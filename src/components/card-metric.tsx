import type { ReactNode } from "react";

/** @deprecated Faixa lateral removida; prop ignorada (compatibilidade). */
export type CardMetricAccent = "primary" | "brass" | "critical" | "tertiary";

type CardMetricProps = {
  icon: ReactNode;
  iconClassName: string;
  accent?: CardMetricAccent;
  rotulo?: string;
  valor?: ReactNode;
  detalhe?: string;
  children?: ReactNode;
  className?: string;
};

const shellClass =
  "flex h-full min-w-0 rounded-lg border border-border-subtle/80 bg-surface-card";

export function CardMetric({
  icon,
  iconClassName,
  rotulo,
  valor,
  detalhe,
  children,
  className,
}: CardMetricProps) {
  if (rotulo !== undefined && valor !== undefined) {
    return (
      <article className={`${shellClass} ${className ?? ""}`}>
        <div className="flex min-w-0 flex-1 items-start gap-sm p-md">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconClassName}`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body-sm text-on-surface-variant">{rotulo}</p>
            <p className="text-headline-sm font-semibold tabular-nums text-on-surface">{valor}</p>
            {detalhe ? <p className="text-body-sm text-on-surface-variant">{detalhe}</p> : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`${shellClass} ${className ?? ""}`}>
      <div className="flex min-w-0 flex-1 items-center gap-sm p-md">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconClassName}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </article>
  );
}
