"use client";

import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { SkeletonCardList } from "@/components/skeleton";
import { AgendaDiaSheet } from "@/components/atendimentos/agenda-dia-sheet";
import type { HistoricoAgendaDia, HistoricoAgendaItem } from "@/lib/atendimentos/agrupar-historico-por-dia";

type Props = {
  dias: HistoricoAgendaDia[];
  carregando?: boolean;
  rotuloPeriodo: string;
  onAnterior: () => void;
  onProximo: () => void;
  onAbrirAtendimento?: (unidadeId: number) => void;
  onAgendarDia?: (diaIso: string) => void;
};

type VistaAgenda = "mes" | "semana" | "dia";

const ROTULOS_DIA_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

function indiceDiaSemana(diaIso: string) {
  const [y, m, d] = diaIso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d).getDay();
}

function rotuloEventoCelula(item: HistoricoAgendaItem) {
  return item.tipo === "retorno" ? "Retorno" : "Atendimento";
}

function identificacaoCurtaAgenda(item: HistoricoAgendaItem) {
  const texto = item.unidadeLabel.trim();
  if (!texto || texto === "—") return null;
  const partes = texto.split(" · ");
  const curto = (partes.length > 1 ? partes[partes.length - 1] : texto).trim();
  return curto.length > 22 ? `${curto.slice(0, 20)}…` : curto;
}

/** Retorno tem prioridade na célula quando há mais de um tipo no mesmo dia. */
function itemDestaqueCelula(dia: HistoricoAgendaDia) {
  return dia.itens.find((item) => item.tipo === "retorno") ?? dia.itens[0] ?? null;
}

function horaEventoCelula(item: HistoricoAgendaItem) {
  const hora = item.hora.trim();
  if (hora && hora !== "Retorno") return hora;
  const ref = item.tipo === "retorno" ? item.dataProximaAcao : item.dataHora;
  if (ref.includes("T")) return ref.slice(11, 16);
  return null;
}

function visualEvento(item: HistoricoAgendaItem) {
  if (item.tipo === "retorno") {
    return {
      dot: "bg-status-pending",
      cartao: "border-status-pending/25 bg-secondary-fixed/40",
    };
  }
  return {
    dot: "bg-status-settled",
    cartao: "border-status-settled/25 bg-badge-success-subtle",
  };
}

const OPCOES_VISTA: { value: VistaAgenda; label: string; icon: typeof LayoutGrid }[] = [
  { value: "mes", label: "Mês", icon: LayoutGrid },
  { value: "semana", label: "Semana", icon: CalendarDays },
  { value: "dia", label: "Dia", icon: CalendarClock },
];

