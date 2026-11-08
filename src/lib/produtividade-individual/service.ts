import {
  escopoCondominios,
  formatarData,
  getCadastros,
  hojeIso,
  nomeCondominio,
  nomeUnidade,
  type Atendimento,
  type Auditoria,
} from "@/data/catalogo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";
import { geradoEmBr } from "@/lib/indicadores/meta";
import { diaDentroDoPeriodo } from "@/lib/indicadores/regras-evento";
import { podeAcessarPainelProdutividadeGlobal } from "@/lib/relatorios/produtividade";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class MinhaProdutividadeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type IndicadorMinhaProdutividadeId =
  | "atendimentos_realizados"
  | "atendimentos_concluidos"
  | "atendimentos_pendentes"
  | "retornos_realizados"
  | "atendimentos_reabertos"
  | "atendimentos_criados"
  | "atendimentos_movimentados"
  | "conclusoes_efetivas";

export type RegistroMinhaProdutividade = {
  indicador: IndicadorMinhaProdutividadeId;
  atendimentoId: string;
  dataReferencia: string;
  tipoEvento: "criado" | "movimentado" | "conclusao_status" | "conclusao_retorno" | "reabertura" | "pendente";
  condominio: string;
  unidade: string;
  canal: string;
  resumo: string;
};

export type SerieDiaMinhaProdutividade = {
  dia: string;
  valor: number;
  rotulo: string;
};

export type PainelMinhaProdutividade = {
  codigoRe: string | null;
  periodo: { de: string; ate: string; rotulo: string };
  indicadores: Record<IndicadorMinhaProdutividadeId, number>;
  taxaConclusao: { percentual: number | null; formula: string };
  graficos: {
    atendimentosRealizados: SerieDiaMinhaProdutividade[];
    atendimentosConcluidos: SerieDiaMinhaProdutividade[];
  };
  definicoes: readonly string[];
  meta: { geradoEm: string; filtros: string[] };
};

export const DEFINICOES_MINHA_PRODUTIVIDADE = [
  "Atendimentos realizados: registros de tentativa gravados por você (data/hora do atendimento no período).",
  "Atendimentos criados: mesmo conjunto dos realizados — cada novo registro conta uma vez na data de criação.",
  "Atendimentos movimentados: alterações em atendimentos feitas por você no período (auditoria UPDATE), exceto a criação.",
  "Conclusões efetivas: fechamentos no período — status alterado para Resolvido por você ou retorno agendado marcado como realizado por você; no máximo uma conclusão por atendimento no período, salvo reabertura documentada entre conclusões.",
  "Atendimentos concluídos: atendimentos distintos com pelo menos uma conclusão efetiva no período (não conta reabertura como conclusão).",
  "Atendimentos pendentes: entre os realizados no período, os que seguem com situação Pendente na consulta.",
  "Retornos realizados: retornos agendados marcados como concluídos por você, com data de conclusão no período.",
  "Atendimentos reabertos: alterações por você que retornam um atendimento de Resolvido para Pendente (ou outra situação não resolvida), conforme histórico de auditoria.",
  "Taxa de conclusão: (atendimentos concluídos ÷ atendimentos realizados) × 100 quando realizados > 0; caso contrário, não calculada.",
] as const;

export const FORMULA_TAXA_CONCLUSAO =
  "Taxa de conclusão (%) = (Atendimentos concluídos ÷ Atendimentos realizados) × 100, no período selecionado.";

function idsUnidadeNoEscopo(userId: number): Set<number> {
  const cadastros = getCadastros();
  return new Set(
    cadastros.unidades
      .filter((u) => escopoCondominios(cadastros, userId).some((c) => c.id === u.condominioId))
      .map((u) => u.id),
  );
}

function atendimentoNoEscopoUsuario(userId: number, item: Atendimento): boolean {
  return idsUnidadeNoEscopo(userId).has(Number(item.unidadeId));
}

function atendimentosAutoria(userId: number): Atendimento[] {
  return getCadastros()
    .atendimentos.filter((item) => item.usuarioId === userId && atendimentoNoEscopoUsuario(userId, item));
}

