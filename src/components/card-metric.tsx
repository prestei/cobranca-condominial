import type { ReactNode } from "react";

type CardMetricProps = {
  icon: ReactNode;
  iconClassName: string;
  children: ReactNode;
};

export function CardMetric({ icon, iconClassName, children }: CardMetricProps) {
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
