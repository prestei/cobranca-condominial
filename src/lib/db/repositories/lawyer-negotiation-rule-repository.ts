import {
  NEGOCIACAO_DESCONTO_MAX_PADRAO,
  NEGOCIACAO_PARCELAS_MAX_PADRAO,
  agoraIso,
  type RegraNegociacaoAdvogado,
} from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { decimalFromString } from "@/lib/db/mappers";

function isoDateTime(value: Date): string {
  return value.toISOString();
}

function mapRow(row: {
  userId: number;
  maxDiscountPercent: { toString(): string };
  maxInstallments: number;
  updatedAt: Date;
  updatedById: number | null;
}): RegraNegociacaoAdvogado {
  return {
    usuarioId: row.userId,
    descontoMaximoPercent: Number(row.maxDiscountPercent.toString()).toFixed(2),
    parcelasMaximas: row.maxInstallments,
    atualizadoEm: isoDateTime(row.updatedAt),
    atualizadoPorId: row.updatedById,
  };
}

export function regraNegociacaoPadrao(usuarioId: number): RegraNegociacaoAdvogado {
  return {
    usuarioId,
    descontoMaximoPercent: NEGOCIACAO_DESCONTO_MAX_PADRAO.toFixed(2),
    parcelasMaximas: NEGOCIACAO_PARCELAS_MAX_PADRAO,
    atualizadoEm: "",
    atualizadoPorId: null,
  };
}

export async function findLawyerNegotiationRule(userId: number): Promise<RegraNegociacaoAdvogado | null> {
  const row = await prisma.lawyerNegotiationRule.findUnique({ where: { userId } });
  return row ? mapRow(row) : null;
}

export async function getLawyerNegotiationRuleEffective(userId: number): Promise<RegraNegociacaoAdvogado> {
  const row = await findLawyerNegotiationRule(userId);
  return row ?? regraNegociacaoPadrao(userId);
}

export async function upsertLawyerNegotiationRule(
  usuarioId: number,
  input: { descontoMaximoPercent: string; parcelasMaximas: number },
  atualizadoPorId: number,
): Promise<RegraNegociacaoAdvogado> {
  const row = await prisma.lawyerNegotiationRule.upsert({
    where: { userId: usuarioId },
    create: {
      userId: usuarioId,
      maxDiscountPercent: decimalFromString(input.descontoMaximoPercent) ?? NEGOCIACAO_DESCONTO_MAX_PADRAO,
      maxInstallments: input.parcelasMaximas,
      updatedAt: new Date(agoraIso()),
      updatedById: atualizadoPorId,
    },
    update: {
      maxDiscountPercent: decimalFromString(input.descontoMaximoPercent) ?? NEGOCIACAO_DESCONTO_MAX_PADRAO,
      maxInstallments: input.parcelasMaximas,
      updatedAt: new Date(agoraIso()),
      updatedById: atualizadoPorId,
    },
  });
  return mapRow(row);
}