function lerJsonAuditoria(texto: string): Record<string, unknown> | null {
  const bruto = texto.trim();
  if (!bruto) return null;
  try {
    const valor = JSON.parse(bruto) as unknown;
    return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function statusDeAuditoria(texto: string): string | null {
  const obj = lerJsonAuditoria(texto);
  const status = obj?.status;
  return typeof status === "string" && status.trim() ? status.trim() : null;
}

function auditoriaDoUsuario(userId: number, de: string, ate: string): Auditoria[] {
  const alvo = String(userId);
  return getCadastros().auditoria.filter(
    (item) =>
      item.entidade === "service_ticket" &&
      item.usuarioId === alvo &&
      diaDentroDoPeriodo(item.dataHora, de, ate),
  );
}

function rotuloAtendimento(item: Atendimento) {
  const unidadeId = Number(item.unidadeId);
  const unidade = getCadastros().unidades.find((u) => u.id === unidadeId);
  const condominioId = unidade?.condominioId;
  return {
    condominio: condominioId ? nomeCondominio(condominioId) : "—",
    unidade: nomeUnidade(unidadeId),
    canal: item.canal.trim() || "—",
    resumo: item.assunto.trim() || item.motivo.trim() || item.canal || "Atendimento",
  };
}

type EventoConclusao = {
  atendimentoId: string;
  dataReferencia: string;
  tipo: "conclusao_status" | "conclusao_retorno";
  item: Atendimento;
};

type EventoReabertura = {
  atendimentoId: string;
  dataReferencia: string;
  item: Atendimento;
};

function eventosConclusao(userId: number, de: string, ate: string): EventoConclusao[] {
  const eventos: EventoConclusao[] = [];
  const porId = new Map(getCadastros().atendimentos.map((item) => [item.id, item]));

  for (const item of atendimentosAutoria(userId)) {
    if (item.status === "Resolvido" && diaDentroDoPeriodo(item.dataHora, de, ate)) {
      eventos.push({
        atendimentoId: item.id,
        dataReferencia: item.dataHora.slice(0, 10),
        tipo: "conclusao_status",
        item,
      });
    }
  }

  for (const reg of auditoriaDoUsuario(userId, de, ate)) {
    if (reg.acao !== "UPDATE") continue;
    const anterior = statusDeAuditoria(reg.dadosAnteriores);
    const novo = statusDeAuditoria(reg.dadosNovos);
    if (novo === "Resolvido" && anterior !== "Resolvido") {
      const item = porId.get(reg.registroId);
      if (item && atendimentoNoEscopoUsuario(userId, item)) {
        eventos.push({
          atendimentoId: reg.registroId,
          dataReferencia: reg.dataHora.slice(0, 10),
          tipo: "conclusao_status",
          item,
        });
      }
    }
    if (reg.camposAlterados.includes("retorno_concluido")) {
      const item = porId.get(reg.registroId);
      if (
        item &&
        item.retornoConcluidoPorId === userId &&
        item.retornoConcluidoEm?.trim() &&
        diaDentroDoPeriodo(item.retornoConcluidoEm, de, ate) &&
        atendimentoNoEscopoUsuario(userId, item)
      ) {
        eventos.push({
          atendimentoId: reg.registroId,
          dataReferencia: item.retornoConcluidoEm.slice(0, 10),
          tipo: "conclusao_retorno",
          item,
        });
      }
    }
  }

  for (const item of atendimentosAutoria(userId)) {
    if (
      item.retornoConcluidoPorId === userId &&
      item.retornoConcluidoEm?.trim() &&
      diaDentroDoPeriodo(item.retornoConcluidoEm, de, ate)
    ) {
      const jaTem = eventos.some((ev) => ev.atendimentoId === item.id && ev.tipo === "conclusao_retorno");
      if (!jaTem) {
        eventos.push({
          atendimentoId: item.id,
          dataReferencia: item.retornoConcluidoEm.slice(0, 10),
          tipo: "conclusao_retorno",
          item,
        });
      }
    }
  }

  return eventos.sort(
    (a, b) => a.dataReferencia.localeCompare(b.dataReferencia) || a.atendimentoId.localeCompare(b.atendimentoId),
  );
}

function eventosReabertura(userId: number, de: string, ate: string): EventoReabertura[] {
  const porId = new Map(getCadastros().atendimentos.map((item) => [item.id, item]));
  const eventos: EventoReabertura[] = [];
  for (const reg of auditoriaDoUsuario(userId, de, ate)) {
    if (reg.acao !== "UPDATE") continue;
    const anterior = statusDeAuditoria(reg.dadosAnteriores);
    const novo = statusDeAuditoria(reg.dadosNovos);
    if (anterior === "Resolvido" && novo && novo !== "Resolvido") {
      const item = porId.get(reg.registroId);
      if (item && atendimentoNoEscopoUsuario(userId, item)) {
        eventos.push({
          atendimentoId: reg.registroId,
          dataReferencia: reg.dataHora.slice(0, 10),
          item,
        });
      }
    }
  }
  return eventos;
}

function conclusoesDistintasComReabertura(
  conclusoes: EventoConclusao[],
  reaberturas: EventoReabertura[],
): EventoConclusao[] {
  const porAtendimento = new Map<string, EventoConclusao[]>();
  for (const ev of conclusoes) {
    const lista = porAtendimento.get(ev.atendimentoId) ?? [];
    lista.push(ev);
    porAtendimento.set(ev.atendimentoId, lista);
  }

  const aceitos: EventoConclusao[] = [];
  for (const [atendimentoId, lista] of porAtendimento) {
    const ordenado = [...lista].sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));
    const reabre = reaberturas
      .filter((item) => item.atendimentoId === atendimentoId)
      .map((item) => item.dataReferencia)
      .sort();
    let ultimaConclusao = "";
    for (const ev of ordenado) {
      if (!ultimaConclusao) {
        aceitos.push(ev);
        ultimaConclusao = ev.dataReferencia;
        continue;
      }
      const houveReabertura = reabre.some((dia) => dia >= ultimaConclusao && dia <= ev.dataReferencia);
      if (houveReabertura) {
        aceitos.push(ev);
        ultimaConclusao = ev.dataReferencia;
      }
    }
  }
  return aceitos;
}

