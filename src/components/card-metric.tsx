import type { ReactNode } from "react";

export type CardMetricAccent = "primary" | "brass" | "critical" | "tertiary";

const accentBarClass: Record<CardMetricAccent, string> = {
  primary: "bg-primary-container",
  brass: "bg-brass",
  critical: "bg-status-critical",
  tertiary: "bg-inverse-primary",
};

type CardMetricProps = {
  icon: ReactNode;
  iconClassName: string;
  /** Faixa de destaque à esquerda (mesmo padrão de Inadimplência e fila). */
  accent?: CardMetricAccent;
  /** Título curto do indicador (ex.: "Valor atualizado em aberto"). */
  rotulo?: string;
  /** Número ou valor principal. */
  valor?: ReactNode;
  /** Uma linha explicando o que o número significa. */
  detalhe?: string;
  /** Layout legado: conteúdo livre (valor + rótulo na ordem antiga). */
  children?: ReactNode;
  className?: string;
};

export function CardMetric({
  icon,
  iconClassName,
  accent,
  rotulo,
  valor,
  detalhe,
  children,
  className,
}: CardMetricProps) {
  if (rotulo !== undefined && valor !== undefined) {
    return (
      <article
        className={`flex h-full min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card ${className ?? ""}`}
      >
        {accent ? (
          <div className={`w-1 shrink-0 self-stretch ${accentBarClass[accent]}`} aria-hidden="true" />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-xs p-lg">
          <div className="flex items-start gap-sm">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
              aria-hidden="true"
            >
              {icon}
            </div>
            <p className="min-w-0 pt-0.5 text-body-sm font-medium leading-snug text-on-surface">{rotulo}</p>
          </div>
          <p className="text-metric font-semibold tabular-nums text-on-surface">{valor}</p>
          {detalhe ? <p className="text-body-sm leading-snug text-on-surface-variant">{detalhe}</p> : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`flex h-full min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card ${className ?? ""}`}
    >
      {accent ? <div className={`w-1 shrink-0 self-stretch ${accentBarClass[accent]}`} aria-hidden="true" /> : null}
      <div className="flex min-w-0 flex-1 items-center gap-md p-lg">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </article>
  );
}
