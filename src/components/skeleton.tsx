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
      <section className="w-full rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
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

/** Área do usuário no header do AppShell enquanto a sessão carrega. */
export function SkeletonAppHeader({
  className = "",
  label = "Carregando cabeçalho",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus
      label={label}
      className={`flex w-full items-center justify-between gap-md ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-sm px-xs">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-36 max-w-full" />
      </div>
      <div className="flex shrink-0 items-center gap-sm">
        <div className="flex items-center gap-0 rounded-xl border border-border-subtle bg-[#F4F7FB] px-0.5">
          <Skeleton className="m-0.5 size-10 rounded-[10px]" />
          <Skeleton className="m-0.5 size-10 rounded-[10px]" />
        </div>
        <Skeleton className="size-11 rounded-[10px]" />
      </div>
    </SkeletonStatus>
  );
}

/** Menu lateral do AppShell (fundo navy) enquanto a sessão/permissões carregam. */
export function SkeletonSidebarNav({
  sections = [
    { items: 4 },
    { items: 2 },
    { items: 2 },
    { items: 3 },
  ],
  className = "",
  label = "Carregando menu",
}: {
  sections?: Array<{ items: number }>;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label} className={`flex flex-col ${className}`}>
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="flex flex-col">
          <div className="px-[14px] pb-xs pt-[18px]">
            <Skeleton className="h-3 w-16 bg-[#31496C]" />
          </div>
          {Array.from({ length: section.items }, (_, itemIndex) => (
            <div
              key={itemIndex}
              className="flex min-h-11 items-center gap-md rounded-[10px] px-[14px]"
            >
              <Skeleton className="size-5 shrink-0 rounded-md bg-[#31496C]" />
              <Skeleton
                className={`h-3.5 rounded-md bg-[#31496C] ${
                  itemIndex % 3 === 0 ? "w-28" : itemIndex % 3 === 1 ? "w-24" : "w-32"
                }`}
              />
            </div>
          ))}
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** Layout operacional de atendimentos: fila (chips + lista) + painel do caso (desktop). */
export function SkeletonAtendimentosOperacao({
  filaRows = 8,
  showHeaderAction = false,
  className = "",
  label = "Carregando atendimentos",
}: {
  filaRows?: number;
  showHeaderAction?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonStatus
      label={label}
      className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-card ${className}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[1024px]:flex-row">
        <aside
          className="flex min-h-0 w-full flex-col border-border-subtle min-[1024px]:w-[min(100%,22rem)] min-[1024px]:shrink-0 min-[1024px]:border-r"
          aria-hidden="true"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-2 py-2">
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 overflow-hidden">
              <Skeleton className="h-9 min-w-0 rounded-full" />
              <Skeleton className="h-9 min-w-0 rounded-full" />
              <Skeleton className="h-9 min-w-0 rounded-full" />
            </div>
            {showHeaderAction ? <Skeleton className="h-9 w-44 shrink-0 rounded-md" /> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-surface-container-low">
            {Array.from({ length: filaRows }, (_, index) => (
              <div
                key={index}
                className="flex w-full gap-3 border-b border-border-subtle px-3 py-2.5"
              >
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-sm pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Skeleton className={`h-4 ${index % 2 === 0 ? "w-36" : "w-28"}`} />
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </div>
                  <Skeleton className="h-3.5 w-full max-w-[90%]" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div
          className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border-subtle min-[1024px]:flex min-[1024px]:border-l"
          aria-hidden="true"
        >
          <div className="flex shrink-0 flex-wrap items-center gap-sm border-b border-border-subtle bg-surface-container-low px-md py-2">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-44 max-w-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-28 min-[720px]:block" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-md overflow-hidden bg-surface-container-low p-md">
            <div className="flex flex-wrap gap-sm">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex flex-col gap-md border-l border-border-subtle pl-md">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="relative flex flex-col gap-xs">
                  <Skeleton className="absolute -left-[calc(0.5rem+5px)] top-1 size-2.5 rounded-full" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-border-subtle bg-surface-card px-md py-md">
            <Skeleton className="size-11 shrink-0 rounded-md" />
            <Skeleton className="size-11 shrink-0 rounded-md" />
            <Skeleton className="h-11 min-h-11 flex-1 rounded-md" />
            <Skeleton className="size-11 shrink-0 rounded-md" />
          </div>
        </div>
      </div>
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
