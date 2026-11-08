import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";

export type KpiMobileCardProps = {
  rotulo: string;
  valor: string;
  icon: LucideIcon;
  destaque?: boolean;
  onClick?: () => void;
};

/** Indicador compacto para mobile (&lt;768px), mesmo padrão da fila de cobranças em Atendimentos. */
export function KpiMobileCard({ rotulo, valor, icon, destaque = false, onClick }: KpiMobileCardProps) {
  const interativo = Boolean(onClick);
  return (
    <article
      className={[
        "flex w-full min-w-0 rounded-xl bg-surface-card shadow-card",
        "max-[479px]:flex-row max-[479px]:items-center max-[479px]:gap-md max-[479px]:px-md max-[479px]:py-md",
        "min-[480px]:max-[767px]:flex-col min-[480px]:max-[767px]:items-start min-[480px]:max-[767px]:gap-sm min-[480px]:max-[767px]:px-sm min-[480px]:max-[767px]:py-sm",
        destaque ? "border-2 border-primary-container" : "border border-border-subtle",
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
    >
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-full",
          "size-10 min-[480px]:max-[767px]:size-9",
          destaque ? "bg-primary-container text-on-primary" : "bg-surface-subtle text-on-surface-variant",
        ].join(" ")}
        aria-hidden
      >
        <Icon icon={icon} size="sm" className={destaque ? "text-on-primary" : undefined} />
      </div>
      <div className="min-w-0 flex flex-1 flex-col gap-0.5 min-[480px]:max-[767px]:w-full">
        <p className="text-body-sm leading-snug text-on-surface-variant min-[480px]:max-[767px]:text-[13px]">{rotulo}</p>
        <p className="text-metric font-semibold leading-none tabular-nums text-primary-container min-[480px]:max-[767px]:text-[1.25rem]">
          {valor}
        </p>
      </div>
    </article>
  );
}
