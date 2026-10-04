"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within Dialog.");
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

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
  );
}

type DialogContentProps = HTMLAttributes<HTMLDialogElement> & {
  children: ReactNode;
};

export function DialogContent({ children, className, ...props }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext();
  const ref = useRef<HTMLDialogElement>(null);
  const isClient = useIsClient();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onOpenChange(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  if (!open || !isClient) return null;

  return createPortal(
    <dialog
      ref={ref}
      className={`m-auto w-[calc(100%-var(--spacing-xl))] max-w-md rounded-xl border border-border-subtle bg-surface-card p-0 shadow-modal [&::backdrop]:bg-overlay ${className ?? ""}`}
      {...props}
    >
      {children}
    </dialog>,
    document.body,
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-xs border-b border-border-subtle px-lg py-md ${className ?? ""}`}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-headline-sm text-on-surface ${className ?? ""}`} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-body-sm text-on-surface-variant ${className ?? ""}`} {...props} />;
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-lg py-md text-body-md text-on-surface ${className ?? ""}`} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-wrap justify-end gap-sm border-t border-border-subtle px-lg py-md ${className ?? ""}`}
      {...props}
    />
  );
}
