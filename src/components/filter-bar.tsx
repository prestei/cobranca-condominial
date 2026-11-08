import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
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
  /** `toolbar`: uma linha (mockup fila de cobranças) — busca com ícone, selects «Label: valor», Filtrar com funil. */
  variant?: "default" | "toolbar";
  /** Com `variant="toolbar"`, distribui busca/cargo/situação em proporções fixas no desktop. */
  toolbarLayout?: "flex" | "proportional";
  /** Layout mobile da fila de cobranças (somente &lt;768px). Desktop permanece toolbar. */
  toolbarMobile?: "fila";
  /** Variante mobile do layout `default`: grade 2 colunas em card (ex.: Inadimplência). */
  defaultMobile?: "grid";
  /** `false` evita `<form>` aninhado quando o FilterBar está dentro de outro formulário (ex.: prévia no Sheet). */
  useFormElement?: boolean;
};

type FilterShellProps = {
  useFormElement: boolean;
  onApply: () => void;
  className?: string;
  children: ReactNode;
};

function FilterShell({ useFormElement, onApply, className, children }: FilterShellProps) {
  if (useFormElement) {
    return (
      <form
        className={className}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onApply();
        }}
      >
        {children}
      </form>
    );
  }

  return (
    <div
      role="search"
      className={className}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.defaultPrevented) return;
        const target = event.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        ) {
          event.preventDefault();
          onApply();
        }
      }}
    >
      {children}
    </div>
  );
}

function applyButtonProps(useFormElement: boolean, onApply: () => void) {
  return useFormElement
    ? ({ type: "submit" as const })
    : ({ type: "button" as const, onClick: () => onApply() });
}

const filaMobileFieldIcons: Record<string, LucideIcon> = {
  condominio: Building2,
  situacao: AlertTriangle,
  re: User,
  retorno: RotateCcw,
};

const inadimplenciaMobileFieldIcons: Record<string, LucideIcon> = {
  periodo: Calendar,
  "data-base": Calendar,
  limite: Clock,
  condominio: Building2,
  unidade: Building2,
  administradora: Building2,
  cidade: MapPin,
  advogado: User,
  situacao: AlertTriangle,
  origem: Upload,
};