function AgendaBarraControles({
  rotuloPeriodo,
  vista,
  onVista,
  onAnterior,
  onProximo,
}: {
  rotuloPeriodo: string;
  vista: VistaAgenda;
  onVista: (vista: VistaAgenda) => void;
  onAnterior: () => void;
  onProximo: () => void;
}) {
  return (
    <div className="flex flex-col gap-md border-b border-border-subtle px-md py-md sm:px-lg">
      <div className="flex flex-col gap-md lg:flex-row lg:items-center lg:justify-between">
        <nav
          aria-label="Navegação do mês"
          className="flex flex-wrap items-center gap-sm"
        >
          <div className="flex min-w-0 items-center gap-xs">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="size-9 shrink-0 border-0 p-0 shadow-none"
              aria-label="Mês anterior"
              onClick={onAnterior}
            >
              <Icon icon={ChevronLeft} size="sm" />
            </Button>
            <h2 className="min-w-0 truncate text-headline-sm text-primary-container">{rotuloPeriodo}</h2>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="size-9 shrink-0 border-0 p-0 shadow-none"
              aria-label="Próximo mês"
              onClick={onProximo}
            >
              <Icon icon={ChevronRight} size="sm" />
            </Button>
          </div>
        </nav>

        <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-end sm:gap-lg">
          <div
            role="radiogroup"
            aria-label="Visualização da agenda"
            className="flex w-full gap-xs rounded-xl border border-border-subtle bg-surface-card p-1 sm:w-auto"
          >
            {OPCOES_VISTA.map((opcao) => {
              const selecionado = vista === opcao.value;
              return (
                <button
                  key={opcao.value}
                  type="button"
                  role="radio"
                  aria-checked={selecionado}
                  onClick={() => onVista(opcao.value)}
                  className={`flex h-9 min-w-[4.75rem] flex-1 items-center justify-center gap-xs rounded-lg px-sm text-label-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass sm:flex-initial ${
                    selecionado
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-subtle"
                  }`}
                >
                  <Icon
                    icon={opcao.icon}
                    size="sm"
                    className={selecionado ? "text-on-primary" : undefined}
                  />
                  {opcao.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartaoEventoCelula({ item }: { item: HistoricoAgendaItem }) {
  const visual = visualEvento(item);
  const hora = horaEventoCelula(item);
  const identificacao = identificacaoCurtaAgenda(item);

  return (
    <div
      className={`mt-sm flex min-w-0 flex-col gap-0.5 rounded-lg border px-sm py-xs ${visual.cartao}`}
    >
      <div className="flex min-w-0 items-center gap-xs">
        <span className={`size-2 shrink-0 rounded-full ${visual.dot}`} aria-hidden />
        <span className="truncate text-label-md font-semibold text-on-surface">
          {rotuloEventoCelula(item)}
        </span>
      </div>
      {hora || identificacao ? (
        <div className="flex min-w-0 flex-col gap-px pl-[calc(0.5rem+2px)]">
          {hora ? (
            <div className="flex items-center gap-xs text-body-sm tabular-nums text-on-surface-variant">
              <Icon icon={Clock} size="sm" className="shrink-0" />
              {hora}
            </div>
          ) : null}
          {identificacao ? (
            <span className="truncate text-body-sm text-on-surface-variant">{identificacao}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AgendaGradeMes({
  dias,
  diaAberto,
  onAbrirDia,
}: {
  dias: HistoricoAgendaDia[];
  diaAberto: string | null;
  onAbrirDia: (dia: HistoricoAgendaDia) => void;
}) {
  const offset = dias[0] ? indiceDiaSemana(dias[0].dia) : 0;
  const totalCelulas = offset + dias.length;
  const linhas = Math.ceil(totalCelulas / 7);

  return (
    <div className="px-md py-md sm:px-lg sm:pb-lg">
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
        <div className="grid grid-cols-7 border-b border-border-subtle bg-surface-subtle/60">
          {ROTULOS_DIA_SEMANA.map((rotulo) => (
            <span
              key={rotulo}
              className="border-r border-border-subtle px-xs py-sm text-center text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant last:border-r-0"
            >
              {rotulo}
            </span>
          ))}
        </div>
        <div
          className="grid grid-cols-7"
          style={{ gridTemplateRows: `repeat(${linhas}, minmax(6.25rem, auto))` }}
        >
          {Array.from({ length: offset }, (_, i) => (
            <span
              key={`pad-${i}`}
              className="border-b border-r border-border-subtle bg-surface-subtle/30"
              aria-hidden
            />
          ))}
          {dias.map((dia, indice) => {
            const temEvento = dia.itens.length > 0;
            const aberto = diaAberto === dia.dia;
            const destaque = itemDestaqueCelula(dia);
            const restantes = dia.itens.length - (destaque ? 1 : 0);
            const coluna = (offset + indice) % 7;
            const ehUltimaColuna = coluna === 6;

            return (
              <button
                key={dia.dia}
                id={dia.eHoje ? "agenda-hoje" : undefined}
                type="button"
                onClick={() => onAbrirDia(dia)}
                className={`relative flex min-h-[7rem] cursor-pointer flex-col items-stretch border-b border-border-subtle bg-surface-card p-md text-left transition-colors focus-visible:z-[1] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass ${
                  ehUltimaColuna ? "border-r-0" : "border-r"
                } ${aberto ? "z-[1] bg-surface-subtle/50" : ""} ${
                  !temEvento ? "hover:bg-surface-subtle/80" : "hover:bg-surface-subtle/40"
                }`}
                title={dia.rotuloLongo}
                aria-label={
                  temEvento
                    ? `${dia.rotuloLongo}, ${dia.itens.length} compromisso(s). Toque para ver a lista.`
                    : `${dia.rotuloLongo}. Toque para ver o dia ou agendar.`
                }
              >
                <div className="mb-sm flex h-7 shrink-0 items-center justify-end">
                  <span
                    className={`inline-flex min-w-7 items-center justify-center text-label-lg font-semibold tabular-nums ${
                      dia.eHoje
                        ? "rounded-full bg-brass px-xs text-on-primary"
                        : "text-on-surface"
                    }`}
                  >
                    {dia.diaNumero}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-xs">
                  {destaque ? <CartaoEventoCelula item={destaque} /> : null}
                  {restantes > 0 ? (
                    <span className="mt-auto inline-flex w-fit max-w-full truncate rounded-full border border-border-subtle bg-surface-subtle px-sm py-0.5 text-body-sm font-medium text-on-surface-variant">
                      +{restantes} compromisso{restantes > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
          {Array.from({ length: linhas * 7 - totalCelulas }, (_, i) => {
            const posicao = totalCelulas + i;
            const ehUltimaColuna = posicao % 7 === 6;
            return (
              <span
                key={`trail-${i}`}
                className={`min-h-[6.25rem] border-b border-border-subtle bg-surface-subtle/30 ${
                  ehUltimaColuna ? "border-r-0" : "border-r"
                }`}
                aria-hidden
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaVistaEmBreve({ rotulo }: { rotulo: string }) {
  return (
    <div className="px-md py-xl sm:px-lg">
      <EmptyState
        icon={<Icon icon={CalendarDays} size="lg" />}
        title={rotulo}
        description="Esta visualização ainda não está disponível. Use o modo Mês."
        className="py-lg"
      />
    </div>
  );
}

export function AgendaHistoricoVisual({
  dias,
  carregando,
  rotuloPeriodo,
  onAnterior,
  onProximo,
  onAbrirAtendimento,
  onAgendarDia,
}: Props) {
  const [diaNoSheet, setDiaNoSheet] = useState<HistoricoAgendaDia | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [vista, setVista] = useState<VistaAgenda>("mes");

  function abrirDia(dia: HistoricoAgendaDia) {
    setDiaNoSheet(dia);
    setSheetAberto(true);
  }

  function agendarNoDia(diaIso: string) {
    setSheetAberto(false);
    onAgendarDia?.(diaIso);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
      <AgendaBarraControles
        rotuloPeriodo={rotuloPeriodo}
        vista={vista}
        onVista={setVista}
        onAnterior={onAnterior}
        onProximo={onProximo}
      />

      {carregando ? (
        <div className="p-md sm:p-lg">
          <SkeletonCardList rows={6} label="Carregando agenda" />
        </div>
      ) : dias.length === 0 ? (
        <EmptyState
          icon={<Icon icon={CalendarClock} size="lg" />}
          title="Agenda indisponível"
          description="Não foi possível montar os dias deste mês."
          className="py-xl"
        />
      ) : vista === "mes" ? (
        <AgendaGradeMes
          dias={dias}
          diaAberto={sheetAberto ? diaNoSheet?.dia ?? null : null}
          onAbrirDia={abrirDia}
        />
      ) : vista === "semana" ? (
        <AgendaVistaEmBreve rotulo="Visualização por semana" />
      ) : (
        <AgendaVistaEmBreve rotulo="Visualização por dia" />
      )}

      <AgendaDiaSheet
        dia={diaNoSheet}
        open={sheetAberto}
        onOpenChange={setSheetAberto}
        onAbrirAtendimento={onAbrirAtendimento}
        onAgendarDia={onAgendarDia ? agendarNoDia : undefined}
      />
    </section>
  );
}