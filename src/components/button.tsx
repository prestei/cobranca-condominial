import { forwardRef, type ButtonHTMLAttributes } from "react";

const variants = {
  primary: [
    "border-transparent bg-gradient-to-br from-primary-container to-tertiary-container text-on-primary shadow-button",
    "hover:border-transparent hover:bg-gradient-to-br hover:from-brass hover:to-brass-hover hover:text-primary-container hover:shadow-button-hover hover:-translate-y-0.5",
    "active:scale-[0.96]",
  ].join(" "),
  secondary: [
    "border-transparent bg-gradient-to-br from-brass to-secondary-container text-primary-container shadow-button-hover",
    "hover:border-transparent hover:bg-gradient-to-br hover:from-primary-container hover:to-tertiary-container hover:text-on-primary hover:shadow-button hover:-translate-y-0.5",
    "active:scale-[0.96]",
  ].join(" "),
  /** Padrão de listagem: Importar, Exportar, Limpar e ações neutras em toolbar. */
  surface: [
    "border border-border-subtle bg-surface-card px-md text-label-md font-medium text-on-surface shadow-card",
    "transition-colors duration-150 hover:bg-surface-subtle",
    "active:scale-[0.98]",
  ].join(" "),
  outline: [
    "border-2 border-primary-container bg-transparent text-primary-container",
    "hover:bg-primary-container hover:text-on-primary hover:shadow-popover hover:-translate-y-0.5",
    "active:scale-[0.96]",
  ].join(" "),
  ghost: [
    "border-transparent bg-transparent text-primary-container",
    "hover:bg-surface-subtle hover:text-brass hover:-translate-y-0.5",
    "active:scale-[0.96]",
  ].join(" "),
  critical: [
    "border-transparent bg-status-critical text-on-primary shadow-button",
    "hover:border-transparent hover:bg-error hover:text-on-error hover:-translate-y-0.5",
    "active:scale-[0.96]",
  ].join(" "),
} as const;

const sizes = {
  sm: "h-control-sm rounded-md px-5 text-body-sm",
  md: "h-control rounded-md px-7 text-body-md",
  lg: "h-control-lg rounded-lg px-10 text-body-md",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  const emphasisClass = variant === "surface" ? "" : "font-semibold transition-all duration-300 ease-out";

  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-sm whitespace-nowrap caret-transparent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale disabled:shadow-none disabled:hover:translate-y-0 ${emphasisClass} ${sizes[size]} ${variants[variant]} ${className ?? ""}`}
      {...props}
    />
  );
});
