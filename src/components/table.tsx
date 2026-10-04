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

export function TableActionsButton({
  className,
  label = "Abrir menu de ações",
  ...props
}: TableActionsCellProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${className ?? ""}`}
      {...props}
    >
      <EllipsisVertical className="size-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

export function TableActionsCell({
  className,
  label,
  ...props
}: TableActionsCellProps) {
  return (
    <TableCell align="center" className={`w-14 px-sm ${className ?? ""}`}>
      <div className="flex justify-center">
        <TableActionsButton label={label} {...props} />
      </div>
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

type ResponsiveTableProps = {
  desktop: ReactNode;
  mobile: ReactNode;
  className?: string;
  viewport?: "auto" | "desktop" | "mobile";
};

export function ResponsiveTable({
  desktop,
  mobile,
  className,
  viewport = "auto",
}: ResponsiveTableProps) {
  if (viewport === "mobile") {
    return <div className={`flex w-full min-w-0 flex-col gap-sm ${className ?? ""}`}>{mobile}</div>;
  }

  if (viewport === "desktop") {
    return <div className={className}>{desktop}</div>;
  }

  return (
    <div className={className}>
      <div className="hidden min-[768px]:block">{desktop}</div>
      <div className="flex w-full min-w-0 flex-col gap-sm min-[768px]:hidden">{mobile}</div>
    </div>
  );
}

type TableMobileListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableMobileList({ children, className, ...props }: TableMobileListProps) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-sm ${className ?? ""}`} {...props}>
      {children}
    </div>
  );
}

type TableMobileToolbarProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableMobileToolbar({ children, className, ...props }: TableMobileToolbarProps) {
  return (
    <div
      className={`flex items-center gap-sm rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

type TableMobileCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function TableMobileCard({ children, className, ...props }: TableMobileCardProps) {
  return (
    <article
      className={`w-full min-w-0 rounded-lg border border-border-subtle bg-surface-card px-md pb-md pt-sm shadow-card ${className ?? ""}`}
      {...props}
    >
      {children}
    </article>
  );
}

type TableMobileCardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableMobileCardHeader({ children, className, ...props }: TableMobileCardHeaderProps) {
  return (
    <div
      className={`grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-sm ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

type TableMobileTitleProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function TableMobileTitle({ children, className, ...props }: TableMobileTitleProps) {
  return (
    <p className={`min-w-0 text-label-lg leading-tight text-on-surface ${className ?? ""}`} {...props}>
      {children}
    </p>
  );
}

type TableMobileFieldsProps = HTMLAttributes<HTMLDListElement> & {
  children: ReactNode;
};

export function TableMobileFields({ children, className, ...props }: TableMobileFieldsProps) {
  return (
    <dl
      className={`mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm ${className ?? ""}`}
      {...props}
    >
      {children}
    </dl>
  );
}

type TableMobileFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
};

export function TableMobileField({ label, children, className, valueClassName }: TableMobileFieldProps) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-md ${className ?? ""}`}>
      <dt className="min-w-0 text-label-md text-on-surface-variant">{label}</dt>
      <dd className={`shrink-0 text-body-md text-on-surface ${valueClassName ?? ""}`}>{children}</dd>
    </div>
  );
}

type TableMobileEmptyProps = {
  children: ReactNode;
  className?: string;
};

export function TableMobileEmpty({ children, className }: TableMobileEmptyProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
