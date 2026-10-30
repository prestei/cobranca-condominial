import type { FormEvent } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input, Select } from "@/components/input";
import { PeriodInput, type PeriodValue } from "@/components/period-input";

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterSelectField = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  type?: "select";
};

export type FilterDateField = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "date";
};

export type FilterPeriodField = {
  id: string;
  label: string;
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  type: "period";
};

export type FilterNumberField = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "number";
  min?: number;
};

export type FilterField = FilterSelectField | FilterDateField | FilterPeriodField | FilterNumberField;

type FilterBarProps = {
  searchId?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  fields: FilterField[];
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
  /** `toolbar`: uma linha (mockup fila de cobranças) — busca com ícone, selects «Label: valor», Filtrar com funil. */
  variant?: "default" | "toolbar";
  /** Com `variant="toolbar"`, distribui busca/cargo/situação em proporções fixas no desktop. */
  toolbarLayout?: "flex" | "proportional";
};

export function FilterBar({
  searchId = "filter-search",
  searchValue,
  onSearchChange,
  searchLabel = "Buscar",
  searchPlaceholder = "Buscar...",
  fields,
  onApply,
  onClear,
  applyLabel = "Filtrar",
  clearLabel = "Limpar",
  variant = "default",
  toolbarLayout = "flex",
}: FilterBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  function renderFieldControl(field: FilterField) {
    if (field.type === "date" || field.type === "number") {
      return (
        <Input
          id={field.id}
          type={field.type}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.type === "number" ? field.min : undefined}
          className="h-control!"
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
        />
      );
    }
    if (field.type === "period") {
      return (
        <PeriodInput id={field.id} className="h-control!" value={field.value} onChange={field.onChange} />
      );
    }
    return (
      <Select
        id={field.id}
        className="h-control!"
        value={field.value}
        prefixLabel={variant === "toolbar" ? field.label : undefined}
        onChange={(event) => field.onChange(event.target.value)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (variant === "toolbar") {
    const toolbarFormClass =
      toolbarLayout === "proportional"
        ? "flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[1024px]:grid min-[1024px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] min-[1024px]:items-center min-[1024px]:gap-md"
        : "flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[1100px]:flex-row min-[1100px]:flex-wrap min-[1100px]:items-center";

    const searchWrapClass =
      toolbarLayout === "proportional"
        ? "relative min-w-0"
        : "relative min-w-[12rem] flex-1 basis-[14rem]";

    const fieldWrapClass =
      toolbarLayout === "proportional" ? "min-w-0" : "min-w-[9.5rem] flex-1 basis-[11rem]";

    const actionsWrapClass =
      toolbarLayout === "proportional"
        ? "flex shrink-0 items-center justify-end gap-sm min-[1024px]:justify-end"
        : "flex shrink-0 items-center justify-end gap-sm min-[1100px]:ml-auto";

    return (
      <form onSubmit={handleSubmit} className={toolbarFormClass}>
        <div className={searchWrapClass}>
          <label htmlFor={searchId} className="sr-only">
            {searchLabel}
          </label>
          <Icon
            icon={Search}
            size="sm"
            className="pointer-events-none absolute top-1/2 left-[calc(var(--spacing-md)-2px)] -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <Input
            id={searchId}
            className="h-control! pl-[calc(var(--spacing-md)+1.125rem)]"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        {fields.map((field) => (
          <div key={field.id} className={fieldWrapClass}>
            <label htmlFor={field.id} className="sr-only">
              {field.label}
            </label>
            {renderFieldControl(field)}
          </div>
        ))}

        <div className={actionsWrapClass}>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <Icon icon={RotateCcw} size="sm" />
            {clearLabel}
          </Button>
          <Button type="submit" size="sm">
            <Icon icon={Filter} size="sm" />
            {applyLabel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md rounded-lg border border-border-subtle bg-surface-subtle p-md">
      <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
        <FormField label={searchLabel} htmlFor={searchId}>
          <Input
            id={searchId}
            className="h-control!"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </FormField>

        {fields.map((field) => (
          <FormField key={field.id} label={field.label} htmlFor={field.id}>
            {renderFieldControl(field)}
          </FormField>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-sm">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <Icon icon={RotateCcw} size="sm" />
          {clearLabel}
        </Button>
        <Button type="submit" size="sm">
          <Icon icon={Filter} size="sm" />
          {applyLabel}
        </Button>
      </div>
    </form>
  );
}
