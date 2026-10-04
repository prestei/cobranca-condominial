"use client";

import { Building, FileBarChart, HelpCircle, Plus, Settings, ShieldCheck, User } from "lucide-react";
import { CondominiumsTableDemo } from "@/design-system/table-demo";
import {
  AppShell,
  AppShellBrand,
  AppShellCarteiraBadge,
  AppShellMain,
  AppShellNav,
  AppShellNavLink,
  AppShellNavSection,
  AppShellSidebar,
  AppShellSidebarFooter,
} from "@/components/app-shell";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";

function DemoSidebar() {
  return (
    <AppShellSidebar>
      <AppShellBrand title="Cobrança" />
      <AppShellCarteiraBadge />
      <AppShellNav>
        <AppShellNavSection title="Carteira">
          <AppShellNavLink href="/design-system" icon={Building} active count={3}>
            Condomínios
          </AppShellNavLink>
          <AppShellNavLink href="/design-system" icon={User} count={268}>
            Unidades
          </AppShellNavLink>
        </AppShellNavSection>
        <AppShellNavSection title="Análise">
          <AppShellNavLink href="/design-system" icon={FileBarChart}>
            Relatórios
          </AppShellNavLink>
          <AppShellNavLink href="/design-system" icon={ShieldCheck}>
            Indicadores
          </AppShellNavLink>
        </AppShellNavSection>
      </AppShellNav>
      <AppShellSidebarFooter>
        <AppShellNavLink href="/design-system" icon={HelpCircle}>
          Ajuda e suporte
        </AppShellNavLink>
        <AppShellNavLink href="/design-system" icon={Settings}>
          Configurações
        </AppShellNavLink>
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

export function AppShellShowcase({ embedded = false }: { embedded?: boolean }) {
  const shell = (
    <div className="overflow-hidden rounded-lg border border-border-subtle shadow-card">
      <AppShell
        sidebar={<DemoSidebar />}
        user={{
          name: "Bruna Souza",
          initials: "BS",
          menuSubtitle: "Cobrança · Carteira ativa",
        }}
        notificationCount={2}
      >
        <AppShellMain>
          <PageHeader
            title="Condomínios"
            description="Acompanhe unidades, situação e ações da carteira."
            breadcrumbs={[
              { label: "Início", href: "/" },
              { label: "Carteira", href: "/design-system" },
              { label: "Condomínios" },
            ]}
            actions={
              <>
                <Button variant="outline" size="md">Exportar</Button>
                <Button size="md">
                  <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                  Novo condomínio
                </Button>
              </>
            }
          />
          <PageContent>
            <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
              <CardMetric
                iconClassName="bg-surface-subtle text-on-surface-variant"
                icon={<Icon icon={Building} size="md" />}
              >
                <p className="text-metric text-on-surface tabular-nums">03</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">na carteira</p>
              </CardMetric>
              <CardMetric
                iconClassName="bg-surface-subtle text-on-surface-variant"
                icon={<Icon icon={User} size="md" />}
              >
                <p className="text-metric text-on-surface tabular-nums">268</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">unidades</p>
              </CardMetric>
              <CardMetric
                iconClassName="bg-gold-subtle text-brass"
                icon={<Icon icon={ShieldCheck} size="md" className="text-brass" />}
              >
                <p className="text-metric text-on-surface tabular-nums">02</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">ativos</p>
              </CardMetric>
            </div>
            <CondominiumsTableDemo />
          </PageContent>
        </AppShellMain>
      </AppShell>
    </div>
  );

  if (embedded) return shell;
  return shell;
}
