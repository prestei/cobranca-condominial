"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IdCard, Mail, Phone, UserRound } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonProfileCard } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useAuth } from "@/context/auth-context";
import { iniciaisNome } from "@/data/catalogo";
import { usePermissao } from "@/hooks/use-permissao";
import type { PerfilMinhaConta } from "@/lib/usuarios/service";

function formatarTelefoneExibicao(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return telefone.trim() || "—";
}

function telefoneHref(telefone: string): string | null {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const nacional = digits.length <= 11 ? `55${digits}` : digits;
  return `tel:+${nacional}`;
}

type CampoContaProps = {
  rotulo: string;
  valor: string;
  icon: typeof Mail;
  href?: string | null;
};

function CampoConta({ rotulo, valor, icon, href }: CampoContaProps) {
  return (
    <div className="flex gap-md py-md first:pt-0 last:pb-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant">
        <Icon icon={icon} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-label-sm uppercase text-on-surface-variant">{rotulo}</dt>
        <dd className="mt-xs text-body-lg font-semibold text-on-surface">
          {href ? (
            <a
              href={href}
              className="break-all text-primary-container underline-offset-2 transition-colors hover:text-primary-hover hover:underline"
            >
              {valor}
            </a>
          ) : (
            <span className="break-all">{valor}</span>
          )}
        </dd>
      </div>
    </div>
  );
}

export default function ContaPage() {
  const { loading: sessaoCarregando } = useAuth();
  const { pode } = usePermissao();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilMinhaConta | null>(null);
  const podeVerColaboradores = pode("usuarios", "ler");

  const carregarPerfil = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const response = await fetch("/api/conta", { credentials: "same-origin" });
    if (!response.ok) {
      let mensagem = "Não foi possível carregar os dados da conta.";
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) mensagem = body.error;
      } catch {
        /* ignore */
      }
      setPerfil(null);
      setErro(mensagem);
      setCarregando(false);
      return;
    }
    const payload = (await response.json()) as { perfil?: PerfilMinhaConta };
    setPerfil(payload.perfil ?? null);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (sessaoCarregando) return;
    void carregarPerfil();
  }, [carregarPerfil, sessaoCarregando]);

  const initials = perfil ? iniciaisNome(perfil.nome) : "—";

  const telefoneFormatado = useMemo(
    () => (perfil ? formatarTelefoneExibicao(perfil.telefone) : ""),
    [perfil],
  );
  const telefoneLink = useMemo(() => (perfil ? telefoneHref(perfil.telefone) : null), [perfil]);

  return (
    <WorkspaceShell>
      <PageHeader
        icon={UserRound}
        title="Minha conta"
        description="Dados da sua sessão no sistema de cobrança."
      />
      <PageContent>
        {sessaoCarregando || carregando ? (
          <SkeletonProfileCard label="Carregando dados da conta" />
        ) : erro ? (
          <div className="w-full max-w-[32rem]">
            <div className="flex flex-col items-center gap-md rounded-card border border-outline-variant bg-surface-card p-lg text-center shadow-card">
              <p className="text-body-md text-on-surface-variant">{erro}</p>
              <Button type="button" variant="secondary" onClick={() => void carregarPerfil()}>
                Tentar de novo
              </Button>
            </div>
          </div>
        ) : perfil ? (
          <div className="flex w-full max-w-[32rem] flex-col gap-lg">
            <section className="overflow-hidden rounded-card border border-outline-variant bg-surface-card shadow-card">
              <div className="border-b border-border-subtle bg-surface-subtle/60 px-lg py-lg">
                <div className="flex items-center gap-md">
                  <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-container text-headline-sm font-bold text-on-primary">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-headline-sm font-bold text-on-surface">{perfil.nome}</p>
                    <p className="mt-xs text-body-md text-on-surface-variant">{perfil.cargoNome}</p>
                  </div>
                </div>
              </div>

              <div className="px-lg py-md">
                <h2 className="text-label-sm uppercase text-on-surface-variant">Dados de contato</h2>
                <dl className="mt-sm divide-y divide-border-subtle">
                  {perfil.codigoRe ? (
                    <CampoConta rotulo="RE" valor={perfil.codigoRe} icon={IdCard} />
                  ) : null}
                  {perfil.email ? (
                    <CampoConta rotulo="E-mail" valor={perfil.email} icon={Mail} href={`mailto:${perfil.email}`} />
                  ) : null}
                  {perfil.telefone ? (
                    <CampoConta
                      rotulo="Telefone"
                      valor={telefoneFormatado}
                      icon={Phone}
                      href={telefoneLink}
                    />
                  ) : null}
                </dl>
              </div>
            </section>

            <Alert variant="info" title="Cadastro somente leitura">
              Alterações de nome, contato e permissões são feitas pela Administradora
              {podeVerColaboradores ? (
                <>
                  {" "}
                  em{" "}
                  <Link
                    href="/usuarios"
                    className="font-semibold text-primary-container underline-offset-2 hover:text-primary-hover hover:underline"
                  >
                    Colaboradores
                  </Link>
                  .
                </>
              ) : (
                <> em Colaboradores.</>
              )}
            </Alert>
          </div>
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}
