import type { ReactNode } from "react";

type CardMetricProps = {
  icon: ReactNode;
  iconClassName: string;
  /** Título curto do indicador (ex.: "Valor atualizado em aberto"). */
  rotulo?: string;
  /** Número ou valor principal. */
  valor?: ReactNode;
  /** Uma linha explicando o que o número significa. */
  detalhe?: string;
  /** Layout legado: conteúdo livre (valor + rótulo na ordem antiga). */
  children?: ReactNode;
};

export function CardMetric({ icon, iconClassName, rotulo, valor, detalhe, children }: CardMetricProps) {
  if (rotulo !== undefined && valor !== undefined) {
    return (
      <article className="flex min-w-0 flex-col gap-xs rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
        <div className="flex items-start gap-sm">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <p className="min-w-0 pt-0.5 text-body-sm font-medium leading-snug text-on-surface">{rotulo}</p>
        </div>
        <p className="text-headline-sm tabular-nums text-on-surface">{valor}</p>
        {detalhe ? <p className="text-body-sm leading-snug text-on-surface-variant">{detalhe}</p> : null}
      </article>
    );
  }

  return (
    <article className="flex min-w-0 items-center gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">{children}</div>
    </article>
  );
}
