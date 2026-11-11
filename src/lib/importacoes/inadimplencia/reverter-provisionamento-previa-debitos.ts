import { SITUACAO_COBRANCA_PADRAO, type Importacao } from "@/data/catalogo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { listImports } from "@/lib/db/repositories/import-repository";
import { deleteCondominium, findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import { deleteResponsibleParty, findResponsiblePartyById } from "@/lib/db/repositories/responsible-party-repository";
import {
  deleteUnit,
  deleteUnitLink,
  findUnitById,
  listUnitLinksByUnit,
} from "@/lib/db/repositories/unit-repository";
import { listDebtsByUnit } from "@/lib/db/repositories/debt-repository";
import { importacaoConcluidaOuParcial } from "@/lib/importacao-centro/situacao-importacao";
import { obterProcessoArquivoTemporario } from "@/lib/importacoes/armazenamento-temporario";
import { parseObservacaoImportacao, type ProvisionamentoPreviaImportacao } from "@/lib/importacoes/hash-arquivo";
import {
  condominioProvisionadoNaPrevia,
  responsavelProvisionadoNaPrevia,
} from "@/lib/importacoes/inadimplencia/provisionamento-previa-markers";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";

type ProvisionamentoProtegido = {
  condominioIds: Set<number>;
  unidadeIds: Set<number>;
};

/** Prévia ainda retomável (arquivo temporário ativo) — cadastros auxiliares permanecem até confirmar ou expirar. */
function importacaoDebitosComPreviaAtiva(imp: Importacao): boolean {
  if (imp.tipo.trim() !== "debitos") return false;
  if (importacaoConcluidaOuParcial(imp.status)) return false;
  const processoId = imp.processoId?.trim();
  if (!processoId) return false;
  return obterProcessoArquivoTemporario(processoId, imp.usuarioId) !== null;
}

/** IDs ainda vinculados a importações de débitos com sessão de prévia ativa (não remover). */
function coletarProvisionamentoProtegido(importacoes: Importacao[]): ProvisionamentoProtegido {
  const condominioIds = new Set<number>();
  const unidadeIds = new Set<number>();
  for (const imp of importacoes) {
    if (!importacaoDebitosComPreviaAtiva(imp)) continue;
    const prov = parseObservacaoImportacao(imp.observacaoInterna).provisionamentoPrevia;
    if (!prov) continue;
    for (const id of prov.condominioIds) condominioIds.add(id);
    for (const id of prov.unidadeIds) unidadeIds.add(id);
  }
  return { condominioIds, unidadeIds };
}

async function unidadeElegivelReversao(unidadeId: number): Promise<boolean> {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) return false;
  if (unidade.situacao.trim() !== SITUACAO_COBRANCA_PADRAO) return false;
  const debitos = await listDebtsByUnit(unidadeId);
  return debitos.length === 0;
}

