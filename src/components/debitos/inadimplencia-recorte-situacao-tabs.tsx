"use client";

import { useEffect } from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import {
  RECORTES_LISTAGEM_INADIMPLENCIA,
  ROTULOS_RECORTE_LISTAGEM,
  type RecorteListagemInadimplenciaId,
  type SituacaoPainelId,
} from "@/lib/debitos/painel-situacao";

const ICONES: Record<SituacaoPainelId, LucideIcon> = {
  em_aberto: AlertCircle,
  em_negociacao: Handshake,
  quitadas: CheckCircle2,
  prescritas: Archive,
};

const ICONE_ATIVO: Record<SituacaoPainelId, string> = {
  em_aberto: "text-status-critical",
  em_negociacao: "text-primary-container",
  quitadas: "text-status-settled",
  prescritas: "text-brass",
};

const BORDA_ATIVA: Record<SituacaoPainelId, string> = {
  em_aberto: "border-status-critical text-on-surface",
  em_negociacao: "border-primary-container text-on-surface",
  quitadas: "border-status-settled text-on-surface",
  prescritas: "border-brass text-on-surface",
};

const HOVER_INATIVO: Record<SituacaoPainelId, string> = {
  em_aberto:
    "hover:border-status-critical/35 hover:bg-[color-mix(in_srgb,var(--color-status-critical)_10%,var(--color-surface-card))] hover:text-on-surface",
  em_negociacao:
    "hover:border-primary-container/35 hover:bg-[color-mix(in_srgb,var(--color-primary-container)_12%,var(--color-surface-card))] hover:text-on-surface",
  quitadas:
    "hover:border-status-settled/35 hover:bg-status-settled/10 hover:text-on-surface",
  prescritas: "hover:border-brass/45 hover:bg-gold-subtle hover:text-on-surface",
};

type Props = {
  value: RecorteListagemInadimplenciaId;
  onValueChange: (value: RecorteListagemInadimplenciaId) => void;
  className?: string;
};

export function InadimplenciaRecorteSituacaoTabs({ value, onValueChange, className }: Props) {
  const valorAba = value === "historico" ? "em_aberto" : value;

  useEffect(() => {
    if (value === "historico") {
      onValueChange("em_aberto");
    }
  }, [value, onValueChange]);

  return (
    <Tabs
      value={valorAba}
      onValueChange={(next) => onValueChange(next as RecorteListagemInadimplenciaId)}
      defaultValue="em_aberto"
      className={className}
    >
      <div
        className="overflow-x-auto rounded-t-xl border border-border-subtle bg-surface-card shadow-card"
        role="presentation"
      >
        <TabsList
          aria-label="Situação da inadimplência no recorte"
          className="flex w-full min-w-max flex-nowrap divide-x divide-border-subtle border-b-0"
        >
          {RECORTES_LISTAGEM_INADIMPLENCIA.map((id) => {
            const situacaoId = id as SituacaoPainelId;
            const selecionado = valorAba === id;
            const Icone = ICONES[situacaoId];
            return (
              <TabsTrigger
                key={id}
                value={id}
                className={`group min-h-12 min-w-0 flex-1 justify-center gap-sm border-b-2 px-md py-md text-label-md transition-[color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass ${
                  selecionado
                    ? `${BORDA_ATIVA[situacaoId].replace("border-", "!border-")} !text-on-surface shadow-[inset_0_-1px_0_0_var(--color-surface-card)]`
                    : `border-transparent border-b-2 text-on-surface-variant ${HOVER_INATIVO[situacaoId]}`
                }`}
              >
                <Icon
                  icon={Icone}
                  size="sm"
                  className={`transition-opacity duration-200 ${
                    selecionado ? ICONE_ATIVO[situacaoId] : `${ICONE_ATIVO[situacaoId]} opacity-55 group-hover:opacity-100`
                  }`}
                />
                <span className="whitespace-nowrap">{ROTULOS_RECORTE_LISTAGEM[id]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}