function deslocarDias(iso: string, delta: number) {
  const data = new Date(`${iso}T12:00:00`);
  data.setDate(data.getDate() + delta);
  return data.toISOString().slice(0, 10);
}

function diasNoPeriodo(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let cursor = inicio;
  while (cursor <= fim) {
    dias.push(cursor);
    cursor = deslocarDias(cursor, 1);
  }
  return dias;
}

function seriePorDia(eventos: { dataReferencia: string }[], inicio: string, fim: string): SerieDiaMinhaProdutividade[] {
  return diasNoPeriodo(inicio, fim).map((dia) => {
    const valor = eventos.filter((item) => item.dataReferencia === dia).length;
    return { dia, valor, rotulo: String(valor) };
  });
}

export function assertPeriodoMinhaProdutividade(de: string, ate: string) {
  if (!de.trim() || !ate.trim()) {
    throw new MinhaProdutividadeError("Informe o período (data inicial e final).", 400);
  }
  if (de > ate) {
    throw new MinhaProdutividadeError("A data inicial não pode ser posterior à data final.", 400);
  }
}

export function podeAcessarMinhaProdutividade(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "atendimentos", "ler") && !podeAcessarPainelProdutividadeGlobal(userId);
}

function montarRegistro(
  indicador: IndicadorMinhaProdutividadeId,
  item: Atendimento,
  dataReferencia: string,
  tipoEvento: RegistroMinhaProdutividade["tipoEvento"],
): RegistroMinhaProdutividade {
  const rotulo = rotuloAtendimento(item);
  return {
    indicador,
    atendimentoId: item.id,
    dataReferencia,
    tipoEvento,
    ...rotulo,
  };
}

