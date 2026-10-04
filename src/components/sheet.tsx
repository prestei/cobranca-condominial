"use client";

import type {
  ButtonHTMLAttributes,
  FormHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/button";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within Sheet.");
  }
  return context;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>
  );
}

type SheetContentProps = HTMLAttributes<HTMLDialogElement> & {
  children: ReactNode;
};

export function SheetContent({ children, className, ...props }: SheetContentProps) {
  const { open, onOpenChange } = useSheetContext();
  const ref = useRef<HTMLDialogElement>(null);
  const isClient = useIsClient();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onOpenChange(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  useEffect(() => {
    return () => {
      const dialog = ref.current;
      if (dialog?.open) dialog.close();
    };
  }, []);

  if (!open || !isClient) return null;

  return createPortal(
    <dialog
      ref={ref}
      className={`m-0 ml-auto hidden h-full max-h-none w-full max-w-lg min-h-0 flex-col rounded-tl-xl rounded-bl-xl border border-border-subtle border-r-0 bg-surface-card p-0 shadow-modal [open]:flex [&::backdrop]:bg-overlay ${className ?? ""}`}
      {...props}
    >
      {children}
    </dialog>,
    document.body,
  );
}

export function SheetForm({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={`flex min-h-0 flex-1 flex-col ${className ?? ""}`} {...props} />;
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex shrink-0 items-start justify-between gap-md border-b border-border-subtle px-lg py-md ${className ?? ""}`}
      {...props}
    />
  );
}

export function SheetHeaderLead({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex min-w-0 flex-1 items-start gap-md ${className ?? ""}`} {...props} />
  );
}

export function SheetHeaderIcon({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-subtle text-primary-container ${className ?? ""}`}
      {...props}
    />
  );
}

type SheetHeaderTextProps = HTMLAttributes<HTMLDivElement>;

export function SheetHeaderText({ className, ...props }: SheetHeaderTextProps) {
  return <div className={`flex min-w-0 flex-1 flex-col gap-xs ${className ?? ""}`} {...props} />;
}

export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-headline-sm text-on-surface ${className ?? ""}`} {...props} />;
}

export function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-body-sm text-on-surface-variant ${className ?? ""}`} {...props} />;
}

export function SheetBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto px-lg py-md ${className ?? ""}`}
      {...props}
    />
  );
}

type SheetPanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "subtle" | "tint";
};

export function SheetPanel({ variant = "subtle", className, ...props }: SheetPanelProps) {
  const variantClass =
    variant === "tint"
      ? "border-primary-fixed-dim/40 bg-primary-fixed/35"
      : "border-border-subtle bg-surface-subtle";

  return (
    <div className={`rounded-lg border px-md py-md ${variantClass} ${className ?? ""}`} {...props} />
  );
}

type SheetToggleRowProps = {
  label: string;
  htmlFor: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SheetToggleRow({
  label,
  htmlFor,
  description,
  children,
  className,
}: SheetToggleRowProps) {
  return (
    <div className={`flex items-start justify-between gap-md ${className ?? ""}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <label htmlFor={htmlFor} className="cursor-pointer text-label-lg text-on-surface">
          {label}
        </label>
        {description ? <p className="text-body-sm text-on-surface-variant">{description}</p> : null}
      </div>
      <label htmlFor={htmlFor} className="shrink-0 cursor-pointer">
        {children}
      </label>
    </div>
  );
}

export function SheetHelpText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-body-sm text-on-surface-variant ${className ?? ""}`} {...props} />;
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex shrink-0 flex-wrap justify-end gap-sm border-t border-border-subtle px-lg py-md ${className ?? ""}`}
      {...props}
    />
  );
}

type SheetCloseProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SheetClose({ className, onClick, ...props }: SheetCloseProps) {
  const { onOpenChange } = useSheetContext();

  return (
    <button
      type="button"
      className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${className ?? ""}`}
      aria-label="Fechar"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onOpenChange(false);
      }}
      {...props}
    >
      <X className="size-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

type SheetFooterFormProps = HTMLAttributes<HTMLDivElement> & {
  onClose: () => void;
  closeLabel?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
};

export function SheetFooterForm({
  onClose,
  closeLabel = "Fechar",
  saveLabel = "Salvar",
  saveDisabled,
  className,
  ...props
}: SheetFooterFormProps) {
  return (
    <SheetFooter className={className} {...props}>
      <Button type="button" variant="outline" onClick={onClose}>
        {closeLabel}
      </Button>
      <Button type="submit" disabled={saveDisabled}>
        <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        {saveLabel}
      </Button>
    </SheetFooter>
  );
}
