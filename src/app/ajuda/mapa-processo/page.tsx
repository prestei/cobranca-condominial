"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Map } from "lucide-react";
import { MapaProcessoView } from "@/components/ajuda/mapa-processo-view";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { usePermissao } from "@/hooks/use-permissao";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

export default function AjudaMapaProcessoPage() {
  const router = useRouter();
  const { pode } = usePermissao();

  const podeAcessarModulo = (modulo: ModuloPermissao) => pode(modulo, "ler");

  return (
    <WorkspaceShell>
      <PageHeader
        icon={Map}
        title="Mapa lógico"
        description="Visualize de forma simples e interativa o fluxo das regras de negócio do sistema."
        actions={
          <Button variant="surface" size="sm" onClick={() => router.push("/ajuda")}>
            <Icon icon={ArrowLeft} size="sm" aria-hidden />
            Voltar à ajuda
          </Button>
        }
      />
      <PageContent>
        <MapaProcessoView podeAcessarModulo={podeAcessarModulo} />
      </PageContent>
    </WorkspaceShell>
  );
}