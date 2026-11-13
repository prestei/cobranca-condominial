import {
  NEGOCIACAO_DESCONTO_MAX_PADRAO,
  NEGOCIACAO_PARCELAS_MAX_PADRAO,
  advogadoPrincipalCondominio,
  type Condominio,
  type RegraNegociacaoAdvogado,
} from "@/data/catalogo";
import { findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import { getLawyerNegotiationRuleEffective } from "@/lib/db/repositories/lawyer-negotiation-rule-repository";
import { listUsers } from "@/lib/db/repositories/identity-repository";
import { centavosMonetarios } from "@/lib/negociacoes/parcelamento";

export type ValidacaoAlcadaInput = {
  valorDividaAtualizada: string;
  valorProposto: string;
  quantidadeParcelas?: number | null;
};

export type ResultadoValidacaoAlcada = {
  ok: boolean;
  descontoPercent: string;
  mensagens: string[];
};

function percentualDesconto(valorAtualizadoCent: number, valorPropostoCent: number): number {
  if (valorAtualizadoCent <= 0) return 0;
  const desconto = ((valorAtualizadoCent - valorPropostoCent) / valorAtualizadoCent) * 100;
  return Math.max(0, Math.round(desconto * 100) / 100);
}

export function validarAlcadaNegociacao(
  regra: RegraNegociacaoAdvogado,
  input: ValidacaoAlcadaInput,
  opcoes?: { pularValidacao?: boolean },
): ResultadoValidacaoAlcada {
  if (opcoes?.pularValidacao) {
    return { ok: true, descontoPercent: "0.00", mensagens: [] };
  }

  const atualizadoCent = centavosMonetarios(input.valorDividaAtualizada);
  const propostoCent = centavosMonetarios(input.valorProposto);
  const mensagens: string[] = [];

  if (propostoCent <= 0) {
    mensagens.push("O valor negociado deve ser positivo.");
  }
  if (propostoCent > atualizadoCent) {
    mensagens.push("O valor negociado não pode ser maior que o valor atualizado da dívida.");
  }

  const desconto = percentualDesconto(atualizadoCent, propostoCent);
  const maxDesconto = Number(regra.descontoMaximoPercent);
  if (Number.isFinite(maxDesconto) && desconto > maxDesconto + 0.001) {
    mensagens.push(
      `Desconto de ${desconto.toFixed(2)}% excede o limite autorizado de ${maxDesconto.toFixed(2)}% para este advogado.`,
    );
  }

  const parcelas = input.quantidadeParcelas;
  if (parcelas != null && Number.isFinite(parcelas)) {
    if (parcelas < 1) {
      mensagens.push("Informe ao menos uma parcela.");
    } else if (parcelas > regra.parcelasMaximas) {
      mensagens.push(
        `Quantidade de parcelas (${parcelas}) excede o máximo autorizado (${regra.parcelasMaximas}).`,
      );
    }
  }

  return {
    ok: mensagens.length === 0,
    descontoPercent: desconto.toFixed(2),
    mensagens,
  };
}

/** Resolve o usuário advogado principal vinculado ao cadastro do condomínio. */
export async function resolverAdvogadoResponsavelId(condominioId: number): Promise<number | null> {
  const condominio = await findCondominiumById(condominioId);
  if (!condominio) return null;
  const nomePrincipal = advogadoPrincipalCondominio(condominio as Condominio).trim();
  if (!nomePrincipal) return null;
  const usuarios = await listUsers();
  const advogado = usuarios.find((item) => item.nome.trim() === nomePrincipal && item.ativo !== false);
  return advogado?.id ?? null;
}

export async function carregarRegraAdvogadoResponsavel(condominioId: number): Promise<{
  advogadoId: number | null;
  regra: RegraNegociacaoAdvogado;
}> {
  const advogadoId = await resolverAdvogadoResponsavelId(condominioId);
  if (advogadoId == null) {
    return {
      advogadoId: null,
      regra: {
        usuarioId: 0,
        descontoMaximoPercent: NEGOCIACAO_DESCONTO_MAX_PADRAO.toFixed(2),
        parcelasMaximas: NEGOCIACAO_PARCELAS_MAX_PADRAO,
        atualizadoEm: "",
        atualizadoPorId: null,
      },
    };
  }
  const regra = await getLawyerNegotiationRuleEffective(advogadoId);
  return { advogadoId, regra };
}

export function calcularTotaisDebitos(
  debitos: Array<{ valorOriginal: string; valorAtualizado: string }>,
): { original: string; atualizado: string } {
  let originalCent = 0;
  let atualizadoCent = 0;
  for (const item of debitos) {
    originalCent += centavosMonetarios(item.valorOriginal || "0");
    atualizadoCent += centavosMonetarios(item.valorAtualizado || item.valorOriginal || "0");
  }
  return {
    original: (originalCent / 100).toFixed(2),
    atualizado: (atualizadoCent / 100).toFixed(2),
  };
}
