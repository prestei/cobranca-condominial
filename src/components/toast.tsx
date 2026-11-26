"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

/** Fundos sólidos no toast; o Alert inline usa tons com transparência. */
const toastContainerVariants = {
  info: "border-border-subtle bg-primary-fixed",
  success: "border-status-settled/30 bg-badge-success-subtle",
  warning: "border-status-pending/35 bg-gold-subtle",
  error: "border-status-critical/30 bg-error-container",
} as const satisfies Record<AlertVariant, string>;

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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (toasts.length === 0 || portalTarget === null) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-md left-1/2 z-[200] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-stretch gap-sm"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>,
    portalTarget,
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const variant = toast.variant ?? "info";
  const config = feedbackVariants[variant];

  const hasDescription = Boolean(toast.description);

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full gap-sm rounded-lg border pl-md pr-sm opacity-100 shadow-popover ${hasDescription ? "items-start py-md" : "items-center py-sm"} ${toastContainerVariants[variant]}`}
    >
      <Icon
        icon={config.icon}
        size="md"
        className={`${config.iconClass} ${hasDescription ? "mt-0.5" : ""}`}
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-label-lg text-on-surface">{toast.title}</p>
        {toast.description ? (
          <p className="mt-xs text-balance text-body-sm text-on-surface-variant">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${hasDescription ? "self-start" : ""}`}
        aria-label="Fechar notificação"
      >
        <X className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
