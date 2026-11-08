import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Bloco título + descrição: no desktop ocupa no máximo metade da linha (ação fica na outra metade). */
const headerLeadClass = "min-w-0 w-full max-w-2xl min-[768px]:max-w-[50%]";

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <section className={`px-md py-sm min-[768px]:px-8 min-[768px]:py-md ${className ?? ""}`}>
      <div className="flex flex-col gap-y-sm min-[768px]:flex-row min-[768px]:items-end min-[768px]:justify-between min-[768px]:gap-x-lg">
        <div className={headerLeadClass}>
          <h1 className="text-headline-lg font-bold leading-none text-[#12213A]">{title}</h1>
          {description ? (
            <p
              className="mt-xs max-w-2xl truncate text-body-sm leading-snug text-on-surface-variant"
              title={typeof description === "string" ? description : undefined}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-md min-[768px]:w-auto min-[768px]:justify-end [&>*]:w-full min-[768px]:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type PageContentProps = {
  children: ReactNode;
  className?: string;
};

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={`flex w-full min-w-0 flex-col gap-lg px-md py-lg pb-12 min-[768px]:px-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}
