"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, EllipsisVertical, FileSpreadsheet, FileText, Sheet, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";
import { Checkbox } from "@/components/input";

const formatosExportacao: Array<{ id: string; label: string; description: string; icon: LucideIcon }> = [
  {
    id: "csv",
    label: "CSV",
    description: "Planilha com separador ; (Excel pt-BR)",
    icon: FileSpreadsheet,
  },
  {
    id: "xls",
    label: "XLS",
    description: "Arquivo Excel (.xlsx)",
    icon: Sheet,
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Documento para impressão ou envio",
    icon: FileText,
  },
];

export type TableExportFormat = "csv" | "xls" | "pdf";

function TableExport({ onExport }: { onExport?: (format: TableExportFormat) => void }) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    function place() {
      if (!button || !menu) return;
      const buttonRect = button.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const menuWidth = menu.offsetWidth;
      const gap = 4;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const openUp = spaceBelow < menuHeight + gap && buttonRect.top > spaceBelow;
      const top = openUp ? buttonRect.top - gap - menuHeight : buttonRect.bottom + gap;
      let left = buttonRect.right - menuWidth;
      const minLeft = 8;
      const maxLeft = window.innerWidth - menuWidth - 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = Math.max(minLeft, maxLeft);
      menu.style.top = `${Math.max(8, top)}px`;
      menu.style.left = `${left}px`;
    }

    place();
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeIfHidden() {
      const button = buttonRef.current;
      if (!button || button.getClientRects().length === 0) setOpen(false);
    }

    closeIfHidden();
    window.addEventListener("resize", closeIfHidden);
    return () => window.removeEventListener("resize", closeIfHidden);
  }, [open]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const menu = menuRef.current;
    if (!menu) return;
    const items = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const current = items.findIndex((item) => item === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[current <= 0 ? items.length - 1 : current - 1]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="inline-flex h-control-sm cursor-pointer items-center gap-sm rounded-md border border-border-subtle bg-surface-card px-md text-label-md text-on-surface shadow-card transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <Icon icon={Download} size="sm" />
        Exportar
        <Icon icon={ChevronDown} size="sm" className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && isClient
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Formato do arquivo"
              onKeyDown={onMenuKeyDown}
              className="fixed z-40 w-80 overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-xs shadow-popover"
            >
              <p className="px-md pb-xs pt-sm text-label-md text-on-surface-variant">Formato do arquivo</p>
              {formatosExportacao.map((formato) => (
                <button
                  key={formato.id}
                  type="button"
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-sm px-md py-sm text-left hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass"
                  onClick={() => {
                    onExport?.(formato.id as TableExportFormat);
                    setOpen(false);
                  }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-primary-container">
                    <Icon icon={formato.icon} size="sm" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label-lg text-on-surface">{formato.label}</span>
                    <span className="block text-body-sm text-on-surface-variant">{formato.description}</span>
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function TableExportBar({ onExport }: { onExport?: (format: TableExportFormat) => void }) {
  return (
    <div className="flex justify-end">
      <TableExport onExport={onExport} />
    </div>
  );
}

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  containerClassName?: string;
  showExport?: boolean;
};

export function Table({ className, containerClassName, children, showExport = true, ...props }: TableProps) {
  return (
    <div className="flex flex-col gap-sm">
      {showExport ? <TableExportBar /> : null}
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
    </div>
  );
}

export { TableExport };

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

export type TableAction = {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  destructive?: boolean;
};

type TableActionsButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> & {
  label?: string;
  actions?: TableAction[];
};

export function TableActionsButton({
  className,
  label = "Abrir menu de ações",
  actions,
  onClick,
  onKeyDown,
  ...props
}: TableActionsButtonProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const hasMenu = Boolean(actions?.length);

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    function place() {
      if (!button || !menu) return;
      const buttonRect = button.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const menuWidth = menu.offsetWidth;
      const gap = 4;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const openUp = spaceBelow < menuHeight + gap && buttonRect.top > spaceBelow;
      const top = openUp ? buttonRect.top - gap - menuHeight : buttonRect.bottom + gap;
      let left = buttonRect.right - menuWidth;
      const minLeft = 8;
      const maxLeft = window.innerWidth - menuWidth - 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = Math.max(minLeft, maxLeft);
      menu.style.top = `${Math.max(8, top)}px`;
      menu.style.left = `${left}px`;
    }

    place();
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const menu = menuRef.current;
    if (!menu) return;
    const items = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const current = items.findIndex((item) => item === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[current <= 0 ? items.length - 1 : current - 1]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup={hasMenu ? "menu" : undefined}
        aria-expanded={hasMenu ? open : undefined}
        aria-controls={hasMenu && open ? menuId : undefined}
        className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${className ?? ""}`}
        onClick={(event) => {
          if (hasMenu) {
            setOpen((current) => !current);
            return;
          }
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || !hasMenu) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        {...props}
      >
        <EllipsisVertical className="size-5" strokeWidth={2} aria-hidden="true" />
      </button>
      {hasMenu && open && isClient
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              onKeyDown={onMenuKeyDown}
              className="fixed z-40 min-w-40 overflow-hidden rounded-lg border border-border-subtle bg-surface-card py-xs shadow-popover"
            >
              {actions?.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={`flex min-h-11 w-full cursor-pointer items-center gap-sm px-md text-left text-body-md hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass ${
                    action.destructive ? "text-status-critical" : "text-on-surface"
                  }`}
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                >
                  {action.icon ? <Icon icon={action.icon} size="sm" /> : null}
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function TableActionsCell({
  className,
  label,
  actions,
  ...props
}: TableActionsButtonProps) {
  return (
    <TableCell align="center" className={`w-14 px-sm ${className ?? ""}`}>
      <div className="flex justify-center">
        <TableActionsButton label={label} actions={actions} {...props} />
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
    return (
      <div className={`flex w-full min-w-0 flex-col gap-sm ${className ?? ""}`}>
        <TableExportBar />
        {mobile}
      </div>
    );
  }

  if (viewport === "desktop") {
    return <div className={className}>{desktop}</div>;
  }

  return (
    <div className={className}>
      <div className="hidden min-[768px]:block">{desktop}</div>
      <div className="flex w-full min-w-0 flex-col gap-sm min-[768px]:hidden">
        <TableExportBar />
        {mobile}
      </div>
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
