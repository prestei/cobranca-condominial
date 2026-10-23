import type { ReactNode } from "react";
import Link from "next/link";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-md gap-y-xs min-[768px]:items-end">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="col-span-2 min-w-0">
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
        <h1 className="col-start-1 min-w-0 self-center text-[26px] font-bold leading-none text-[#12213A] min-[768px]:self-auto">
          {title}
        </h1>
        {actions ? (
          <div
            className={`col-start-2 flex shrink-0 flex-wrap items-center gap-md self-center min-[768px]:self-end ${
              description ? "min-[768px]:row-span-2" : ""
            }`}
          >
            {actions}
          </div>
        ) : null}
        {description ? (
          <p className="col-span-2 max-w-3xl text-[15px] leading-none text-[#33415C] min-[768px]:col-span-1">
            {description}
          </p>
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