export function listarRegistrosIndicador(
  userId: number,
  indicador: IndicadorMinhaProdutividadeId,
  de: string,
  ate: string,
): RegistroMinhaProdutividade[] {
  if (!podeAcessarMinhaProdutividade(userId)) {
    throw new MinhaProdutividadeError("A produtividade individual é destinada ao perfil de atendente.", 403);
  }
  assertPeriodoMinhaProdutividade(de, ate);
  const realizados = atendimentosAutoria(userId).filter((item) => diaDentroDoPeriodo(item.dataHora, de, ate));
  const conclusoesBrutas = eventosConclusao(userId, de, ate);
  const reaberturas = eventosReabertura(userId, de, ate);
  const conclusoes = conclusoesDistintasComReabertura(conclusoesBrutas, reaberturas);
  const porId = new Map(getCadastros().atendimentos.map((item) => [item.id, item]));

  if (indicador === "atendimentos_realizados" || indicador === "atendimentos_criados") {
    return realizados.map((item) =>
      montarRegistro(indicador, item, item.dataHora.slice(0, 10), "criado"),
    );
  }

  if (indicador === "atendimentos_pendentes") {
    return realizados
      .filter((item) => item.status === "Pendente")
      .map((item) => montarRegistro(indicador, item, item.dataHora.slice(0, 10), "pendente"));
  }

  if (indicador === "atendimentos_concluidos" || indicador === "conclusoes_efetivas") {
    const ids = new Set<string>();
    const lista: RegistroMinhaProdutividade[] = [];
    for (const ev of conclusoes) {
      if (indicador === "atendimentos_concluidos" && ids.has(ev.atendimentoId)) continue;
      if (indicador === "atendimentos_concluidos") ids.add(ev.atendimentoId);
      lista.push(montarRegistro(indicador, ev.item, ev.dataReferencia, ev.tipo));
    }
    return lista;
  }

  if (indicador === "retornos_realizados") {
    return conclusoesBrutas
      .filter((ev) => ev.tipo === "conclusao_retorno")
      .map((ev) => montarRegistro(indicador, ev.item, ev.dataReferencia, "conclusao_retorno"));
  }

  if (indicador === "atendimentos_reabertos") {
    return reaberturas.map((ev) => montarRegistro(indicador, ev.item, ev.dataReferencia, "reabertura"));
  }

  if (indicador === "atendimentos_movimentados") {
    const registros: RegistroMinhaProdutividade[] = [];
    for (const reg of auditoriaDoUsuario(userId, de, ate)) {
      if (reg.acao !== "UPDATE") continue;
      const item = porId.get(reg.registroId);
      if (!item || !atendimentoNoEscopoUsuario(userId, item)) continue;
      registros.push(montarRegistro(indicador, item, reg.dataHora.slice(0, 10), "movimentado"));
    }
    return registros;
  }

  return [];
}

export function montarPainelMinhaProdutividade(userId: number, de: string, ate: string): PainelMinhaProdutividade {
  if (!podeAcessarMinhaProdutividade(userId)) {
    throw new MinhaProdutividadeError("A produtividade individual é destinada ao perfil de atendente.", 403);
  }
  assertPeriodoMinhaProdutividade(de, ate);

  const usuario = getCadastros().usuarios.find((item) => item.id === userId);
  const codigoRe = usuario ? codigoReDoUsuario(usuario) : null;

  const realizados = atendimentosAutoria(userId).filter((item) => diaDentroDoPeriodo(item.dataHora, de, ate));
  const conclusoesBrutas = eventosConclusao(userId, de, ate);
  const reaberturas = eventosReabertura(userId, de, ate);
  const conclusoes = conclusoesDistintasComReabertura(conclusoesBrutas, reaberturas);
  const concluidosIds = new Set(conclusoes.map((item) => item.atendimentoId));

  const retornos = conclusoesBrutas.filter((item) => item.tipo === "conclusao_retorno");
  const movimentados = auditoriaDoUsuario(userId, de, ate).filter((item) => item.acao === "UPDATE").length;

  const realizadosEventos = realizados.map((item) => ({ dataReferencia: item.dataHora.slice(0, 10) }));
  const concluidosEventos = conclusoes.map((item) => ({ dataReferencia: item.dataReferencia }));

  const totalRealizados = realizados.length;
  const totalConcluidos = concluidosIds.size;
  const percentual = totalRealizados > 0 ? (totalConcluidos / totalRealizados) * 100 : null;

  const indicadores: Record<IndicadorMinhaProdutividadeId, number> = {
    atendimentos_realizados: totalRealizados,
    atendimentos_criados: totalRealizados,
    atendimentos_movimentados: movimentados,
    conclusoes_efetivas: conclusoes.length,
    atendimentos_concluidos: totalConcluidos,
    atendimentos_pendentes: realizados.filter((item) => item.status === "Pendente").length,
    retornos_realizados: retornos.length,
    atendimentos_reabertos: reaberturas.length,
  };

  return {
    codigoRe,
    periodo: {
      de,
      ate,
      rotulo: `${formatarData(de)} a ${formatarData(ate)}`,
    },
    indicadores,
    taxaConclusao: { percentual, formula: FORMULA_TAXA_CONCLUSAO },
    graficos: {
      atendimentosRealizados: seriePorDia(realizadosEventos, de, ate),
      atendimentosConcluidos: seriePorDia(concluidosEventos, de, ate),
    },
    definicoes: DEFINICOES_MINHA_PRODUTIVIDADE,
    meta: {
      geradoEm: geradoEmBr(),
      filtros: [
        `Período: ${formatarData(de)} a ${formatarData(ate)}`,
        codigoRe ? `RE: ${codigoRe}` : "RE: —",
        `Referência: ${hojeIso()}`,
      ],
    },
  };
}
