import type { ReactNode } from "react";
import Link from "next/link";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={`px-md py-md min-[768px]:px-8 ${className ?? ""}`}
    >
      <div className="grid grid-cols-1 gap-y-sm min-[768px]:grid-cols-[minmax(0,1fr)_auto] min-[768px]:gap-x-md min-[768px]:gap-y-xs min-[768px]:items-end">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="min-w-0 min-[768px]:col-span-2">
            <p className="text-body-md leading-none text-[#1B2A41]">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <span key={`${item.label}-${index}`}>
                    {index > 0 ? <span className="text-[#1B2A41]"> / </span> : null}
                    {item.href && !isLast ? (
                      <Link
                        href={item.href}
                        className="transition-colors hover:text-primary-container focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold" : undefined} aria-current={isLast ? "page" : undefined}>
                        {item.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </p>
          </nav>
        ) : null}
        <h1 className="min-w-0 text-[26px] font-bold leading-none text-[#12213A] min-[768px]:col-start-1 min-[768px]:row-start-2">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-[15px] leading-snug text-[#33415C] min-[768px]:col-start-1 min-[768px]:row-start-3">
            {description}
          </p>
        ) : null}
        {actions ? (
          <div
            className={`flex w-full shrink-0 flex-wrap items-center gap-md min-[768px]:col-start-2 min-[768px]:w-auto min-[768px]:self-end ${
              description ? "min-[768px]:row-span-2 min-[768px]:row-start-2" : "min-[768px]:row-start-2"
            } [&>*]:w-full min-[768px]:[&>*]:w-auto`}
          >
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
    <div className={`flex w-full flex-col gap-lg px-md py-lg pb-12 min-[768px]:px-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}
