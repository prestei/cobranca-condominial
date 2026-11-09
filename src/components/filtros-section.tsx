"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/icon";

const DESKTOP_MQ = "(min-width: 768px)";

type FiltrosSectionProps = {
  children: ReactNode;
  title?: string;
  /** Se omitido, mobile inicia fechado e desktop (≥768px) expandido. */
  defaultOpen?: boolean;
  className?: string;
};

export function FiltrosSection({
  children,
  title = "Filtros",
  defaultOpen,
  className,
}: FiltrosSectionProps) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();
  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;
    if (typeof defaultOpen === "boolean") {
      setAberto(defaultOpen);
      return;
    }
    setAberto(window.matchMedia(DESKTOP_MQ).matches);
  }, [defaultOpen]);

  return (
    <section className={`flex flex-col gap-0 ${className ?? ""}`.trim()}>
      <h2 className="text-label-lg text-on-surface">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-sm rounded-md text-left transition-colors hover:bg-surface-subtle/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-expanded={aberto}
          aria-controls={painelId}
          onClick={() => setAberto((atual) => !atual)}
        >
          <span>{title}</span>
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center text-on-surface-variant"
            aria-hidden
          >
            <Icon
              icon={ChevronDown}
              size="sm"
              className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h2>
      {aberto ? (
        <div id={painelId} role="region" aria-label="Campos de filtro">
          {children}
        </div>
      ) : null}
    </section>
  );
}
