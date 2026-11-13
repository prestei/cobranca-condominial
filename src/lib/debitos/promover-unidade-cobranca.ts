import {
  debitoEmAberto,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  unidadePrescrita,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findUnitById, updateUnit } from "@/lib/db/repositories/unit-repository";
import { invalidateServiceContextCache } from "@/lib/db/service-context";

type SituacaoCobranca = (typeof situacoesUnidade)[number];

/** Situações que entram na fila ao gravar débito em aberto (manual ou importação confirmada). */
const SITUACOES_PROMOVER_PARA_COBRANCA = new Set<SituacaoCobranca>(["Sem cobrança", "Quitada"]);

/** Define a situação de cobrança após persistir débito em aberto; `null` = sem alteração. */
export function situacaoDestinoAposDebitoEmAberto(
  unidade: Pick<Unidade, "situacao">,
): SituacaoCobranca | null {
  if (unidadePrescrita(unidade)) return null;
  const situacao = situacaoCobrancaUnidade(unidade);
  if (SITUACOES_PROMOVER_PARA_COBRANCA.has(situacao)) return "Em cobrança";
  return null;
}

export async function promoverUnidadeParaCobrancaSeDebitoEmAberto(
  unidadeId: number,
  debito: Pick<Debito, "status">,
  meta?: { userId?: number; ip?: string; userAgent?: string },
): Promise<Unidade | null> {
  if (!debitoEmAberto(debito)) return null;

  const unidade = await findUnitById(unidadeId);
  if (!unidade) return null;

  const novaSituacao = situacaoDestinoAposDebitoEmAberto(unidade);
  if (!novaSituacao) return null;

  const anterior = unidade.situacao;
  const salva = await updateUnit({ ...unidade, situacao: novaSituacao });
  invalidateServiceContextCache();

  if (meta?.userId != null) {
    await writeAuditLog({
      entity: "unit",
      recordId: String(unidadeId),
      action: "UPDATE",
      previousData: JSON.stringify({ situacao: anterior }),
      newData: JSON.stringify({ situacao: salva.situacao, motivo: "debito_em_aberto" }),
      changedFields: "situacao",
      userId: meta.userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  return salva;
}
