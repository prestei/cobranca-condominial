"use client";

import { Building2 } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { acaoRapidaKanban, configColunaKanban, rotuloBadgeKanban } from "@/lib/juridico/kanban-colunas";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import { formatarMoeda, hojeIso, nomeCondominio, type Cadastros } from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

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

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros) {
  return cadastros.unidades.find((u) => u.id === unidadeId)?.identificacao?.trim() || "—";
}

type Props = {
  item: EncaminhamentoJuridicoDetalhe;
  cadastros: Cadastros;
  selecionado?: boolean;
  podeEditar?: boolean;
  onClick: () => void;
  /** Abre o sheet na aba Ação com o próximo status sugerido (sem saltar status no card). */
  onAbrirAcao?: (proximoStatus: string) => void;
};

export function JuridicoKanbanCard({
  item,
  cadastros,
  selecionado,
  podeEditar = false,
  onClick,
  onAbrirAcao,
}: Props) {
  const condominio = nomeCondominio(item.condominioId, cadastros);
  const unidade = identificacaoUnidade(item.unidadeId, cadastros);
  const valor = valorDebitosEncaminhamento(item, cadastros);
  const badge = rotuloBadgeKanban(item.status);
  const dataRotulo = formatarDataHoraCard(item.encaminhadoEm);
  const coluna = configColunaKanban(item.status);
  const pill = coluna?.pillCard ?? {
    fundo: "bg-surface-subtle",
    texto: "text-on-surface-variant",
    ponto: "bg-on-surface-variant",
  };
  const acaoRapida = podeEditar ? acaoRapidaKanban(item.status) : null;

  const cardSurface = [
    "group flex w-full flex-col gap-md rounded-xl border p-md text-left shadow-card transition-[border-color,box-shadow,transform] duration-150",
    selecionado
      ? "border-primary-container bg-surface-card ring-2 ring-primary-container/30"
      : "border-border-subtle bg-surface-card hover:-translate-y-px hover:border-border-strong hover:shadow-popover",
  ].join(" ");

  return (
    <div className={cardSurface}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-md text-left">
        <div className="flex items-center justify-between gap-sm">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-body-sm font-medium ${pill.fundo} ${pill.texto}`}
          >
            <span className={`size-1.5 shrink-0 rounded-full ${pill.ponto}`} aria-hidden />
            {badge}
          </span>
          {dataRotulo ? (
            <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{dataRotulo}</span>
          ) : null}
        </div>

        <div className="flex items-start gap-sm">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant transition-colors group-hover:bg-primary-fixed/40 group-hover:text-primary-container"
            aria-hidden
          >
            <Icon icon={Building2} size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-headline-sm font-semibold tabular-nums tracking-tight text-on-surface">
              {formatarMoeda(String(valor))}
            </p>
            <p className="mt-xs text-body-md text-on-surface">
              <span className="font-semibold">Unidade {unidade}</span>
            </p>
            <p className="truncate text-body-sm text-on-surface-variant">{condominio}</p>
          </div>
        </div>
      </button>

      {acaoRapida && onAbrirAcao ? (
        <Button
          type="button"
          size="sm"
          variant="primary"
          className="w-full"
          onClick={(event) => {
            event.stopPropagation();
            onAbrirAcao(acaoRapida.proximoStatus);
          }}
        >
          {acaoRapida.rotulo}
        </Button>
      ) : null}
    </div>
  );
}