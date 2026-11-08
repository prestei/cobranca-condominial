"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MinhaAgendaPanel } from "@/components/atendimentos/minha-agenda-panel";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";

function MinhaAgendaConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const retornoLegado = searchParams?.get("retorno");
    if (!retornoLegado) return;
    const mapa: Record<string, string> = {
      hoje: "hoje",
      atrasado: "atrasado",
      atrasados: "atrasado",
      semana: "semana",
      agendado: "futuros",
    };
    const secao = mapa[retornoLegado];
    if (secao) {
      router.replace(`/minha-agenda?secao=${secao}`);
    } else {
      router.replace("/minha-agenda");
    }
  }, [router, searchParams]);

  return (
    <WorkspaceShell>
      <PageHeader
        title="Minha agenda"
        description="Organize retornos e compromissos da sua carteira — lista e calendário com o mesmo conjunto de registros."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Minha agenda" }]}
      />
      <PageContent>
        <MinhaAgendaPanel />
      </PageContent>
    </WorkspaceShell>
  );
}

export default function MinhaAgendaPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceShell>
          <PageHeader
            title="Minha agenda"
            description="Organize retornos e compromissos da sua carteira — lista e calendário com o mesmo conjunto de registros."
            breadcrumbs={[{ label: "Início", href: "/" }, { label: "Minha agenda" }]}
          />
          <PageContent>
            <SkeletonListPage showMetrics={false} rows={8} cols={7} label="Carregando agenda" />
          </PageContent>
        </WorkspaceShell>
      }
    >
      <MinhaAgendaConteudo />
    </Suspense>
  );
}
