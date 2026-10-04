import type { LucideIcon } from "lucide-react";

export const iconSizes = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export const iconStrokeWidths = {
  sm: 2,
  md: 1.75,
  lg: 1.75,
} as const;

export type IconSize = keyof typeof iconSizes;

type IconProps = {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  label?: string;
};

export function Icon({ icon: LucideComponent, size = "md", className, label }: IconProps) {
  return (
    <LucideComponent
      className={`${iconSizes[size]} shrink-0 ${className ?? ""}`}
      strokeWidth={iconStrokeWidths[size]}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
