import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Icon } from "@/components/icon";

const variants = {
  info: {
    icon: Info,
    container: "border-border-subtle bg-primary-fixed/40",
    iconClass: "text-primary-container",
  },
  success: {
    icon: CheckCircle2,
    container: "border-status-settled/25 bg-status-settled/10",
    iconClass: "text-status-settled",
  },
  warning: {
    icon: TriangleAlert,
    container: "border-status-pending/30 bg-status-pending/10",
    iconClass: "text-status-pending",
  },
  error: {
    icon: CircleAlert,
    container: "border-status-critical/25 bg-error-container/80",
    iconClass: "text-status-critical",
  },
} as const satisfies Record<
  string,
  { icon: LucideIcon; container: string; iconClass: string }
>;

export type AlertVariant = keyof typeof variants;

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const config = variants[variant];

  return (
    <div
      role="alert"
      className={`flex gap-md rounded-lg border p-md ${config.container} ${className ?? ""}`}
    >
      <Icon icon={config.icon} size="md" className={config.iconClass} />
      <div className="min-w-0 flex-1 text-left">
        {title ? <p className="text-label-lg text-on-surface">{title}</p> : null}
        <div
          className={`text-body-sm text-on-surface-variant ${title ? "mt-xs" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
