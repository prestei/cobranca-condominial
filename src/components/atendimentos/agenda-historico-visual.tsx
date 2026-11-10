"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { SkeletonCardList } from "@/components/skeleton";
import type { HistoricoAgendaDia } from "@/lib/atendimentos/agrupar-historico-por-dia";

type Props = {
  dias: HistoricoAgendaDia[];
  carregando?: boolean;
  rotuloPeriodo: string;
  onAnterior: () => void;
  onProximo: () => void;
  onHoje: () => void;
  onAbrirAtendimento?: (unidadeId: number) => void;
  onAgendarDia?: (diaIso: string) => void;
};

function iconeCanal(canal: string) {
  const chave = canal.toLocaleLowerCase("pt-BR");
  if (chave.includes("whats")) return MessageCircle;
  if (chave.includes("mail") || chave.includes("e-mail") || chave.includes("email")) return Mail;
  if (chave.includes("telef") || chave.includes("lig")) return Phone;
  return ClipboardList;
}

export function AgendaHistoricoVisual({
  dias,
  carregando,
  rotuloPeriodo,
  onAnterior,
  onProximo,
  onHoje,
  onAbrirAtendimento,
  onAgendarDia,
}: Props) {
  const temAlgumEvento = dias.some((dia) => dia.itens.length > 0);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm rounded-xl border border-border-subtle bg-surface-card px-md py-sm shadow-card">
        <div className="flex items-center gap-xs">
          <Button type="button" size="sm" variant="ghost" aria-label="Mês anterior" onClick={onAnterior}>
            <Icon icon={ChevronLeft} size="sm" />
          </Button>
          <Button type="button" size="sm" variant="surface" onClick={onHoje}>
            Hoje
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-label="Próximo mês" onClick={onProximo}>
            <Icon icon={ChevronRight} size="sm" />
          </Button>
        </div>
        <p className="text-label-lg capitalize text-on-surface">{rotuloPeriodo}</p>
      </div>

      {carregando ? (
        <SkeletonCardList rows={8} label="Carregando agenda" />
      ) : dias.length === 0 ? (
        <EmptyState
          icon={<Icon icon={CalendarClock} size="lg" />}
          title="Agenda indisponível"
          description="Não foi possível montar os dias deste mês."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
          {!temAlgumEvento ? (
            <div className="border-b border-border-subtle px-md py-sm">
              <p className="text-body-sm text-on-surface-variant">
                Nenhum atendimento neste mês ainda — os dias aparecem abaixo para você navegar a agenda.
              </p>
            </div>
          ) : null}
          <ul className="divide-y divide-border-subtle">
            {dias.map((dia) => (
              <li
                key={dia.dia}
                id={dia.eHoje ? "agenda-hoje" : undefined}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-0 min-[640px]:grid-cols-[6.5rem_minmax(0,1fr)]"
              >
                <div
                  className={`flex flex-col items-center justify-start gap-xs border-r border-border-subtle px-sm py-md ${
                    dia.eHoje ? "bg-gold-subtle" : "bg-surface-subtle/80"
                  }`}
                >
                  <span
                    className={`text-label-sm uppercase ${
                      dia.eHoje ? "text-brass" : "text-on-surface-variant"
                    }`}
                  >
                    {dia.diaSemanaCurto}
                  </span>
                  <span
                    className={`flex size-10 items-center justify-center rounded-full text-headline-sm tabular-nums ${
                      dia.eHoje
                        ? "bg-brass text-primary-container"
                        : "bg-surface-card text-on-surface shadow-card"
                    }`}
                  >
                    {dia.diaNumero}
                  </span>
                  {dia.eHoje ? <span className="text-label-sm text-brass">Hoje</span> : null}
                </div>

                {dia.itens.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-sm px-md py-md">
                    <p className="text-body-sm text-on-surface-variant">Sem atendimentos</p>
                    {onAgendarDia ? (
                      <Button type="button" size="sm" variant="ghost" onClick={() => onAgendarDia(dia.dia)}>
                        <Icon icon={CalendarClock} size="sm" />
                        Agendar
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-sm p-md">
                    {dia.itens.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`flex w-full items-start gap-md rounded-xl border px-md py-sm text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
                            item.tipo === "retorno"
                              ? "border-brass/40 bg-gold-subtle/70 hover:bg-gold-subtle"
                              : "border-border-subtle bg-surface-card hover:border-brass/40 hover:bg-gold-subtle/50"
                          }`}
                          onClick={() => onAbrirAtendimento?.(item.unidadeId)}
                        >
                          <span className="mt-0.5 w-14 shrink-0 text-label-md tabular-nums text-brass">
                            {item.hora}
                          </span>
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary-container">
                            <Icon
                              icon={item.tipo === "retorno" ? CalendarClock : iconeCanal(item.canal)}
                              size="sm"
                              aria-hidden
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-sm">
                              <span className="truncate text-body-md font-semibold text-on-surface">
                                {item.unidadeLabel}
                              </span>
                              <Badge variant={item.tipo === "retorno" ? "secondary" : item.status === "Resolvido" ? "success" : "neutral"}>
                                {item.tipo === "retorno" ? "Retorno" : item.status}
                              </Badge>
                            </span>
                            <span className="mt-xs block text-body-sm text-on-surface-variant">
                              {item.tipo === "retorno"
                                ? item.proximaAcao || "Retorno agendado"
                                : `${item.canal}${item.respondeu ? ` · Respondeu: ${item.respondeu}` : ""}${item.motivo ? ` · ${item.motivo}` : ""}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
