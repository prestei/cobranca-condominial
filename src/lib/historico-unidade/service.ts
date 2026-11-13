import {
  debitoEmAberto,
  escopoCondominios,
  formatarData,
  formatarMoeda,
  type Atendimento,
  type AtribuicaoCobranca,
  type Cadastros,
  type Debito,
  type PagamentoAcordo,
  type EncaminhamentoJuridico,
  type PropostaNegociacao,
  type Unidade,
} from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { calcularResumoAcordo, type ResumoAcordo } from "@/lib/acordos/resumo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re-server";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class HistoricoUnidadeServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type HistoricoUnidadeReferencia = {
  unidade: {
    id: number;
    condominioId: number;
    identificacao: string;
    bloco: string;
    tipo: string;
    status: string;
    situacao: string;
  };
  condominio: {
    id: number;
    nome: string;
  };
  cobranca: {
    situacao: string;
    reResponsavel: string | null;
    totalTentativas: number;
    ultimoContato: string | null;
    debitosAbertos: number;
    valorAberto: number;
  };
  debitos: Array<{
    id: number;
    referencia: string;
    status: string;
    dataVencimento: string;
    valorAtualizado: string;
  }>;
};

export type EventoHistoricoUnidade = {
  id: string;
  tipo:
    | "tentativa"
    | "retorno_concluido"
    | "redistribuicao"
    | "pagamento"
    | "pagamento_acordo"
    | "negociacao"
    | "encaminhamento_juridico"
    | "correcao_atendimento"
    | "correcao_unidade"
    | "correcao_proposta"
    | "correcao_juridico";
  origem:
    | "service_ticket"
    | "collection_assignment"
    | "debt"
    | "negotiation_proposal"
    | "agreement_payment"
    | "legal_case_referral"
    | "audit_log"
    | "unit";
  dataHora: string;
  ator: string;
  atorPerfil: "atendente" | "administradora" | "advogado" | "outro";
  titulo: string;
  meio?: string;
  resultado?: string;
  motivo?: string;
  observacao?: string;
  proximoPasso?: string;
  registroOrigemId?: string;
};

export type HistoricoUnidadeResposta = {
  referencia: HistoricoUnidadeReferencia;
  eventos: EventoHistoricoUnidade[];
};

function usuarioVeCarteiraGeral(userId: number, cadastros: Cadastros) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  return temPermissao(perm, "usuarios", "criar");
}

function atribuicaoVigente(cadastros: Cadastros, unidadeId: number): AtribuicaoCobranca | undefined {
  return cadastros.atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function idsCondominioNoEscopo(userId: number, cadastros: Cadastros): Set<number> {
  return new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
}

export function podeConsultarHistoricoUnidade(userId: number, cadastros: Cadastros = getCadastros()) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  return temPermissao(perm, "unidades", "ler") || temPermissao(perm, "atendimentos", "ler");
}

function assertAcessoHistorico(userId: number, unidade: Unidade, cadastros: Cadastros) {
  if (!podeConsultarHistoricoUnidade(userId, cadastros)) {
    throw new HistoricoUnidadeServiceError("Sem permissão para consultar o histórico da unidade.", 403);
  }
  const ids = idsCondominioNoEscopo(userId, cadastros);
  if (!ids.has(unidade.condominioId)) {
    throw new HistoricoUnidadeServiceError("Unidade fora do seu escopo de acesso.", 403);
  }
  const perm = permissoesDoUsuarioId(userId, cadastros);
  if (!temPermissao(perm, "unidades", "ler") && !usuarioVeCarteiraGeral(userId, cadastros)) {
    const vigente = atribuicaoVigente(cadastros, unidade.id);
    if (!vigente || vigente.atendenteId !== userId) {
      throw new HistoricoUnidadeServiceError(
        "Esta unidade não está na sua carteira. Consulte a administradora.",
        403,
      );
    }
  }
}

function rotuloAutor(
  userId: number,
  cadastros: Cadastros,
): { ator: string; atorPerfil: EventoHistoricoUnidade["atorPerfil"] } {
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (!usuario) {
    return { ator: "—", atorPerfil: "outro" };
  }
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  const re = codigoReDoUsuario(usuario);
  if (re) {
    return { ator: re, atorPerfil: "atendente" };
  }
  if (cargo?.nome === "Advogado") {
    return { ator: usuario.nome.trim() || "Advogado", atorPerfil: "advogado" };
  }
  if (cargo?.nome === "Administrador") {
    return { ator: "Administradora", atorPerfil: "administradora" };
  }
  return { ator: usuario.nome.trim() || "Colaborador", atorPerfil: "outro" };
}

