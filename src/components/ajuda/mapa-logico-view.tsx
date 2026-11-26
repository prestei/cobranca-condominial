"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Icon } from "@/components/icon";
import { MAPA_PROCESSO_ICONES } from "@/components/ajuda/mapa-sistema-icones";
import {
  ABAS_MAPA_LOGICO,
  DECISAO_ACORDO,
  DECISAO_QUITACAO,
  LEGENDA_MAPA,
  NOS_PROTOTIPO,
  PAINEL_EXCECOES,
  PAINEL_EXEMPLO,
  PAINEL_REGRAS,
  type ModoMapaLogico,
  type NoPrototipo,
  type PaletaPrototipo,
} from "@/lib/ajuda/mapa-logico-dados";

const PALETA_CAIXA: Record<PaletaPrototipo, string> = {
  neutro: "bg-surface-container-high",
  laranja: "bg-secondary-fixed/75",
  roxo: "bg-primary-fixed/85",
  teal: "bg-primary-fixed/65",
  verde: "bg-primary-fixed",
  azul: "bg-primary-container",
};

const PALETA_ICONE: Record<PaletaPrototipo, string> = {
  neutro: "bg-surface-card text-on-surface-variant",
  laranja: "bg-surface-card text-secondary-container",
  roxo: "bg-surface-card text-primary-container",
  teal: "bg-surface-card text-primary-container",
  verde: "bg-primary-container text-on-primary",
  azul: "bg-primary-fixed text-primary-container",
};

const PALETA_LEGENDA: Record<PaletaPrototipo, string> = {
  neutro: "bg-outline-variant",
  laranja: "bg-secondary-container",
  roxo: "bg-primary-container",
  teal: "bg-primary-container",
  verde: "bg-primary-container",
  azul: "bg-primary-container",
};

function destacado(no: NoPrototipo, modo: ModoMapaLogico) {
  return modo === "completo" || no.foco.includes(modo);
}

function RotuloRamo({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-card px-sm py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-on-surface-variant shadow-card">
      {children}
    </span>
  );
}

function ConectoresEntreItens() {
  return (
    <>
      <span className="inline-flex py-xs text-on-surface-variant/45 min-[900px]:hidden" aria-hidden>
        <Icon icon={ArrowDown} size="sm" />
      </span>
      <span className="hidden shrink-0 px-xs text-on-surface-variant/45 min-[900px]:inline-flex" aria-hidden>
        <Icon icon={ArrowRight} size="sm" />
      </span>
    </>
  );
}

function CaixaPrototipo({ no, modo, className = "" }: { no: NoPrototipo; modo: ModoMapaLogico; className?: string }) {
  const Icone = MAPA_PROCESSO_ICONES[no.icone];
  const ativo = destacado(no, modo);
  return (
    <article
      className={`flex w-full max-w-[11.5rem] min-w-[9.5rem] flex-col items-center rounded-2xl px-sm pb-md pt-md shadow-card transition-opacity ${PALETA_CAIXA[no.paleta]} ${
        ativo ? "opacity-100" : "opacity-40 saturate-50"
      } ${className}`}
    >
      <span
        className={`inline-flex size-12 items-center justify-center rounded-full shadow-card ${PALETA_ICONE[no.paleta]}`}
      >
        <Icon icon={Icone} size="md" aria-hidden />
      </span>
      <h3 className="mt-sm text-center text-body-sm font-bold leading-tight text-on-surface">{no.titulo}</h3>
      <p className="mt-xs px-xs text-center text-[0.6875rem] leading-snug text-on-surface-variant">{no.descricao}</p>
    </article>
  );
}

function DecisaoPrototipo({
  titulo,
  modo,
  idFoco,
}: {
  titulo: string;
  modo: ModoMapaLogico;
  idFoco: ModoMapaLogico[];
}) {
  const ativo = modo === "completo" || idFoco.includes(modo);
  return (
    <div
      className={`flex w-full max-w-[7rem] min-w-[5.5rem] flex-col items-center justify-center px-xs ${ativo ? "opacity-100" : "opacity-45"}`}
    >
      <div className="relative flex size-16 items-center justify-center sm:size-[4.5rem]">
        <div className="absolute inset-0 rotate-45 rounded-lg bg-primary-container shadow-card" />
        <p className="relative z-[1] max-w-[4.25rem] text-center text-[0.625rem] font-bold leading-tight text-on-primary sm:text-[0.6875rem]">
          {titulo}
        </p>
      </div>
    </div>
  );
}

