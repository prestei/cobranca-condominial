/**
 * Gera centenas de propostas, parcelas e pagamentos de demonstração no PostgreSQL.
 * Executar: node --import tsx scripts/seed-negociacoes-mock.ts
 * Opções: --count=350 --limpar
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { distribuirValorEmParcelas, datasVencimentoMensais } from "../src/lib/negociacoes/parcelamento";

const MOCK_PREFIX = "mock-neg-";
const MOCK_NOTES = "MOCK_SEED negociacoes";

function carregarDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function argNumero(flag: string, padrao: number): number {
  const hit = process.argv.find((item) => item.startsWith(`${flag}=`));
  if (!hit) return padrao;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : padrao;
}

function argFlag(nome: string): boolean {
  return process.argv.includes(nome);
}

function escolher<T>(lista: T[], indice: number): T {
  const item = lista[indice % lista.length];
  if (item === undefined) throw new Error("Lista vazia para sorteio.");
  return item;
}

function escolhaPonderada(indice: number): string {
  const opcoes = ["Aceita", "Aceita", "Aceita", "Em análise", "Em análise", "Recusada", "Cancelada"];
  return escolher(opcoes, indice);
}

function descontoPercentual(originalCent: number, propostoCent: number): number {
  if (originalCent <= 0) return 0.15;
  const desconto = (originalCent - propostoCent) / originalCent;
  return Math.min(0.3, Math.max(0.05, desconto));
}

function centavosDec(valor: number): number {
  return Math.round(valor * 100);
}

function deCentavos(c: number): string {
  return (c / 100).toFixed(2);
}

async function main() {
  carregarDotEnv();
  const quantidade = argNumero("--count", 350);
  const limpar = argFlag("--limpar");

  const prisma = new PrismaClient();

  try {
    if (limpar) {
      const removidas = await prisma.negotiationProposal.deleteMany({
        where: { id: { startsWith: MOCK_PREFIX } },
      });
      console.info(`Removidas ${removidas.count} propostas mock anteriores.`);
    }

    const [debts, users, advogadoRole] = await Promise.all([
      prisma.debt.findMany({
        where: { status: { in: ["Pendente", "Vencido"] } },
        select: {
          id: true,
          unitId: true,
          condominiumId: true,
          updatedAmount: true,
          originalAmount: true,
        },
        take: 5000,
      }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, roleId: true } }),
      prisma.role.findFirst({ where: { name: { equals: "Advogado", mode: "insensitive" } } }),
    ]);

    if (debts.length === 0) {
      console.error("Nenhum débito em aberto no banco. Importe dados ou cadastre débitos antes do seed.");
      process.exit(1);
    }

    const advogadoIds = advogadoRole
      ? users.filter((u) => u.roleId === advogadoRole.id).map((u) => u.id)
      : [];
    const atendenteIds = users.map((u) => u.id);
    const advogadoPadrao = advogadoIds[0] ?? atendenteIds[0] ?? 1;

    const agrupadoPorUnidade = new Map<number, typeof debts>();
    for (const debito of debts) {
      const lista = agrupadoPorUnidade.get(debito.unitId) ?? [];
      lista.push(debito);
      agrupadoPorUnidade.set(debito.unitId, lista);
    }
    const unidades = [...agrupadoPorUnidade.keys()];

    let criadas = 0;
    let parcelasTotal = 0;
    let pagamentosTotal = 0;

    const lote = 50;
    for (let offset = 0; offset < quantidade; offset += lote) {
      const fim = Math.min(offset + lote, quantidade);
      await prisma.$transaction(async (tx) => {
        for (let i = offset; i < fim; i++) {
          const unidadeId = escolher(unidades, i);
          const debitosUnidade = agrupadoPorUnidade.get(unidadeId) ?? [];
          const debito = escolher(debitosUnidade, i);
          const condominioId = debito.condominiumId;
          const autorId = escolher(atendenteIds, i);
          const advogadoId = escolher(advogadoIds.length > 0 ? advogadoIds : [advogadoPadrao], i);

          const atualizadoCent = centavosDec(Number(debito.updatedAmount ?? 0));
          const originalCent = centavosDec(
            Number(debito.originalAmount ?? debito.updatedAmount ?? 0),
          );
          const baseCent = atualizadoCent > 0 ? atualizadoCent : Math.max(originalCent, 50000);
          const descontoFrac = descontoPercentual(baseCent, Math.round(baseCent * (0.85 + (i % 5) * 0.02)));
          const propostoCent = Math.round(baseCent * (1 - descontoFrac));

          const status = escolhaPonderada(i);
          const qtdParcelas = 6 + (i % 19);
          const criadoEm = new Date();
          criadoEm.setUTCDate(criadoEm.getUTCDate() - (i % 365));
          criadoEm.setUTCHours(10 + (i % 8), i % 60, 0, 0);

          const propostaId = `${MOCK_PREFIX}${randomUUID()}`;

          const aceita = status === "Aceita";
          const agreementConfirmedAt = aceita ? new Date(criadoEm.getTime() + 2 * 86400000) : null;

          await tx.negotiationProposal.create({
            data: {
              id: propostaId,
              condominiumId: condominioId,
              unitId: unidadeId,
              userId: autorId,
              createdAt: criadoEm,
              status,
              proposedAmount: propostoCent / 100,
              notes: `${MOCK_NOTES} #${i + 1}`,
              debtIdsJson: JSON.stringify([debito.id]),
              agreementConfirmedAt,
              agreementConfirmedById: aceita ? advogadoId : null,
              approvedTerms: aceita ? `Acordo mock ${qtdParcelas}x aprovado automaticamente.` : null,
              responsibleLawyerUserId: advogadoId,
              originalDebtAmount: originalCent / 100,
              updatedDebtAmount: atualizadoCent / 100,
              installmentCount: qtdParcelas,
              valuesDefinedByUserId: autorId,
              valuesApprovedByUserId: aceita ? advogadoId : null,
              debts: { create: [{ debtId: debito.id }] },
            },
          });

          if (aceita) {
            const valorProposto = deCentavos(propostoCent);
            const valores = distribuirValorEmParcelas(valorProposto, qtdParcelas);
            const primeiroVenc = new Date(criadoEm);
            primeiroVenc.setUTCMonth(primeiroVenc.getUTCMonth() + 1);
            const primeiroIso = primeiroVenc.toISOString().slice(0, 10);
            const vencimentos = datasVencimentoMensais(primeiroIso, qtdParcelas);

            const pagasAte = Math.min(qtdParcelas, i % (qtdParcelas + 1));
            const parcelasIds: string[] = [];

            for (let p = 0; p < qtdParcelas; p++) {
              const parcelaId = `${MOCK_PREFIX}par-${randomUUID()}`;
              parcelasIds.push(parcelaId);
              const venc = new Date(`${vencimentos[p]}T12:00:00.000Z`);
              await tx.agreementInstallment.create({
                data: {
                  id: parcelaId,
                  proposalId: propostaId,
                  condominiumId: condominioId,
                  unitId: unidadeId,
                  number: p + 1,
                  plannedAmount: Number(valores[p]),
                  dueDate: venc,
                  createdAt: agreementConfirmedAt ?? criadoEm,
                  createdById: autorId,
                },
              });
              parcelasTotal += 1;

              if (p < pagasAte) {
                const pagoEm = new Date(venc);
                pagoEm.setUTCDate(pagoEm.getUTCDate() - 2);
                await tx.agreementPayment.create({
                  data: {
                    id: `${MOCK_PREFIX}pay-${randomUUID()}`,
                    proposalId: propostaId,
                    installmentId: parcelaId,
                    unitId: unidadeId,
                    amount: Number(valores[p]),
                    paidAt: pagoEm,
                    proofReference: `MOCK-COMP-${i}-${p + 1}`,
                    confirmation: "Confirmado",
                    createdAt: pagoEm,
                    registeredById: autorId,
                  },
                });
                pagamentosTotal += 1;
              }
            }

            if (pagasAte < qtdParcelas && i % 7 === 0) {
              const indiceVencida = pagasAte;
              const parcelaVencidaId = parcelasIds[indiceVencida];
              if (parcelaVencidaId) {
                const vencPassado = new Date();
                vencPassado.setUTCMonth(vencPassado.getUTCMonth() - 2);
                await tx.agreementInstallment.update({
                  where: { id: parcelaVencidaId },
                  data: { dueDate: vencPassado },
                });
              }
            }
          }

          criadas += 1;
        }
      });
      console.info(`Progresso: ${fim}/${quantidade} propostas…`);
    }

    console.info(
      `Concluído: ${criadas} propostas, ${parcelasTotal} parcelas, ${pagamentosTotal} pagamentos confirmados.`,
    );
    console.info(`Prefixo dos IDs: ${MOCK_PREFIX} — use --limpar para remover.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
