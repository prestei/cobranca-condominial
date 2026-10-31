"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric, type CardMetricAccent } from "@/components/card-metric";
import { Icon } from "@/components/icon";
import { Grade, Leitura } from "@/components/dashboard/dashboard-shared";

export { Grade, Leitura };

export function RelatorioPainel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}

type RelatorioMetricaProps = {
  valor: string;
  rotulo: string;
  destaque?: boolean;
  accent?: CardMetricAccent;
  detalhe?: string;
};

export function RelatorioMetrica({ valor, rotulo, destaque = false, accent, detalhe = "No período filtrado" }: RelatorioMetricaProps) {
  const accentFinal = accent ?? (destaque ? "brass" : "primary");
  const iconClass =
    accentFinal === "brass"
      ? "bg-gold-subtle text-brass"
      : accentFinal === "critical"
        ? "bg-error-container text-status-critical"
        : accentFinal === "tertiary"
          ? "bg-tertiary-fixed/40 text-tertiary-container"
          : "bg-primary-fixed/50 text-primary-container";

  const tituloMetrica = rotulo.charAt(0).toUpperCase() + rotulo.slice(1);

  return (
    <CardMetric
      accent={accentFinal}
      rotulo={tituloMetrica}
      valor={valor}
      detalhe={detalhe}
      iconClassName={iconClass}
      icon={
        <Icon
          icon={BarChart3}
          size="md"
          className={
            accentFinal === "brass"
              ? "text-brass"
              : accentFinal === "critical"
                ? "text-status-critical"
                : accentFinal === "tertiary"
                  ? "text-tertiary-container"
                  : "text-primary-container"
          }
        />
      }
    />
  );
}

export function RelatorioFiltros({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-md">
      <h2 className="text-headline-sm text-on-surface">Filtros</h2>
      {children}
    </section>
  );
}

export function VoltarRelatoriosHub() {
  const router = useRouter();
  return (
    <Button size="sm" variant="ghost" className="self-start" onClick={() => router.push("/relatorios")}>
      <Icon icon={ArrowLeft} size="sm" />
      Todos os relatórios
    </Button>
  );
}

export function RelatorioSecaoTabela({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}
