import type { FormEvent } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Input, Select } from "@/components/input";

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
};

type FilterBarProps = {
  searchId?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  fields: FilterSelectField[];
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
};

export function FilterBar({
  searchId = "filter-search",
  searchValue,
  onSearchChange,
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

  const columnClassNames = [
    "min-[768px]:grid-cols-1",
    "min-[768px]:grid-cols-2",
    "min-[768px]:grid-cols-3",
    "min-[768px]:grid-cols-4",
    "min-[768px]:grid-cols-5",
    "min-[768px]:grid-cols-6",
  ];
  const columnClassName = columnClassNames[Math.min(fields.length, columnClassNames.length - 1)];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md rounded-lg border border-border-subtle bg-surface-subtle p-md">
      <div className={`grid grid-cols-1 gap-md ${columnClassName}`}>
        <Input
          id={searchId}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />

        {fields.map((field) => (
          <Select
            key={field.id}
            id={field.id}
            aria-label={field.label}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
