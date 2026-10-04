"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

const SIDEBAR_WIDTH_EXPANDED = "264px";
const SIDEBAR_WIDTH_COLLAPSED = "84px";

type AppShellUser = {
  name: string;
  initials: string;
  menuSubtitle?: string;
};

type AppShellContextValue = {
  closeMobileNav: () => void;
  sidebarCollapsed: boolean;
  showSidebarLabels: boolean;
  toggleSidebar: () => void;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const toggleSidebar = useCallback(() => {
    closeMenus();
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 960px)").matches) {
      setMobileNavOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  }, [closeMenus]);

  const showSidebarLabels = !sidebarCollapsed || mobileNavOpen;

  const shellContext = useMemo(
    () => ({
      closeMobileNav,
      sidebarCollapsed: sidebarCollapsed && !mobileNavOpen,
      showSidebarLabels,
      toggleSidebar,
    }),
    [closeMobileNav, mobileNavOpen, showSidebarLabels, sidebarCollapsed, toggleSidebar],
  );

  const sidebarWidth =
    sidebarCollapsed && !mobileNavOpen ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const toggleLabel =
    sidebarCollapsed && !mobileNavOpen ? "Expandir menu lateral" : "Recolher menu lateral";

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
          className="fixed inset-y-0 left-0 z-50 shrink-0 transition-[width,transform] duration-200 ease-out min-[961px]:static min-[961px]:z-auto min-[961px]:translate-x-0"
          style={{ width: mobileNavOpen ? SIDEBAR_WIDTH_EXPANDED : sidebarWidth }}
        >
          <div
            className={`h-full min-[961px]:h-screen ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full min-[961px]:translate-x-0"
            }`}
          >
            {sidebar}
          </div>
        </div>

        <div className="app-main flex min-w-0 flex-1 flex-col">
          <AppShellHeader
            user={user}
            notificationCount={notificationCount}
            notifOpen={notifOpen}
            userOpen={userOpen}
            onToggleSidebar={toggleSidebar}
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
      className={`flex h-full min-h-screen w-full flex-col bg-primary-container text-on-primary-container ${className ?? ""}`}
      {...props}
    >
      {children}
      <AppShellSidebarCollapseFooter />
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
  const shell = useContext(AppShellContext);
  const showLabels = shell?.showSidebarLabels ?? true;
  const collapsed = shell?.sidebarCollapsed ?? false;

  return (
    <div
      className={`flex min-h-[4.5rem] items-center gap-md border-b border-[#31496C] px-md py-lg ${
        collapsed && !showLabels ? "justify-center" : ""
      } ${className ?? ""}`}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brass text-label-lg font-bold text-[#1A1300]"
        aria-hidden="true"
      >
        {initials}
      </span>
      {showLabels ? (
        <div className="min-w-0">
          <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-[#8FA3BF]">{eyebrow}</p>
          <p className="text-headline-sm font-bold text-on-primary">{title}</p>
        </div>
      ) : null}
    </div>
  );
}

export function AppShellCarteiraBadge({ className }: { className?: string }) {
  const shell = useContext(AppShellContext);
  if (!shell?.showSidebarLabels) return null;

  return (
    <div
      className={`mx-[14px] mt-md flex items-center gap-sm rounded-[10px] bg-primary-hover px-md py-sm text-body-sm text-[#C3CFDF] ${className ?? ""}`}
    >
      <span className="size-2 shrink-0 rounded-full bg-[#4FC38A]" aria-hidden="true" />
      Carteira ativa
    </div>
  );
}

type AppShellNavSectionProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: ReactNode;
  showDividerWhenCollapsed?: boolean;
};

export function AppShellNavSection({
  title,
  children,
  showDividerWhenCollapsed = true,
  className,
  ...props
}: AppShellNavSectionProps) {
  const shell = useContext(AppShellContext);
  const showLabels = shell?.showSidebarLabels ?? true;
  const collapsed = shell?.sidebarCollapsed ?? false;

  return (
    <div className={`flex flex-col ${className ?? ""}`} {...props}>
      {showLabels ? (
        <p className="px-[14px] pb-xs pt-[18px] text-label-sm font-bold uppercase tracking-[0.14em] text-[#8FA3BF]">
          {title}
        </p>
      ) : showDividerWhenCollapsed && collapsed ? (
        <div className="mx-[14px] mb-sm h-4 border-b border-[#31496C]" aria-hidden="true" />
      ) : null}
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
      className={`flex flex-1 flex-col px-[14px] py-xs ${className ?? ""}`}
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
  const showLabels = shell?.showSidebarLabels ?? true;
  const collapsed = shell?.sidebarCollapsed ?? false;

  return (
    <Link
      href={href}
      title={typeof children === "string" ? children : undefined}
      onClick={() => {
        onNavigate?.();
        shell?.closeMobileNav();
      }}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-md rounded-[10px] px-[14px] text-[15px] font-medium text-[#C3CFDF] transition-colors hover:bg-[#26395A] hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
        active ? "bg-primary-hover font-semibold text-on-primary before:absolute before:bottom-[10px] before:left-[-14px] before:top-[10px] before:w-1 before:rounded-r before:bg-brass before:content-['']" : ""
      } ${collapsed && !showLabels ? "justify-center px-0" : ""} ${className ?? ""}`}
    >
      {icon ? <Icon icon={icon} size="md" className="text-current" /> : null}
      {showLabels ? (
        <>
          <span className="min-w-0 flex-1">{children}</span>
          {count !== undefined ? (
            <span className="ml-auto rounded-full bg-[#2C4166] px-sm py-[2px] text-label-md font-bold text-[#E6EDF7]">
              {count}
            </span>
          ) : null}
        </>
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

function AppShellSidebarCollapseFooter() {
  const shell = useContext(AppShellContext);
  const collapsed = shell?.sidebarCollapsed ?? false;
  const showLabels = shell?.showSidebarLabels ?? true;

  return (
    <div className="px-[14px] pb-md pt-xs">
      <button
        type="button"
        onClick={() => shell?.toggleSidebar()}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-md rounded-[10px] border-0 bg-[#2A3F61] px-[14px] text-[15px] font-semibold text-on-primary transition-colors hover:bg-[#31496C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
          collapsed && !showLabels ? "justify-center px-0" : ""
        }`}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <ChevronRight className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        )}
        {showLabels ? <span>Recolher menu</span> : null}
      </button>
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
      <AppShellIconButton label={toggleLabel} onClick={onToggleSidebar}>
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
  "aria-expanded": ariaExpanded,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-expanded"?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-[#33415C] hover:bg-[#EDF1F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
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
