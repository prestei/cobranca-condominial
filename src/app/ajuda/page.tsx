"use client";

import { useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { AjudaGuiaCard } from "@/components/ajuda/ajuda-guia-card";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { guiasAjudaVisiveis } from "@/lib/ajuda/manual-guias";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";

export default function AjudaPage() {
  const { permissoes, pode } = usePermissao();
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);

  const guiasVisiveis = useMemo(() => guiasAjudaVisiveis(pode, perfil), [pode, perfil]);

  return (
    <WorkspaceShell>
      <PageHeader
        icon={HelpCircle}
        title="Ajuda e suporte"
        description="Regras de negócio de cada tela, em linguagem direta, com captura da página para você se localizar."
      />
      <PageContent>
        <section className="flex w-full min-w-0 flex-col gap-lg">
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Regras por tela</h2>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              {guiasVisiveis.length} tela{guiasVisiveis.length === 1 ? "" : "s"} — o que pode, o que não pode e como o escritório usa
            </p>
          </div>

          {guiasVisiveis.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-subtle bg-surface-muted/50 px-lg py-xl text-center">
              <p className="text-body-md font-medium text-on-surface">Nenhum guia disponível</p>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                Não há tópicos do manual liberados para o seu perfil no momento.
              </p>
            </div>
          ) : (
            <ul className="grid w-full min-w-0 grid-cols-1 gap-sm min-[768px]:grid-cols-3 min-[768px]:gap-md">
              {guiasVisiveis.map((item) => (
                <li key={item.id} className="flex min-w-0">
                  <AjudaGuiaCard guia={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageContent>
    </WorkspaceShell>
  );
}
