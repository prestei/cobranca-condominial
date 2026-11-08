import type { HTMLAttributes, ReactNode } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Bloco base de loading — pulse suave, tokens de superfície. */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-md bg-surface-container motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}

type SkeletonStatusProps = {
  label?: string;
  className?: string;
  children: ReactNode;
};

/** Wrapper acessível para qualquer composição de skeleton. */
export function SkeletonStatus({ label = "Carregando", className = "", children }: SkeletonStatusProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-sm ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-3.5 ${index === lines - 1 && lines > 1 ? "w-[66%]" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonMetricCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-full min-w-0 items-start gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card ${className}`}
    >
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-sm">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonMetrics({
  count = 4,
  desktopCols = 4,
  className = "",
  label = "Carregando indicadores",
  withStatus = true,
}: {
  count?: number;
  desktopCols?: 2 | 3 | 4 | 5;
  className?: string;
  label?: string;
  withStatus?: boolean;
}) {
  const desktopColsClass: Record<2 | 3 | 4 | 5, string> = {
    2: "min-[768px]:grid-cols-2",
    3: "min-[768px]:grid-cols-3",
    4: "min-[768px]:grid-cols-4",
    5: "min-[768px]:grid-cols-2 min-[1024px]:grid-cols-5",
  };
  const items = Array.from({ length: count }, (_, index) => index);

  const body = (
    <>
      <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2 min-[768px]:hidden">
        {items.map((index) => (
          <SkeletonMetricCard key={index} />
        ))}
      </div>
      <div className={`hidden grid-cols-1 gap-md min-[768px]:grid ${desktopColsClass[desktopCols]}`}>
        {items.map((index) => (
          <SkeletonMetricCard key={index} />
        ))}
      </div>
    </>
  );

  if (!withStatus) {
    return <div className={className}>{body}</div>;
  }

  return (
    <SkeletonStatus label={label} className={className}>
      {body}
    </SkeletonStatus>
  );
}

export function SkeletonFilterBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border-subtle bg-surface-subtle p-md ${className}`}
      aria-hidden="true"
    >
      <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2 min-[768px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-xs">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-input w-full rounded-md" />
          </div>
        ))}
        <div className="col-span-full flex justify-end gap-sm">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 6,
  cols = 5,
  className = "",
  label = "Carregando listagem",
  withStatus = true,
}: {
  rows?: number;
  cols?: number;
  className?: string;
  label?: string;
  withStatus?: boolean;
}) {
  const body = (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-card min-[768px]:block">
        <div className="flex gap-md border-b border-border-subtle bg-surface-subtle px-md py-sm">
          {Array.from({ length: cols }, (_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>
        <div className="flex flex-col">
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex gap-md border-b border-border-subtle/40 px-md py-md last:border-b-0"
            >
              {Array.from({ length: cols }, (_, col) => (
                <Skeleton
                  key={col}
                  className={`h-3.5 flex-1 ${col === 0 ? "max-w-[40%]" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-sm min-[768px]:hidden" aria-hidden="true">
        {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card"
          >
            <div className="flex items-center justify-between gap-md">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[66%]" />
          </div>
        ))}
      </div>
    </>
  );

  if (!withStatus) {
    return <div className={className}>{body}</div>;
  }

  return (
    <SkeletonStatus label={label} className={className}>
      {body}
    </SkeletonStatus>
  );
}

/** Listagem típica: filtros + métricas + tabela. */
export function SkeletonListPage({
  metrics = 4,
  rows = 8,
  cols = 5,
  showFilters = true,
  showMetrics = true,
  label = "Carregando página",
  className = "",
}: {
  metrics?: number;
  rows?: number;
  cols?: number;
  showFilters?: boolean;
  showMetrics?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col gap-lg ${className}`}>
      {showFilters ? <SkeletonFilterBar /> : null}
      {showMetrics ? <SkeletonMetrics count={metrics} withStatus={false} /> : null}
      <SkeletonTable rows={rows} cols={cols} withStatus={false} />
    </SkeletonStatus>
  );
}

/** Painel / card com título e linhas (dashboard, relatórios). */
export function SkeletonPanel({
  lines = 4,
  className = "",
  label = "Carregando painel",
  withStatus = true,
}: {
  lines?: number;
  className?: string;
  label?: string;
  withStatus?: boolean;
}) {
  const body = (
    <div className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-3 w-64" />
      <SkeletonText lines={lines} />
    </div>
  );

  if (!withStatus) {
    return <div className={className}>{body}</div>;
  }

  return (
    <SkeletonStatus label={label} className={className}>
      {body}
    </SkeletonStatus>
  );
}

/** Dashboard: métricas + grade de painéis. */
export function SkeletonDashboard({
  metrics = 4,
  panels = 2,
  label = "Carregando dashboard",
  className = "",
}: {
  metrics?: number;
  panels?: number;
  label?: string;
  className?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col gap-xl ${className}`}>
      <SkeletonMetrics count={metrics} withStatus={false} />
      <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2">
        {Array.from({ length: panels }, (_, index) => (
          <SkeletonPanel key={index} lines={5} withStatus={false} />
        ))}
      </div>
    </SkeletonStatus>
  );
}

/** Lista em cards (notificações, agenda). */
export function SkeletonCardList({
  rows = 5,
  className = "",
  label = "Carregando lista",
}: {
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={className}>
      <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex flex-col gap-sm px-md py-sm">
            <div className="flex items-start justify-between gap-md">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[60%]" />
          </li>
        ))}
      </ul>
    </SkeletonStatus>
  );
}

/** Formulário / corpo de Sheet. */
export function SkeletonForm({
  fields = 4,
  className = "",
  label = "Carregando formulário",
}: {
  fields?: number;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col gap-md ${className}`}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-xs">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-input w-full rounded-md" />
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** Linha do tempo / histórico. */
export function SkeletonTimeline({
  items = 4,
  className = "",
  label = "Carregando histórico",
}: {
  items?: number;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col gap-md ${className}`}>
      <div className="flex flex-wrap gap-sm">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="flex flex-col gap-md border-l border-border-subtle pl-md">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="relative flex flex-col gap-xs">
            <Skeleton className="absolute -left-[calc(0.5rem+5px)] top-1 size-2.5 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[66%]" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  );
}

/** Card de conta / perfil. */
export function SkeletonProfileCard({
  className = "",
  label = "Carregando conta",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={className}>
      <section className="w-full max-w-[32rem] rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
        <div className="flex items-center gap-md">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-sm">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <div className="mt-lg flex flex-col gap-md">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-xs">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonStatus>
  );
}

/** Tela de login (Suspense / pré-mount). */
export function SkeletonLogin({ label = "Carregando" }: { label?: string }) {
  return (
    <SkeletonStatus
      label={label}
      className="flex min-h-screen flex-col items-center justify-center bg-surface-canvas px-md py-xl"
    >
      <div className="w-full max-w-[420px] rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
        <div className="mb-lg flex flex-col gap-md border-b border-border-subtle pb-md">
          <Skeleton className="h-12 w-40 rounded-md" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[80%]" />
        </div>
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-input w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-xs">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-input w-full rounded-md" />
          </div>
          <Skeleton className="mt-sm h-control w-full rounded-md" />
        </div>
      </div>
    </SkeletonStatus>
  );
}

/** Dropdown compacto (ex.: painel de notificações do header). */
export function SkeletonInlineList({
  rows = 3,
  className = "",
  label = "Carregando",
}: {
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col gap-sm px-md py-sm ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-xs border-t border-border-subtle pt-sm first:border-t-0 first:pt-0">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** Calendário / grade mensal. */
export function SkeletonCalendar({
  className = "",
  label = "Carregando calendário",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={className}>
      <div className="rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
        <div className="mb-md flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <div className="flex gap-sm">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <div className="mb-sm grid grid-cols-7 gap-sm">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="mx-auto h-3 w-6" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-sm">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}
