"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/badge";
import { SkeletonTimeline } from "@/components/skeleton";
import { formatarData } from "@/data/catalogo";
import type { EventoHistoricoUnidade } from "@/lib/historico-unidade/service";

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
  unidadeId: number | null;
  /** Incrementar após salvar atendimento para recarregar. */
  refreshNonce?: number;
  acaoTopo?: ReactNode;
};

function EventoLinhaTempo({ evento }: { evento: EventoHistoricoUnidade }) {
  return (
    <article className="flex flex-col gap-xs rounded-md border border-border-subtle bg-surface-card px-md py-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-sm">
          <Badge variant={variantTipo[evento.tipo]}>{rotuloTipo[evento.tipo]}</Badge>
          <span className="text-label-md text-on-surface">{evento.titulo}</span>
        </div>
        <time className="shrink-0 text-body-sm tabular-nums text-on-surface-variant" dateTime={evento.dataHora}>
          {formatarData(evento.dataHora)}
        </time>
      </div>
      {evento.meio ? (
        <p className="text-body-sm text-on-surface">
          <span className="text-on-surface-variant">Canal: </span>
          {evento.meio}
        </p>
      ) : null}
      {evento.resultado ? (
        <p className="text-body-sm text-on-surface">
          <span className="text-on-surface-variant">Resultado: </span>
          {evento.resultado}
        </p>
      ) : null}
      {evento.motivo ? (
        <p className="text-body-sm text-on-surface">
          <span className="text-on-surface-variant">Motivo: </span>
          {evento.motivo}
        </p>
      ) : null}
      {evento.proximoPasso ? (
        <p className="text-body-sm text-on-surface">
          <span className="text-on-surface-variant">Próximo passo: </span>
          {evento.proximoPasso}
        </p>
      ) : null}
      {evento.observacao ? (
        <p className="whitespace-pre-wrap text-body-sm text-on-surface-variant">{evento.observacao}</p>
      ) : null}
    </article>
  );
}

export function AtendimentoLinhaTempoOperacao({ unidadeId, refreshNonce = 0, acaoTopo }: Props) {
  const [eventos, setEventos] = useState<EventoHistoricoUnidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    if (unidadeId === null) return;
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/unidades/${unidadeId}/historico`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; eventos?: EventoHistoricoUnidade[] };
      if (!response.ok) {
        setEventos([]);
        setErro(payload.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      setEventos(payload.eventos ?? []);
    } catch {
      setEventos([]);
      setErro("Erro ao carregar a linha do tempo.");
    } finally {
      setCarregando(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    if (unidadeId === null) {
      setEventos([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [carregar, refreshNonce, unidadeId]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [eventos, unidadeId, carregando]);

  if (unidadeId === null) {
    return (
      <p className="px-md py-lg text-center text-body-sm text-on-surface-variant">
        Selecione uma unidade na fila para ver a linha do tempo.
      </p>
    );
  }

  return (
    <div
      ref={areaRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-surface-subtle px-md py-md"
      aria-label="Linha do tempo da cobrança"
    >
      {acaoTopo}
      {carregando ? (
        <SkeletonTimeline items={4} label="Carregando linha do tempo" />
      ) : erro ? (
        <p className="text-body-sm text-error">{erro}</p>
      ) : eventos.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhum evento registrado ainda.</p>
      ) : (
        <ol className="relative flex flex-col gap-md border-l border-border-strong pl-md">
          {eventos.map((evento, index) => (
            <li key={evento.id} className={`relative ${index === eventos.length - 1 ? "" : ""}`}>
              <span
                className="absolute -left-[calc(0.5rem+1px)] top-4 size-2.5 rounded-full border-2 border-surface-subtle bg-primary-container"
                aria-hidden
              />
              <EventoLinhaTempo evento={evento} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
