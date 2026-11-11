/**
 * Repara vínculos e cidade do Residencial do Mar (uso pontual em dev).
 * Executar: node --import tsx scripts/repair-provisionamento-mar.ts
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { interpretarTextoRelatorioInadimplenciaGestao } from "../src/lib/importacoes/inadimplencia/interpretar-relatorio-gestao-condominial";
import { extrairTextoLegivelPdf } from "../src/lib/importacoes/inadimplencia/extrair-texto-pdf";
import { extrairReferenciasCadastraisMatrizDebitos } from "../src/lib/importacoes/importar-debitos-planilha";

const OBS_RESP = "Cadastro criado automaticamente na importação de inadimplência (sem CPF/CNPJ no arquivo).";
const OBS_VINC = "Vínculo criado automaticamente na importação de inadimplência.";

function slugDoc(nome: string): string {
  const base =
    nome
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "RESPONSAVEL";
  return `IMPORT-${base}`;
}

async function main() {
  const prisma = new PrismaClient();
  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-residencial-do-mar.pdf");
  const { texto } = await extrairTextoLegivelPdf(buffer);
  const rel = interpretarTextoRelatorioInadimplenciaGestao(texto);
  const refs = extrairReferenciasCadastraisMatrizDebitos(rel.matriz);

  const condo = await prisma.condominium.findFirst({
    where: { name: { equals: "Residencial do Mar", mode: "insensitive" } },
  });
  if (!condo) throw new Error("Condomínio não encontrado");

  const cidadePadrao =
    (
      await prisma.condominium.findMany({
        where: { city: { not: null }, id: { not: condo.id } },
        select: { city: true, state: true },
        distinct: ["city"],
      })
    ).length === 1
      ? (
          await prisma.condominium.findFirst({
            where: { city: { not: null }, id: { not: condo.id } },
            select: { city: true, state: true },
          })
        )?.city
      : null;

  if (!condo.city && cidadePadrao) {
    const estado =
      (
        await prisma.condominium.findFirst({
          where: { city: cidadePadrao, state: { not: null } },
          select: { state: true },
        })
      )?.state ?? null;
    await prisma.condominium.update({
      where: { id: condo.id },
      data: { city: cidadePadrao, state: estado },
    });
  }

  const units = await prisma.unit.findMany({ where: { condominiumId: condo.id } });
  const unitByCode = new Map(units.map((u) => [u.identification.toUpperCase(), u]));

  let links = 0;
  let respNovos = 0;

  for (const ref of refs) {
    const unit = unitByCode.get(ref.unidade.toUpperCase());
    const nomeResp = ref.responsavel?.trim();
    if (!unit || !nomeResp) continue;

    const doc = slugDoc(nomeResp);
    let resp = await prisma.responsibleParty.findFirst({
      where: { taxId: doc },
    });
    if (!resp) {
      resp = await prisma.responsibleParty.create({
        data: {
          name: nomeResp,
          taxId: doc,
          personType: "Fisica",
          notes: OBS_RESP,
        },
      });
      respNovos += 1;
    }

    const exists = await prisma.unitResponsibleParty.findFirst({
      where: { unitId: unit.id, responsiblePartyId: resp.id, linkType: "Proprietario" },
    });
    if (exists) continue;

    const temPrincipal = await prisma.unitResponsibleParty.findFirst({
      where: { unitId: unit.id, primary: true },
    });

    await prisma.unitResponsibleParty.create({
      data: {
        unitId: unit.id,
        responsiblePartyId: resp.id,
        linkType: "Proprietario",
        primary: !temPrincipal,
        notes: OBS_VINC,
      },
    });
    links += 1;
  }

  const condoAfter = await prisma.condominium.findUnique({ where: { id: condo.id } });
  const linkCount = await prisma.unitResponsibleParty.count({
    where: { unitId: { in: units.map((u) => u.id) } },
  });

  console.log({ respNovos, linksCriados: links, linkCount, city: condoAfter?.city });
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
