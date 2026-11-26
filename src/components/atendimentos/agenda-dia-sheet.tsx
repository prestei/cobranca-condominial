"use client";

import { CalendarClock, ClipboardList, Mail, MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import type { HistoricoAgendaDia } from "@/lib/atendimentos/agrupar-historico-por-dia";

type Props = {
  dia: HistoricoAgendaDia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function rotuloUnidadeExibicao(label: string) {
  const texto = label.trim();
  return texto && texto !== "—" ? texto : null;
}

function metaItemAgenda(item: HistoricoAgendaDia["itens"][number]) {
  if (item.tipo === "retorno") {
    return item.proximaAcao?.trim() || "Retorno agendado";
  }
  const partes: string[] = [];
  if (item.canal.trim()) partes.push(item.canal);
  if (item.respondeu.trim()) partes.push(`Respondeu: ${item.respondeu}`);
  if (item.motivo.trim()) partes.push(item.motivo);
  return partes.join(" · ");
}

export function rotuloResumoCelulaAgenda(item: HistoricoAgendaDia["itens"][number]) {
  const unidade = rotuloUnidadeExibicao(item.unidadeLabel);
  const identificacao = unidade?.includes(" · ") ? (unidade.split(" · ").pop()?.trim() ?? unidade) : unidade;
  if (item.tipo === "retorno") {
    return identificacao ? `Retorno · ${identificacao}` : "Retorno";
  }
  const hora = item.hora.trim();
  if (hora && identificacao) return `${hora} · ${identificacao}`;
  return identificacao || hora || item.canal.trim() || "Atendimento";
}

export function AgendaDiaSheet({
  dia,
  open,
  onOpenChange,
  onAbrirAtendimento,
  onAgendarDia,
}: Props) {
  const tituloId = "agenda-dia-sheet-titulo";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={tituloId}>
        {dia ? (
          <>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={CalendarClock} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={tituloId}>{dia.rotuloLongo}</SheetTitle>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>

            <SheetBody className="flex flex-col gap-sm">
              {dia.itens.length === 0 ? (
                <EmptyState
                  icon={<Icon icon={CalendarClock} size="lg" />}
                  title="Dia livre"
                  description="Nenhum atendimento nem retorno previsto para esta data."
                />
              ) : (
                <ul className="flex flex-col gap-sm">
                  {dia.itens.map((item) => {
                    const unidadeRotulo = rotuloUnidadeExibicao(item.unidadeLabel);
                    const meta = metaItemAgenda(item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`flex w-full cursor-pointer items-start gap-sm rounded-xl border px-sm py-sm text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass sm:px-md ${
                            item.tipo === "retorno"
                              ? "border-brass/40 bg-gold-subtle/70 hover:bg-gold-subtle"
                              : "border-border-subtle bg-surface-card hover:border-brass/40 hover:bg-gold-subtle/50"
                          }`}
                          onClick={() => onAbrirAtendimento?.(item.unidadeId)}
                        >
                          <span className="flex shrink-0 items-center gap-xs pt-0.5">
                            <span className="min-w-[2.75rem] text-body-sm tabular-nums text-on-surface-variant">
                              {item.hora}
                            </span>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary-container">
                              <Icon
                                icon={item.tipo === "retorno" ? CalendarClock : iconeCanal(item.canal)}
                                size="sm"
                                aria-hidden
                              />
                            </span>
                          </span>
                          <span className="min-w-0 flex-1 pt-0.5">
                            <span className="flex flex-wrap items-center gap-sm">
                              {unidadeRotulo ? (
                                <span className="truncate text-body-md font-semibold text-on-surface">
                                  {unidadeRotulo}
                                </span>
                              ) : null}
                              <Badge
                                variant={
                                  item.tipo === "retorno"
                                    ? "secondary"
                                    : item.status === "Resolvido"
                                      ? "success"
                                      : "neutral"
                                }
                              >
                                {item.tipo === "retorno" ? "Retorno" : item.status}
                              </Badge>
                            </span>
                            {meta ? (
                              <span className="mt-xs block text-body-sm text-on-surface-variant">{meta}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              {onAgendarDia ? (
                <Button type="button" variant="primary" onClick={() => onAgendarDia(dia.dia)}>
                  <Icon icon={CalendarClock} size="sm" />
                  Agendar retorno
                </Button>
              ) : null}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}