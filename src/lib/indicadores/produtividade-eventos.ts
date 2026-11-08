import {
  escopoCondominios,
  getCadastros,
  hojeIso,
  nomeCondominio,
  nomeUnidade,
  situacaoRetorno,
  type Atendimento,
  type Condominio,
} from "@/data/catalogo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";
import type { IndicadorProdutividadeId } from "@/lib/indicadores/catalogo-oficial";
import { atendenteIdNaDataUnidade, reDoUsuarioId } from "@/lib/indicadores/atribuicao-historica";
import {
  atendimentoElegivelIndicador,
  diaDentroDoPeriodo,
  propostaContaComoAcordoConfirmado,
  propostaContaComoNegociacaoCriada,
} from "@/lib/indicadores/regras-evento";
import type { RelatorioFiltros } from "@/lib/relatorios/service";

export type EventoReferenciaProdutividade = {
  indicador: IndicadorProdutividadeId;
  origem: "atendimento" | "proposta" | "atribuicao";
  origemId: string;
  dataReferencia: string;
  reContabilizado: string;
  reAutorEvento: string | null;
  reResponsavelCarteiraAtual: string | null;
  reResponsavelNaDataEvento: string | null;
  condominio: string;
  unidade: string;
  detalhe: string;
  meio: string | null;
};

function usuarioIdsPorRe(codigoRe: string): number[] {
  const alvo = codigoRe.trim().toUpperCase();
  return getCadastros()
    .usuarios.filter((item) => codigoReDoUsuario(item)?.toUpperCase() === alvo)
    .map((item) => item.id);
}

function combinaCarteira(condominio: Condominio | undefined, filtros: RelatorioFiltros) {
  if (!condominio) return false;
  if (filtros.advogado !== "todos" && !condominio.advogados.includes(filtros.advogado)) return false;
  if (filtros.condominioId != null && condominio.id !== filtros.condominioId) return false;
  return true;
}

function condominioDaUnidade(unidadeId: string | number) {
  const unidade = getCadastros().unidades.find((item) => String(item.id) === String(unidadeId));
  if (!unidade) return undefined;
  return getCadastros().condominios.find((item) => item.id === unidade.condominioId);
}

function atendimentoNoEscopo(userId: number, item: Atendimento, filtros: RelatorioFiltros) {
  const idsCondominio = new Set(escopoCondominios(getCadastros(), userId).map((c) => c.id));
  const condominio = condominioDaUnidade(item.unidadeId);
  if (!condominio || !idsCondominio.has(condominio.id)) return false;
  return combinaCarteira(condominio, filtros);
}

function retornoEmAberto(item: Atendimento) {
  return (
    Boolean(item.dataProximaAcao?.trim()) &&
    !item.retornoConcluidoEm?.trim() &&
    !item.retornoCanceladoEm?.trim()
  );
}

function reCarteiraAtualUnidade(unidadeId: number): string | null {
  const vigente = getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
  return reDoUsuarioId(vigente?.atendenteId);
}

function montarEventoBase(
  indicador: IndicadorProdutividadeId,
  origem: EventoReferenciaProdutividade["origem"],
  origemId: string,
  dataReferencia: string,
  reContabilizado: string,
  atendimento: Atendimento | null,
  unidadeId: number,
  detalhe: string,
  meio: string | null = atendimento?.canal?.trim() || null,
): EventoReferenciaProdutividade {
  const instante = atendimento?.dataHora ?? `${dataReferencia}T12:00:00.000Z`;
  const reAutor = atendimento ? reDoUsuarioId(atendimento.usuarioId) : null;
  return {
    indicador,
    origem,
    origemId,
    dataReferencia: dataReferencia.slice(0, 10),
    reContabilizado,
    reAutorEvento: reAutor,
    reResponsavelCarteiraAtual: reCarteiraAtualUnidade(unidadeId),
    reResponsavelNaDataEvento: reDoUsuarioId(atendenteIdNaDataUnidade(unidadeId, instante)),
    condominio: (() => {
      const cond = condominioDaUnidade(unidadeId);
      return cond ? nomeCondominio(cond.id) : "—";
    })(),
    unidade: nomeUnidade(unidadeId),
    detalhe,
    meio,
  };
}

function filtraRe(evento: EventoReferenciaProdutividade, codigoRe: string) {
  if (codigoRe === "todos" || !codigoRe.trim()) return true;
  return evento.reContabilizado.toUpperCase() === codigoRe.trim().toUpperCase();
}

