"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileUp,
  LayoutDashboard,
  Receipt,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
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
import { useAuth } from "@/context/auth-context";
import { retornoPendente, usuarioSessaoApp } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

const secoes: Array<{
  title: string;
  links: Array<{ href: string; label: string; icon: LucideIcon; count?: "retornos"; modulo: ModuloPermissao }>;
}> = [
  {
    title: "Cobrança",
    links: [
      { href: "/", label: "Início", icon: LayoutDashboard, modulo: "dashboard" },
      { href: "/atendimentos", label: "Atendimentos", icon: ClipboardList, count: "retornos", modulo: "atendimentos" },
      { href: "/debitos", label: "Inadimplência", icon: Receipt, modulo: "debitos" },
      { href: "/juridico", label: "Jurídico", icon: Scale, modulo: "juridico" },
    ],
  },
  {
    title: "Carteira",
    links: [
      { href: "/condominios", label: "Condomínios", icon: Building2, modulo: "condominios" },
      { href: "/unidades", label: "Unidades", icon: DoorOpen, modulo: "unidades" },
    ],
  },
  {
    title: "Análise",
    links: [
      { href: "/relatorios", label: "Relatórios", icon: FileBarChart, modulo: "relatorios" },
      { href: "/indicadores", label: "Indicadores", icon: ShieldCheck, modulo: "relatorios" },
    ],
  },
  {
    title: "Operação",
    links: [
      { href: "/importacoes", label: "Importações", icon: FileUp, modulo: "importacoes" },
      { href: "/usuarios", label: "Colaboradores", icon: UserRound, modulo: "usuarios" },
      { href: "/cargos", label: "Cargos", icon: Shield, modulo: "cargos" },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText, modulo: "auditoria" },
    ],
  },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user: sessao, logout } = useAuth();
  const { pode } = usePermissao();
  const cadastros = useCadastros();
  const retornos = cadastros.atendimentos.filter(retornoPendente).length;
  const usuario = usuarioSessaoApp(cadastros, sessao?.userId);

  return (
    <AppShell
      onLogout={logout}
      sidebar={
        <AppShellSidebar>
          <AppShellBrand title="Cobrança" />
          <AppShellNav>
            {secoes.map((secao) => {
              const links = secao.links.filter((link) => pode(link.modulo, "ler"));
              if (links.length === 0) return null;
              return (
                <AppShellNavSection key={secao.title} title={secao.title}>
                  {links.map((link) => (
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
              );
            })}
          </AppShellNav>
        </AppShellSidebar>
      }
      user={usuario}
      notificationCount={retornos}
    >
      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
}
