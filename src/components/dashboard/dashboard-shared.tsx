"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { formatarData } from "@/data/catalogo";

export function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function percentual(valor: number | null | undefined) {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-2">{children}</div>;
}

export function SubPainel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-md rounded-lg border border-border-subtle/60 bg-surface-card p-md min-[768px]:p-lg">
      <div className="flex flex-col gap-xs">
        <h3 className="text-body-sm font-semibold text-on-surface">{titulo}</h3>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SecaoBloco({
  selo,
  titulo,
  descricao,
  linkLabel,
  onLink,
  children,
}: {
  selo?: string;
  titulo: string;
  descricao?: string;
  linkLabel?: string;
  onLink?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <div className="h-5 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-xs">
            {selo ? <p className="text-label-md uppercase text-brass">{selo}</p> : null}
            <h2 className="text-headline-sm font-semibold text-on-surface">{titulo}</h2>
            {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
          </div>
        </div>
        {linkLabel && onLink ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 gap-xs text-body-sm font-medium text-on-surface"
            onClick={onLink}
          >
            {linkLabel}
            <Icon icon={ArrowUpRight} size="sm" />
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border border-border-subtle/40 bg-surface-card p-lg shadow-card">{children}</div>
    </section>
  );
}

export type DashboardMetricTom = "brass" | "settled" | "primary" | "violet";

const tomMetricaClass: Record<DashboardMetricTom, string> = {
  brass: "bg-gold-subtle text-brass",
  settled: "bg-[color-mix(in_srgb,var(--color-status-settled)_14%,white)] text-status-settled",
  primary: "bg-primary-fixed/50 text-primary-container",
  violet: "bg-tertiary-fixed/45 text-tertiary-container",
};

export function DashboardMetric({
  tom,
  icon,
  rotulo,
  valor,
  detalhe,
}: {
  tom: DashboardMetricTom;
  icon: ReactNode;
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-sm">
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tomMetricaClass[tom]}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-md text-on-surface-variant">{rotulo}</p>
        <p className="text-headline-sm font-semibold tabular-nums leading-snug text-on-surface">{valor}</p>
        {detalhe ? <p className="text-body-sm text-on-surface-variant">{detalhe}</p> : null}
      </div>
    </div>
  );
}

export function GradeMetricas({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-md gap-y-lg min-[768px]:grid-cols-4">{children}</div>;
}

export function GradeMetricasTres({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-md gap-y-lg min-[768px]:grid-cols-3">{children}</div>;
}

export function ListaValorCompacta({
  itens,
  limite = 5,
  vazio = "Sem registros.",
  integrada = false,
}: {
  itens: { chave: string; nome: string; valor: string; secundario?: string }[];
  limite?: number;
  vazio?: string;
  /** Lista dentro do card da seção (sem caixa extra). */
  integrada?: boolean;
}) {
  const visiveis = itens.slice(0, limite);
  if (visiveis.length === 0) {
    return (
      <p className={`text-body-sm text-on-surface-variant ${integrada ? "border-t border-border-subtle/60 pt-md" : ""}`}>
        {vazio}
      </p>
    );
  }
  return (
    <ul
      className={
        integrada
          ? "divide-y divide-border-subtle/60 border-t border-border-subtle/60 pt-md"
          : "overflow-hidden rounded-lg border border-border-subtle/60 bg-surface-card divide-y divide-border-subtle/60"
      }
    >
      {visiveis.map((item) => (
        <li
          key={item.chave}
          className={`flex items-baseline justify-between gap-md ${integrada ? "py-sm first:pt-0" : "px-md py-sm"}`}
        >
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-on-surface">{item.nome}</p>
            {item.secundario ? (
              <p className="truncate text-body-sm text-on-surface-variant">{item.secundario}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-body-md font-semibold tabular-nums text-on-surface">{item.valor}</span>
        </li>
      ))}
    </ul>
  );
}

export function Leitura({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-gold-subtle/80 px-md py-sm shadow-card">
      <p className="text-body-sm leading-relaxed text-on-surface">{children}</p>
    </div>
  );
}

/** Agrupa seções principais do dashboard com espaçamento uniforme (T36). */
export function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-xl">{children}</div>;
}

/** Cartão de gráfico padronizado na home. */
export function PainelGrafico({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-col gap-xs">
        <h3 className="text-body-md font-semibold text-on-surface">{titulo}</h3>
        {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
      </div>
      {children}
    </article>
  );
}

/** Alerta acionável no topo da home (retornos atrasados, atenção etc.). */
export function AlertaPrioridade({
  titulo,
  children,
  acaoLabel,
  onAcao,
}: {
  titulo: string;
  children: ReactNode;
  acaoLabel: string;
  onAcao: () => void;
}) {
  return (
    <Alert variant="warning" title={titulo}>
      <div className="flex flex-col gap-md min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div className="text-body-sm text-on-surface">{children}</div>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={onAcao}>
          {acaoLabel}
          <Icon icon={ArrowUpRight} size="sm" />
        </Button>
      </div>
    </Alert>
  );
}

/** Título de bloco secundário dentro de uma seção (indicadores de apoio). */
export function SubsecaoTitulo({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-xs">
      <h3 className="text-body-md font-semibold text-on-surface">{titulo}</h3>
      {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
    </div>
  );
}

export function diaCurto(iso: string) {
  const texto = formatarData(iso.slice(0, 10));
  return texto === "—" ? iso : texto.slice(0, 5);
}

const rotuloRetorno = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos 7 dias",
  agendado: "Agendado",
  concluido: "Concluído",
} as const;

const badgeRetorno = {
  atrasado: "error",
  hoje: "secondary",
  semana: "primary",
  agendado: "secondary",
  concluido: "secondary",
} as const;

export function rotuloSituacaoRetorno(situacao: keyof typeof rotuloRetorno | string) {
  return rotuloRetorno[situacao as keyof typeof rotuloRetorno] ?? "—";
}

export function badgeVariantRetorno(situacao: keyof typeof badgeRetorno | string) {
  return badgeRetorno[situacao as keyof typeof badgeRetorno] ?? "secondary";
}
