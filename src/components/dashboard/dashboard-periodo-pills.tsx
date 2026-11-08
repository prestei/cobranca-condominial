"use client";

import { CalendarDays } from "lucide-react";
import { Icon } from "@/components/icon";
import type { PeriodPreset, PeriodValue } from "@/lib/periodo";

const ATALHOS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "anterior", label: "Mês anterior" },
  { id: "personalizado", label: "Personalizado" },
];

type Props = {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  titulo?: string;
};

export function DashboardPeriodoPills({ value, onChange, titulo = "Resumo do período" }: Props) {
  const ativo = value.preset;

  function escolher(preset: PeriodPreset) {
    if (preset === "personalizado") {
      onChange({ preset: "personalizado", de: value.de, ate: value.ate });
      return;
    }
    onChange({ preset, de: "", ate: "" });
  }

  return (
    <div className="flex flex-col gap-md min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
      <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
      <div
        className="flex flex-wrap items-center gap-xs rounded-full border border-border-subtle bg-surface-card p-xs shadow-card"
        role="group"
        aria-label="Período do resumo"
      >
        {ATALHOS.map((item) => {
          const selecionado = ativo === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selecionado}
              onClick={() => escolher(item.id)}
              className={[
                "inline-flex h-9 items-center gap-xs rounded-full px-md text-body-sm font-semibold transition-colors",
                selecionado
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface",
              ].join(" ")}
            >
              {item.id === "personalizado" ? <Icon icon={CalendarDays} size="sm" /> : null}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
