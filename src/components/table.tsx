"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useEffect, useRef } from "react";
import { EllipsisVertical } from "lucide-react";
import { Checkbox } from "@/components/input";

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  containerClassName?: string;
};

export function Table({ className, containerClassName, children, ...props }: TableProps) {
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-border-subtle bg-surface-card shadow-card ${containerClassName ?? ""}`}
    >
      <table
        className={`w-full min-w-[32rem] table-fixed border-collapse text-left text-body-md ${className ?? ""}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className={`px-md pb-sm pt-md text-body-sm text-on-surface-variant ${className ?? ""}`} {...props} />
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-surface-subtle ${className ?? ""}`} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={`border-t border-border-subtle/40 bg-surface-subtle font-medium ${className ?? ""}`} {...props} />
  );
}

const rowBorderClass = "border-b border-border-subtle/30";

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`${rowBorderClass} transition-colors last:border-b-0 hover:bg-gold-subtle/25 ${className ?? ""}`}
      {...props}
    />
  );
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

type Align = keyof typeof alignClass;

export type TableSortDirection = "asc" | "desc" | "none";

type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: Align;
  sortable?: boolean;
  sortDirection?: TableSortDirection;
  onSort?: () => void;
  actions?: boolean;
  selection?: boolean;
  selectionChecked?: boolean;
  selectionIndeterminate?: boolean;
  onSelectionChange?: (checked: boolean) => void;
  selectionLabel?: string;
  selectionDisabled?: boolean;
};

function TableSelectionCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  indeterminate?: boolean;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate, checked]);

  return (
    <Checkbox
      ref={ref}
      checked={checked}
      onChange={onChange}
      aria-label={label}
      {...props}
    />
  );
}

function SortIcon({ direction }: { direction: TableSortDirection }) {
  const inactiveClass = "fill-on-primary-container";
  const activeClass = "fill-brass";

  return (
    <svg
      viewBox="0 0 8 10"
      className="h-2.5 w-2 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 0 8 3.5H0Z"
        className={direction === "asc" ? activeClass : inactiveClass}
      />
      <path
        d="M4 10 0 6.5h8Z"
        className={direction === "desc" ? activeClass : inactiveClass}
      />
    </svg>
  );
}

export function TableHead({
  className,
  align = "left",
  sortable = false,
  sortDirection = "none",
  onSort,
  actions = false,
  selection = false,
  selectionChecked = false,
  selectionIndeterminate = false,
  onSelectionChange,
  selectionLabel = "Selecionar todos",
  selectionDisabled = false,
  children,
  ...props
}: TableHeadProps) {
  if (selection) {
    return (
      <th
        scope="col"
        className={`w-12 px-md py-md text-center ${className ?? ""}`}
        {...props}
      >
        <div className="flex justify-center">
          <TableSelectionCheckbox
            checked={selectionChecked}
            disabled={selectionDisabled}
            indeterminate={selectionIndeterminate}
            label={selectionLabel}
            onChange={(event) => onSelectionChange?.(event.target.checked)}
          />
        </div>
      </th>
    );
  }

  if (actions) {
    return (
      <th
        scope="col"
        className={`w-20 px-md py-md text-center text-label-lg text-primary-container ${className ?? ""}`}
        {...props}
      >
        Ação
      </th>
    );
  }

  const headClass = `px-md py-md text-label-lg text-primary-container ${alignClass[align]} ${className ?? ""}`;

  if (!sortable) {
    return (
      <th scope="col" className={headClass} {...props}>
        {children}
      </th>
    );
  }

  return (
    <th scope="col" className={headClass} {...props}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-sm text-label-lg text-primary-container transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        aria-label={
          sortDirection === "asc"
            ? `Ordenar ${children} decrescente`
            : sortDirection === "desc"
              ? `Remover ordenação de ${children}`
              : `Ordenar ${children} crescente`
        }
      >
        <span>{children}</span>
        <SortIcon direction={sortDirection} />
      </button>
    </th>
  );
}

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: Align;
};

export function TableCell({ className, align = "left", ...props }: TableCellProps) {
  return (
    <td className={`px-md py-sm text-on-surface ${alignClass[align]} ${className ?? ""}`} {...props} />
  );
}

type TableSelectCellProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: string;
  className?: string;
};

export function TableSelectCell({
  checked,
  onCheckedChange,
  label,
  className,
  ...props
}: TableSelectCellProps) {
  return (
    <TableCell align="center" className={`w-12 px-md ${className ?? ""}`}>
      <div className="flex justify-center">
        <Checkbox
          checked={checked}
          aria-label={label}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
          {...props}
        />
      </div>
    </TableCell>
  );
}

type TableActionsCellProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  label?: string;
};

export function TableActionsCell({
  className,
  label = "Abrir menu de ações",
  ...props
}: TableActionsCellProps) {
  return (
    <TableCell align="center" className={`w-14 px-sm ${className ?? ""}`}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        {...props}
      >
        <EllipsisVertical className="size-5" strokeWidth={2} aria-hidden="true" />
      </button>
    </TableCell>
  );
}

type TableEmptyProps = {
  colSpan: number;
  children: ReactNode;
  className?: string;
};

export function TableEmpty({ colSpan, children, className }: TableEmptyProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className={`w-full p-0 ${className ?? ""}`}>
        <div className="w-full min-w-0">{children}</div>
      </TableCell>
    </TableRow>
  );
}
