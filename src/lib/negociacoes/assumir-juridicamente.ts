import { agoraIso, type PropostaNegociacao } from "@/data/catalogo";
import { calcularResumoAcordo } from "@/lib/acordos/resumo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  listAgreementInstallmentsByProposal,
  listAgreementPayments,
  registrarAssuncaoJuridicaProposta,
} from "@/lib/db/repositories/negotiation-repository";
import { criarEncaminhamentoAssuncaoAdvogado, JuridicoServiceError } from "@/lib/juridico/service";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";
import {
  negociacaoExigeIntervencaoAdvogado,
  propostaJaAssumidaJuridicamente,
} from "@/lib/negociacoes/intervencao-advogado-juridico";
import {
  PropostaNegociacaoServiceError,
  obterPropostaNegociacao,
} from "@/lib/negociacoes/service";

export class AssumirJuridicamenteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

function motivoAssuncao(proposta: PropostaNegociacao, parcelasVencidas: number): string {
  if (proposta.status === "Em análise") {
    return "Análise de condições e pendências da proposta";
  }
  if (parcelasVencidas > 0) {
    return "Avaliação de descumprimento do acordo (parcelas em atraso)";
  }
  return "Acompanhamento jurídico do acordo aceito";
}

export async function assumirJuridicamenteNegociacao(
  userId: number,
  propostaId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<{ proposta: PropostaNegociacao; encaminhamentoId: string }> {
  const perm = await resolverPermissoesUsuario(userId);
  if (resolverPerfilOperacional(perm) !== "advogado") {
    throw new AssumirJuridicamenteError("Apenas advogados podem assumir juridicamente.", 403);
  }
  if (!temPermissao(perm, "juridico", "editar")) {
    throw new AssumirJuridicamenteError("Sem permissão para assumir juridicamente.", 403);
  }
  if (!temPermissao(perm, "negociacoes", "ler")) {
    throw new AssumirJuridicamenteError("Sem permissão para consultar negociações.", 403);
  }

  const proposta = await obterPropostaNegociacao(userId, propostaId);

  if (propostaJaAssumidaJuridicamente(proposta)) {
    throw new AssumirJuridicamenteError("Esta negociação já foi assumida juridicamente.", 409);
  }

  const parcelas = await listAgreementInstallmentsByProposal(proposta.id);
  const pagamentos = (await listAgreementPayments()).filter((item) => item.propostaId === proposta.id);
  const resumo =
    proposta.status === "Aceita"
      ? calcularResumoAcordo(proposta, parcelas, pagamentos)
      : null;

  if (!negociacaoExigeIntervencaoAdvogado(proposta, resumo)) {
    throw new AssumirJuridicamenteError(
      "Esta negociação não exige intervenção jurídica no momento.",
      409,
    );
  }

  const cadastros = await loadCadastrosForScope();
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  const nomeAdvogado = usuario?.nome?.trim();
  if (!nomeAdvogado) {
    throw new AssumirJuridicamenteError("Não foi possível identificar o advogado logado.", 400);
  }

  const agora = agoraIso();
  const motivo = motivoAssuncao(proposta, resumo?.parcelasVencidas ?? 0);

  let encaminhamentoId: string;
  try {
    const encaminhamento = await criarEncaminhamentoAssuncaoAdvogado(
      userId,
      {
        condominioId: proposta.condominioId,
        unidadeId: proposta.unidadeId,
        advogadoResponsavel: nomeAdvogado,
        observacoes: `Assunção jurídica da negociação ${proposta.id}. ${motivo}. O acordo permanece vigente até nova decisão.`,
        resumoContexto: `Proposta ${proposta.id} · status ${proposta.status} · valor ${proposta.valorProposto} · ${motivo}`,
        debitoIds: proposta.debitoIds,
      },
      meta,
    );
    encaminhamentoId = encaminhamento.id;
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      throw new AssumirJuridicamenteError(error.message, error.status, error.detalhes);
    }
    throw error;
  }

  const salva = await registrarAssuncaoJuridicaProposta(proposta.id, {
    assuncaoEm: agora,
    advogadoUserId: userId,
    encaminhamentoId,
    definirAdvogadoResponsavelSeVazio: proposta.advogadoResponsavelId == null,
  });

  await writeAuditLog({
    entity: "negotiation_proposal",
    recordId: salva.id,
    action: "UPDATE",
    previousData: JSON.stringify({
      assuncaoJuridicaEm: proposta.assuncaoJuridicaEm,
      status: proposta.status,
    }),
    newData: JSON.stringify({
      assuncaoJuridicaEm: salva.assuncaoJuridicaEm,
      assuncaoJuridicaPorId: salva.assuncaoJuridicaPorId,
      encaminhamentoJuridicoAssuncaoId: salva.encaminhamentoJuridicoAssuncaoId,
      status: salva.status,
    }),
    changedFields: "legal_assumption_at, legal_assumption_by_user_id, legal_assumption_referral_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  return { proposta: salva, encaminhamentoId };
}