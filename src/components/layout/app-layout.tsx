"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Building, FileBarChart, HelpCircle, Settings, ShieldCheck, User } from "lucide-react";
import {
  AppShell,
  AppShellBrand,
  AppShellMain,
  AppShellNav,
  AppShellNavLink,
  AppShellNavSection,
  AppShellSidebar,
  AppShellSidebarFooter,
} from "@/components/app-shell";

const appUser = {
  name: "Bruna Souza",
  initials: "BS",
  menuSubtitle: "Cobrança · Carteira ativa",
};

type CarteiraNavCounts = {
  condominioCount: number;
  unidadeCount: number;
};

const defaultCounts: CarteiraNavCounts = {
  condominioCount: 3,
  unidadeCount: 268,
};

type CarteiraNavContextValue = {
  counts: CarteiraNavCounts;
  setCounts: (partial: Partial<CarteiraNavCounts>) => void;
};

const CarteiraNavContext = createContext<CarteiraNavContextValue | null>(null);

export function useCarteiraNav() {
  const context = useContext(CarteiraNavContext);
  if (!context) {
    throw new Error("useCarteiraNav must be used within AppLayout.");
  }
  return context;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname() ?? "";
  const [counts, setCountsState] = useState<CarteiraNavCounts>(defaultCounts);

  const setCounts = useCallback((partial: Partial<CarteiraNavCounts>) => {
    setCountsState((current) => ({ ...current, ...partial }));
  }, []);

  const navValue = useMemo(() => ({ counts, setCounts }), [counts, setCounts]);

  const sidebar = (
    <AppShellSidebar>
      <AppShellBrand title="Cobrança" />
      <AppShellNav>
        <AppShellNavSection title="Carteira">
          <AppShellNavLink
            href="/condominios"
            icon={Building}
            active={isActivePath(pathname, "/condominios")}
            count={counts.condominioCount}
          >
            Condomínios
          </AppShellNavLink>
          <AppShellNavLink
            href="/unidades"
            icon={User}
            active={isActivePath(pathname, "/unidades")}
            count={counts.unidadeCount}
          >
            Unidades
          </AppShellNavLink>
        </AppShellNavSection>
        <AppShellNavSection title="Análise">
          <AppShellNavLink href="/relatorios" icon={FileBarChart} active={isActivePath(pathname, "/relatorios")}>
            Relatórios
          </AppShellNavLink>
          <AppShellNavLink href="/indicadores" icon={ShieldCheck} active={isActivePath(pathname, "/indicadores")}>
            Indicadores
          </AppShellNavLink>
        </AppShellNavSection>
      </AppShellNav>
      <AppShellSidebarFooter>
        <AppShellNavLink href="/ajuda" icon={HelpCircle} active={isActivePath(pathname, "/ajuda")}>
          Ajuda e suporte
        </AppShellNavLink>
        <AppShellNavLink href="/configuracoes" icon={Settings} active={isActivePath(pathname, "/configuracoes")}>
          Configurações
        </AppShellNavLink>
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );

  return (
    <CarteiraNavContext.Provider value={navValue}>
      <AppShell sidebar={sidebar} user={appUser} notificationCount={2}>
        <AppShellMain>{children}</AppShellMain>
      </AppShell>
    </CarteiraNavContext.Provider>
  );
}
