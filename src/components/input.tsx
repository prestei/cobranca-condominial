import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

const checkboxClassName = [
  "size-3.5 shrink-0 cursor-pointer appearance-none rounded-sm border border-border-strong bg-surface-card bg-center bg-no-repeat",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "checked:border-primary-container checked:bg-primary-container checked:bg-[length:0.625rem]",
  "checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2010%2010%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M2%205.25%204.25%207.5%208%202.75%27%20stroke%3D%27%23ffffff%27%20stroke-width%3D%271.35%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27/%3E%3C/svg%3E')]",
  "focus-visible:border-brass focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass/20",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-status-critical aria-invalid:focus-visible:border-status-critical aria-invalid:focus-visible:ring-status-critical/20",
].join(" ");

const radioClassName = [
  "size-3.5 shrink-0 cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-card",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "checked:border-primary-container checked:bg-primary-container checked:shadow-[inset_0_0_0_2px_var(--color-surface-card)]",
  "focus-visible:border-brass focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "checked:focus-visible:shadow-[inset_0_0_0_2px_var(--color-surface-card),0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-status-critical",
].join(" ");

const switchTrackClassName = [
  "relative inline-flex h-[1.375rem] w-11 shrink-0 rounded-full border border-border-strong bg-surface-container",
  "transition-[background-color,border-color,box-shadow] duration-150",
  "has-[:checked]:border-primary-container has-[:checked]:bg-primary-container",
  "has-[:focus-visible]:border-brass has-[:focus-visible]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brass)_20%,transparent)]",
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
  "has-[input[aria-invalid=true]]:border-status-critical",
].join(" ");

const switchInputClassName =
  "peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed";

const switchThumbClassName = [
  "pointer-events-none absolute top-0.5 left-0.5 size-[1.125rem] rounded-full bg-surface-card",
  "shadow-[0_1px_2px_rgb(32_51_71/14%)] transition-[transform,background-color,box-shadow] duration-150 ease-out",
  "peer-checked:translate-x-[1.375rem] peer-checked:bg-on-primary peer-checked:shadow-none",
].join(" ");

export const formControlClassName =
  "h-input w-full rounded-md border bg-surface-card px-md text-body-md text-on-surface transition-colors duration-150 placeholder:text-on-surface-variant focus-visible:border-brass focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass/20 disabled:cursor-not-allowed disabled:opacity-60";

function controlStateClass(invalid?: boolean) {
  return invalid
    ? "border-status-critical focus-visible:border-status-critical focus-visible:ring-status-critical/20"
    : "border-border-subtle";
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={`${formControlClassName} ${controlStateClass(invalid)} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ className, invalid, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`${formControlClassName} min-h-[calc(var(--spacing-input)*2)] resize-y py-sm ${controlStateClass(invalid)} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select
      className={`${formControlClassName} ${controlStateClass(invalid)} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`${checkboxClassName} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="radio"
      className={`${radioClassName} ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, invalid, role = "switch", ...props },
  ref,
) {
  return (
    <span className={`${switchTrackClassName} ${className ?? ""}`}>
      <input
        ref={ref}
        type="checkbox"
        role={role}
        className={switchInputClassName}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <span className={switchThumbClassName} aria-hidden="true" />
    </span>
  );
});

type ChoiceFieldProps = {
  label: string;
  htmlFor: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function CheckboxField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-start gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(0.875rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

export function RadioField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-start gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(0.875rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

export function SwitchField({ label, htmlFor, description, children, className }: ChoiceFieldProps) {
  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="inline-flex cursor-pointer items-center gap-sm">
        {children}
        <span className="text-body-md text-on-surface">{label}</span>
      </label>
      {description ? <p className="pl-[calc(2.75rem+var(--spacing-sm))] text-body-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, required, error, children, className }: FormFieldProps) {
  const invalid = Boolean(error);

  return (
    <div className={`flex flex-col gap-sm ${className ?? ""}`}>
      <div className="flex flex-col gap-xs">
        <label
          htmlFor={htmlFor}
          className={`text-label-lg ${invalid ? "text-status-critical" : "text-primary-container"}`}
        >
          {label}
          {required ? <span className="text-status-critical"> *</span> : null}
        </label>
        {children}
      </div>
      {error ? <p className="text-body-sm text-status-critical">{error}</p> : null}
    </div>
  );
}