function FaixaFluxo({ children }: { children: React.ReactNode[] }) {
  return (
    <div className="w-full overflow-x-auto pb-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max max-w-full flex-col items-center gap-sm min-[900px]:flex-row min-[900px]:flex-nowrap min-[900px]:items-center min-[900px]:justify-center min-[900px]:gap-lg">
        {children.map((child, index) => (
          <Fragment key={index}>
            <div className="flex w-full flex-col items-center min-[900px]:w-auto min-[900px]:shrink-0">{child}</div>
            {index < children.length - 1 ? <ConectoresEntreItens /> : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RamosDecisao({
  sim,
  nao,
}: {
  sim: React.ReactNode;
  nao: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-stretch gap-md border-y border-border-subtle/80 py-md min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-center min-[640px]:gap-xl">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-sm min-[640px]:max-w-[13rem] min-[640px]:flex-initial">
        <RotuloRamo>Sim</RotuloRamo>
        {sim}
      </div>
      <div
        className="hidden w-px shrink-0 self-stretch bg-border-subtle/80 min-[640px]:block"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-sm min-[640px]:max-w-[13rem] min-[640px]:flex-initial">
        <RotuloRamo>Não</RotuloRamo>
        {nao}
      </div>
    </div>
  );
}

function RotuloFaixa({ children }: { children: React.ReactNode }) {
  return (
    <p className="w-full text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-on-surface-variant">
      {children}
    </p>
  );
}

function FluxoPrototipo({ modo }: { modo: ModoMapaLogico }) {
  const cad = NOS_PROTOTIPO.cadastro;
  const imp = NOS_PROTOTIPO.importacao;
  const u = NOS_PROTOTIPO.unidade;
  const i = NOS_PROTOTIPO.inadimplencia;
  const q = NOS_PROTOTIPO.quitacao;
  const f = NOS_PROTOTIPO.fila;
  const a = NOS_PROTOTIPO.atendimento;
  const n = NOS_PROTOTIPO.negociacao;
  const ac = NOS_PROTOTIPO.acordo;
  const j = NOS_PROTOTIPO.juridico;

  return (
    <div className="w-full rounded-2xl border border-border-subtle bg-surface-container-low/95 p-md pb-lg min-[768px]:p-lg min-[768px]:pr-20">
      <div className="flex w-full flex-col gap-xl">
        <div className="flex w-full flex-col gap-sm">
          <RotuloFaixa>Entrada de dados</RotuloFaixa>
          <FaixaFluxo>
            <CaixaPrototipo no={cad} modo={modo} />
            <CaixaPrototipo no={imp} modo={modo} />
            <CaixaPrototipo no={u} modo={modo} />
          </FaixaFluxo>
        </div>

        <div className="flex w-full flex-col gap-sm">
          <RotuloFaixa>Inadimplência e cobrança</RotuloFaixa>
          <FaixaFluxo>
            <CaixaPrototipo no={i} modo={modo} />
            <DecisaoPrototipo titulo={DECISAO_QUITACAO.titulo} modo={modo} idFoco={["completo", "inadimplencia"]} />
          </FaixaFluxo>
        </div>

        <RamosDecisao
          sim={<CaixaPrototipo no={q} modo={modo} />}
          nao={
            <p className="w-full max-w-[13rem] text-center text-body-sm leading-relaxed text-on-surface-variant">
              Segue para a fila de cobrança e carteira do RE.
            </p>
          }
        />

        <div className="flex w-full flex-col gap-sm">
          <RotuloFaixa>Fila, atendimento e desfechos</RotuloFaixa>
          <FaixaFluxo>
            <CaixaPrototipo no={f} modo={modo} />
            <CaixaPrototipo no={a} modo={modo} />
            <CaixaPrototipo no={n} modo={modo} />
            <DecisaoPrototipo titulo={DECISAO_ACORDO.titulo} modo={modo} idFoco={["completo", "negociacao"]} />
          </FaixaFluxo>
        </div>

        <RamosDecisao sim={<CaixaPrototipo no={ac} modo={modo} />} nao={<CaixaPrototipo no={j} modo={modo} />} />
      </div>
    </div>
  );
}

function PainelRodape() {
  return (
    <div className="grid w-full grid-cols-1 gap-md min-[960px]:grid-cols-3">
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-lg shadow-card">
        <h3 className="text-body-md font-bold text-on-surface">Regras importantes</h3>
        <ul className="mt-md space-y-sm text-body-sm text-on-surface-variant">
          {PAINEL_REGRAS.map((item) => (
            <li key={item} className="flex gap-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-lg shadow-card">
        <h3 className="text-body-md font-bold text-on-surface">Exemplo prático</h3>
        <p className="mt-md text-body-sm leading-relaxed text-on-surface-variant">{PAINEL_EXEMPLO}</p>
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-lg shadow-card">
        <h3 className="text-body-md font-bold text-on-surface">Exceções</h3>
        <ul className="mt-md space-y-sm text-body-sm text-on-surface-variant">
          {PAINEL_EXCECOES.map((item) => (
            <li key={item} className="flex gap-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-secondary-container" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MapaLogicoView() {
  const [modo, setModo] = useState<ModoMapaLogico>("completo");

  return (
    <div className="flex w-full min-w-0 flex-col gap-lg">
      <div
        className="flex w-full flex-wrap gap-1 rounded-xl border border-border-subtle bg-surface-container-low p-1"
        role="tablist"
        aria-label="Recorte do mapa"
      >
        {ABAS_MAPA_LOGICO.map((aba) => {
          const selecionada = modo === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={selecionada}
              onClick={() => setModo(aba.id)}
              className={`cursor-pointer rounded-lg px-md py-sm text-body-sm font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
                selecionada
                  ? "bg-primary-container text-on-primary shadow-card"
                  : "text-on-surface-variant hover:bg-surface-card hover:text-on-surface"
              }`}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>

      <FluxoPrototipo modo={modo} />

      <div className="flex w-full flex-wrap items-center gap-md border-t border-border-subtle pt-md">
        <span className="text-body-sm font-semibold text-on-surface">Legenda</span>
        <ul className="flex flex-wrap gap-md text-body-sm text-on-surface-variant">
          {LEGENDA_MAPA.map((item) => (
            <li key={item.rotulo} className="inline-flex items-center gap-xs">
              <span className={`size-2.5 rounded-full ${PALETA_LEGENDA[item.paleta]}`} aria-hidden />
              {item.rotulo}
            </li>
          ))}
        </ul>
      </div>

      <PainelRodape />
    </div>
  );
}