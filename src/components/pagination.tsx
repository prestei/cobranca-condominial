"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/icon";

export const PAGE_SIZE = 20;

type PaginationProps = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
};

function itemClass(current: boolean) {
  return [
    "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-body-sm tabular-nums transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
    "disabled:cursor-not-allowed disabled:opacity-40",
    current
      ? "bg-primary-container font-semibold text-on-primary"
      : "text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface",
  ].join(" ");
}

export function Pagination({ page, total, onPageChange, pageSize = PAGE_SIZE }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const pages: Array<number | "gap"> = [];
  if (pageCount <= 7) {
    for (let number = 1; number <= pageCount; number += 1) pages.push(number);
  } else {
    const start = Math.max(2, current - 1);
    const end = Math.min(pageCount - 1, current + 1);
    pages.push(1);
    if (start > 2) pages.push("gap");
    for (let number = start; number <= end; number += 1) pages.push(number);
    if (end < pageCount - 1) pages.push("gap");
    pages.push(pageCount);
  }

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-sm min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between"
    >
      <p className="text-body-sm text-on-surface-variant tabular-nums">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-xs">
        <button
          type="button"
          className={itemClass(false)}
          disabled={current <= 1}
          aria-label="Página anterior"
          onClick={() => onPageChange(current - 1)}
        >
          <Icon icon={ChevronLeft} size="sm" />
        </button>
        {pages.map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-xs text-body-sm text-on-surface-variant" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={itemClass(item === current)}
              aria-label={`Página ${item}`}
              aria-current={item === current ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={itemClass(false)}
          disabled={current >= pageCount}
          aria-label="Próxima página"
          onClick={() => onPageChange(current + 1)}
        >
          <Icon icon={ChevronRight} size="sm" />
        </button>
      </div>
    </nav>
  );
}
