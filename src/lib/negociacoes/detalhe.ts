import { formatarMoeda, type PropostaNegociacao } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re";
import { centavosMonetarios } from "@/lib/negociacoes/parcelamento";

export type PropostaNegociacaoDetalhe = {
  proposta: PropostaNegociacao;
  condominioNome: string;
  unidadeIdentificacao: string;
  devedorNome: string;
  descontoConcedido: string;
  descontoPercent: string;
  valorParcelaIndicativo: string;
  advogadoResponsavelRotulo: string;
  autorRotulo: string;
  valoresDefinidosPorRotulo: string;
  valoresAprovadosPorRotulo: string;
};

function deCentavos(c: number): string {
  return (c / 100).toFixed(2);
}

export async function montarDetalheProposta(proposta: PropostaNegociacao): Promise<PropostaNegociacaoDetalhe> {
  const cadastros = await loadCadastrosForScope();
  const condominio = cadastros.condominios.find((item) => item.id === proposta.condominioId);
  const unidade = cadastros.unidades.find((item) => item.id === proposta.unidadeId);

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
    proposta,
    condominioNome: condominio?.nome ?? `Condomínio ${proposta.condominioId}`,
    unidadeIdentificacao: unidade?.identificacao ?? `Unidade ${proposta.unidadeId}`,
    devedorNome: devedor,
    descontoConcedido: formatarMoeda(deCentavos(descontoCent)),
    descontoPercent,
    valorParcelaIndicativo,
    advogadoResponsavelRotulo:
      proposta.advogadoResponsavelId != null
        ? identificadorColaboradorPorId(proposta.advogadoResponsavelId, cadastros)
        : "—",
    autorRotulo: identificadorColaboradorPorId(proposta.usuarioId, cadastros),
    valoresDefinidosPorRotulo:
      proposta.valoresDefinidosPorId != null
        ? identificadorColaboradorPorId(proposta.valoresDefinidosPorId, cadastros)
        : "—",
    valoresAprovadosPorRotulo:
      proposta.valoresAprovadosPorId != null
        ? identificadorColaboradorPorId(proposta.valoresAprovadosPorId, cadastros)
        : "—",
  };
}
