"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";

export type IconChoiceOption = {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
};

type IconChoiceGroupProps = {
  id?: string;
  name?: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: IconChoiceOption[];
  invalid?: boolean;
  /** Vários toggles (ex.: canais). Só em `layout="row"` ou `grid`. */
  multiple?: boolean;
  /** `grid`: grade; `row`: ícones na mesma linha; `segmented`: barra (2+ opções curtas). */
  layout?: "grid" | "row" | "segmented";
  labelledBy?: string;
  ariaLabel?: string;
  className?: string;
};

function opcaoSelecionada(value: string | string[], optionValue: string) {
  return Array.isArray(value) ? value.includes(optionValue) : value === optionValue;
}

function grupoSemSelecao(value: string | string[]) {
  return Array.isArray(value) ? value.length === 0 : !value;
}

function alternarMultiplo(value: string[], optionValue: string) {
  if (value.includes(optionValue)) return value.filter((item) => item !== optionValue);
  return [...value, optionValue];
}

const foco =
  "cursor-pointer focus-visible:z-[1] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brass/20 focus-visible:border-brass";

function colunasGrade(total: number) {
  if (total <= 2) return 2;
  if (total <= 4) return 2;
  return 3;
}

function rotulo(option: IconChoiceOption) {
  return option.shortLabel ?? option.label;
}

function IconeOpcao({
  option,
  selecionado,
}: {
  option: IconChoiceOption;
  selecionado: boolean;
}) {
  const iconeClass = selecionado ? "text-on-primary" : "text-on-surface-variant";
  if (option.iconNode) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center [&_svg]:size-4 ${iconeClass}`}>
        {option.iconNode}
      </span>
    );
  }
  if (option.icon) {
    return <Icon icon={option.icon} size="sm" className={`shrink-0 ${iconeClass}`} />;
  }
  return null;
}

function classeOpcao(selecionado: boolean, grupoInvalido: boolean) {
  if (selecionado) {
    return "border-primary-container bg-primary-fixed-dim text-on-surface shadow-sm";
  }
  if (grupoInvalido) {
    return "border-border-strong bg-surface-card text-on-surface-variant hover:border-status-critical/70 hover:bg-surface-subtle";
  }
  return "border-border-strong bg-surface-card text-on-surface-variant hover:border-border-strong hover:bg-surface-subtle hover:text-on-surface";
}

function OpcaoQuadrada({
  option,
  selecionado,
  optionId,
  name,
  grupoInvalido,
  onSelect,
}: {
  option: IconChoiceOption;
  selecionado: boolean;
  optionId?: string;
  name?: string;
  grupoInvalido: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      id={optionId}
      type="button"
      role="radio"
      name={name}
      aria-checked={selecionado}
      aria-label={option.label}
      title={option.label}
      onClick={onSelect}
      className={[
        `flex h-[4.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 transition-colors ${foco}`,
        classeOpcao(selecionado, grupoInvalido),
      ].join(" ")}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
          selecionado ? "bg-primary-container" : "bg-surface-container"
        }`}
        aria-hidden
      >
        <IconeOpcao option={option} selecionado={selecionado} />
      </span>
      <span className="line-clamp-1 w-full px-0.5 text-center text-[11px] font-semibold leading-tight">
        {rotulo(option)}
      </span>
    </button>
  );
}

function OpcaoLinha({
  option,
  selecionado,
  optionId,
  name,
  multiple,
  grupoInvalido,
  onSelect,
}: {
  option: IconChoiceOption;
  selecionado: boolean;
  optionId?: string;
  name?: string;
  multiple?: boolean;
  grupoInvalido: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      id={optionId}
      type="button"
      role={multiple ? undefined : "radio"}
      name={multiple ? undefined : name}
      aria-checked={multiple ? undefined : selecionado}
      aria-pressed={multiple ? selecionado : undefined}
      aria-label={option.label}
      title={option.label}
      onClick={onSelect}
      className={[
        `flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg border px-0.5 transition-colors ${foco}`,
        classeOpcao(selecionado, grupoInvalido),
      ].join(" ")}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
          selecionado ? "bg-primary-container" : "bg-surface-container"
        }`}
        aria-hidden
      >
        <IconeOpcao option={option} selecionado={selecionado} />
      </span>
      <span className="sr-only">{option.label}</span>
    </button>
  );
}

export function IconChoiceGroup({
  id,
  name,
  value,
  onChange,
  options,
  invalid = false,
  multiple = false,
  layout = "grid",
  labelledBy,
  ariaLabel,
  className = "",
}: IconChoiceGroupProps) {
  const grupoInvalido = invalid && grupoSemSelecao(value);

  if (layout === "segmented" && options.length <= 4 && !multiple) {
    return (
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-invalid={invalid || undefined}
        className={`flex w-full gap-sm ${className}`}
      >
        {options.map((option) => {
          const selecionado = opcaoSelecionada(value, option.value);
          const optionId = id ? `${id}-${option.value.replace(/\s+/g, "-").toLowerCase()}` : undefined;
          return (
            <button
              key={option.value}
              id={optionId}
              type="button"
              role="radio"
              name={name}
              aria-checked={selecionado}
              onClick={() => onChange(option.value)}
              className={[
                `flex h-input min-w-0 flex-1 items-center justify-center gap-sm rounded-lg border px-md text-body-md font-semibold transition-colors ${foco}`,
                classeOpcao(selecionado, grupoInvalido),
              ].join(" ")}
            >
              <IconeOpcao option={option} selecionado={selecionado} />
              <span className="truncate">{rotulo(option)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (layout === "row") {
    return (
      <div
        id={id}
        role={multiple ? "group" : "radiogroup"}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-invalid={invalid || undefined}
        className={`flex w-full gap-1 ${className}`}
      >
        {options.map((option) => {
          const selecionado = opcaoSelecionada(value, option.value);
          const optionId = id ? `${id}-${option.value.replace(/\s+/g, "-").toLowerCase()}` : undefined;
          return (
            <OpcaoLinha
              key={option.value}
              option={option}
              selecionado={selecionado}
              optionId={optionId}
              name={name}
              multiple={multiple}
              grupoInvalido={grupoInvalido}
              onSelect={() => {
                if (multiple && Array.isArray(value)) {
                  onChange(alternarMultiplo(value, option.value));
                  return;
                }
                onChange(option.value);
              }}
            />
          );
        })}
      </div>
    );
  }

  const cols = colunasGrade(options.length);
  const gradeCols = cols === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-invalid={invalid || undefined}
      className={`grid w-full gap-sm ${gradeCols} ${className}`}
    >
      {options.map((option) => {
        const selecionado = opcaoSelecionada(value, option.value);
        const optionId = id ? `${id}-${option.value.replace(/\s+/g, "-").toLowerCase()}` : undefined;
        return (
          <OpcaoQuadrada
            key={option.value}
            option={option}
            selecionado={selecionado}
            optionId={optionId}
            name={name}
            grupoInvalido={grupoInvalido}
            onSelect={() => {
              if (multiple && Array.isArray(value)) {
                onChange(alternarMultiplo(value, option.value));
                return;
              }
              onChange(option.value);
            }}
          />
        );
      })}
    </div>
  );
}