function FilaMobileFieldLabel({ icon, htmlFor, children }: { icon: LucideIcon; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-xs text-label-lg text-primary-container">
      <Icon icon={icon} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden />
      {children}
    </label>
  );
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
  variant = "default",
  toolbarLayout = "flex",
  toolbarMobile,
  defaultMobile,
  useFormElement = true,
}: FilterBarProps) {
  const searchInputClass = searchReadOnly
    ? "h-control! cursor-not-allowed bg-surface-subtle text-on-surface-variant"
    : "h-control!";
  /** Sobrescreve o `pl` padrão de `formControlClassName` quando há ícone absoluto à esquerda. */
  const searchInputWithIconClass = `${searchInputClass} !pl-[calc(var(--spacing-md)+1.125rem)]`;
  const filtrarButtonProps = applyButtonProps(useFormElement, onApply);

  function renderFieldControl(field: FilterField, options?: { toolbarPrefix?: boolean }) {
    const useToolbarPrefix = options?.toolbarPrefix ?? variant === "toolbar";
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
        prefixLabel={useToolbarPrefix ? field.label : undefined}
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
        ? "hidden min-[768px]:grid min-[768px]:grid-cols-2 min-[768px]:gap-md min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-border-subtle min-[768px]:bg-surface-card min-[768px]:p-md min-[768px]:shadow-card min-[1024px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] min-[1024px]:items-center"
        : "hidden min-[768px]:flex min-[768px]:flex-col min-[768px]:gap-md min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-border-subtle min-[768px]:bg-surface-card min-[768px]:p-md min-[768px]:shadow-card min-[1100px]:flex-row min-[1100px]:flex-wrap min-[1100px]:items-center";

    const searchWrapClass =
      toolbarLayout === "proportional"
        ? "relative min-w-0 min-[1024px]:col-span-1"
        : "relative min-w-[12rem] min-[768px]:flex-1 min-[768px]:basis-[14rem]";

    const fieldWrapClass =
      toolbarLayout === "proportional"
        ? "min-w-0"
        : "min-w-[9.5rem] min-[768px]:flex-1 min-[768px]:basis-[11rem]";

    const actionsWrapClass =
      toolbarLayout === "proportional"
        ? "flex shrink-0 items-center justify-end gap-sm min-[1024px]:justify-end"
        : "flex shrink-0 items-center justify-end gap-sm min-[1100px]:ml-auto";

    const desktopToolbar = (
      <FilterShell useFormElement={useFormElement} onApply={onApply} className={toolbarFormClass}>
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
            className={searchInputWithIconClass}
            value={searchValue}
            readOnly={searchReadOnly}
            aria-readonly={searchReadOnly}
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
          <Button size="sm" {...filtrarButtonProps}>
            <Icon icon={Filter} size="sm" />
            {applyLabel}
          </Button>
        </div>
      </FilterShell>
    );

    if (toolbarMobile !== "fila") {
      return (
        <FilterShell
          useFormElement={useFormElement}
          onApply={onApply}
          className={
            toolbarLayout === "proportional"
              ? "grid grid-cols-2 gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[1024px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_auto] min-[1024px]:items-center"
              : "flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[1100px]:flex-row min-[1100px]:flex-wrap min-[1100px]:items-center"
          }
        >
          <div
            className={
              toolbarLayout === "proportional"
                ? "relative col-span-2 min-w-0 min-[1024px]:col-span-1"
                : "relative min-w-0 min-[1100px]:min-w-[12rem] min-[1100px]:flex-1 min-[1100px]:basis-[14rem]"
            }
          >
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
              className={searchInputWithIconClass}
              value={searchValue}
              readOnly={searchReadOnly}
              aria-readonly={searchReadOnly}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          {fields.map((field) => (
            <div
              key={field.id}
              className={
                toolbarLayout === "proportional"
                  ? "min-w-0"
                  : "min-w-0 min-[1100px]:min-w-[9.5rem] min-[1100px]:flex-1 min-[1100px]:basis-[11rem]"
              }
            >
              <label htmlFor={field.id} className="sr-only">
                {field.label}
              </label>
              {renderFieldControl(field)}
            </div>
          ))}

          <div
            className={
              toolbarLayout === "proportional"
                ? "col-span-2 flex w-full items-stretch gap-sm min-[1024px]:col-span-1 min-[1024px]:w-auto min-[1024px]:justify-end"
                : "flex w-full items-stretch gap-sm min-[1100px]:ml-auto min-[1100px]:w-auto min-[1100px]:justify-end"
            }
          >
            <Button type="button" variant="outline" size="sm" className="min-h-11 flex-1 min-[1100px]:flex-none" onClick={onClear}>
              <Icon icon={RotateCcw} size="sm" />
              {clearLabel}
            </Button>
            <Button size="sm" className="min-h-11 flex-[1.15] min-[1100px]:flex-none" {...filtrarButtonProps}>
              <Icon icon={Filter} size="sm" />
              {applyLabel}
            </Button>
          </div>
        </FilterShell>
      );
    }

    const mobileSearchId = `${searchId}-mobile`;

    return (
      <>
        <FilterShell
          useFormElement={useFormElement}
          onApply={onApply}
          className="flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:hidden"
        >
          <div className="flex flex-col gap-xs">
            <FilaMobileFieldLabel icon={Building2} htmlFor={mobileSearchId}>
              {searchLabel === "Buscar" ? "Condomínio" : searchLabel}
            </FilaMobileFieldLabel>
            <div className="relative">
              <Icon
                icon={Search}
                size="sm"
                className="pointer-events-none absolute top-1/2 left-[calc(var(--spacing-md)-2px)] -translate-y-1/2 text-on-surface-variant"
                aria-hidden
              />
              <Input
                id={mobileSearchId}
                className={searchInputWithIconClass}
                value={searchValue}
                readOnly={searchReadOnly}
                aria-readonly={searchReadOnly}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-sm">
            {fields.map((field) => {
              const fieldIcon = filaMobileFieldIcons[field.id] ?? Building2;
              return (
                <div key={field.id} className="flex min-w-0 flex-col gap-xs">
                  <FilaMobileFieldLabel icon={fieldIcon} htmlFor={`${field.id}-mobile`}>
                    {field.label}
                  </FilaMobileFieldLabel>
                  {field.type === "date" || field.type === "number" ? (
                    renderFieldControl({ ...field, id: `${field.id}-mobile` }, { toolbarPrefix: false })
                  ) : field.type === "period" ? (
                    renderFieldControl({ ...field, id: `${field.id}-mobile` }, { toolbarPrefix: false })
                  ) : (
                    <Select
                      id={`${field.id}-mobile`}
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
                </div>
              );
            })}
          </div>

          <div className="flex items-stretch gap-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 flex-[0.92] border-transparent bg-surface-subtle"
              onClick={onClear}
            >
              <Icon icon={RotateCcw} size="sm" />
              {clearLabel}
            </Button>
            <Button size="sm" className="min-h-11 flex-1" {...filtrarButtonProps}>
              <Icon icon={Filter} size="sm" />
              {applyLabel}
            </Button>
          </div>
        </FilterShell>
        {desktopToolbar}
      </>
    );
  }

  const desktopDefaultForm = (
    <FilterShell
      useFormElement={useFormElement}
      onApply={onApply}
      className={
        defaultMobile === "grid"
          ? "hidden flex-col gap-md rounded-lg border border-border-subtle bg-surface-subtle p-md min-[768px]:flex min-[768px]:flex-row min-[768px]:flex-wrap min-[768px]:items-end"
          : "flex flex-col gap-md rounded-lg border border-border-subtle bg-surface-subtle p-md min-[768px]:flex-row min-[768px]:flex-wrap min-[768px]:items-end"
      }
    >
      <div className="min-w-0 flex-1 basis-[12rem]">
        <FormField label={searchLabel} htmlFor={searchId}>
          <Input
            id={searchId}
            className={searchInputClass}
            value={searchValue}
            readOnly={searchReadOnly}
            aria-readonly={searchReadOnly}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </FormField>
      </div>

      {fields.map((field) => (
        <div key={field.id} className="min-w-0 flex-1 basis-[10rem]">
          <FormField label={field.label} htmlFor={field.id}>
            {renderFieldControl(field)}
          </FormField>
        </div>
      ))}

      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-sm min-[768px]:ml-auto min-[768px]:w-auto">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <Icon icon={RotateCcw} size="sm" />
          {clearLabel}
        </Button>
        <Button size="sm" {...filtrarButtonProps}>
          <Icon icon={Filter} size="sm" />
          {applyLabel}
        </Button>
      </div>
    </FilterShell>
  );

  if (defaultMobile !== "grid") {
    return desktopDefaultForm;
  }

  const mobileSearchId = `${searchId}-mobile`;

  return (
    <>
      <FilterShell
        useFormElement={useFormElement}
        onApply={onApply}
        className="flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:hidden"
      >
        <div className="flex flex-col gap-xs">
          <FilaMobileFieldLabel icon={Search} htmlFor={mobileSearchId}>
            {searchLabel}
          </FilaMobileFieldLabel>
          <Input
            id={mobileSearchId}
            className={searchInputClass}
            value={searchValue}
            readOnly={searchReadOnly}
            aria-readonly={searchReadOnly}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-sm">
          {fields.map((field) => {
            const fieldIcon = inadimplenciaMobileFieldIcons[field.id] ?? Building2;
            const spanFull = field.type === "period";
            return (
              <div
                key={field.id}
                className={`flex min-w-0 flex-col gap-xs${spanFull ? " col-span-2" : ""}`}
              >
                <FilaMobileFieldLabel icon={fieldIcon} htmlFor={`${field.id}-mobile`}>
                  {field.label}
                </FilaMobileFieldLabel>
                {renderFieldControl({ ...field, id: `${field.id}-mobile` }, { toolbarPrefix: false })}
              </div>
            );
          })}
        </div>

        <div className="flex items-stretch gap-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 flex-[0.92] border-transparent bg-surface-subtle"
            onClick={onClear}
          >
            <Icon icon={RotateCcw} size="sm" />
            {clearLabel}
          </Button>
          <Button size="sm" className="min-h-11 flex-1" {...filtrarButtonProps}>
            <Icon icon={Filter} size="sm" />
            {applyLabel}
          </Button>
        </div>
      </FilterShell>
      {desktopDefaultForm}
    </>
  );
}
