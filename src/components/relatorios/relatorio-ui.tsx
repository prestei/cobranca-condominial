"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, type LucideIcon } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric, type CardMetricAccent } from "@/components/card-metric";
import { FiltrosSection } from "@/components/filtros-section";
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
  onClick?: () => void;
  selecionado?: boolean;
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
            detalhe={item.detalhe}
            icon={item.icon ?? BarChart3}
            destaque={item.destaque || item.selecionado}
            onClick={item.onClick}
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

type RelatorioMetricaProps = RelatorioMetricaItem;

export function RelatorioMetrica({
  valor,
  rotulo,
  destaque = false,
  accent,
  detalhe = "No período filtrado",
  icon: Icone = BarChart3,
  onClick,
  selecionado = false,
}: RelatorioMetricaProps) {
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

  const iconTone =
    accentFinal === "brass"
      ? "text-brass"
      : accentFinal === "critical"
        ? "text-status-critical"
        : accentFinal === "tertiary"
          ? "text-tertiary-container"
          : "text-primary-container";

  return (
    <CardMetric
      accent={accentFinal}
      rotulo={tituloMetrica}
      valor={valor}
      detalhe={onClick ? `${detalhe} Toque para ver registros.` : detalhe}
      iconClassName={iconClass}
      className={selecionado ? "border-primary-container ring-1 ring-primary-container/25" : undefined}
      onClick={onClick}
      ariaLabel={onClick ? `Ver registros: ${tituloMetrica}` : undefined}
      icon={<Icon icon={Icone} size="md" className={iconTone} />}
    />
  );
}

export function RelatorioFiltros({ children }: { children: ReactNode }) {
  return <FiltrosSection>{children}</FiltrosSection>;
}

export function VoltarRelatoriosHub({ className }: { className?: string } = {}) {
  const router = useRouter();
  return (
    <Button size="sm" variant="ghost" className={className} onClick={() => router.push("/relatorios")}>
      <Icon icon={ArrowLeft} size="sm" />
      Voltar
    </Button>
  );
}

export function RelatorioSecaoTabela({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}
