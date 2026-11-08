import type { ReactNode } from "react";

/** Mantido por compatibilidade; a faixa lateral não é mais renderizada (padrão visual unificado). */
export type CardMetricAccent = "primary" | "brass" | "critical" | "tertiary";

type CardMetricProps = {
  icon: ReactNode;
  iconClassName: string;
  /** @deprecated Sem efeito visual — cards seguem o padrão sem faixa lateral. */
  accent?: CardMetricAccent;
  /** Título curto do indicador (ex.: "Valor atualizado em aberto"). */
  rotulo?: string;
  /** Número ou valor principal — exibido em destaque acima do rótulo. */
  valor?: ReactNode;
  /** Uma linha explicando o que o número significa. */
  detalhe?: string;
  /** Layout legado: conteúdo livre (preferir `rotulo` + `valor`). */
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Rótulo de acessibilidade quando o card é clicável. */
  ariaLabel?: string;
};

export function CardMetric({
  icon,
  iconClassName,
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
    "flex h-full min-w-0 items-start gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card",
    interativo
      ? "cursor-pointer transition-colors hover:border-primary-container/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
      : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const modoIndicador = rotulo !== undefined && valor !== undefined;

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
      aria-label={interativo ? ariaLabel ?? (modoIndicador ? String(rotulo) : undefined) : undefined}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      {modoIndicador ? (
        <div className="flex min-w-0 flex-1 flex-col gap-xs">
          <p className="text-metric tabular-nums text-on-surface">{valor}</p>
          <p className="text-body-md leading-snug text-on-surface">{rotulo}</p>
          {detalhe ? <p className="text-body-sm leading-snug text-on-surface-variant">{detalhe}</p> : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </article>
  );
}
