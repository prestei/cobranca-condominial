import {
  agoraIso,
  type DecisaoProximoPassoNegociacao,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { encerrarCarteiraVigente } from "@/lib/atendimentos/encerrar-carteira-vigente";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findOpenAssignmentByUnit } from "@/lib/db/repositories/collection-repository";
import {
  createNextStepDecision,
  findNextStepDecisionByIdempotencyKey,
  findNextStepDecisionByProposalId,
} from "@/lib/db/repositories/negotiation-next-step-repository";
import {
  findNegotiationProposalById,
  updateNegotiationProposal,
} from "@/lib/db/repositories/negotiation-repository";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re-server";
import { criarEncaminhamentoJuridico, JuridicoServiceError } from "@/lib/juridico/service";
import { validarCombinacaoProximoPasso, rotuloAcaoProximoPassoNegociacao } from "@/lib/negociacoes/next-step-decision-labels";
import { assertCarteiraParaRegistrar, obterPropostaNegociacao, PropostaNegociacaoServiceError } from "@/lib/negociacoes/service";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

export class NegociacaoProximoPassoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type NegociacaoProximoPassoInput = {
  acao: string;
  confirmado: boolean;
  idempotencyKey: string;
  observacoes?: string;
  destinoAnalise?: string;
  advogadoResponsavel?: string;
  resumoContexto?: string;
};

export type NegociacaoProximoPassoResumo = {
  unidadeIdentificacao: string;
  condominioNome: string;
  valorNegociado: string;
  atendenteRe: string;
  destino: string;
  acaoRotulo: string;
};

export type NegociacaoProximoPassoResultado = {
  decisao: DecisaoProximoPassoNegociacao;
  proposta: PropostaNegociacao;
  resumo: NegociacaoProximoPassoResumo;
};

const ultimasDecisoes = new Map<string, number>();
const JANELA_DEDUPE_MS = 4_000;

function assertNaoDuplicadoRecente(chave: string) {
  const agora = Date.now();
  const anterior = ultimasDecisoes.get(chave);
  if (anterior != null && agora - anterior < JANELA_DEDUPE_MS) {
    throw new NegociacaoProximoPassoError(
      "Operação já enviada. Aguarde a confirmação antes de tentar novamente.",
      409,
    );
  }
  ultimasDecisoes.set(chave, agora);
}

async function montarDestino(
  acao: DecisaoProximoPassoNegociacao["acao"],
  proposta: PropostaNegociacao,
  input: NegociacaoProximoPassoInput,
): Promise<{ destinoRotulo: string; responsavelUsuarioId: number | null }> {
  const cadastros = await loadCadastrosForScope();
  if (acao === "continue_service") {
    const vigente = await findOpenAssignmentByUnit(proposta.unidadeId);
    const atendente = vigente ? cadastros.usuarios.find((item) => item.id === vigente.atendenteId) : undefined;
    const re = atendente ? codigoReDoUsuario(atendente) : null;
    return {
      destinoRotulo: re ? `Carteira do atendente (${re})` : "Carteira do atendente",
      responsavelUsuarioId: vigente?.atendenteId ?? null,
    };
  }
  if (acao === "forward_negotiation_queue") {
    const advogado =
      proposta.advogadoResponsavelId != null
        ? identificadorColaboradorPorId(proposta.advogadoResponsavelId, cadastros)
        : "Advogado do condomínio";
    return {
      destinoRotulo: `Fila de negociação · ${advogado}`,
      responsavelUsuarioId: proposta.advogadoResponsavelId,
    };
  }
  const destino = input.destinoAnalise?.trim();
  if (destino === "juridico") {
    const nomeAdv = (input.advogadoResponsavel ?? "").trim();
    return {
      destinoRotulo: nomeAdv ? `Análise jurídica · ${nomeAdv}` : "Análise jurídica",
      responsavelUsuarioId: null,
    };
  }
  const advId = proposta.advogadoResponsavelId;
  const rotulo =
    advId != null ? identificadorColaboradorPorId(advId, cadastros) : "Advogado responsável";
  return { destinoRotulo: `Análise · ${rotulo}`, responsavelUsuarioId: advId };
}

export async function montarResumoProximoPassoNegociacao(
  userId: number,
  propostaId: string,
  input: Pick<NegociacaoProximoPassoInput, "acao" | "destinoAnalise" | "advogadoResponsavel">,
): Promise<NegociacaoProximoPassoResumo> {
  const validacao = validarCombinacaoProximoPasso(input.acao, input.destinoAnalise);
  if (!validacao.ok) {
    throw new NegociacaoProximoPassoError(validacao.mensagem, 400);
  }

  const proposta = await obterPropostaNegociacao(userId, propostaId);
  const cadastros = await loadCadastrosForScope();
  const unidade = cadastros.unidades.find((item) => item.id === proposta.unidadeId);
  const condominio = cadastros.condominios.find((item) => item.id === proposta.condominioId);
  const { destinoRotulo } = await montarDestino(validacao.acao, proposta, input);

  return {
    unidadeIdentificacao: unidade?.identificacao ?? String(proposta.unidadeId),
    condominioNome: condominio?.nome ?? "—",
    valorNegociado: proposta.valorProposto,
    atendenteRe: identificadorColaboradorPorId(proposta.usuarioId, cadastros),
    destino: destinoRotulo,
    acaoRotulo: rotuloAcaoProximoPassoNegociacao(validacao.acao),
  };
}

