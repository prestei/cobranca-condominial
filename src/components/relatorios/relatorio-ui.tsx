"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, type LucideIcon } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric, type CardMetricAccent } from "@/components/card-metric";
import { Icon } from "@/components/icon";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { Grade, Leitura } from "@/components/dashboard/dashboard-shared";

export { Grade, Leitura };

const desktopMetricasColsClass: Record<2 | 3 | 4 | 5, string> = {
  2: "min-[768px]:grid-cols-2",
  3: "min-[768px]:grid-cols-3",
  4: "min-[768px]:grid-cols-4",
  5: "min-[768px]:grid-cols-2 min-[1024px]:grid-cols-5",
};

const mobileMetricasColsClass: Record<1 | 2 | 3, string> = {
  1: "",
  2: "min-[480px]:grid-cols-2",
  3: "min-[480px]:grid-cols-3",
};

export type RelatorioMetricaItem = {
  valor: string;
  rotulo: string;
  destaque?: boolean;
  accent?: CardMetricAccent;
  detalhe?: string;
  icon?: LucideIcon;
};

/** Indicadores com KpiMobileCard (&lt;768px) e CardMetric no desktop — mesmo padrão de Atendimentos e Inadimplência. */
export function RelatorioMetricas({
  itens,
  desktopCols = 4,
  mobileCols = 2,
  className = "",
}: {
  itens: RelatorioMetricaItem[];
  desktopCols?: 2 | 3 | 4 | 5;
  mobileCols?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <section aria-label="Indicadores do relatório" className={className}>
      <div className={`grid grid-cols-1 gap-sm ${mobileMetricasColsClass[mobileCols]} min-[768px]:hidden`}>
        {itens.map((item) => (
          <KpiMobileCard
            key={item.rotulo}
            rotulo={item.rotulo.charAt(0).toUpperCase() + item.rotulo.slice(1)}
            valor={item.valor}
            icon={item.icon ?? BarChart3}
            destaque={item.destaque}
          />
        ))}
      </div>
      <div className={`hidden grid-cols-1 gap-md min-[768px]:grid ${desktopMetricasColsClass[desktopCols]}`}>
        {itens.map((item) => (
          <RelatorioMetrica key={item.rotulo} {...item} />
        ))}
      </div>
    </section>
  );
}

export function RelatorioPainel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg">
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
    <section className="flex flex-col gap-md min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-border-subtle min-[768px]:bg-surface-card min-[768px]:p-lg min-[768px]:shadow-card">
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
    <section className="flex flex-col gap-md min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-border-subtle min-[768px]:bg-surface-card min-[768px]:p-lg min-[768px]:shadow-card">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}
