import type { FormEvent } from "react";
import { RotateCcw, Search } from "lucide-react";
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
}: FilterBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
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
            {field.type === "date" || field.type === "number" ? (
              <Input
                id={field.id}
                type={field.type}
                inputMode={field.type === "number" ? "numeric" : undefined}
                min={field.type === "number" ? field.min : undefined}
                className="h-control!"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              />
            ) : field.type === "period" ? (
              <PeriodInput
                id={field.id}
                className="h-control!"
                value={field.value}
                onChange={field.onChange}
              />
            ) : (
              <Select
                id={field.id}
                className="h-control!"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-sm">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <Icon icon={RotateCcw} size="sm" />
          {clearLabel}
        </Button>
        <Button type="submit" size="sm">
          <Icon icon={Search} size="sm" />
          {applyLabel}
        </Button>
      </div>
    </form>
  );
}
