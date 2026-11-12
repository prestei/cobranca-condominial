import { Badge } from "@/components/badge";
import {
  rotuloSituacaoListagemUnidade,
  variantBadgeSituacaoListagemUnidade,
  type RotuloSituacaoListagemUnidade,
} from "@/lib/unidades/situacao-listagem";
import type { Unidade } from "@/data/catalogo";

type UnidadeSituacaoListagemBadgeProps = {
  unidade: Unidade;
  /** Unidade com ao menos um débito Pendente/Vencido na base consultada. */
  temDebitoVencidoAberto: boolean;
  className?: string;
};

export function UnidadeSituacaoListagemBadge({
  unidade,
  temDebitoVencidoAberto,
  className,
}: UnidadeSituacaoListagemBadgeProps) {
  const rotulo: RotuloSituacaoListagemUnidade = rotuloSituacaoListagemUnidade(unidade, temDebitoVencidoAberto);
  return (
    <Badge variant={variantBadgeSituacaoListagemUnidade(rotulo)} className={className}>
      {rotulo}
    </Badge>
  );
}