export async function confirmarProximoPassoNegociacao(
  userId: number,
  propostaId: string,
  input: NegociacaoProximoPassoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<NegociacaoProximoPassoResultado> {
  if (!input.confirmado) {
    throw new NegociacaoProximoPassoError("Confirme a ação antes de prosseguir.", 400);
  }
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new NegociacaoProximoPassoError("Chave de confirmação inválida.", 400);
  }

  const existenteIdempotencia = await findNextStepDecisionByIdempotencyKey(idempotencyKey);
  if (existenteIdempotencia) {
    const proposta = await findNegotiationProposalById(existenteIdempotencia.propostaId);
    if (!proposta) {
      throw new NegociacaoProximoPassoError("Proposta não encontrada.", 404);
    }
    const resumo = await montarResumoProximoPassoNegociacao(userId, proposta.id, input);
    return { decisao: existenteIdempotencia, proposta, resumo };
  }

  const validacao = validarCombinacaoProximoPasso(input.acao, input.destinoAnalise);
  if (!validacao.ok) {
    throw new NegociacaoProximoPassoError(validacao.mensagem, 400);
  }

  assertNaoDuplicadoRecente(`${userId}:${propostaId}:${validacao.acao}`);

  const existente = await findNextStepDecisionByProposalId(propostaId);
  if (existente) {
    throw new NegociacaoProximoPassoError(
      "Esta proposta já teve o próximo passo definido. Atualize a página.",
      409,
    );
  }

  const proposta = await obterPropostaNegociacao(userId, propostaId);
  await assertCarteiraParaRegistrar(userId, proposta.unidadeId);

  const perm = await resolverPermissoesUsuario(userId);
  const podeAtendimento = temPermissao(perm, "atendimentos", "criar");
  if (!podeAtendimento) {
    throw new NegociacaoProximoPassoError("Sem permissão para definir o próximo passo.", 403);
  }

  if (validacao.acao === "forward_analysis" && validacao.destinoAnalise === "juridico") {
    if (!temPermissao(perm, "juridico", "criar")) {
      throw new NegociacaoProximoPassoError(
        "Sem permissão para encaminhar para análise jurídica.",
        403,
      );
    }
  }

  const { destinoRotulo, responsavelUsuarioId } = await montarDestino(validacao.acao, proposta, input);
  const observacoes = (input.observacoes ?? "").trim();
  let encaminhamentoJuridicoId = "";
  const agora = agoraIso();

  if (validacao.acao === "forward_analysis" && validacao.destinoAnalise === "juridico") {
    try {
      const encaminhamento = await criarEncaminhamentoJuridico(
        userId,
        {
          condominioId: proposta.condominioId,
          unidadeId: proposta.unidadeId,
          advogadoResponsavel: input.advogadoResponsavel,
          observacoes,
          resumoContexto:
            input.resumoContexto?.trim() ||
            `Proposta de negociação ${proposta.id} · valor ${proposta.valorProposto}`,
          debitoIds: proposta.debitoIds,
        },
        meta,
      );
      encaminhamentoJuridicoId = encaminhamento.id;
    } catch (error) {
      if (error instanceof JuridicoServiceError) {
        throw new NegociacaoProximoPassoError(error.message, error.status, error.detalhes);
      }
      throw error;
    }
    await encerrarCarteiraVigente(
      userId,
      proposta.unidadeId,
      `Encaminhamento para análise jurídica (proposta ${proposta.id})`,
      meta,
    );
  }

  if (validacao.acao === "forward_negotiation_queue") {
    const atualizada: PropostaNegociacao = {
      ...proposta,
      filaNegociacaoEm: agora,
      filaNegociacaoPorId: userId,
    };
    await updateNegotiationProposal(atualizada);
    await encerrarCarteiraVigente(
      userId,
      proposta.unidadeId,
      `Encaminhado para fila de negociação (proposta ${proposta.id})`,
      meta,
    );
  }

  if (validacao.acao === "forward_analysis" && validacao.destinoAnalise === "lawyer_negotiation") {
    await encerrarCarteiraVigente(
      userId,
      proposta.unidadeId,
      `Encaminhado para análise do advogado (proposta ${proposta.id})`,
      meta,
    );
  }

  const decisao: DecisaoProximoPassoNegociacao = {
    id: crypto.randomUUID(),
    propostaId: proposta.id,
    condominioId: proposta.condominioId,
    unidadeId: proposta.unidadeId,
    usuarioId: userId,
    decididoEm: agora,
    acao: validacao.acao,
    destinoAnalise: validacao.destinoAnalise ?? "",
    destinoRotulo,
    responsavelUsuarioId,
    encaminhamentoJuridicoId,
    observacoes,
    idempotencyKey,
  };

  const salva = await createNextStepDecision(decisao);
  await writeAuditLog({
    entity: "negotiation_next_step_decision",
    recordId: salva.id,
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({
      propostaId: salva.propostaId,
      acao: salva.acao,
      destino: salva.destinoRotulo,
      responsavelUsuarioId: salva.responsavelUsuarioId,
    }),
    changedFields: "acao, destino, proposta_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  const propostaAtualizada = (await findNegotiationProposalById(propostaId)) ?? proposta;
  const resumo = await montarResumoProximoPassoNegociacao(userId, propostaId, input);

  return { decisao: salva, proposta: propostaAtualizada, resumo };
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}