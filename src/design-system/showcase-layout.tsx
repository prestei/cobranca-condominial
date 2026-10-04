import type { ReactNode } from "react";

export function DesignSystemSectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-headline-sm text-on-surface">
      {children}
    </h2>
  );
}

export function DesignSystemShowcase({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-md ${className ?? ""}`} aria-labelledby={id}>
      <DesignSystemSectionTitle id={id}>{title}</DesignSystemSectionTitle>
      {children}
    </section>
  );
}

export function DesignSystemShowcaseWide({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-lg" aria-labelledby={id}>
      <DesignSystemSectionTitle id={id}>{title}</DesignSystemSectionTitle>
      {children}
    </section>
  );
}

export function DesignSystemPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card ${className ?? ""}`}
    >
      {children}
    </article>
  );
}

export function DesignSystemCatalogShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-canvas px-margin py-margin-md min-[768px]:px-margin-md min-[1280px]:px-margin-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-xl">
        <header className="border-b border-border-subtle pb-lg">
          <p className="text-label-sm text-on-surface-variant uppercase">Lex Condominial</p>
          <h1 className="mt-sm text-headline-lg text-on-surface">Design system</h1>
          <p className="mt-sm max-w-3xl text-body-md text-on-surface-variant">
            Cores, tipografia e componentes globais reutilizáveis em todas as telas.
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}
