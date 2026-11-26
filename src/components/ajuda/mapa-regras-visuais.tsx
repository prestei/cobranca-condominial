"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Handshake, ListOrdered, Scale, Shield, Split, X } from "lucide-react";
import { Icon } from "@/components/icon";
import { MAPA_PROCESSO_ICONES } from "@/components/ajuda/mapa-sistema-icones";
import {
  DESTAQUE_PRINCIPIO,
  FLUXO_NEGOCIACAO,
  NOTA_JURIDICO,
  PERMISSOES_JURIDICO,
  REGRA_NEGOCIACAO_FILA,
  SITUACOES_FILA,
  SITUACOES_FORA_FILA,
  TRES_CONCEITOS,
} from "@/lib/ajuda/mapa-regras-conteudo";

function SecaoRegra({
  id,
  titulo,
  descricao,
  icon,
  children,
  className = "",
}: {
  id: string;
  titulo: string;
  descricao?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`overflow-hidden rounded-card border border-border-subtle bg-surface-card shadow-card ${className}`}
    >
      <div className="flex gap-sm border-b border-border-subtle bg-surface-container-low/70 px-md py-sm">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/45 text-primary-container">
          <Icon icon={icon} size="sm" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-body-md font-semibold text-on-surface">
            {titulo}
          </h2>
          {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
        </div>
      </div>
      <div className="px-md py-md">{children}</div>
    </section>
  );
}

function Selo({ children, variante }: { children: React.ReactNode; variante: "fila" | "fora" }) {
  const cls =
    variante === "fila"
      ? "border-primary-container/35 bg-primary-fixed/35 text-on-surface"
      : "border-border-subtle bg-surface-muted text-on-surface-variant";
  return (
    <span className={`inline-flex rounded-full border px-sm py-0.5 text-[0.6875rem] font-medium leading-snug ${cls}`}>
      {children}
    </span>
  );
}

function IconePermissao({ ativo, rotulo }: { ativo: boolean; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-xs text-body-sm">
      <span
        className={`inline-flex size-7 items-center justify-center rounded-full ${
          ativo ? "bg-primary-container text-on-primary" : "bg-surface-muted text-on-surface-variant"
        }`}
      >
        <Icon icon={ativo ? Check : X} size="sm" aria-hidden />
      </span>
      <span className={ativo ? "font-medium text-on-surface" : "text-on-surface-variant"}>{rotulo}</span>
    </span>
  );
}

const ACCENT_CONCEITO: Record<(typeof TRES_CONCEITOS)[number]["id"], string> = {
  inadimplencia: "border-l-secondary-container",
  fila: "border-l-primary-container",
  atendimento: "border-l-tertiary-container",
};

export function MapaRegrasVisuais() {
  return (
    <div className="flex flex-col gap-md">
      <div className="rounded-card border border-primary-container/20 bg-primary-fixed/25 px-md py-md shadow-card">
        <p className="text-body-md font-medium leading-snug text-on-surface">{DESTAQUE_PRINCIPIO}</p>
      </div>

      <SecaoRegra
        id="regra-tres-conceitos"
        titulo="Não confunda estes três"
        descricao="Cada um responde a uma pergunta diferente."
        icon={Split}
      >
        <ul className="grid grid-cols-1 gap-sm min-[720px]:grid-cols-3">
          {TRES_CONCEITOS.map((item) => {
            const Icone = MAPA_PROCESSO_ICONES[item.icone];
            return (
              <li
                key={item.id}
                className={`flex min-w-0 flex-col rounded-lg border border-border-subtle border-l-4 bg-surface-container-lowest/90 p-md ${ACCENT_CONCEITO[item.id]}`}
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface-card text-primary-container shadow-card">
                  <Icon icon={Icone} size="sm" aria-hidden />
                </span>
                <h3 className="mt-sm text-body-md font-semibold text-on-surface">{item.titulo}</h3>
                <p className="mt-xs text-body-sm text-on-surface">{item.resumo}</p>
                <p className="mt-sm text-[0.6875rem] leading-snug text-on-surface-variant">{item.onde}</p>
              </li>
            );
          })}
        </ul>
      </SecaoRegra>

      <SecaoRegra id="regra-fila" titulo="Quem aparece na fila?" icon={ListOrdered}>
        <div className="grid grid-cols-1 gap-sm min-[560px]:grid-cols-2">
          <div className="rounded-xl border border-primary-container/25 bg-primary-fixed/20 p-md">
            <p className="text-label-md font-semibold text-primary-container">Entra na fila</p>
            <div className="mt-sm flex flex-wrap gap-xs">
              {SITUACOES_FILA.map((s) => (
                <Selo key={s} variante="fila">
                  {s}
                </Selo>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-md">
            <p className="text-label-md font-semibold text-on-surface-variant">Fica fora</p>
            <div className="mt-sm flex flex-wrap gap-xs">
              {SITUACOES_FORA_FILA.map((s) => (
                <Selo key={s} variante="fora">
                  {s}
                </Selo>
              ))}
            </div>
            <p className="mt-md text-body-sm text-on-surface-variant">
              Dá para ter débito em aberto e ainda assim estar fora (ex.: Prescrita).
            </p>
          </div>
        </div>
      </SecaoRegra>

      <SecaoRegra
        id="regra-negociacao"
        titulo="Negociação"
        descricao="Proposta e acordo não substituem a fila."
        icon={Handshake}
      >
        <ol className="grid grid-cols-1 gap-sm min-[640px]:grid-cols-3">
          {FLUXO_NEGOCIACAO.map((item, index) => (
            <li
              key={item.passo}
              className="relative flex flex-col rounded-lg border border-border-subtle bg-surface-container-lowest/80 p-sm"
            >
              <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-on-surface-variant">
                Passo {index + 1}
              </span>
              <span className="mt-xs text-body-sm font-semibold text-on-surface">{item.passo}</span>
              <span className="mt-xs text-body-sm text-on-surface-variant">{item.efeito}</span>
            </li>
          ))}
        </ol>
        <p className="mt-md flex gap-sm rounded-lg border border-primary-container/30 bg-primary-fixed/30 px-sm py-sm text-body-sm text-on-surface">
          <Icon icon={Handshake} size="sm" className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
          {REGRA_NEGOCIACAO_FILA}
        </p>
      </SecaoRegra>

      <SecaoRegra
        id="regra-juridico"
        titulo="Jurídico — quem faz o quê"
        descricao="Solicitar exige jurídico · criar. Aprovação é da gestão. Acompanhar usa ler / editar no seu escopo."
        icon={Scale}
      >
        <ul className="grid grid-cols-1 gap-sm min-[560px]:grid-cols-3">
          {PERMISSOES_JURIDICO.map((row) => (
            <li
              key={row.perfil}
              className="flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-container-lowest/90 p-md"
            >
              <div className="flex items-center gap-xs">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary-container">
                  <Icon icon={Shield} size="sm" aria-hidden />
                </span>
                <span className="text-body-md font-semibold text-on-surface">{row.perfil}</span>
              </div>
              <IconePermissao
                ativo={row.encaminhar}
                rotulo={row.perfil === "Administradora" ? "Encaminhar / aprovar" : "Solicitar encaminhamento"}
              />
              <IconePermissao ativo={row.acompanhar} rotulo="Acompanhar" />
            </li>
          ))}
        </ul>
        <p className="mt-md text-body-sm text-on-surface-variant">{NOTA_JURIDICO}</p>
      </SecaoRegra>
    </div>
  );
}