"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Search,
  ShieldAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert } from "@/components/alert";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

type TopicoAjuda = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  modulo: ModuloPermissao;
  palavrasChave: string[];
  perfis?: Array<"administradora" | "atendente" | "advogado">;
};

type AtalhoAjuda = {
  href: string;
  titulo: string;
  icon: LucideIcon;
  modulo: ModuloPermissao;
};

const topicos: TopicoAjuda[] = [
  {
    id: "atendimentos",
    titulo: "Atendimentos",
    descricao: "Registre tentativas de contato, acompanhe a fila da sua carteira e finalize pendências.",
    href: "/atendimentos",
    icon: ClipboardList,
    modulo: "atendimentos",
    palavrasChave: ["fila", "contato", "tentativa", "pendência", "retorno"],
  },
  {
    id: "agenda",
    titulo: "Minha agenda",
    descricao: "Filtre retornos de hoje, atrasados, da semana e futuros para organizar o dia.",
    href: "/atendimentos?retorno=hoje",
    icon: CalendarClock,
    modulo: "atendimentos",
    palavrasChave: ["retorno", "hoje", "atrasado", "calendário"],
    perfis: ["atendente"],
  },
  {
    id: "inadimplencia",
    titulo: "Inadimplência",
    descricao: "Consulte valores em aberto das unidades dentro do seu escopo de carteira.",
    href: "/debitos",
    icon: Wallet,
    modulo: "debitos",
    palavrasChave: ["débito", "valor", "unidade", "cobrança"],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    descricao: "Alertas de retorno, distribuição e movimentação também aparecem no sino do topo.",
    href: "/notificacoes",
    icon: Bell,
    modulo: "dashboard",
    palavrasChave: ["alerta", "sino", "aviso", "retorno"],
  },
  {
    id: "inicio",
    titulo: "Início",
    descricao: "Painel com visão da carteira, pendências e atalhos conforme o seu perfil.",
    href: "/",
    icon: LayoutDashboard,
    modulo: "dashboard",
    palavrasChave: ["dashboard", "painel", "início"],
  },
  {
    id: "condominios",
    titulo: "Condomínios",
    descricao: "Cadastro e consulta de condomínios vinculados ao escritório.",
    href: "/condominios",
    icon: Building2,
    modulo: "condominios",
    palavrasChave: ["cadastro", "empreendimento"],
    perfis: ["administradora", "advogado"],
  },
];

const atalhos: AtalhoAjuda[] = [
  { href: "/atendimentos", titulo: "Atendimentos", icon: ClipboardList, modulo: "atendimentos" },
  { href: "/atendimentos?retorno=hoje", titulo: "Minha agenda", icon: CalendarClock, modulo: "atendimentos" },
  { href: "/debitos", titulo: "Inadimplência", icon: Wallet, modulo: "debitos" },
  { href: "/notificacoes", titulo: "Notificações", icon: Bell, modulo: "dashboard" },
  { href: "/", titulo: "Início", icon: LayoutDashboard, modulo: "dashboard" },
  { href: "/conta", titulo: "Minha conta", icon: UserRound, modulo: "dashboard" },
];

