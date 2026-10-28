"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
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
  selo: string;
  titulo: string;
  descricao?: string;
  linkLabel?: string;
  onLink?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-lg rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-md border-b border-border-subtle pb-md">
        <div className="flex min-w-0 flex-col gap-xs">
          <p className="text-label-md uppercase text-brass">{selo}</p>
          <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
          {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
        </div>
        {linkLabel && onLink ? (
          <Button size="sm" variant="ghost" className="shrink-0 text-on-surface-variant" onClick={onLink}>
            {linkLabel}
            <Icon icon={ArrowUpRight} size="sm" />
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Leitura({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-gold-subtle/80 px-md py-sm shadow-card">
      <p className="text-body-sm leading-relaxed text-on-surface">{children}</p>
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
