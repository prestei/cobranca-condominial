"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Route } from "lucide-react";
import { Icon } from "@/components/icon";
import { MAPA_PROCESSO_ICONES } from "@/components/ajuda/mapa-sistema-icones";
import { MAPA_BLOCOS_FLUXO, MAPA_GOVERNANCA, type NoMapaSistema } from "@/lib/ajuda/mapa-sistema-grafo";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

const FAIXA_BLOCO: Record<string, string> = {
  cadastro: "border-l-primary-container",
  dados: "border-l-secondary-container",
  operacao: "border-l-primary-container",
  desfechos: "border-l-tertiary-container",
  analise: "border-l-outline",
};

type MapaSistemaDiagramaProps = {
  podeAcessarModulo: (modulo: ModuloPermissao) => boolean;
};

type ChipModuloProps = {
  no: NoMapaSistema;
  podeAcessarModulo: (modulo: ModuloPermissao) => boolean;
};

function ChipModulo({ no, podeAcessarModulo }: ChipModuloProps) {
  const Icone = MAPA_PROCESSO_ICONES[no.icone];
  const podeIr = Boolean(no.href && no.modulo && podeAcessarModulo(no.modulo));
  const hub = no.hub;
  const informativo = no.informativo;

  const classChip = `inline-flex min-w-0 max-w-full items-center gap-xs rounded-lg border px-sm py-xs text-body-sm ${
    hub
      ? "border-primary-container bg-primary-fixed/40 font-semibold text-on-surface shadow-card ring-1 ring-primary-container/20"
      : informativo
        ? "border-dashed border-border-subtle bg-transparent text-on-surface-variant"
        : "border-border-subtle bg-surface-card text-on-surface shadow-card hover:border-primary-container/35"
  }`;

  const conteudo = (
    <>
      <span
        className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${
          hub ? "bg-primary-container text-on-primary" : "bg-primary-fixed/45 text-primary-container"
        }`}
      >
        <Icon icon={Icone} size="sm" aria-hidden />
      </span>
      <span className="truncate">{no.titulo}</span>
    </>
  );

  if (podeIr && no.href) {
    return (
      <Link
        href={no.href}
        className={`${classChip} transition-[border-color,transform] hover:-translate-y-px focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass`}
      >
        {conteudo}
      </Link>
    );
  }

  return (
    <span
      className={classChip}
      title={no.href && no.modulo ? "Sem permissão" : informativo ? "Integração externa" : undefined}
    >
      {conteudo}
    </span>
  );
}

function SetaHorizontal() {
  return (
    <span className="inline-flex shrink-0 px-0.5 text-primary-container/50" aria-hidden>
      <Icon icon={ArrowRight} size="sm" />
    </span>
  );
}

function LinhaFluxo({
  nos,
  podeAcessarModulo,
}: {
  nos: readonly NoMapaSistema[];
  podeAcessarModulo: (modulo: ModuloPermissao) => boolean;
}) {
  if (nos.length === 0) return null;

  return (
    <>
      <div className="hidden min-w-0 flex-wrap items-center gap-0.5 min-[560px]:flex">
        {nos.map((no, index) => (
          <div key={no.id} className="flex min-w-0 items-center">
            <ChipModulo no={no} podeAcessarModulo={podeAcessarModulo} />
            {index < nos.length - 1 ? <SetaHorizontal /> : null}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-stretch gap-xs min-[560px]:hidden">
        {nos.map((no, index) => (
          <div key={no.id} className="flex flex-col items-center gap-xs">
            <ChipModulo no={no} podeAcessarModulo={podeAcessarModulo} />
            {index < nos.length - 1 ? (
              <Icon icon={ArrowDown} size="sm" className="text-primary-container/50" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

export function MapaSistemaDiagrama({ podeAcessarModulo }: MapaSistemaDiagramaProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-sm">
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-muted/35 px-md py-sm">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-on-surface-variant">
          Apoio — permissões e auditoria
        </p>
        <div className="mt-xs flex flex-wrap gap-xs">
          {MAPA_GOVERNANCA.map((no) => (
            <ChipModulo key={no.id} no={no} podeAcessarModulo={podeAcessarModulo} />
          ))}
        </div>
      </div>

      <ol className="m-0 flex list-none flex-col gap-sm p-0">
        {MAPA_BLOCOS_FLUXO.map((bloco) => (
          <li
            key={bloco.id}
            className={`flex gap-sm rounded-card border border-border-subtle border-l-4 bg-surface-card px-md py-sm shadow-card ${FAIXA_BLOCO[bloco.id] ?? "border-l-outline"}`}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-body-sm font-bold text-on-primary tabular-nums shadow-button"
              aria-hidden
            >
              {bloco.ordem}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-body-md font-semibold text-on-surface">{bloco.titulo}</h3>
              <p className="text-body-sm text-on-surface-variant">{bloco.subtitulo}</p>

              {bloco.nos.length > 0 ? (
                <div className="mt-sm">
                  <LinhaFluxo nos={bloco.nos} podeAcessarModulo={podeAcessarModulo} />
                </div>
              ) : null}

              {bloco.ramificacoes && bloco.ramificacoes.length > 0 ? (
                <div className="mt-sm flex flex-wrap gap-xs border-t border-border-subtle/80 pt-sm">
                  {bloco.ramificacoes.map((no) => (
                    <ChipModulo key={no.id} no={no} podeAcessarModulo={podeAcessarModulo} />
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="flex items-start gap-xs text-body-sm text-on-surface-variant">
        <Icon icon={Route} size="sm" className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
        <span>
          Siga do <strong className="font-semibold text-on-surface">1 ao 5</strong>. No passo 3, toque em{" "}
          <strong className="font-semibold text-on-surface">Fila e palitagem</strong> para abrir seu dia a dia.
        </span>
      </p>
    </div>
  );
}