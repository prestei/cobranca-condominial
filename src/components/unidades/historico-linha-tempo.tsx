"use client";

import { Badge } from "@/components/badge";
import { formatarData, formatarMoeda } from "@/data/catalogo";
import type { EventoHistoricoUnidade, HistoricoUnidadeReferencia } from "@/lib/historico-unidade/service";

const rotuloTipo: Record<EventoHistoricoUnidade["tipo"], string> = {
  tentativa: "Tentativa",
  retorno_concluido: "Retorno",
  redistribuicao: "Distribuição",
  pagamento: "Pagamento",
  pagamento_acordo: "Pag. acordo",
  negociacao: "Negociação",
  encaminhamento_juridico: "Jurídico",
  correcao_atendimento: "Correção",
  correcao_unidade: "Correção",
  correcao_proposta: "Status proposta",
  correcao_juridico: "Jurídico",
};

const variantTipo: Record<
  EventoHistoricoUnidade["tipo"],
  "primary" | "secondary" | "success" | "neutral" | "error"
> = {
  tentativa: "primary",
  retorno_concluido: "success",
  redistribuicao: "secondary",
  pagamento: "success",
  pagamento_acordo: "success",
  negociacao: "secondary",
  encaminhamento_juridico: "secondary",
  correcao_atendimento: "neutral",
  correcao_unidade: "neutral",
  correcao_proposta: "neutral",
  correcao_juridico: "neutral",
};

type Props = {
  referencia: HistoricoUnidadeReferencia;
  eventos: EventoHistoricoUnidade[];
  loading?: boolean;
  erro?: string | null;
};

export function HistoricoLinhaTempo({ referencia, eventos, loading, erro }: Props) {
  if (loading) {
    return <p className="text-body-sm text-on-surface-variant">Carregando linha do tempo…</p>;
  }
  if (erro) {
    return <p className="text-body-sm text-error">{erro}</p>;
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap gap-sm">
        <Badge variant="secondary">Situação: {referencia.cobranca.situacao}</Badge>
        {referencia.cobranca.reResponsavel ? (
          <Badge variant="secondary">RE {referencia.cobranca.reResponsavel}</Badge>
        ) : null}
        <Badge variant="secondary">{referencia.cobranca.totalTentativas} tentativa(s)</Badge>
        {referencia.cobranca.ultimoContato ? (
          <Badge variant="secondary">Último contato: {formatarData(referencia.cobranca.ultimoContato)}</Badge>
        ) : null}
        {referencia.cobranca.debitosAbertos > 0 ? (
          <Badge variant="error">
            {referencia.cobranca.debitosAbertos} débito(s) · {formatarMoeda(String(referencia.cobranca.valorAberto))}
          </Badge>
        ) : (
          <Badge variant="success">Sem débitos em aberto</Badge>
        )}
      </div>

      {referencia.debitos.length > 0 ? (
        <details className="rounded-md border border-border-subtle bg-surface-container-low px-md py-sm">
          <summary className="cursor-pointer text-label-md text-on-surface">Débitos da unidade ({referencia.debitos.length})</summary>
          <ul className="mt-sm flex flex-col gap-xs text-body-sm text-on-surface">
            {referencia.debitos.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-xs border-t border-border-subtle pt-xs first:border-0 first:pt-0">
                <span>
                  {item.referencia} · {item.status}
                </span>
                <span className="tabular-nums text-on-surface-variant">
                  {formatarMoeda(item.valorAtualizado)} · venc. {formatarData(item.dataVencimento)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {eventos.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhum evento registrado para esta unidade.</p>
      ) : (
        <ol className="relative flex flex-col gap-0 border-l border-border-subtle pl-md" aria-label="Linha do tempo da cobrança">
          {eventos.map((evento, index) => (
            <li
              key={evento.id}
              className={`relative pb-md ${index === eventos.length - 1 ? "pb-0" : ""}`}
            >
              <span
                className="absolute -left-[calc(0.5rem+1px)] top-1.5 size-2 rounded-full bg-primary"
                aria-hidden
              />
              <article className="flex flex-col gap-xs rounded-md border border-border-subtle bg-surface px-md py-sm">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div className="flex flex-wrap items-center gap-sm">
                    <Badge variant={variantTipo[evento.tipo]}>{rotuloTipo[evento.tipo]}</Badge>
                    <span className="text-label-md text-on-surface">{evento.titulo}</span>
                  </div>
                  <time className="text-body-sm tabular-nums text-on-surface-variant" dateTime={evento.dataHora}>
                    {formatarData(evento.dataHora)}
                  </time>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {evento.ator}
                  <span className="text-on-surface-variant/70"> · origem {evento.origem.replaceAll("_", " ")}</span>
                </p>
                {evento.meio ? (
                  <p className="text-body-sm text-on-surface">
                    <span className="text-on-surface-variant">Meio: </span>
                    {evento.meio}
                  </p>
                ) : null}
                {evento.resultado ? (
                  <p className="text-body-sm text-on-surface">
                    <span className="text-on-surface-variant">Resultado: </span>
                    {evento.resultado}
                  </p>
                ) : null}
                {evento.proximoPasso ? (
                  <p className="text-body-sm text-on-surface">
                    <span className="text-on-surface-variant">Próximo passo: </span>
                    {evento.proximoPasso}
                  </p>
                ) : null}
                {evento.observacao ? (
                  <p className="text-body-sm text-on-surface-variant">{evento.observacao}</p>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
