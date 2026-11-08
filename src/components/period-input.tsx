"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/icon";
import { FormField, Input, formControlClassName } from "@/components/input";

export const periodPresets = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7", label: "Últimos 7 dias" },
  { id: "30", label: "Últimos 30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "anterior", label: "Mês anterior" },
  { id: "todos", label: "Todos" },
] as const;

export type PeriodPreset = (typeof periodPresets)[number]["id"] | "personalizado";

export type PeriodValue = {
  preset: PeriodPreset;
  de: string;
  ate: string;
};

type PeriodInputProps = {
  id?: string;
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

function isoData(data: Date) {
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function formatarDia(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function rotuloPeriodo(value: PeriodValue) {
  const preset = periodPresets.find((item) => item.id === value.preset);
  if (preset) return preset.label;
  const de = value.de ? formatarDia(value.de) : "";
  const ate = value.ate ? formatarDia(value.ate) : "";
  if (de && ate) return `${de} – ${ate}`;
  if (de) return `De ${de}`;
  if (ate) return `Até ${ate}`;
  return "Período personalizado";
}

export function resolverPeriodo(value: PeriodValue, hoje: string) {
  if (value.preset === "hoje") return { inicio: hoje, fim: hoje };
  if (value.preset === "ontem") {
    const data = new Date(`${hoje}T00:00:00`);
    data.setDate(data.getDate() - 1);
    const dia = isoData(data);
    return { inicio: dia, fim: dia };
  }
  if (value.preset === "7" || value.preset === "30") {
    const data = new Date(`${hoje}T00:00:00`);
    data.setDate(data.getDate() - (value.preset === "7" ? 6 : 29));
    return { inicio: isoData(data), fim: hoje };
  }
  if (value.preset === "mes") return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
  if (value.preset === "anterior") {
    const data = new Date(`${hoje.slice(0, 7)}-01T00:00:00`);
    data.setDate(0);
    const fim = isoData(data);
    return { inicio: `${fim.slice(0, 7)}-01`, fim };
  }
  if (value.preset === "todos") return { inicio: "", fim: "" };
  return { inicio: value.de, fim: value.ate };
}

export function PeriodInput({ id, value, onChange, invalid, disabled, className }: PeriodInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const panelId = `${fieldId}-painel`;
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const borda = invalid
    ? "border-status-critical focus-visible:border-status-critical focus-visible:ring-status-critical/20"
    : "border-border-strong";

  useEffect(() => {
    if (!open) return;
    function fecharSeFora(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", fecharSeFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [open]);

  function escolherPreset(preset: (typeof periodPresets)[number]["id"]) {
    onChange({ preset, de: "", ate: "" });
    setOpen(false);
  }

  return (
    <span ref={rootRef} className="relative block w-full">
      <button
        type="button"
        id={fieldId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-invalid={invalid || undefined}
        className={`${formControlClassName} peer flex cursor-pointer items-center pr-[calc(var(--spacing-md)+1rem+var(--spacing-sm))] text-left ${borda} ${className ?? ""}`}
        onClick={() => setOpen((atual) => !atual)}
      >
        <span className="truncate">{rotuloPeriodo(value)}</span>
      </button>
      <Icon
        icon={ChevronDown}
        size="sm"
        className="pointer-events-none absolute top-1/2 right-md -translate-y-1/2 text-on-surface-variant peer-disabled:opacity-60"
      />
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Período"
          className="absolute top-[calc(100%+var(--spacing-xs))] z-40 w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-popover"
        >
          <div className="flex flex-col py-xs" role="listbox" aria-label="Atalhos">
            {periodPresets.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={value.preset === item.id}
                className={`px-md py-sm text-left text-body-md text-on-surface hover:bg-surface-subtle ${value.preset === item.id ? "bg-surface-subtle font-semibold" : ""}`}
                onClick={() => escolherPreset(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-sm border-t border-border-subtle p-md">
            <p className="text-label-sm uppercase text-on-surface-variant">Período personalizado</p>
            <FormField label="De" htmlFor={`${fieldId}-de`}>
              <Input
                id={`${fieldId}-de`}
                type="date"
                value={value.de}
                onChange={(event) => onChange({ preset: "personalizado", de: event.target.value, ate: value.ate })}
              />
            </FormField>
            <FormField label="Até" htmlFor={`${fieldId}-ate`}>
              <Input
                id={`${fieldId}-ate`}
                type="date"
                value={value.ate}
                onChange={(event) => onChange({ preset: "personalizado", de: value.de, ate: event.target.value })}
              />
            </FormField>
          </div>
        </div>
      ) : null}
    </span>
  );
}
