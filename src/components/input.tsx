import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

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
      className={`checkbox-control cursor-pointer ${className ?? ""}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

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
