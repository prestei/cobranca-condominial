"use client";

import { CircleCheck, Clock, Gavel, Scale, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";

export type MetricasJuridicoAdvogado = {
  total: number;
  emAnalise: number;
  comAcaoDefinida: number;
  finalizados: number;
};

function metricValor(n: number) {
  return String(n).padStart(2, "0");
}

function FaixaIndicador({
  rotulo,
  valor,
  icon,
  iconClassName,
  destaque,
}: {
  rotulo: string;
  valor: string;
  icon: LucideIcon;
  iconClassName: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-w-[8.5rem] flex-1 items-center gap-sm rounded-lg px-md py-sm",
        destaque ? "bg-primary-fixed/30" : "bg-surface-subtle/90",
      ].join(" ")}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        aria-hidden
      >
        <Icon icon={icon} size="sm" />
      </div>
      <div className="flex min-w-0 flex-col gap-xs">
        <span className="text-metric tabular-nums text-on-surface">{valor}</span>
        <span className="text-body-sm leading-snug text-on-surface-variant">{rotulo}</span>
      </div>
    </div>
  );
}

type Props = {
  metricas: MetricasJuridicoAdvogado;
};

/** Faixa de contexto e KPIs da visão advogado em `/juridico`. */
export function JuridicoAdvogadoHero({ metricas }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-primary-fixed/35 via-surface-card to-surface-card shadow-card">
      <div className="flex flex-col gap-md p-lg min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
        <div className="flex items-start gap-md">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">
            <Icon icon={Scale} size="lg" />
          </div>
          <div>
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Carteira jurídica</p>
            <h2 className="text-headline-sm text-on-surface">Análise e definição de ações</h2>
            <p className="mt-xs max-w-prose text-body-sm text-on-surface-variant">
              Acompanhe os encaminhamentos por etapa, abra o caso no painel lateral e registre a decisão no
              acompanhamento.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-sm border-t border-border-subtle bg-surface-card/85 px-lg py-md">
        <FaixaIndicador
          rotulo="Casos no jurídico"
          valor={metricValor(metricas.total)}
          icon={Scale}
          iconClassName="bg-primary-fixed/50 text-primary-container"
          destaque
        />
        <FaixaIndicador
          rotulo="Em análise"
          valor={metricValor(metricas.emAnalise)}
          icon={Clock}
          iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
        />
        <FaixaIndicador
          rotulo="Com ação definida"
          valor={metricValor(metricas.comAcaoDefinida)}
          icon={Gavel}
          iconClassName="bg-gold-subtle text-brass"
        />
        <FaixaIndicador
          rotulo="Finalizados"
          valor={metricValor(metricas.finalizados)}
          icon={CircleCheck}
          iconClassName="bg-badge-success-subtle text-badge-success-emphasis"
        />
      </div>
    </section>
  );
}