"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  BarChart3,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  HelpCircle,
  LayoutDashboard,
  Receipt,
  Scale,
  ScrollText,
  Shield,
  UserRound,
  Wallet,
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
import { useToast } from "@/components/toast";
import { useAuth } from "@/context/auth-context";
import { retornoPendente, usuarioSessaoApp } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  modulo: ModuloPermissao;
  count?: "retornos" | "notificacoes";
  /** Destaque quando a fila de atendimentos está aberta sem filtro de retorno na URL. */
  atendimentosSemRetorno?: boolean;
  /** Destaque na rota de agenda (`/atendimentos?retorno=…`). */
  agendaRetornos?: boolean;
};

const secoesAtendente: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Operação",
    links: [
      { href: "/", label: "Início", icon: LayoutDashboard, modulo: "dashboard" },
      {
        href: "/atendimentos",
        label: "Atendimentos",
        icon: ClipboardList,
        count: "retornos",
        modulo: "atendimentos",
        atendimentosSemRetorno: true,
      },
      { href: "/debitos", label: "Inadimplência", icon: Wallet, modulo: "debitos" },
      {
        href: "/minha-agenda",
        label: "Minha agenda",
        icon: CalendarClock,
        modulo: "atendimentos",
        agendaRetornos: true,
      },
      { href: "/notificacoes", label: "Notificações", icon: Bell, modulo: "dashboard", count: "notificacoes" },
      { href: "/minha-produtividade", label: "Minha produtividade", icon: BarChart3, modulo: "atendimentos" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/conta", label: "Minha conta", icon: UserRound, modulo: "dashboard" },
      { href: "/ajuda", label: "Ajuda e suporte", icon: HelpCircle, modulo: "dashboard" },
    ],
  },
];

const secoes: Array<{ title: string; links: NavLink[] }> = [
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
    ],
  },
  {
    title: "Operação",
    links: [
      { href: "/usuarios", label: "Colaboradores", icon: UserRound, modulo: "usuarios" },
      { href: "/cargos", label: "Cargos", icon: Shield, modulo: "cargos" },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText, modulo: "auditoria" },
    ],
  },
];

function navLinkAtivo(pathname: string, retornoNaUrl: string | null, link: NavLink) {
  if (link.agendaRetornos) {
    return pathname === "/minha-agenda" || pathname.startsWith("/minha-agenda/");
  }
  if (link.atendimentosSemRetorno) {
    return (pathname === "/atendimentos" || pathname.startsWith("/atendimentos/")) && !retornoNaUrl;
  }
  const base = link.href.split("?")[0] ?? link.href;
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: sessao, loading: sessaoCarregando, logout } = useAuth();
  const [layoutMontado, setLayoutMontado] = useState(false);
  useEffect(() => {
    setLayoutMontado(true);
  }, []);
  const { permissoes, pode } = usePermissao();
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);
  const retornoNaUrl = searchParams?.get("retorno") ?? null;
  const menuSecoes = perfil === "atendente" ? secoesAtendente : secoes;
  const cadastros = useCadastros();
  const retornos =
    layoutMontado && !sessaoCarregando && sessao?.userId
      ? cadastros.atendimentos.filter(retornoPendente).length
      : 0;
  const usuario =
    sessaoCarregando || !sessao?.userId ? undefined : usuarioSessaoApp(cadastros, sessao.userId);
  const { itens, naoLidas, carregando, marcarTodasLidas, abrirNotificacao, recarregar } = useNotificacoes();

  const handleAbrirNotificacao = useCallback(
    async (id: number) => {
      const resultado = await abrirNotificacao(id);
      if (!resultado.ok) {
        toast({ variant: "error", title: "Notificação", description: resultado.error });
        return;
      }
      const url = resultado.notificacao?.urlRegistro;
      if (url) {
        router.push(url);
      } else {
        router.push("/notificacoes");
      }
      void recarregar();
    },
    [abrirNotificacao, recarregar, router, toast],
  );

  return (
    <AppShell
      onLogout={logout}
      notificationCount={naoLidas}
      notificacoes={itens.map((item) => ({
        id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        relativo: item.relativo,
        lida: Boolean(item.lidaEm),
        evento: item.evento,
      }))}
      notificacoesCarregando={carregando}
      onMarcarTodasNotificacoesLidas={() => void marcarTodasLidas()}
      onAbrirNotificacao={(id) => void handleAbrirNotificacao(id)}
      sidebar={
        <AppShellSidebar>
          <AppShellBrand />
          <AppShellNav>
            {menuSecoes.map((secao) => {
              const links = secao.links.filter((link) => pode(link.modulo, "ler"));
              if (links.length === 0) return null;
              return (
                <AppShellNavSection key={secao.title} title={secao.title}>
                  {links.map((link) => (
                    <AppShellNavLink
                      key={link.href}
                      href={link.href}
                      icon={link.icon}
                      active={navLinkAtivo(pathname, retornoNaUrl, link)}
                      count={
                        link.count === "retornos" && retornos > 0
                          ? retornos
                          : link.count === "notificacoes" && naoLidas > 0
                            ? naoLidas
                            : undefined
                      }
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
    >
      <AppShellMain>{children}</AppShellMain>
    </AppShell>
  );
}
