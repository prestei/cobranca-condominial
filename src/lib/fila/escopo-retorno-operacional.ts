import type { Atendimento, Cadastros } from "@/data/catalogo";
import { escopoCondominios } from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export function atendimentoComRetornoAberto(
  atendimento: Pick<Atendimento, "dataProximaAcao" | "retornoConcluidoEm">,
): boolean {
  if (!atendimento.dataProximaAcao.trim()) return false;
  return !atendimento.retornoConcluidoEm?.trim();
}

function usuarioVeCarteiraGeral(userId: number, cadastros: Cadastros) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  return temPermissao(perm, "usuarios", "criar");
}

function unidadeIdsNaCarteira(cadastros: Cadastros, userId: number): Set<number> | null {
  if (usuarioVeCarteiraGeral(userId, cadastros)) return null;
  const ids = new Set<number>();
  for (const item of cadastros.atribuicoesCobranca) {
    if (!item.encerradoEm && item.atendenteId === userId) ids.add(item.unidadeId);
  }
  return ids;
}

/** Carteira vigente ou retorno aberto registrado pelo próprio atendente (ex.: após acordo). */
export function unidadeNoEscopoRetornoOperacional(
  cadastros: Cadastros,
  userId: number,
  unidadeId: number,
): boolean {
  const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
  if (!unidade) return false;
  const condominio = cadastros.condominios.find((item) => item.id === unidade.condominioId);
  if (!condominio || condominio.status !== "Ativo") return false;

  const carteiraIds = unidadeIdsNaCarteira(cadastros, userId);
  if (carteiraIds === null) {
    const idsCondominio = new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
    return idsCondominio.has(unidade.condominioId);
  }
  if (carteiraIds.has(unidadeId)) return true;

  return cadastros.atendimentos.some(
    (atendimento) =>
      Number(atendimento.unidadeId) === unidadeId &&
      atendimentoComRetornoAberto(atendimento) &&
      atendimento.usuarioId === userId,
  );
}

export function unidadeIdsComRetornoAberto(cadastros: Cadastros): Set<number> {
  const ids = new Set<number>();
  for (const atendimento of cadastros.atendimentos) {
    if (!atendimentoComRetornoAberto(atendimento)) continue;
    ids.add(Number(atendimento.unidadeId));
  }
  return ids;
}