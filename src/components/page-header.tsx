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
      <div className="flex flex-col gap-md min-[768px]:flex-row min-[768px]:items-end min-[768px]:justify-between">
        <div className="flex min-w-0 flex-col gap-xs">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb">
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
          <h1 className="text-[26px] font-bold leading-none text-[#12213A]">{title}</h1>
          {description ? <p className="max-w-3xl text-[15px] leading-none text-[#33415C]">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-md min-[768px]:justify-end">{actions}</div>
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
