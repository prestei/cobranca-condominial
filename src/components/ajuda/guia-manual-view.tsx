"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Lightbulb, Route, Scale } from "lucide-react";
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

          <section className="rounded-card border border-primary-container/25 bg-primary-fixed/15 p-lg shadow-card">
            <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
              <Icon icon={Scale} size="md" className="text-primary-container" />
              Regras desta tela
            </h2>
            <p className="mt-sm text-body-sm text-on-surface-variant">
              O que o escritório combinou — leia antes de operar ou tirar dúvidas com a equipe.
            </p>
            <ul className="mt-lg space-y-md text-body-md text-on-surface-variant">
              {guia.regras.map((regra) => (
                <li key={regra} className="flex gap-md leading-relaxed">
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-primary-container"
                    aria-hidden
                  />
                  <span>{regra}</span>
                </li>
              ))}
            </ul>
          </section>

          {guia.passos && guia.passos.length > 0 ? (
            <section className="rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
              <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                <Icon icon={Route} size="md" className="text-primary-container" />
                Por onde começar
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
          ) : null}

          {guia.dicas && guia.dicas.length > 0 ? (
            <section className="rounded-card border border-dashed border-primary-container/30 bg-primary-fixed/20 p-lg">
              <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                <Icon icon={Lightbulb} size="md" className="text-status-pending" />
                Vale lembrar
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
          ) : null}

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