function rotuloDataProximaAcao(data: string) {
  const limpa = data.trim();
  if (!limpa) return "";
  return formatarData(limpa);
}

function resultadoTentativa(atendimento: Atendimento) {
  const partes = [atendimento.respondeu === "Sim" ? "Respondeu" : "Sem resposta"];
  if (atendimento.motivo.trim()) partes.push(atendimento.motivo);
  partes.push(atendimento.status);
  return partes.join(" · ");
}

function eventosDeTentativa(atendimento: Atendimento, cadastros: Cadastros): EventoHistoricoUnidade[] {
  const { ator, atorPerfil } = rotuloAutor(atendimento.usuarioId, cadastros);
  const eventos: EventoHistoricoUnidade[] = [
    {
      id: `tentativa-${atendimento.id}`,
      tipo: "tentativa",
      origem: "service_ticket",
      dataHora: atendimento.dataHora,
      ator,
      atorPerfil,
      titulo: atendimento.assunto.trim() || "Tentativa de cobrança",
      meio: atendimento.canal,
      resultado: resultadoTentativa(atendimento),
      motivo: atendimento.motivo || undefined,
      observacao: atendimento.descricao || undefined,
      proximoPasso:
        atendimento.dataProximaAcao.trim() && atendimento.proximaAcao.trim()
          ? `${atendimento.proximaAcao} (${rotuloDataProximaAcao(atendimento.dataProximaAcao)})`
          : atendimento.dataProximaAcao.trim()
            ? rotuloDataProximaAcao(atendimento.dataProximaAcao)
            : atendimento.proximaAcao.trim() || undefined,
      registroOrigemId: atendimento.id,
    },
  ];

  if (atendimento.retornoConcluidoEm?.trim() && atendimento.retornoConcluidoPorId) {
    const conclusao = rotuloAutor(atendimento.retornoConcluidoPorId, cadastros);
    eventos.push({
      id: `retorno-${atendimento.id}`,
      tipo: "retorno_concluido",
      origem: "service_ticket",
      dataHora: atendimento.retornoConcluidoEm,
      ator: conclusao.ator,
      atorPerfil: conclusao.atorPerfil,
      titulo: "Retorno agendado realizado",
      observacao: atendimento.dataProximaAcao.trim()
        ? `Agendamento original: ${rotuloDataProximaAcao(atendimento.dataProximaAcao)}`
        : undefined,
      registroOrigemId: atendimento.id,
    });
  }

  return eventos;
}

function eventoRedistribuicao(registro: AtribuicaoCobranca, cadastros: Cadastros): EventoHistoricoUnidade {
  const reAtual = rotuloAutor(registro.atendenteId, cadastros);
  const reAnterior =
    registro.anteriorAtendenteId != null ? rotuloAutor(registro.anteriorAtendenteId, cadastros).ator : null;
  const { ator, atorPerfil } = rotuloAutor(registro.atribuidoPorId, cadastros);
  const titulo = registro.anteriorAtendenteId ? "Redistribuição de cobrança" : "Atribuição de cobrança";
  const observacao = [
    reAnterior ? `De ${reAnterior} para ${reAtual.ator}` : `Responsável: ${reAtual.ator}`,
    registro.motivo.trim() ? registro.motivo : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `atribuicao-${registro.id}`,
    tipo: "redistribuicao",
    origem: "collection_assignment",
    dataHora: registro.atribuidoEm,
    ator,
    atorPerfil,
    titulo,
    observacao: observacao || undefined,
    registroOrigemId: String(registro.id),
  };
}

