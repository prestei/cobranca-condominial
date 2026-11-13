"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, HelpCircle, Search, ShieldAlert } from "lucide-react";
import { AjudaCapturaTela } from "@/components/ajuda/ajuda-captura-tela";
import { Alert } from "@/components/alert";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { guiasAjudaVisiveis } from "@/lib/ajuda/manual-guias";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";

const atalhosRapidos = [
  { guiaId: "atendimentos", titulo: "Atendimentos" },
  { guiaId: "agenda", titulo: "Minha agenda" },
  { guiaId: "inadimplencia", titulo: "Inadimplência" },
  { guiaId: "notificacoes", titulo: "Notificações" },
  { guiaId: "inicio", titulo: "Início" },
  { guiaId: "conta", titulo: "Minha conta" },
] as const;

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

  const guiasVisiveis = useMemo(() => guiasAjudaVisiveis(pode, perfil), [pode, perfil]);

  const guiasFiltrados = useMemo(() => {
    const query = normalizarBusca(busca);
    if (!query) return guiasVisiveis;
    return guiasVisiveis.filter((item) => {
      const alvo = normalizarBusca(`${item.titulo} ${item.resumo} ${item.palavrasChave.join(" ")}`);
      return alvo.includes(query);
    });
  }, [busca, guiasVisiveis]);

  const atalhosVisiveis = useMemo(() => {
    const ids = new Set(guiasVisiveis.map((g) => g.id));
    return atalhosRapidos.filter((item) => ids.has(item.guiaId));
  }, [guiasVisiveis]);

  return (
    <WorkspaceShell>
      <PageHeader
        icon={HelpCircle}
        title="Ajuda e suporte"
        description="Manual do sistema: como cada tela funciona, com capturas reais e passo a passo."
      />
      <PageContent>
        <div className="flex w-full min-w-0 flex-col gap-xl">
          <section className="grid w-full min-w-0 gap-lg min-[1024px]:grid-cols-[1.1fr_0.9fr] min-[1024px]:items-center">
            <div className="flex flex-col gap-md">
              <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                <Icon icon={BookOpen} size="md" className="text-primary-container" />
                Manual funcional
              </h2>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Cada cartão abaixo abre um guia completo: objetivo da tela, fluxo em passos, o que significa cada área da
                interface e dicas de operação. As imagens são capturas reais do sistema (ambiente de demonstração).
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Guias disponíveis para o seu perfil:{" "}
                <span className="font-semibold text-on-surface">{guiasVisiveis.length}</span>
              </p>
            </div>
            <AjudaCapturaTela capturaId="ajuda" titulo="Ajuda e suporte" variante="card" className="min-[1024px]:max-h-[280px]" priority />
          </section>

          <section className="w-full rounded-card border border-outline-variant bg-surface-card p-lg shadow-card">
            <div className="flex w-full min-w-0 flex-col gap-lg">
              <div className="w-full min-w-0">
                <h2 className="flex items-center gap-sm text-title-md font-bold text-on-surface">
                  <Icon icon={HelpCircle} size="md" className="shrink-0 text-primary-container" />
                  Como podemos ajudar?
                </h2>
                <p className="mt-xs text-body-md text-on-surface-variant">
                  Busque por um módulo ou abra um guia com print da tela antes de ir à operação.
                </p>
              </div>
              <FormField
                htmlFor={buscaAjudaId}
                label="Buscar no manual"
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
                    placeholder="retorno, inadimplência, importação…"
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
                    <li key={item.guiaId}>
                      <Link
                        href={`/ajuda/guia/${item.guiaId}`}
                        className="inline-flex items-center gap-xs rounded-full border border-border-subtle bg-surface-muted px-md py-xs text-body-sm font-medium text-on-surface transition-colors hover:border-primary-container/40 hover:bg-primary-fixed/30"
                      >
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
              <h2 className="text-title-md font-bold text-on-surface">Guias por tela</h2>
              {busca.trim() ? (
                <p className="text-body-sm text-on-surface-variant">
                  {guiasFiltrados.length} resultado{guiasFiltrados.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>

            {guiasFiltrados.length === 0 ? (
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
                {guiasFiltrados.map((item) => (
                  <li key={item.id} className="flex min-w-0 flex-col gap-sm">
                    <Link
                      href={`/ajuda/guia/${item.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-card border border-outline-variant bg-surface-card shadow-card transition-[border-color,box-shadow] hover:border-primary-container/35 hover:shadow-popover"
                    >
                      <div className="border-b border-outline-variant/50 bg-surface-muted/30 p-sm">
                        <AjudaCapturaTela
                          capturaId={item.id}
                          titulo={item.titulo}
                          variante="thumb"
                          className="rounded-none border-0 shadow-none"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-lg">
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
                            <p className="mt-xs text-body-sm text-on-surface-variant">{item.resumo}</p>
                            <p className="mt-sm text-label-sm font-medium text-primary-container">Ver guia com captura</p>
                          </div>
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
                  Leia o guia de Atendimentos antes da primeira palitagem — o histórico não pode ser apagado.
                </li>
                <li className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  Confira o sino e o guia de Notificações para retornos urgentes.
                </li>
                <li className="flex gap-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
                  Administradora: Importações e Cargos têm guias próprios sobre permissões e conferência.
                </li>
              </ul>
            </article>
          </section>
        </div>
      </PageContent>
    </WorkspaceShell>
  );
}
