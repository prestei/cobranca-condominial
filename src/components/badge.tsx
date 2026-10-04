import type { HTMLAttributes } from "react";

const variants = {
  primary: "bg-primary-container text-on-primary",
  secondary: "bg-brass text-primary-container",
  success: "bg-status-settled text-on-primary",
  error: "bg-status-critical text-on-primary",
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
};

export function Badge({ variant = "primary", className, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm uppercase tracking-wide ${variants[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
