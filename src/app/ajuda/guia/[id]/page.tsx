"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { GuiaManualView } from "@/components/ajuda/guia-manual-view";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { guiaPorId, guiasAjudaVisiveis } from "@/lib/ajuda/manual-guias";
import { useAuth } from "@/context/auth-context";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";

export default function AjudaGuiaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params && typeof params.id === "string" ? params.id : "";
  const { loading: sessaoCarregando } = useAuth();
  const { permissoes, pode } = usePermissao();
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);

  const guia = guiaPorId(id);
  const guiasVisiveis = useMemo(() => guiasAjudaVisiveis(pode, perfil), [pode, perfil]);
  const permitido = guia ? guiasVisiveis.some((item) => item.id === guia.id) : false;

  if (sessaoCarregando) {
    return (
      <WorkspaceShell>
        <PageHeader icon={HelpCircle} title="Carregando guia…" description="Aguarde a sessão para exibir o manual." />
        <PageContent>
          <div className="h-48 animate-pulse rounded-card bg-surface-muted" aria-hidden />
        </PageContent>
      </WorkspaceShell>
    );
  }

  if (!guia || !permitido) {
    return (
      <WorkspaceShell>
        <PageHeader icon={HelpCircle} title="Guia não encontrado" description="Este tópico não existe ou não está disponível para o seu perfil." />
        <PageContent>
          <div className="rounded-card border border-dashed border-border-subtle bg-surface-muted/50 px-lg py-xl text-center">
            <p className="text-body-md text-on-surface-variant">
              Volte ao{" "}
              <Link href="/ajuda" className="font-semibold text-primary-container underline-offset-2 hover:underline">
                manual principal
              </Link>{" "}
              e escolha um módulo listado para o seu cargo.
            </p>
            <button
              type="button"
              className="mt-md text-body-sm font-semibold text-primary-container underline-offset-2 hover:underline"
              onClick={() => router.push("/ajuda")}
            >
              Ir para Ajuda e suporte
            </button>
          </div>
        </PageContent>
      </WorkspaceShell>
    );
  }

  return <GuiaManualView guia={guia} />;
}