function normalizarBusca(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export default function AjudaPage() {
  const buscaAjudaId = useId();
  const [busca, setBusca] = useState("");
  const { permissoes, pode } = usePermissao();
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);

  const atalhosVisiveis = useMemo(
    () => atalhos.filter((item) => pode(item.modulo, "ler")),
    [pode],
  );

  const topicosVisiveis = useMemo(() => {
    const query = normalizarBusca(busca);
    return topicos.filter((item) => {
      if (!pode(item.modulo, "ler")) return false;
      if (item.perfis && !item.perfis.includes(perfil)) return false;
      if (!query) return true;
      const alvo = normalizarBusca(`${item.titulo} ${item.descricao} ${item.palavrasChave.join(" ")}`);
      return alvo.includes(query);
    });
  }, [busca, pode, perfil]);

  return (
    <WorkspaceShell>
      <PageHeader
        title="Ajuda e suporte"
        description="Orientações rápidas para o dia a dia da cobrança."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Ajuda e suporte" }]}
      />
      <PageContent>
        <div className="flex w-full min-w-0 flex-col gap-xl">
          <section className="w-full rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
            <div className="flex w-full min-w-0 flex-col gap-lg">
              <div className="w-full min-w-0">
                <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                  <Icon icon={HelpCircle} size="md" className="shrink-0 text-primary-container" />
                  Como podemos ajudar?
                </h2>
                <p className="mt-xs text-body-md text-on-surface-variant">
                  Busque por um módulo ou use os atalhos para ir direto à tela desejada.
                </p>
              </div>
              <FormField
                htmlFor={buscaAjudaId}
                label="Buscar na ajuda"
                className="w-full min-w-0 max-w-[var(--container-sm)]"
              >
                <div className="relative w-full min-w-0">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-on-surface-variant"
                    aria-hidden
                  >
                    <Icon icon={Search} size="sm" />
                  </span>
                  <Input
                    id={buscaAjudaId}
                    type="text"
                    autoComplete="off"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="retorno, inadimplência, notificação…"
                    className="w-full !pl-10"
                  />
                </div>
              </FormField>
            </div>

            {atalhosVisiveis.length > 0 ? (
              <div className="mt-lg">
                <p className="text-label-sm uppercase text-on-surface-variant">Atalhos rápidos</p>
                <ul className="mt-sm flex flex-wrap gap-sm">
                  {atalhosVisiveis.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-xs rounded-full border border-border-subtle bg-surface-muted px-md py-xs text-body-sm font-medium text-on-surface transition-colors hover:border-primary-container/40 hover:bg-primary-fixed/30"
                      >
                        <Icon icon={item.icon} size="sm" className="text-primary-container" />
                        {item.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <h2 className="text-title-md font-bold text-on-surface">Guias por módulo</h2>
              {busca.trim() ? (
                <p className="text-body-sm text-on-surface-variant">
                  {topicosVisiveis.length} resultado{topicosVisiveis.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>

            {topicosVisiveis.length === 0 ? (
              <div className="rounded-card border border-dashed border-border-subtle bg-surface-muted/50 px-lg py-xl text-center">
                <p className="text-body-md font-medium text-on-surface">Nenhum tópico encontrado</p>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Tente outro termo ou limpe a busca para ver todos os guias disponíveis para o seu perfil.
                </p>
                {busca.trim() ? (
                  <button
                    type="button"
                    className="mt-md text-body-sm font-semibold text-primary-container underline-offset-2 hover:underline"
                    onClick={() => setBusca("")}
                  >
                    Limpar busca
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="grid w-full min-w-0 gap-md min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
                {topicosVisiveis.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group flex h-full flex-col rounded-card border border-outline-variant bg-surface-card p-lg shadow-card transition-[border-color,box-shadow] hover:border-primary-container/35 hover:shadow-popover"
                    >
                      <div className="flex items-start gap-md">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/50 text-primary-container">
                          <Icon icon={item.icon} size="md" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-sm">
                            <h3 className="text-title-sm font-bold text-on-surface">{item.titulo}</h3>
                            <Icon
                              icon={ChevronRight}
                              size="sm"
                              className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-primary-container"
                            />
                          </div>
                          <p className="mt-xs text-body-sm text-on-surface-variant">{item.descricao}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid w-full min-w-0 gap-lg min-[768px]:grid-cols-2">
            <Alert variant="warning" title="Suporte interno">
              <p>
                Problemas de acesso, permissão ou dados incorretos devem ser reportados à Administradora do escritório.
              </p>
              <p className="mt-sm">
                Não compartilhe sua senha nem credenciais de integração com terceiros.
              </p>
              <p className="mt-md">
                <Link href="/conta" className="font-semibold text-on-surface underline-offset-2 hover:underline">
                  Ver dados da sua sessão em Minha conta
                </Link>
              </p>
            </Alert>

            <article className="rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
              <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                <Icon icon={ShieldAlert} size="md" className="text-status-pending" />
                Boas práticas
              </h2>
              <ul className="mt-md space-y-sm text-body-sm text-on-surface-variant">
                <li className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  Registre cada tentativa de contato em Atendimentos para manter o histórico da carteira.
                </li>
                <li className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  Confira o sino do topo para retornos urgentes antes de iniciar novos contatos.
                </li>
                <li className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  Use a agenda para priorizar retornos atrasados e os compromissos do dia.
                </li>
              </ul>
            </article>
          </section>
        </div>
      </PageContent>
    </WorkspaceShell>
  );
}
