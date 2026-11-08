import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";

export type KpiMobileCardProps = {
  rotulo: string;
  valor: string;
  icon: LucideIcon;
  detalhe?: string;
  iconClassName?: string;
  destaque?: boolean;
  onClick?: () => void;
};

/** Indicador compacto para mobile — mesmo padrão visual do `CardMetric` (valor → rótulo → detalhe). */
export function KpiMobileCard({
  rotulo,
  valor,
  icon,
  detalhe,
  iconClassName,
  destaque = false,
  onClick,
}: KpiMobileCardProps) {
  const interativo = Boolean(onClick);
  const iconWrapClass =
    iconClassName ??
    (destaque ? "bg-primary-fixed/50 text-primary-container" : "bg-surface-subtle text-on-surface-variant");

  return (
    <article
      className={[
        "flex h-full w-full min-w-0 items-start gap-md rounded-xl border bg-surface-card p-md shadow-card",
        destaque ? "border-primary-container/40" : "border-border-subtle",
        interativo
          ? "cursor-pointer transition-colors hover:border-primary-container/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          : "",
      ].join(" ")}
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
      aria-label={interativo ? rotulo : undefined}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
        aria-hidden
      >
        <Icon icon={icon} size="sm" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <p className="text-metric tabular-nums text-on-surface">{valor}</p>
        <p className="text-body-md leading-snug text-on-surface">{rotulo}</p>
        {detalhe ? <p className="text-body-sm leading-snug text-on-surface-variant">{detalhe}</p> : null}
      </div>
    </article>
  );
}
