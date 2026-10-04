"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AlertVariant } from "@/components/alert";
import { feedbackVariants } from "@/components/alert";
import { Icon } from "@/components/icon";

type ToastInput = {
  title: string;
  description?: string;
  variant?: AlertVariant;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, ...input }]);

      const duration = input.duration ?? 5000;
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-sm p-md min-[768px]:inset-x-auto min-[768px]:bottom-md min-[768px]:right-md min-[768px]:items-end"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const variant = toast.variant ?? "info";
  const config = feedbackVariants[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-sm gap-md rounded-lg border p-md shadow-popover min-[768px]:w-auto min-[768px]:min-w-[20rem] ${config.container}`}
    >
      <Icon icon={config.icon} size="md" className={config.iconClass} />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-label-lg text-on-surface">{toast.title}</p>
        {toast.description ? (
          <p className="mt-xs text-body-sm text-on-surface-variant">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        aria-label="Fechar notificação"
      >
        <X className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
