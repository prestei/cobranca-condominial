"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { MODULOS_PERMISSAO } from "@/lib/permissions/modulos";

function AcessoNegadoContent() {
  const params = useSearchParams();
  const moduloId = params?.get("modulo") ?? "";
  const modulo = MODULOS_PERMISSAO.find((item) => item.id === moduloId);

  return (
    <WorkspaceShell>
      <PageHeader title="Acesso restrito" />
      <PageContent>
        <EmptyState
          icon={<Icon icon={ShieldOff} size="lg" />}
          title="Você não tem permissão para esta área"
          description={
            modulo
              ? `Seu cargo não inclui permissão de visualização em ${modulo.label}. Peça ao administrador para ajustar o cargo em Cargos.`
              : "Seu cargo não inclui permissão para acessar esta página. Peça ao administrador para ajustar o cargo."
          }
          action={
            <Link href="/" className="inline-flex">
              <Button size="sm" type="button">Voltar ao início</Button>
            </Link>
          }
        />
      </PageContent>
    </WorkspaceShell>
  );
}

export default function AcessoNegadoPage() {
  return (
    <Suspense fallback={null}>
      <AcessoNegadoContent />
    </Suspense>
  );
}
