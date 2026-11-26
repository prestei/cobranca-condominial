import { type PropostaNegociacao } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re";
import { montarResumoCamposProposta } from "@/lib/negociacoes/resumo-campos";

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

export async function montarDetalheProposta(proposta: PropostaNegociacao): Promise<PropostaNegociacaoDetalhe> {
  const cadastros = await loadCadastrosForScope();
  const condominio = cadastros.condominios.find((item) => item.id === proposta.condominioId);
  const unidade = cadastros.unidades.find((item) => item.id === proposta.unidadeId);
  const resumo = montarResumoCamposProposta(proposta, cadastros);

  return {
    proposta,
    condominioNome: condominio?.nome ?? `Condomínio ${proposta.condominioId}`,
    unidadeIdentificacao: unidade?.identificacao ?? `Unidade ${proposta.unidadeId}`,
    devedorNome: resumo.devedorNome,
    descontoConcedido: resumo.descontoConcedido,
    descontoPercent: resumo.descontoPercent,
    valorParcelaIndicativo: resumo.valorParcelaIndicativo,
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