function eventoEncaminhamentoJuridico(
  encaminhamento: EncaminhamentoJuridico,
  cadastros: Cadastros,
): EventoHistoricoUnidade {
  const { ator, atorPerfil } = rotuloAutor(encaminhamento.usuarioId, cadastros);
  const observacao = [
    encaminhamento.resumoContexto.trim(),
    encaminhamento.observacoes.trim(),
    encaminhamento.debitoIds.length > 0 ? `Débitos: ${encaminhamento.debitoIds.join(", ")}` : "",
    `Advogado: ${encaminhamento.advogadoResponsavel}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `juridico-${encaminhamento.id}`,
    tipo: "encaminhamento_juridico",
    origem: "legal_case_referral",
    dataHora: encaminhamento.encaminhadoEm,
    ator,
    atorPerfil,
    titulo: "Encaminhamento jurídico",
    resultado: `Status: ${encaminhamento.status}`,
    observacao: observacao || undefined,
    registroOrigemId: encaminhamento.id,
  };
}

function eventoPropostaNegociacao(proposta: PropostaNegociacao, cadastros: Cadastros): EventoHistoricoUnidade {
  const { ator, atorPerfil } = rotuloAutor(proposta.usuarioId, cadastros);
  const titulo =
    proposta.status === "Aceita"
      ? "Acordo confirmado"
      : proposta.status === "Recusada"
        ? "Proposta recusada"
        : proposta.status === "Cancelada"
          ? "Proposta cancelada"
          : "Proposta de negociação";
  const resultado = `Status: ${proposta.status} · Valor proposto: ${formatarMoeda(proposta.valorProposto)}`;
  const observacao = [
    proposta.observacoes.trim(),
    proposta.termosAprovados.trim() ? `Termos: ${proposta.termosAprovados.trim()}` : "",
    proposta.debitoIds.length > 0 ? `Débitos: ${proposta.debitoIds.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `proposta-${proposta.id}`,
    tipo: "negociacao",
    origem: "negotiation_proposal",
    dataHora: proposta.status === "Aceita" && proposta.acordoConfirmadoEm.trim() ? proposta.acordoConfirmadoEm : proposta.criadoEm,
    ator,
    atorPerfil,
    titulo,
    resultado,
    observacao: observacao || undefined,
    registroOrigemId: proposta.id,
  };
}

function dataHoraAlertaDescumprimento(resumo: ResumoAcordo): string {
  const vencidas = resumo.parcelas.filter((item) => item.status === "Vencida");
  if (vencidas.length === 0) return new Date().toISOString();
  const ultima = [...vencidas].sort((a, b) => b.vencimentoEm.localeCompare(a.vencimentoEm))[0];
  return `${ultima.vencimentoEm}T23:59:59.000Z`;
}

function eventoPagamentoAcordo(pagamento: PagamentoAcordo, cadastros: Cadastros): EventoHistoricoUnidade {
  const { ator, atorPerfil } = rotuloAutor(pagamento.registradoPorId, cadastros);
  return {
    id: `pagamento-acordo-${pagamento.id}`,
    tipo: "pagamento_acordo",
    origem: "agreement_payment",
    dataHora: pagamento.dataPagamento,
    ator,
    atorPerfil,
    titulo: `Pagamento de acordo (${pagamento.confirmacao})`,
    resultado: `Valor: ${formatarMoeda(pagamento.valor)}`,
    observacao: pagamento.referenciaComprovante.trim()
      ? `Ref.: ${pagamento.referenciaComprovante.trim()}`
      : undefined,
    registroOrigemId: pagamento.id,
  };
}

function eventoPagamento(debito: Debito): EventoHistoricoUnidade | null {
  if (debito.status !== "Pago") return null;
  const dataHora = debito.dataPagamento.trim();
  if (!dataHora) return null;
  return {
    id: `pagamento-${debito.id}`,
    tipo: "pagamento",
    origem: "debt",
    dataHora,
    ator: "Registro financeiro",
    atorPerfil: "outro",
    titulo: `Pagamento — ${debito.referencia}`,
    resultado: debito.valorPago.trim()
      ? `Valor pago: ${formatarMoeda(debito.valorPago)}`
      : `Valor: ${formatarMoeda(debito.valorAtualizado || debito.valor)}`,
    registroOrigemId: String(debito.id),
  };
}

function observacaoAlteracaoSituacaoCobranca(registro: { dadosAnteriores: string; dadosNovos: string }): string | null {
  try {
    const anterior = JSON.parse(registro.dadosAnteriores) as { situacao?: string };
    const novo = JSON.parse(registro.dadosNovos) as { situacao?: string };
    const de = anterior.situacao?.trim() || "—";
    const para = novo.situacao?.trim() || "—";
    if (de === para) return null;
    return `Situação de cobrança: ${de} → ${para}`;
  } catch {
    return null;
  }
}

function eventosAuditoriaUnidade(
  unidadeId: number,
  idsAtendimento: Set<string>,
  idsProposta: Set<string>,
  idsEncaminhamento: Set<string>,
  cadastros: Cadastros,
): EventoHistoricoUnidade[] {
  const eventos: EventoHistoricoUnidade[] = [];
  for (const registro of cadastros.auditoria) {
    if (registro.acao !== "UPDATE") continue;

    if (registro.entidade === "negotiation_proposal" && idsProposta.has(registro.registroId)) {
      if (!registro.camposAlterados.includes("status")) continue;
      const userId = Number(registro.usuarioId);
      const { ator, atorPerfil } = Number.isFinite(userId)
        ? rotuloAutor(userId, cadastros)
        : { ator: "—", atorPerfil: "outro" as const };
      eventos.push({
        id: `audit-proposta-${registro.id}`,
        tipo: "correcao_proposta",
        origem: "audit_log",
        dataHora: registro.dataHora,
        ator,
        atorPerfil,
        titulo: "Alteração de status da proposta",
        observacao: registro.camposAlterados.replaceAll("_", " "),
        registroOrigemId: registro.registroId,
      });
      continue;
    }

    if (registro.entidade === "service_ticket" && idsAtendimento.has(registro.registroId)) {
      if (registro.camposAlterados.includes("retorno_concluido")) continue;
      const userId = Number(registro.usuarioId);
      const { ator, atorPerfil } = Number.isFinite(userId)
        ? rotuloAutor(userId, cadastros)
        : { ator: "—", atorPerfil: "outro" as const };
      eventos.push({
        id: `audit-ticket-${registro.id}`,
        tipo: "correcao_atendimento",
        origem: "audit_log",
        dataHora: registro.dataHora,
        ator,
        atorPerfil,
        titulo: "Correção de atendimento",
        observacao: registro.camposAlterados.replaceAll("_", " "),
        registroOrigemId: registro.registroId,
      });
      continue;
    }

    if (registro.entidade === "legal_case_referral" && idsEncaminhamento.has(registro.registroId)) {
      if (
        !registro.camposAlterados.includes("status") &&
        !registro.camposAlterados.includes("advogado_responsavel")
      ) {
        continue;
      }
      const userId = Number(registro.usuarioId);
      const { ator, atorPerfil } = Number.isFinite(userId)
        ? rotuloAutor(userId, cadastros)
        : { ator: "—", atorPerfil: "outro" as const };
      eventos.push({
        id: `audit-juridico-${registro.id}`,
        tipo: "correcao_juridico",
        origem: "audit_log",
        dataHora: registro.dataHora,
        ator,
        atorPerfil,
        titulo: "Alteração no acompanhamento jurídico",
        observacao: registro.camposAlterados.replaceAll("_", " "),
        registroOrigemId: registro.registroId,
      });
      continue;
    }

    if (registro.entidade === "unit" && registro.registroId === String(unidadeId)) {
      const userId = Number(registro.usuarioId);
      const { ator, atorPerfil } = Number.isFinite(userId)
        ? rotuloAutor(userId, cadastros)
        : { ator: "—", atorPerfil: "outro" as const };
      const alteracaoSituacao = registro.camposAlterados.includes("situacao")
        ? observacaoAlteracaoSituacaoCobranca(registro)
        : null;
      eventos.push({
        id: `audit-unit-${registro.id}`,
        tipo: "correcao_unidade",
        origem: "audit_log",
        dataHora: registro.dataHora,
        ator,
        atorPerfil,
        titulo: alteracaoSituacao ? "Alteração da situação de cobrança" : "Correção cadastral da unidade",
        observacao: alteracaoSituacao ?? registro.camposAlterados.replaceAll("_", " "),
        registroOrigemId: registro.registroId,
      });
    }
  }
  return eventos;
}

function ordenarEventos(a: EventoHistoricoUnidade, b: EventoHistoricoUnidade) {
  const cmp = a.dataHora.localeCompare(b.dataHora);
  if (cmp !== 0) return cmp;
  return a.id.localeCompare(b.id);
}

export async function obterHistoricoUnidade(
  userId: number,
  unidadeId: number,
  cadastros?: Cadastros,
): Promise<HistoricoUnidadeResposta> {
  const base = cadastros ?? (await loadFullOperationalCadastros());
  const unidade = base.unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new HistoricoUnidadeServiceError("Unidade não encontrada.", 404);
  }
  assertAcessoHistorico(userId, unidade, base);
  const condominio = base.condominios.find((item) => item.id === unidade.condominioId);
  const atendimentos = base.atendimentos.filter((item) => Number(item.unidadeId) === unidadeId);
  const debitos = base.debitos.filter((item) => item.unidadeId === unidadeId);
  const debitosAbertos = debitos.filter(debitoEmAberto);
  const valorAberto = debitosAbertos.reduce((sum, item) => sum + Number(item.valorAtualizado || 0), 0);
  const ultimoContato =
    atendimentos.length > 0
      ? [...atendimentos].sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0]?.dataHora ?? null
      : null;

  const vigente = atribuicaoVigente(base, unidadeId);
  const usuarioVigente =
    vigente != null ? base.usuarios.find((item) => item.id === vigente.atendenteId) : undefined;
  const reResponsavel = usuarioVigente ? codigoReDoUsuario(usuarioVigente) : null;

  const referencia: HistoricoUnidadeReferencia = {
    unidade: {
      id: unidade.id,
      condominioId: unidade.condominioId,
      identificacao: unidade.identificacao,
      bloco: unidade.bloco,
      tipo: unidade.tipo,
      status: unidade.status,
      situacao: unidade.situacao,
    },
    condominio: {
      id: unidade.condominioId,
      nome: condominio?.nome ?? "—",
    },
    cobranca: {
      situacao: unidade.situacao,
      reResponsavel,
      totalTentativas: atendimentos.length,
      ultimoContato,
      debitosAbertos: debitosAbertos.length,
      valorAberto,
    },
    debitos: [...debitos]
      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
      .map((item) => ({
        id: item.id,
        referencia: item.referencia,
        status: item.status,
        dataVencimento: item.dataVencimento,
        valorAtualizado: item.valorAtualizado,
      })),
  };

  const propostas = base.propostasNegociacao.filter((item) => item.unidadeId === unidadeId);
  const encaminhamentos = base.encaminhamentosJuridicos.filter((item) => item.unidadeId === unidadeId);
  const idsAtendimento = new Set(atendimentos.map((item) => item.id));
  const idsProposta = new Set(propostas.map((item) => item.id));
  const idsEncaminhamento = new Set(encaminhamentos.map((item) => item.id));
  const eventos: EventoHistoricoUnidade[] = [];

  for (const atendimento of atendimentos) {
    eventos.push(...eventosDeTentativa(atendimento, base));
  }

  for (const registro of base.atribuicoesCobranca.filter((item) => item.unidadeId === unidadeId)) {
    eventos.push(eventoRedistribuicao(registro, base));
  }

  for (const encaminhamento of encaminhamentos) {
    eventos.push(eventoEncaminhamentoJuridico(encaminhamento, base));
  }

  for (const proposta of propostas) {
    eventos.push(eventoPropostaNegociacao(proposta, base));
    if (proposta.status === "Aceita") {
      const parcelas = base.parcelasAcordo.filter((item) => item.propostaId === proposta.id);
      const pagamentosAcordo = base.pagamentosAcordo.filter((item) => item.propostaId === proposta.id);
      const resumo = calcularResumoAcordo(proposta, parcelas, pagamentosAcordo);
      if (resumo.potencialDescumprimento) {
        eventos.push({
          id: `acordo-alerta-${proposta.id}`,
          tipo: "negociacao",
          origem: "negotiation_proposal",
          dataHora: dataHoraAlertaDescumprimento(resumo),
          ator: "Sistema",
          atorPerfil: "outro",
          titulo: "Acordo — potencial descumprimento",
          resultado: `${resumo.parcelasVencidas} parcela(s) vencida(s) sem quitação confirmada`,
          observacao: "Indício operacional; não marca acordo como quebrado.",
          registroOrigemId: proposta.id,
        });
      }
    }
  }

  for (const pagamento of base.pagamentosAcordo.filter((item) => item.unidadeId === unidadeId)) {
    eventos.push(eventoPagamentoAcordo(pagamento, base));
  }

  for (const debito of debitos) {
    const pagamento = eventoPagamento(debito);
    if (pagamento) eventos.push(pagamento);
  }

  eventos.push(...eventosAuditoriaUnidade(unidadeId, idsAtendimento, idsProposta, idsEncaminhamento, base));

  eventos.sort(ordenarEventos);

  return { referencia, eventos };
}