async function removerUnidadeProvisionada(unidadeId: number, userId: number, meta?: { ip?: string; userAgent?: string }) {
  if (!(await unidadeElegivelReversao(unidadeId))) return;
  const unidade = await findUnitById(unidadeId);
  if (!unidade) return;
  const condominio = await findCondominiumById(unidade.condominioId);
  if (!condominio || !condominioProvisionadoNaPrevia(condominio)) return;
  const vinculos = await listUnitLinksByUnit(unidadeId);
  for (const vinculo of vinculos) {
    await deleteUnitLink(vinculo.id);
  }
  await deleteUnit(unidadeId);
  await writeAuditLog({
    entity: "unit",
    recordId: String(unidadeId),
    action: "DELETE",
    previousData: JSON.stringify(unidade),
    newData: "",
    changedFields: "reversao_provisionamento_previa",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

async function removerResponsavelSeOrfao(responsavelId: number, userId: number, meta?: { ip?: string; userAgent?: string }) {
  const responsavel = await findResponsiblePartyById(responsavelId);
  if (!responsavel || !responsavelProvisionadoNaPrevia(responsavel)) return;
  const cadastros = await loadFullOperationalCadastros();
  const aindaVinculado = cadastros.vinculos.some((item) => item.responsavelId === responsavelId);
  if (aindaVinculado) return;
  await deleteResponsibleParty(responsavelId);
  await writeAuditLog({
    entity: "responsible_party",
    recordId: String(responsavelId),
    action: "DELETE",
    previousData: JSON.stringify({ id: responsavelId, nome: responsavel.nome }),
    newData: "",
    changedFields: "reversao_provisionamento_previa",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

async function removerCondominioSeVazio(condominioId: number, userId: number, meta?: { ip?: string; userAgent?: string }) {
  const condominio = await findCondominiumById(condominioId);
  if (!condominio || !condominioProvisionadoNaPrevia(condominio)) return;
  const cadastros = await loadFullOperationalCadastros();
  const unidadesRestantes = cadastros.unidades.filter((item) => item.condominioId === condominioId);
  if (unidadesRestantes.length > 0) return;
  const temDebito = cadastros.debitos.some((item) => item.condominioId === condominioId);
  if (temDebito) return;
  await deleteCondominium(condominioId);
  await writeAuditLog({
    entity: "condominium",
    recordId: String(condominioId),
    action: "DELETE",
    previousData: JSON.stringify(condominio),
    newData: "",
    changedFields: "reversao_provisionamento_previa",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

async function reverterPorIdsProvisionamento(
  ids: ProvisionamentoPreviaImportacao,
  userId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const condominioIds = (
    await Promise.all(
      ids.condominioIds.map(async (condominioId) => {
        const condominio = await findCondominiumById(condominioId);
        return condominio && condominioProvisionadoNaPrevia(condominio) ? condominioId : null;
      }),
    )
  ).filter((id): id is number => id !== null);

  const unidadeIds = (
    await Promise.all(
      ids.unidadeIds.map(async (unidadeId) => {
        const unidade = await findUnitById(unidadeId);
        if (!unidade) return null;
        const condominio = await findCondominiumById(unidade.condominioId);
        return condominio && condominioProvisionadoNaPrevia(condominio) ? unidadeId : null;
      }),
    )
  ).filter((id): id is number => id !== null);

  const idsFiltrados: ProvisionamentoPreviaImportacao = {
    condominioIds,
    unidadeIds,
    responsavelIds: ids.responsavelIds,
    vinculoIds: ids.vinculoIds,
  };

  const responsavelIds = new Set(idsFiltrados.responsavelIds);
  for (const vinculoId of idsFiltrados.vinculoIds) {
    const cadastros = await loadFullOperationalCadastros();
    const vinculo = cadastros.vinculos.find((item) => item.id === vinculoId);
    if (vinculo) responsavelIds.add(vinculo.responsavelId);
    await deleteUnitLink(vinculoId).catch(() => undefined);
  }
  for (const unidadeId of idsFiltrados.unidadeIds) {
    await removerUnidadeProvisionada(unidadeId, userId, meta);
  }
  for (const responsavelId of responsavelIds) {
    await removerResponsavelSeOrfao(responsavelId, userId, meta);
  }
  for (const condominioId of idsFiltrados.condominioIds) {
    await removerCondominioSeVazio(condominioId, userId, meta);
  }
}

/** Remove cadastros auxiliares gravados na prévia quando a importação de débitos não foi confirmada. */
export async function reverterProvisionamentoPreviaImportacaoDebitos(
  importacao: Importacao,
  userId: number,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  if (importacao.tipo.trim() !== "debitos") return;
  if (importacaoConcluidaOuParcial(importacao.status)) return;
  const obs = parseObservacaoImportacao(importacao.observacaoInterna);
  if (obs.provisionamentoPrevia) {
    await reverterPorIdsProvisionamento(obs.provisionamentoPrevia, userId, meta);
  }
}

/**
 * Limpa condomínios/unidades criados na prévia sem importação concluída correspondente
 * (ex.: histórico excluído com falha antes da reversão).
 */
/**
 * Remove cadastros criados só na prévia quando a importação não foi confirmada
 * (arquivo temporário ausente/expirado) e limpa registros órfãos sem histórico.
 */
export async function limparCadastrosProvisionadosPreviaAbandonada(
  userId: number,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const importacoes = await listImports();
  for (const imp of importacoes) {
    if (imp.tipo.trim() !== "debitos") continue;
    if (importacaoConcluidaOuParcial(imp.status)) continue;
    if (importacaoDebitosComPreviaAtiva(imp)) continue;
    await reverterProvisionamentoPreviaImportacaoDebitos(imp, imp.usuarioId, meta);
  }
  await reverterProvisionamentoOrfaoImportacaoDebitos(userId, meta);
}

export async function reverterProvisionamentoOrfaoImportacaoDebitos(
  userId: number,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const [cadastros, importacoes] = await Promise.all([loadFullOperationalCadastros(), listImports()]);
  const protegidos = coletarProvisionamentoProtegido(importacoes);

  const condominiosOrfaos = cadastros.condominios.filter((item) => {
    if (!condominioProvisionadoNaPrevia(item)) return false;
    if (protegidos.condominioIds.has(item.id)) return false;
    const unidades = cadastros.unidades.filter((u) => u.condominioId === item.id);
    if (unidades.some((u) => protegidos.unidadeIds.has(u.id))) return false;
    return true;
  });

  for (const condominio of condominiosOrfaos) {
    const unidades = cadastros.unidades.filter((item) => item.condominioId === condominio.id);
    const todasElegiveis =
      unidades.length > 0 &&
      unidades.every((item) => item.situacao.trim() === SITUACAO_COBRANCA_PADRAO) &&
      unidades.every((item) => !cadastros.debitos.some((debito) => debito.unidadeId === item.id));
    if (!todasElegiveis) continue;

    const responsavelIds = new Set<number>();
    for (const unidade of unidades) {
      for (const vinculo of cadastros.vinculos.filter((item) => item.unidadeId === unidade.id)) {
        responsavelIds.add(vinculo.responsavelId);
        await deleteUnitLink(vinculo.id);
      }
      await removerUnidadeProvisionada(unidade.id, userId, meta);
    }
    for (const responsavelId of responsavelIds) {
      await removerResponsavelSeOrfao(responsavelId, userId, meta);
    }
    await removerCondominioSeVazio(condominio.id, userId, meta);
  }
}
