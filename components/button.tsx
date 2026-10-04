import type { ButtonHTMLAttributes } from "react";

const colors = {
  primary:
    "border-primary-container bg-primary-container text-on-primary hover:border-primary-hover hover:bg-primary-hover",
  secondary:
    "border-brass bg-brass text-primary-container hover:border-brass-hover hover:bg-brass-hover",
  outline:
    "border-border-strong bg-transparent text-primary-container hover:bg-surface-subtle",
  ghost:
    "border-transparent bg-transparent text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface",
} as const;

const sizes = {
  sm: "h-control-sm rounded-md px-3 text-body-sm",
  md: "h-control rounded-md px-md text-body-md",
  lg: "h-control-lg rounded-lg px-md text-body-md",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof colors;
  size?: keyof typeof sizes;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const weight =
    variant === "secondary" || (variant === "primary" && size === "lg")
      ? "font-semibold"
      : "font-medium";

  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-sm whitespace-nowrap border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${colors[variant]} ${weight} ${className ?? ""}`}
      {...props}
    />
  );
}
