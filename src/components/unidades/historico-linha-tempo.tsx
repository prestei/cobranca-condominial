"use client";

import { Badge } from "@/components/badge";
import { SkeletonTimeline } from "@/components/skeleton";
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

const tiposAtendimento = new Set<EventoHistoricoUnidade["tipo"]>([
  "tentativa",
  "retorno_concluido",
  "correcao_atendimento",
  "redistribuicao",
]);

const tiposDebito = new Set<EventoHistoricoUnidade["tipo"]>([
  "pagamento",
  "pagamento_acordo",
  "negociacao",
  "encaminhamento_juridico",
  "correcao_proposta",
  "correcao_juridico",
  "correcao_unidade",
]);

function eventosDaSecao(eventos: EventoHistoricoUnidade[], secao?: "debito" | "atendimento") {
  if (!secao) return eventos;
  const permitidos = secao === "atendimento" ? tiposAtendimento : tiposDebito;
  return eventos.filter((item) => permitidos.has(item.tipo));
}

type Props = {
  referencia: HistoricoUnidadeReferencia;
  eventos: EventoHistoricoUnidade[];
  loading?: boolean;
  erro?: string | null;
  secao?: "debito" | "atendimento";
};

export function HistoricoLinhaTempo({ referencia, eventos, loading, erro, secao }: Props) {
  if (loading) {
    return <SkeletonTimeline items={4} label="Carregando linha do tempo" />;
  }
  if (erro) {
    return <p className="text-body-sm text-error">{erro}</p>;
  }

  const eventosFiltrados = eventosDaSecao(eventos, secao);
  const mostrarDebitos = !secao || secao === "debito";
  const mostrarAtendimento = !secao || secao === "atendimento";

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap gap-sm">
        {mostrarDebitos ? (
          <>
            <Badge variant="secondary">Situação: {referencia.cobranca.situacao}</Badge>
            {referencia.cobranca.debitosAbertos > 0 ? (
              <Badge variant="error">
                {referencia.cobranca.debitosAbertos} débito(s) · {formatarMoeda(String(referencia.cobranca.valorAberto))}
              </Badge>
            ) : (
              <Badge variant="success">Sem débitos em aberto</Badge>
            )}
          </>
        ) : null}
        {mostrarAtendimento ? (
          <>
            {referencia.cobranca.reResponsavel ? (
              <Badge variant="secondary">RE {referencia.cobranca.reResponsavel}</Badge>
            ) : null}
            <Badge variant="secondary">{referencia.cobranca.totalTentativas} tentativa(s)</Badge>
            {referencia.cobranca.ultimoContato ? (
              <Badge variant="secondary">Último contato: {formatarData(referencia.cobranca.ultimoContato)}</Badge>
            ) : null}
          </>
        ) : null}
      </div>

      {mostrarDebitos && referencia.debitos.length > 0 ? (
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

      {eventosFiltrados.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          {secao === "debito"
            ? "Nenhum evento de débito registrado para esta unidade."
            : secao === "atendimento"
              ? "Nenhum atendimento registrado para esta unidade."
              : "Nenhum evento registrado para esta unidade."}
        </p>
      ) : (
        <ol
          className="relative flex flex-col gap-0 border-l border-border-subtle pl-md"
          aria-label={secao === "atendimento" ? "Linha do tempo de atendimento" : "Linha do tempo de débito"}
        >
          {eventosFiltrados.map((evento, index) => (
            <li
              key={evento.id}
              className={`relative pb-md ${index === eventosFiltrados.length - 1 ? "pb-0" : ""}`}
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
