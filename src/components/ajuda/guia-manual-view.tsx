"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Lightbulb, ListTree, Route } from "lucide-react";
import { AjudaCapturaTela } from "@/components/ajuda/ajuda-captura-tela";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { GuiaManual } from "@/lib/ajuda/manual-guias";

type GuiaManualViewProps = {
  guia: GuiaManual;
};

export function GuiaManualView({ guia }: GuiaManualViewProps) {
  const router = useRouter();

  return (
    <WorkspaceShell>
      <PageHeader
        icon={guia.icon}
        title={guia.titulo}
        description={guia.resumo}
        actions={
          <div className="flex flex-wrap items-center gap-sm">
            <Button size="sm" variant="ghost" type="button" onClick={() => router.push("/ajuda")}>
              <Icon icon={ArrowLeft} size="sm" />
              Manual
            </Button>
            <Button size="sm" variant="primary" type="button" onClick={() => router.push(guia.href)}>
              <Icon icon={ArrowUpRight} size="sm" />
              Abrir tela
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="flex w-full min-w-0 flex-col gap-xl">
          <AjudaCapturaTela capturaId={guia.id} titulo={guia.titulo} variante="hero" priority />

          <section className="rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
            <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
              <Icon icon={BookOpen} size="md" className="text-primary-container" />
              Para que serve
            </h2>
            <p className="mt-md text-body-md leading-relaxed text-on-surface-variant">{guia.objetivo}</p>
          </section>

          <section className="rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
            <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
              <Icon icon={Route} size="md" className="text-primary-container" />
              Passo a passo
            </h2>
            <ol className="mt-lg space-y-lg">
              {guia.passos.map((passo, index) => (
                <li key={passo.titulo} className="flex gap-md">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/55 text-body-sm font-bold text-primary-container"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-title-sm font-bold text-on-surface">{passo.titulo}</h3>
                    <p className="mt-xs text-body-sm leading-relaxed text-on-surface-variant">{passo.descricao}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
            <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
              <Icon icon={ListTree} size="md" className="text-primary-container" />
              Elementos da tela
            </h2>
            <ul className="mt-lg grid gap-md min-[768px]:grid-cols-2">
              {guia.elementos.map((elemento) => (
                <li
                  key={elemento.titulo}
                  className="rounded-lg border border-border-subtle bg-surface-muted/40 p-md"
                >
                  <h3 className="text-body-md font-semibold text-on-surface">{elemento.titulo}</h3>
                  <p className="mt-xs text-body-sm text-on-surface-variant">{elemento.descricao}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-card border border-dashed border-primary-container/30 bg-primary-fixed/20 p-lg">
            <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
              <Icon icon={Lightbulb} size="md" className="text-status-pending" />
              Dicas
            </h2>
            <ul className="mt-md space-y-sm text-body-sm text-on-surface-variant">
              {guia.dicas.map((dica) => (
                <li key={dica} className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  {dica}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-body-sm text-on-surface-variant">
            Precisa de outro módulo?{" "}
            <Link href="/ajuda" className="font-semibold text-primary-container underline-offset-2 hover:underline">
              Voltar ao índice do manual
            </Link>
            .
          </p>
        </div>
      </PageContent>
    </WorkspaceShell>
  );
}
