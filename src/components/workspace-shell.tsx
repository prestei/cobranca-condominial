"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileUp,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Shield,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AppShell,
  AppShellBrand,
  AppShellMain,
  AppShellNav,
  AppShellNavLink,
  AppShellNavSection,
  AppShellSidebar,
} from "@/components/app-shell";
import { getCadastros, retornoPendente, subscribeCadastros } from "@/data/catalogo";

const secoes: Array<{
  title: string;
  links: Array<{ href: string; label: string; icon: LucideIcon; count?: "retornos" }>;
}> = [
  {
    title: "Cobrança",
    links: [
      { href: "/", label: "Início", icon: LayoutDashboard },
      { href: "/atendimentos", label: "Atendimentos", icon: ClipboardList, count: "retornos" },
      { href: "/debitos", label: "Inadimplência", icon: Receipt },
    ],
  },
  {
    title: "Carteira",
    links: [
      { href: "/condominios", label: "Condomínios", icon: Building2 },
      { href: "/unidades", label: "Unidades", icon: DoorOpen },
    ],
  },
  {
    title: "Análise",
    links: [{ href: "/relatorios", label: "Relatórios", icon: FileBarChart }],
  },
  {
    title: "Operação",
    links: [
      { href: "/importacoes", label: "Importações", icon: FileUp },
      { href: "/usuarios", label: "Colaboradores", icon: UserRound },
      { href: "/cargos", label: "Cargos", icon: Shield },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText },
    ],
  },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const retornos = cadastros.atendimentos.filter(retornoPendente).length;

  return (
    <AppShell
      sidebar={
        <AppShellSidebar>
          <AppShellBrand title="Cobrança" />
          <AppShellNav>
            {secoes.map((secao) => (
              <AppShellNavSection key={secao.title} title={secao.title}>
                {secao.links.map((link) => (
                  <AppShellNavLink
                    key={link.href}
                    href={link.href}
                    icon={link.icon}
                    active={pathname === link.href}
                    count={link.count === "retornos" && retornos > 0 ? retornos : undefined}
                  >
                    {link.label}
                  </AppShellNavLink>
                ))}
              </AppShellNavSection>
            ))}
          </AppShellNav>
        </AppShellSidebar>
      }
      user={{ name: "Milena", initials: "MI", menuSubtitle: "Administradora" }}
      notificationCount={retornos}
    >
      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
}
