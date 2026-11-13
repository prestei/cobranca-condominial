"use client";

import { formatarData, formatarMoeda, type PropostaNegociacao } from "@/data/catalogo";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re";
import { useCadastros } from "@/hooks/use-cadastros";

type Props = {
  proposta: PropostaNegociacao;
  condominioNome?: string;
  unidadeIdentificacao?: string;
  devedorNome?: string;
  descontoConcedido?: string;
  descontoPercent?: string;
  valorParcelaIndicativo?: string;
};

export function PropostaDetalheResumo({
  proposta,
  condominioNome,
  unidadeIdentificacao,
  devedorNome,
  descontoConcedido,
  descontoPercent,
  valorParcelaIndicativo,
}: Props) {
  const cadastros = useCadastros();
  const desconto = descontoConcedido ?? "—";

  return (
    <dl className="grid gap-sm text-body-sm sm:grid-cols-2">
      <div>
        <dt className="text-on-surface-variant">Condomínio</dt>
        <dd>{condominioNome ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Unidade</dt>
        <dd>{unidadeIdentificacao ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Devedor</dt>
        <dd>{devedorNome ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Valor original da dívida</dt>
        <dd className="tabular-nums">{proposta.valorDividaOriginal ? formatarMoeda(proposta.valorDividaOriginal) : "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Valor atualizado</dt>
        <dd className="tabular-nums">
          {proposta.valorDividaAtualizada ? formatarMoeda(proposta.valorDividaAtualizada) : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Desconto concedido</dt>
        <dd className="tabular-nums">
          {desconto}
          {descontoPercent ? ` (${descontoPercent}%)` : null}
        </dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Valor negociado</dt>
        <dd className="font-medium tabular-nums">{formatarMoeda(proposta.valorProposto)}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Parcelas acordadas</dt>
        <dd>{proposta.quantidadeParcelas ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Valor por parcela (indicativo)</dt>
        <dd className="tabular-nums">{valorParcelaIndicativo ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Criação</dt>
        <dd>
          <time dateTime={proposta.criadoEm}>{formatarData(proposta.criadoEm)}</time>
        </dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Advogado responsável</dt>
        <dd>
          {proposta.advogadoResponsavelId != null
            ? identificadorColaboradorPorId(proposta.advogadoResponsavelId, cadastros)
            : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-on-surface-variant">Valores definidos por</dt>
        <dd>
          {proposta.valoresDefinidosPorId != null
            ? identificadorColaboradorPorId(proposta.valoresDefinidosPorId, cadastros)
            : identificadorColaboradorPorId(proposta.usuarioId, cadastros)}
        </dd>
      </div>
      {proposta.valoresAprovadosPorId != null ? (
        <div>
          <dt className="text-on-surface-variant">Valores aprovados por</dt>
          <dd>{identificadorColaboradorPorId(proposta.valoresAprovadosPorId, cadastros)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
