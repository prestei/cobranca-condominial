import { formatarMoeda, type Cadastros, type PropostaNegociacao } from "@/data/catalogo";
import { centavosMonetarios } from "@/lib/negociacoes/parcelamento";

export type PropostaNegociacaoResumoCampos = {
  devedorNome: string;
  descontoConcedido: string;
  descontoPercent: string;
  valorParcelaIndicativo: string;
};

function deCentavos(c: number): string {
  return (c / 100).toFixed(2);
}

/** Campos derivados do resumo (cliente ou servidor), a partir dos cadastros já carregados. */
export function montarResumoCamposProposta(
  proposta: PropostaNegociacao,
  cadastros: Cadastros,
): PropostaNegociacaoResumoCampos {
  const vinculos = cadastros.vinculos.filter((item) => item.unidadeId === proposta.unidadeId);
  const vinculoPrincipal = vinculos.find((item) => item.principal) ?? vinculos[0];
  const devedor = vinculoPrincipal
    ? (cadastros.responsaveis.find((item) => item.id === vinculoPrincipal.responsavelId)?.nome ?? "—")
    : "—";

  const atualizadoCent = centavosMonetarios(proposta.valorDividaAtualizada || "0");
  const propostoCent = centavosMonetarios(proposta.valorProposto);
  const descontoCent = Math.max(0, atualizadoCent - propostoCent);
  const descontoPercent =
    atualizadoCent > 0 ? ((descontoCent / atualizadoCent) * 100).toFixed(2) : "0.00";

  const qtdParcelas = proposta.quantidadeParcelas && proposta.quantidadeParcelas > 0 ? proposta.quantidadeParcelas : null;
  const valorParcelaIndicativo =
    qtdParcelas != null ? formatarMoeda(deCentavos(Math.floor(propostoCent / qtdParcelas))) : "—";

  return {
    devedorNome: devedor,
    descontoConcedido: formatarMoeda(deCentavos(descontoCent)),
    descontoPercent,
    valorParcelaIndicativo,
  };
}