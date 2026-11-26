import { Badge } from "@/components/badge";
import {
  rotuloSituacaoListagemUnidade,
  variantBadgeSituacaoListagemUnidade,
  type RotuloSituacaoListagemUnidade,
} from "@/lib/unidades/situacao-listagem";
import type { Unidade } from "@/data/catalogo";

type UnidadeSituacaoListagemBadgeProps = {
  unidade: Unidade;
  /** Unidade com ao menos um débito operacional (não prescrito) Pendente/Vencido. */
  temDebitoOperacionalAberto: boolean;
  /** Unidade com ao menos um débito prescrito Pendente/Vencido. */
  temDebitoPrescritoAberto: boolean;
  className?: string;
};

export function UnidadeSituacaoListagemBadge({
  unidade,
  temDebitoOperacionalAberto,
  temDebitoPrescritoAberto,
  className,
}: UnidadeSituacaoListagemBadgeProps) {
  const rotulo: RotuloSituacaoListagemUnidade = rotuloSituacaoListagemUnidade(
    unidade,
    temDebitoOperacionalAberto,
    temDebitoPrescritoAberto,
  );
  return (
    <Badge variant={variantBadgeSituacaoListagemUnidade(rotulo)} className={className}>
      {rotulo}
    </Badge>
  );
}
