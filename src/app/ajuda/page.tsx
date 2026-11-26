"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, HelpCircle, Map } from "lucide-react";
import { AjudaGuiaCard } from "@/components/ajuda/ajuda-guia-card";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Icon } from "@/components/icon";
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
          <Link
            href="/ajuda/mapa-processo"
            className="group flex w-full flex-col gap-sm rounded-xl border border-primary-container/25 bg-primary-fixed/20 p-lg shadow-card transition-[border-color,box-shadow] hover:border-primary-container/45 hover:shadow-popover focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between"
          >
            <div className="flex min-w-0 items-start gap-md">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary shadow-button">
                <Icon icon={Map} size="md" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-title-md font-bold text-on-surface">Mapa lógico</h2>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Fluxo interativo como no escritório: abas, decisões e regras reais do sistema.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-xs text-body-md font-semibold text-primary-container">
              Ver mapa visual
              <Icon
                icon={ChevronRight}
                size="sm"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>

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