export function listarEventosProdutividade(
  userId: number,
  filtros: RelatorioFiltros,
  indicador: IndicadorProdutividadeId,
): EventoReferenciaProdutividade[] {
  const de = filtros.de.trim();
  const ate = filtros.ate.trim();
  const hoje = hojeIso();
  const cadastros = getCadastros();
  const atendimentosEscopo = cadastros.atendimentos.filter((item) => atendimentoNoEscopo(userId, item, filtros));
  const eventos: EventoReferenciaProdutividade[] = [];

  if (indicador === "cobrancas_carteira") {
    for (const atrib of cadastros.atribuicoesCobranca) {
      if (atrib.encerradoEm) continue;
      const unidade = cadastros.unidades.find((u) => u.id === atrib.unidadeId);
      const condominio = unidade ? cadastros.condominios.find((c) => c.id === unidade.condominioId) : undefined;
      if (!combinaCarteira(condominio, filtros)) continue;
      const re = reDoUsuarioId(atrib.atendenteId);
      if (!re) continue;
      const ev = montarEventoBase(
        indicador,
        "atribuicao",
        String(atrib.id),
        hoje,
        re,
        null,
        atrib.unidadeId,
        "Atribuição vigente",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }
    return eventos.sort((a, b) => a.reContabilizado.localeCompare(b.reContabilizado, "pt-BR"));
  }

  for (const item of atendimentosEscopo) {
    if (!atendimentoElegivelIndicador(item)) continue;
    const unidadeId = Number(item.unidadeId);
    const reAutor = reDoUsuarioId(item.usuarioId);
    if (!reAutor) continue;

    if (indicador === "atendimentos_registrados" && diaDentroDoPeriodo(item.dataHora, de, ate)) {
      const ev = montarEventoBase(
        indicador,
        "atendimento",
        item.id,
        item.dataHora,
        reAutor,
        item,
        unidadeId,
        item.assunto || item.canal || "Atendimento",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }

    if (
      indicador === "acoes_agendadas" &&
      diaDentroDoPeriodo(item.dataHora, de, ate) &&
      (item.dataProximaAcao?.trim() || item.proximaAcao?.trim())
    ) {
      const ev = montarEventoBase(
        indicador,
        "atendimento",
        item.id,
        item.dataHora,
        reAutor,
        item,
        unidadeId,
        item.proximaAcao || "Próxima ação",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }

    if (indicador === "retornos_previstos" && item.dataProximaAcao?.trim() && diaDentroDoPeriodo(item.dataProximaAcao, de, ate)) {
      const ev = montarEventoBase(
        indicador,
        "atendimento",
        item.id,
        item.dataProximaAcao,
        reAutor,
        item,
        unidadeId,
        item.proximaAcao || "Retorno previsto",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }

    if (indicador === "retornos_concluidos" && item.retornoConcluidoEm?.trim() && item.retornoConcluidoPorId != null) {
      const reConcluiu = reDoUsuarioId(item.retornoConcluidoPorId);
      if (!reConcluiu || !diaDentroDoPeriodo(item.retornoConcluidoEm, de, ate)) continue;
      const ev = montarEventoBase(
        indicador,
        "atendimento",
        item.id,
        item.retornoConcluidoEm,
        reConcluiu,
        item,
        unidadeId,
        "Retorno concluído",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }

    if (
      (indicador === "retornos_atrasados" || indicador === "retornos_em_aberto") &&
      retornoEmAberto(item) &&
      item.dataProximaAcao?.trim() &&
      diaDentroDoPeriodo(item.dataProximaAcao, de, ate)
    ) {
      const situacao = situacaoRetorno(item.dataProximaAcao);
      const atrasado = situacao === "atrasado";
      if (indicador === "retornos_atrasados" && !atrasado) continue;
      if (indicador === "retornos_em_aberto" && atrasado) continue;
      const ev = montarEventoBase(
        indicador,
        "atendimento",
        item.id,
        item.dataProximaAcao,
        reAutor,
        item,
        unidadeId,
        atrasado ? "Retorno atrasado" : "Retorno em aberto",
      );
      if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
    }
  }

  if (indicador === "negociacoes_criadas" || indicador === "acordos_confirmados") {
    for (const proposta of cadastros.propostasNegociacao) {
      const condominio = cadastros.condominios.find((c) => c.id === proposta.condominioId);
      if (!combinaCarteira(condominio, filtros)) continue;

      if (indicador === "negociacoes_criadas") {
        if (!propostaContaComoNegociacaoCriada(proposta)) continue;
        if (!diaDentroDoPeriodo(proposta.criadoEm, de, ate)) continue;
        const re = reDoUsuarioId(proposta.usuarioId);
        if (!re) continue;
        const ev = montarEventoBase(
          indicador,
          "proposta",
          proposta.id,
          proposta.criadoEm,
          re,
          null,
          proposta.unidadeId,
          `Proposta ${proposta.status}`,
        );
        if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
      }

      if (indicador === "acordos_confirmados") {
        if (!propostaContaComoAcordoConfirmado(proposta)) continue;
        const autorId = proposta.acordoConfirmadoPorId ?? proposta.usuarioId;
        const re = reDoUsuarioId(autorId);
        if (!re || !diaDentroDoPeriodo(proposta.acordoConfirmadoEm, de, ate)) continue;
        const ev = montarEventoBase(
          indicador,
          "proposta",
          proposta.id,
          proposta.acordoConfirmadoEm,
          re,
          null,
          proposta.unidadeId,
          "Acordo confirmado",
        );
        if (filtraRe(ev, filtros.codigoRe)) eventos.push(ev);
      }
    }
  }

  return eventos.sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia) || a.origemId.localeCompare(b.origemId));
}

export function contagemPorRe(eventos: EventoReferenciaProdutividade[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const ev of eventos) {
    mapa.set(ev.reContabilizado, (mapa.get(ev.reContabilizado) ?? 0) + 1);
  }
  return mapa;
}

export function usuarioIdsPorReExport(codigoRe: string) {
  return usuarioIdsPorRe(codigoRe);
}
