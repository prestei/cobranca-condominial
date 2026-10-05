import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex w-full min-w-0 flex-col items-center justify-center px-lg py-xl text-center ${className ?? ""}`}
      role="status"
    >
      {icon ? (
        <div
          className="mb-md flex size-12 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-label-lg text-on-surface">{title}</p>
      {description ? (
        <p className="mt-sm w-full max-w-[var(--container-sm)] text-body-md text-on-surface-variant">{description}</p>
      ) : null}
      {action ? <div className="mt-lg">{action}</div> : null}
    </div>
  );
}
