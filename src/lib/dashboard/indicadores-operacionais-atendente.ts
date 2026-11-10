import { escopoCondominios, hojeIso, situacaoRetorno, type Atendimento, type AtribuicaoCobranca } from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/** Motivos que exigem acompanhamento prioritário do atendente na carteira. */
const MOTIVOS_ATENCAO = new Set([
  "Já pagou (enviar comprovante)",
  "Aguarda proposta de acordo",
  "Recusa-se a pagar",
]);

export type IndicadorOperacionalAtendenteId =
  | "pendentes"
  | "aguardando_retorno"
  | "resolvidos_periodo"
  | "atencao";

export type IndicadorOperacionalAtendenteContagem = {
  id: IndicadorOperacionalAtendenteId;
  total: number;
  requerAtencaoVisual: boolean;
};

export type IndicadoresOperacionaisAtendente = {
  periodo: { inicio: string; fim: string };
  itens: IndicadorOperacionalAtendenteContagem[];
};

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

export function periodoUltimos7Dias(hoje: string) {
  const fim = hoje;
  const inicioDate = new Date(`${hoje}T12:00:00`);
  inicioDate.setDate(inicioDate.getDate() - 6);
  const inicio = inicioDate.toISOString().slice(0, 10);
  return { inicio, fim };
}

function dentroPeriodo(dia: string, inicio: string, fim: string) {
  return dia >= inicio && dia <= fim;
}

/** Retorno agendado em aberto, aguardando data ou contato do terceiro. */
export function aguardandoRetornoTerceiro(atendimento: Atendimento): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimento.respondeu === "Não") return true;
  if (!atendimento.dataProximaAcao?.trim()) return false;
  if (atendimento.retornoConcluidoEm?.trim()) return false;
  return true;
}

/** Situações prioritárias: retorno atrasado ou motivos sensíveis com pendência aberta. */
export function atendimentoPrecisaAtencao(atendimento: Atendimento, hoje = hojeIso()): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimento.dataProximaAcao?.trim() && !atendimento.retornoConcluidoEm?.trim()) {
    if (situacaoRetorno(atendimento.dataProximaAcao, hoje) === "atrasado") return true;
  }
  if (atendimento.respondeu === "Sim" && MOTIVOS_ATENCAO.has(atendimento.motivo)) return true;
  return false;
}

/** Pendência aberta que exige ação do atendente, fora de aguardar terceiro ou fila de atenção. */
export function atendimentoPendenteAcao(atendimento: Atendimento, hoje = hojeIso()): boolean {
  if (atendimento.status !== "Pendente") return false;
  if (atendimentoPrecisaAtencao(atendimento, hoje)) return false;
  if (aguardandoRetornoTerceiro(atendimento)) return false;
  return true;
}

export function resolvidoNoPeriodo(atendimento: Atendimento, inicio: string, fim: string): boolean {
  if (atendimento.status === "Resolvido") {
    const dia = atendimento.dataHora.slice(0, 10);
    return dentroPeriodo(dia, inicio, fim);
  }
  const conclusao = atendimento.retornoConcluidoEm?.trim();
  if (conclusao) {
    const dia = conclusao.slice(0, 10);
    return dentroPeriodo(dia, inicio, fim);
  }
  return false;
}

export function classificarAtendimentoOperacional(
  atendimento: Atendimento,
  periodo: { inicio: string; fim: string },
  hoje = hojeIso(),
): IndicadorOperacionalAtendenteId | null {
  if (resolvidoNoPeriodo(atendimento, periodo.inicio, periodo.fim)) return "resolvidos_periodo";
  if (atendimento.status !== "Pendente") return null;
  if (atendimentoPrecisaAtencao(atendimento, hoje)) return "atencao";
  if (aguardandoRetornoTerceiro(atendimento)) return "aguardando_retorno";
  if (atendimentoPendenteAcao(atendimento, hoje)) return "pendentes";
  return null;
}

function atendimentosEscopoCarteira(userId: number): Atendimento[] {
  return getCadastros().atendimentos.filter((item) => atendimentoNaCarteiraVigente(userId, item));
}

export function listarAtendimentosIndicadorOperacional(
  userId: number,
  indicador: IndicadorOperacionalAtendenteId,
  periodo?: { inicio: string; fim: string },
): Atendimento[] {
  const hoje = hojeIso();
  const intervalo = periodo ?? periodoUltimos7Dias(hoje);
  const lista = atendimentosEscopoCarteira(userId);
  return lista
    .filter((item) => classificarAtendimentoOperacional(item, intervalo, hoje) === indicador)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

export function contarIndicadoresOperacionaisAtendente(
  userId: number,
  periodo?: { inicio: string; fim: string },
): IndicadoresOperacionaisAtendente {
  const hoje = hojeIso();
  const intervalo = periodo ?? periodoUltimos7Dias(hoje);
  const lista = atendimentosEscopoCarteira(userId);
  const totais: Record<IndicadorOperacionalAtendenteId, number> = {
    pendentes: 0,
    aguardando_retorno: 0,
    resolvidos_periodo: 0,
    atencao: 0,
  };

  for (const item of lista) {
    const bucket = classificarAtendimentoOperacional(item, intervalo, hoje);
    if (bucket) totais[bucket] += 1;
  }

  return {
    periodo: intervalo,
    itens: (Object.keys(totais) as IndicadorOperacionalAtendenteId[]).map((id) => ({
      id,
      total: totais[id],
      requerAtencaoVisual: id === "atencao" && totais[id] > 0,
    })),
  };
}
