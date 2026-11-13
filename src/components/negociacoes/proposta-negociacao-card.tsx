"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import {
  formatarMoeda,
  hojeIso,
  nomeCondominio,
  nomeUsuario,
  type PropostaNegociacao,
  type Cadastros,
} from "@/data/catalogo";
import type { ResumoAcordo } from "@/lib/acordos/resumo";

const pillStatus: Record<
  string,
  { rotulo: string; fundo: string; texto: string; ponto: string }
> = {
  Aceita: {
    rotulo: "Aceita",
    fundo: "bg-badge-success-subtle",
    texto: "text-badge-success-emphasis",
    ponto: "bg-badge-success-emphasis",
  },
  "Em análise": {
    rotulo: "Em análise",
    fundo: "bg-[#fff3cd]",
    texto: "text-[#856404]",
    ponto: "bg-[#856404]",
  },
  Recusada: {
    rotulo: "Recusada",
    fundo: "bg-badge-danger-subtle",
    texto: "text-badge-danger-emphasis",
    ponto: "bg-badge-danger-emphasis",
  },
  Cancelada: {
    rotulo: "Cancelada",
    fundo: "bg-surface-subtle",
    texto: "text-on-surface-variant",
    ponto: "bg-on-surface-variant",
  },
};

const mensagemStatus: Record<string, string> = {
  "Em análise": "Aguardando análise da proposta",
  Recusada: "Proposta recusada",
  Cancelada: "Negociação cancelada",
};

function formatarDataHoraCard(iso: string): string {
  const dataDia = iso.slice(0, 10);
  const hora = iso.includes("T") ? iso.slice(11, 16) : "00:00";
  const hoje = hojeIso();

  if (dataDia === hoje) {
    return `Hoje, ${hora}`;
  }

  const [y, m, d] = dataDia.split("-");
  const [hy, hm, hd] = hoje.split("-");
  if (y && m && d && hy && hm && hd) {
    const alvo = new Date(Number(y), Number(m) - 1, Number(d));
    const ref = new Date(Number(hy), Number(hm) - 1, Number(hd));
    const diffDias = Math.round((alvo.getTime() - ref.getTime()) / 86_400_000);
    if (diffDias === -1) {
      return `Ontem, ${hora}`;
    }
  }

  if (d && m) {
    return `${d}/${m}, ${hora}`;
  }
  return iso;
}

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros): string {
  const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
  return unidade?.identificacao?.trim() || "—";
}

type Props = {
  proposta: PropostaNegociacao;
  cadastros: Cadastros;
  resumo?: ResumoAcordo | null;
  selecionada?: boolean;
  onClick: () => void;
  onEncaminharJuridico?: () => void;
};

export function PropostaNegociacaoCard({
  proposta,
  cadastros,
  resumo,
  selecionada,
  onClick,
  onEncaminharJuridico,
}: Props) {
  const condominio = nomeCondominio(proposta.condominioId, cadastros);
  const unidade = identificacaoUnidade(proposta.unidadeId, cadastros);
  const pill = pillStatus[proposta.status] ?? pillStatus["Em análise"]!;

  const aceita = proposta.status === "Aceita";
  const emAtraso = aceita && (resumo?.parcelasVencidas ?? 0) > 0;
  const parcelasTotal = aceita
    ? (resumo?.parcelasTotal ?? proposta.quantidadeParcelas ?? 0)
    : (proposta.quantidadeParcelas ?? 0);
  const parcelasPagas = aceita ? (resumo?.parcelasPagas ?? 0) : 0;
  const progresso =
    parcelasTotal > 0 ? Math.min(100, Math.round((parcelasPagas / parcelasTotal) * 100)) : 0;
  const rotuloParcelas =
    parcelasTotal > 0
      ? `${parcelasPagas} de ${parcelasTotal} parcelas`
      : (mensagemStatus[proposta.status] ??
          (proposta.quantidadeParcelas
            ? `Até ${proposta.quantidadeParcelas} parcelas propostas`
            : "Proposta registrada"));
  const corBarraParcelas = emAtraso
    ? "bg-error"
    : progresso > 0
      ? "bg-[#198754]"
      : "bg-on-surface-variant/25";

  const advogado =
    proposta.advogadoResponsavelId != null
      ? nomeUsuario(proposta.advogadoResponsavelId, cadastros)
      : "Sem advogado";
  const advogadoRotulo = advogado === "—" ? "Sem advogado" : advogado;

  const cardSurface = [
    "flex h-full min-h-[11.5rem] w-full flex-col rounded-xl border p-lg shadow-card transition-colors",
    selecionada
      ? "border-primary-container bg-surface-card ring-2 ring-primary-container/35"
      : "border-border-subtle bg-surface-card hover:border-border-strong hover:shadow-popover",
  ].join(" ");

  return (
    <div className={cardSurface}>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-0 flex-1 cursor-pointer flex-col gap-md text-left"
      >
      <div className="flex items-center justify-between gap-sm">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-body-sm font-medium ${pill.fundo} ${pill.texto}`}
        >
          <span className={`size-1.5 shrink-0 rounded-full ${pill.ponto}`} aria-hidden />
          {pill.rotulo}
        </span>
        {emAtraso ? (
          <span className="text-body-sm font-medium text-error">Em atraso</span>
        ) : (
          <span className="size-4 shrink-0" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-xs">
        <p className="text-headline-sm font-semibold tabular-nums tracking-tight text-on-surface">
          {formatarMoeda(proposta.valorProposto)}
        </p>
        <p className="text-body-md text-on-surface">
          <span className="font-semibold">{unidade}</span>
          <span className="text-on-surface-variant"> {condominio}</span>
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-sm">
        <div className="flex items-baseline justify-between gap-sm text-body-sm">
          <span className="text-on-surface-variant">{rotuloParcelas}</span>
          {aceita && parcelasTotal > 0 ? (
            <span className="text-on-surface-variant">
              Saldo{" "}
              <span className="font-semibold tabular-nums text-on-surface">
                {formatarMoeda(resumo?.saldoRestante ?? proposta.valorProposto)}
              </span>
            </span>
          ) : null}
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-surface-container"
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso das parcelas"
        >
          <div
            className={`h-full rounded-full transition-all ${corBarraParcelas}`}
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>
      </button>
      <div className="mt-[calc(var(--spacing-sm)+4px)] flex shrink-0 items-end justify-between gap-sm">
        <span className="min-w-0 truncate text-body-sm leading-none text-on-surface-variant">{advogadoRotulo}</span>
        <div className="flex shrink-0 flex-col items-end gap-xs text-right">
          <time
            className="text-body-sm leading-none tabular-nums text-on-surface-variant"
            dateTime={proposta.criadoEm}
          >
            {formatarDataHoraCard(proposta.criadoEm)}
          </time>
          {onEncaminharJuridico ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!h-auto !min-h-0 gap-1 !px-0 !py-0 text-label-sm font-normal leading-none text-on-surface-variant hover:bg-transparent hover:text-on-surface"
              onClick={(event) => {
                event.stopPropagation();
                onEncaminharJuridico();
              }}
            >
              <span>Encaminhar p/ jurídico</span>
              <Icon icon={ArrowRight} size="sm" className="shrink-0" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
