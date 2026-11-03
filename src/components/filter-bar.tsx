import type { FormEvent } from "react";
import { Filter, RotateCcw } from "lucide-react";
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
  /** Campo de busca apenas informativo (ex.: relatórios sem busca textual). */
  searchReadOnly?: boolean;
};

const FILTER_COLS_DESKTOP = 4;

const filterShellClass =
  "flex w-full min-w-0 flex-col gap-md rounded-lg border border-border-subtle bg-surface-subtle p-md";

const desktopRowClass = "grid w-full min-w-0 grid-cols-4 gap-md";

const mobileGridClass = "grid min-w-0 grid-cols-2 gap-sm min-[768px]:hidden";

const fieldCellClass = "min-w-0";

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length === 0) return [];
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function mobileSpanClass(field: FilterField): string {
  if (field.type === "period") {
    return "col-span-2";
  }
  return "col-span-1";
}

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
  searchReadOnly = false,
}: FilterBarProps) {
  const searchInputClass = searchReadOnly
    ? "h-control! cursor-not-allowed bg-surface-subtle text-on-surface-variant"
    : "h-control!";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  function renderFieldControl(field: FilterField, controlId: string) {
    if (field.type === "date" || field.type === "number") {
      return (
        <Input
          id={controlId}
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
        <PeriodInput id={controlId} className="h-control!" value={field.value} onChange={field.onChange} />
      );
    }
    return (
      <Select
        id={controlId}
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
    );
  }

  function renderSearchField(id: string) {
    return (
      <FormField label={searchLabel} htmlFor={id}>
        <Input
          id={id}
          className={searchInputClass}
          value={searchValue}
          readOnly={searchReadOnly}
          aria-readonly={searchReadOnly}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </FormField>
    );
  }

  function renderFilterField(field: FilterField, controlId: string) {
    return (
      <FormField label={field.label} htmlFor={controlId}>
        {renderFieldControl(field, controlId)}
      </FormField>
    );
  }

  const desktopSlots = [
    { key: "search", node: renderSearchField(searchId) },
    ...fields.map((field) => ({
      key: field.id,
      node: renderFilterField(field, field.id),
    })),
  ];

  const desktopRows = chunk(desktopSlots, FILTER_COLS_DESKTOP);

  const mobileSearchId = `${searchId}-mobile`;

  const actionButtons = (
    <>
      <Button type="button" variant="surface" size="sm" onClick={onClear}>
        <Icon icon={RotateCcw} size="sm" />
        {clearLabel}
      </Button>
      <Button type="submit" variant="primary" size="sm">
        <Icon icon={Filter} size="sm" />
        {applyLabel}
      </Button>
    </>
  );

  return (
    <form onSubmit={handleSubmit} className={filterShellClass}>
      <div className="hidden min-w-0 flex-col gap-md min-[768px]:flex">
        {desktopRows.map((row, rowIndex) => (
          <div key={`filter-row-${rowIndex}`} className={desktopRowClass}>
            {row.map((slot) => (
              <div key={slot.key} className={fieldCellClass}>
                {slot.node}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={mobileGridClass}>
        <div className={`${fieldCellClass} col-span-2`}>{renderSearchField(mobileSearchId)}</div>
        {fields.map((field) => (
          <div key={`${field.id}-mobile`} className={`${fieldCellClass} ${mobileSpanClass(field)}`}>
            {renderFilterField(field, `${field.id}-mobile`)}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-sm">{actionButtons}</div>
    </form>
  );
}
