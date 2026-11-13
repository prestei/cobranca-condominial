import { agoraIso, type PropostaNegociacao } from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  createAgreementInstallment,
  listAgreementInstallmentsByProposal,
} from "@/lib/db/repositories/negotiation-repository";
import { datasVencimentoMensais, distribuirValorEmParcelas, parcelasCoerentesComValorAcordado, centavosMonetarios } from "@/lib/negociacoes/parcelamento";

/** Gera o cronograma completo após confirmação do acordo, se ainda não existir parcela. */
export async function gerarCronogramaParcelasPadrao(
  userId: number,
  proposta: PropostaNegociacao,
  primeiroVencimento: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const existentes = await listAgreementInstallmentsByProposal(proposta.id);
  if (existentes.length > 0) return;

  const quantidade = proposta.quantidadeParcelas;
  if (!quantidade || quantidade < 1) return;

  const valores = distribuirValorEmParcelas(proposta.valorProposto, quantidade);
  const vencimentos = datasVencimentoMensais(primeiroVencimento, quantidade);

  const somaCent = valores.reduce((sum, item) => sum + centavosMonetarios(item), 0);
  if (!parcelasCoerentesComValorAcordado(somaCent, centavosMonetarios(proposta.valorProposto))) {
    throw new Error("INSTALLMENT_SUM_MISMATCH");
  }

  for (let index = 0; index < valores.length; index++) {
    const valorPrevisto = valores[index] ?? "0.00";
    const numero = index + 1;
  const vencimentoEm = vencimentos[index] ?? primeiroVencimento;
    const id = crypto.randomUUID();
    await createAgreementInstallment({
      id,
      propostaId: proposta.id,
      condominioId: proposta.condominioId,
      unidadeId: proposta.unidadeId,
      numero,
      valorPrevisto,
      vencimentoEm,
      criadoEm: agoraIso(),
      criadoPorId: userId,
      canceladoEm: "",
    });
    await writeAuditLog({
      entity: "agreement_installment",
      recordId: id,
      action: "INSERT",
      previousData: "",
      newData: JSON.stringify({ propostaId: proposta.id, numero, automatico: true }),
      changedFields: "proposta_id, numero, valor_previsto, vencimento_em",
      userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }
}
