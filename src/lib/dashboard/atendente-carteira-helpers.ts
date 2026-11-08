import {
  escopoCondominios,
  getCadastros,
  hojeIso,
  situacaoRetorno,
  type Atendimento,
  type AtribuicaoCobranca,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/** Motivos que exigem acompanhamento prioritário do atendente na carteira. */
const MOTIVOS_ATENCAO = new Set([
  "Já pagou (enviar comprovante)",
  "Aguarda proposta de acordo",
  "Recusa-se a pagar",
]);

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function unidadeIdsNaCarteira(userId: number): Set<number> | null {
  if (usuarioVeCarteiraGeral(userId)) return null;
  const ids = new Set<number>();
  for (const item of getCadastros().atribuicoesCobranca) {
    if (!item.encerradoEm && item.atendenteId === userId) ids.add(item.unidadeId);
  }
  return ids;
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

export function atendimentoNaCarteiraVigente(userId: number, atendimento: Atendimento): boolean {
  const unidadeId = Number(atendimento.unidadeId);
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) return false;
  const idsCondominio = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  if (!idsCondominio.has(unidade.condominioId)) return false;
  const carteiraIds = unidadeIdsNaCarteira(userId);
  if (carteiraIds === null) return true;
  const vigente = atribuicaoVigente(unidadeId);
  return Boolean(vigente && vigente.atendenteId === userId);
}

/** Retorno agendado em aberto, aguardando data ou contato do terceiro. */
export function aguardandoRetornoTerceiro(atendimento: Atendimento): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimento.respondeu === "Não") return true;
  if (!atendimento.dataProximaAcao?.trim()) return false;
  if (atendimento.retornoConcluidoEm?.trim()) return false;
  return true;
}

export function atendimentoPrecisaAtencao(atendimento: Atendimento, hoje = hojeIso()): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimento.dataProximaAcao?.trim() && !atendimento.retornoConcluidoEm?.trim()) {
    if (situacaoRetorno(atendimento.dataProximaAcao, hoje) === "atrasado") return true;
  }
  if (atendimento.respondeu === "Sim" && MOTIVOS_ATENCAO.has(atendimento.motivo)) return true;
  return false;
}

export function atendimentoPendenteAcao(atendimento: Atendimento, hoje = hojeIso()): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimentoPrecisaAtencao(atendimento, hoje)) return false;
  if (aguardandoRetornoTerceiro(atendimento)) return false;
  return true;
}
