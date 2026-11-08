import type { ReactNode } from "react";

export type CardMetricAccent = "primary" | "brass" | "critical" | "tertiary";

const accentBarClass: Record<CardMetricAccent, string> = {
  primary: "bg-primary-container",
  brass: "bg-brass",
  critical: "bg-status-critical",
  tertiary: "bg-tertiary-fixed-dim",
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
  onClick?: () => void;
  /** Rótulo de acessibilidade quando o card é clicável. */
  ariaLabel?: string;
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
  onClick,
  ariaLabel,
}: CardMetricProps) {
  const interativo = Boolean(onClick);
  const articleClassName = [
    "flex h-full min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card",
    interativo
      ? "cursor-pointer transition-colors hover:border-primary-container/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
      : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (rotulo !== undefined && valor !== undefined) {
    return (
      <article
        className={articleClassName}
        onClick={onClick}
        onKeyDown={
          interativo
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        role={interativo ? "button" : undefined}
        tabIndex={interativo ? 0 : undefined}
        aria-label={interativo ? ariaLabel ?? String(rotulo) : undefined}
      >
        {accent ? (
          <div className={`w-[3px] shrink-0 self-stretch ${accentBarClass[accent]}`} aria-hidden="true" />
        ) : null}
        <div className="flex min-w-0 flex-1 gap-sm p-lg">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-body-sm font-medium leading-snug text-on-surface">{rotulo}</p>
            <p className="text-metric font-semibold tabular-nums text-primary-container">{valor}</p>
            {detalhe ? <p className="text-body-sm leading-snug text-on-surface-variant">{detalhe}</p> : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={articleClassName}
      onClick={onClick}
      role={interativo ? "button" : undefined}
      tabIndex={interativo ? 0 : undefined}
      aria-label={interativo ? ariaLabel : undefined}
    >
      {accent ? (
        <div className={`w-[3px] shrink-0 self-stretch ${accentBarClass[accent]}`} aria-hidden="true" />
      ) : null}
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
