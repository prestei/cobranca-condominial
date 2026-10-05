"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react";
import { Icon } from "@/components/icon";

const SIDEBAR_WIDTH = "264px";

type AppShellUser = {
  name: string;
  initials: string;
  menuSubtitle?: string;
};

type AppShellContextValue = {
  closeMobileNav: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

type AppShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  user?: AppShellUser;
  notificationCount?: number;
  className?: string;
};

export function AppShell({
  sidebar,
  children,
  user,
  notificationCount = 0,
  className,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const mobileNavId = useId();

  const closeMenus = useCallback(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const toggleMobileNav = useCallback(() => {
    closeMenus();
    setMobileNavOpen((open) => !open);
  }, [closeMenus]);

  const shellContext = useMemo(
    () => ({
      closeMobileNav,
    }),
    [closeMobileNav],
  );

  const toggleLabel = mobileNavOpen ? "Fechar menu" : "Abrir menu";

  return (
    <AppShellContext.Provider value={shellContext}>
      <div className={`app-layout flex min-h-screen bg-[#F6F8FB] ${className ?? ""}`}>
        {(notifOpen || userOpen) && (
          <button
            type="button"
            className="fixed inset-0 z-20 border-0 bg-transparent"
            aria-label="Fechar menus"
            onClick={closeMenus}
          />
        )}

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-overlay min-[961px]:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <div
          id={mobileNavId}
          className={`fixed inset-y-0 left-0 z-50 shrink-0 overflow-hidden transition-[width,transform] duration-200 ease-out min-[961px]:sticky min-[961px]:bottom-auto min-[961px]:h-screen min-[961px]:translate-x-0 min-[961px]:self-start ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="h-full">{sidebar}</div>
        </div>

        <div className="app-main flex min-w-0 flex-1 flex-col">
          <AppShellHeader
            user={user}
            notificationCount={notificationCount}
            notifOpen={notifOpen}
            userOpen={userOpen}
            onToggleSidebar={toggleMobileNav}
            toggleLabel={toggleLabel}
            onToggleNotif={() => {
              setUserOpen(false);
              setNotifOpen((open) => !open);
            }}
            onToggleUser={() => {
              setNotifOpen(false);
              setUserOpen((open) => !open);
            }}
          />
          {children}
        </div>
      </div>
    </AppShellContext.Provider>
  );
}

type AppShellSidebarProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function AppShellSidebar({ children, className, ...props }: AppShellSidebarProps) {
  return (
    <aside
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-primary-container text-on-primary-container ${className ?? ""}`}
      {...props}
    >
      {children}
    </aside>
  );
}

type AppShellBrandProps = {
  initials?: string;
  title: string;
  eyebrow?: string;
  className?: string;
};

export function AppShellBrand({
  initials = "LC",
  title,
  eyebrow = "Lex Condominial",
  className,
}: AppShellBrandProps) {
  return (
    <div
      className={`flex min-h-[4.5rem] items-center gap-md border-b border-[#31496C] px-md py-lg ${className ?? ""}`}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brass text-label-lg font-bold text-[#1A1300]"
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-[#8FA3BF]">{eyebrow}</p>
        <p className="text-headline-sm font-bold text-on-primary">{title}</p>
      </div>
    </div>
  );
}

type AppShellNavSectionProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: ReactNode;
};

export function AppShellNavSection({
  title,
  children,
  className,
  ...props
}: AppShellNavSectionProps) {
  return (
    <div className={`flex flex-col ${className ?? ""}`} {...props}>
      <p className="px-[14px] pb-xs pt-[18px] text-label-sm font-bold uppercase tracking-[0.14em] text-[#8FA3BF]">
        {title}
      </p>
      {children}
    </div>
  );
}

type AppShellNavProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  label?: string;
};

export function AppShellNav({ children, className, label = "Principal", ...props }: AppShellNavProps) {
  return (
    <nav
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-[14px] py-xs ${className ?? ""}`}
      aria-label={label}
      {...props}
    >
      {children}
    </nav>
  );
}

type AppShellNavLinkProps = {
  href: string;
  icon?: LucideIcon;
  active?: boolean;
  count?: number;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

export function AppShellNavLink({
  href,
  icon,
  active = false,
  count,
  children,
  className,
  onNavigate,
}: AppShellNavLinkProps) {
  const shell = useContext(AppShellContext);

  return (
    <Link
      href={href}
      onClick={() => {
        onNavigate?.();
        shell?.closeMobileNav();
      }}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-md rounded-[10px] px-[14px] text-[15px] font-medium text-[#C3CFDF] transition-colors hover:bg-[#26395A] hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
        active ? "bg-primary-hover font-semibold text-on-primary before:absolute before:bottom-[10px] before:left-[-14px] before:top-[10px] before:w-1 before:rounded-r before:bg-brass before:content-['']" : ""
      } ${className ?? ""}`}
    >
      {icon ? <Icon icon={icon} size="md" className="text-current" /> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {count !== undefined ? (
        <span className="ml-auto rounded-full bg-[#2C4166] px-sm py-[2px] text-label-md font-bold text-[#E6EDF7]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

type AppShellSidebarFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AppShellSidebarFooter({ children, className, ...props }: AppShellSidebarFooterProps) {
  return (
    <div
      className={`mt-auto flex flex-col gap-xs border-t border-[#31496C] px-[14px] pt-md ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

type AppShellHeaderProps = {
  user?: AppShellUser;
  notificationCount: number;
  notifOpen: boolean;
  userOpen: boolean;
  toggleLabel: string;
  onToggleSidebar: () => void;
  onToggleNotif: () => void;
  onToggleUser: () => void;
};

function AppShellHeader({
  user,
  notificationCount,
  notifOpen,
  userOpen,
  toggleLabel,
  onToggleSidebar,
  onToggleNotif,
  onToggleUser,
}: AppShellHeaderProps) {
  return (
    <header className="relative z-30 flex min-h-[4.5rem] shrink-0 items-center gap-md border-b border-border-subtle bg-surface-card px-md min-[768px]:px-6">
      <AppShellIconButton label={toggleLabel} onClick={onToggleSidebar} className="min-[961px]:hidden">
        <Menu className="size-[22px]" strokeWidth={1.9} aria-hidden="true" />
      </AppShellIconButton>

      <div className="min-w-0 flex-1" aria-hidden="true" />

      <AppShellIconButton label="Ajuda">
        <HelpCircle className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
      </AppShellIconButton>

      <div className="relative">
        <AppShellIconButton
          label={notificationCount > 0 ? `Notificações, ${notificationCount} novas` : "Notificações"}
          onClick={onToggleNotif}
          aria-expanded={notifOpen}
        >
          <Bell className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
          {notificationCount > 0 ? (
            <span
              className="absolute right-1 top-[5px] flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface-card bg-status-critical px-[4px] text-[11px] font-bold leading-none text-on-primary"
            >
              {notificationCount}
            </span>
          ) : null}
        </AppShellIconButton>

        {notifOpen ? (
          <div
            className="absolute right-0 top-14 z-30 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-surface-card shadow-modal"
            role="dialog"
            aria-label="Notificações"
          >
            <div className="flex items-center justify-between px-md py-sm">
              <p className="text-body-lg font-bold text-on-surface">Notificações</p>
              <button type="button" className="text-body-md font-semibold text-primary-container">
                Marcar como lidas
              </button>
            </div>
            <AppShellNotificationItem
              dotClassName="bg-[#E8A317]"
              title="Condomínio Horizonte está pendente"
              description="Situação aguardando regularização na carteira."
            />
            <AppShellNotificationItem
              dotClassName="bg-[#2F4A6F]"
              title="[Título da notificação]"
              description="[Descrição] · [tempo]"
            />
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-center border-t border-[#EEF1F6] text-body-md font-semibold text-primary-container hover:bg-[#F8FAFC]"
            >
              Ver todas as notificações
            </button>
          </div>
        ) : null}
      </div>

      {user ? (
        <>
          <div className="hidden h-8 w-px bg-[#E3E8EF] min-[480px]:block" aria-hidden="true" />
          <div className="relative">
            <button
              type="button"
              onClick={onToggleUser}
              aria-expanded={userOpen}
              aria-label={`Menu da conta de ${user.name}`}
              className="flex min-h-12 cursor-pointer items-center gap-sm rounded-xl border-0 bg-transparent px-xs py-0 text-[15px] font-semibold text-[#1B2A41] hover:bg-[#EDF1F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-bold text-on-primary"
                aria-hidden="true"
              >
                {user.initials}
              </span>
              <span className="hidden max-w-[8rem] truncate min-[640px]:inline">{user.name}</span>
              <ChevronDown className="hidden size-4 min-[640px]:block" strokeWidth={2.2} aria-hidden="true" />
            </button>

            {userOpen ? (
              <div
                className="absolute right-0 top-14 z-30 w-[260px] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-surface-card shadow-modal"
                role="menu"
                aria-label="Conta"
              >
                <div className="border-b border-[#EEF1F6] px-md py-md">
                  <p className="text-body-lg font-bold text-on-surface">{user.name}</p>
                  {user.menuSubtitle ? (
                    <p className="mt-[2px] text-body-sm text-[#52607A]">{user.menuSubtitle}</p>
                  ) : null}
                </div>
                <AppShellMenuLink href="#">Meu perfil</AppShellMenuLink>
                <AppShellMenuLink href="#">Preferências</AppShellMenuLink>
                <AppShellMenuLink href="#">Ajuda e suporte</AppShellMenuLink>
                <AppShellMenuLink href="#" className="border-t border-[#EEF1F6] font-semibold text-status-critical">
                  Sair
                </AppShellMenuLink>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </header>
  );
}

function AppShellNotificationItem({
  dotClassName,
  title,
  description,
}: {
  dotClassName: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-md border-t border-[#EEF1F6] px-md py-sm hover:bg-[#F8FAFC]">
      <span className={`mt-[6px] size-[10px] shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />
      <div>
        <p className="text-[15px] font-semibold text-on-surface">{title}</p>
        <p className="mt-[2px] text-body-sm text-[#52607A]">{description}</p>
      </div>
    </div>
  );
}

function AppShellMenuLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center px-md text-[15px] font-medium text-[#1B2A41] hover:bg-[#F3F6FA] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass ${className ?? ""}`}
      role="menuitem"
    >
      {children}
    </Link>
  );
}

function AppShellIconButton({
  label,
  children,
  onClick,
  className,
  "aria-expanded": ariaExpanded,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-expanded"?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={`relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-[#33415C] hover:bg-[#EDF1F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

type AppShellMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  expanded: boolean;
  controls: string;
};

export function AppShellMenuButton({
  expanded,
  controls,
  className,
  ...props
}: AppShellMenuButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${className ?? ""}`}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={expanded ? "Fechar menu" : "Abrir menu"}
      {...props}
    >
      {expanded ? (
        <X className="size-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Menu className="size-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}

type AppShellMainProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function AppShellMain({ children, className, ...props }: AppShellMainProps) {
  return (
    <main className={`min-w-0 flex-1 bg-[#F6F8FB] ${className ?? ""}`} {...props}>
      {children}
    </main>
  );
}

/** @deprecated Use o header integrado do AppShell com a prop `user`. */
export function AppShellTopbar({ children, className, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <header className={`hidden ${className ?? ""}`} {...props}>
      {children}
    </header>
  );
}

/** @deprecated */
export function AppShellTopbarTitle({ children }: { children: ReactNode }) {
  return <p className="hidden">{children}</p>;
}

/** @deprecated */
export function AppShellTopbarActions({ children }: { children: ReactNode }) {
  return <div className="hidden">{children}</div>;
}

/** @deprecated Use a prop `user` no AppShell. */
export function AppShellUserChip({ name }: { name: string; initials: string }) {
  return <span className="sr-only">{name}</span>;
}

export function AppShellTopbarSpacer({ className }: { className?: string }) {
  return <div className={`min-w-0 flex-1 ${className ?? ""}`} />;
}
