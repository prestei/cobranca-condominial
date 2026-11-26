"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { EncaminhamentoJuridicoPainelDetalhe } from "@/components/juridico/encaminhamento-juridico-painel-detalhe";
import { etapaDoEncaminhamento } from "@/lib/juridico/etapas-advogado";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import { formatarDataHoraLista } from "@/lib/fila/formatar-data-hora-lista";
import { formatarMoeda, nomeCondominio, type Cadastros } from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  Encaminhado: "secondary",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

type Props = {
  itens: EncaminhamentoJuridicoDetalhe[];
  cadastros: Cadastros;
  selecionadoId: string | null;
  onSelecionar: (id: string | null) => void;
  podeEditar: boolean;
  onAbrirAcompanhamento: (item: EncaminhamentoJuridicoDetalhe) => void;
  /** Quando a lista global tem itens, mas o filtro de etapa não. */
  vazioPorFiltro?: boolean;
};

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros) {
  return cadastros.unidades.find((u) => u.id === unidadeId)?.identificacao?.trim() || "—";
}

function layoutDesktop() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function JuridicoAdvogadoPainel({
  itens,
  cadastros,
  selecionadoId,
  onSelecionar,
  podeEditar,
  onAbrirAcompanhamento,
  vazioPorFiltro = false,
}: Props) {
  const [detalheMobileAberto, setDetalheMobileAberto] = useState(false);

  const selecionado = useMemo(
    () => itens.find((item) => item.id === selecionadoId) ?? null,
    [itens, selecionadoId],
  );

  useEffect(() => {
    if (itens.length === 0) {
      onSelecionar(null);
      return;
    }
    const aindaVisivel = selecionadoId && itens.some((item) => item.id === selecionadoId);
    if (!aindaVisivel) {
      onSelecionar(layoutDesktop() ? itens[0].id : null);
    }
  }, [itens, selecionadoId, onSelecionar]);

  useEffect(() => {
    if (selecionadoId == null) setDetalheMobileAberto(false);
  }, [selecionadoId]);

  if (itens.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
        <EmptyState
          icon={<Icon icon={Scale} size="lg" className="text-on-surface-variant" />}
          title={vazioPorFiltro ? "Nenhum caso neste filtro" : "Nenhum encaminhamento"}
          description={
            vazioPorFiltro
              ? "Altere a etapa, a busca ou os filtros acima para ver outros casos."
              : "Não há casos no seu escopo no momento."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card min-[1024px]:min-h-[32rem]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[1024px]:flex-row">
        <aside
          className={`flex min-h-0 w-full flex-col border-border-subtle min-[1024px]:w-[min(100%,22rem)] min-[1024px]:shrink-0 min-[1024px]:border-r ${
            detalheMobileAberto ? "max-[1023px]:hidden" : "max-[1023px]:flex max-[1023px]:min-h-0 max-[1023px]:flex-1"
          }`}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-container-low"
            role="list"
            aria-label="Encaminhamentos jurídicos"
          >
            {itens.map((item) => {
              const ativo = selecionado?.id === item.id;
              const valor = valorDebitosEncaminhamento(item, cadastros);
              const condominio = nomeCondominio(item.condominioId, cadastros);
              const unidade = identificacaoUnidade(item.unidadeId, cadastros);
              const dataRotulo = formatarDataHoraLista(item.encaminhadoEm);
              const etapa = etapaDoEncaminhamento(item.status);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    onSelecionar(item.id);
                    setDetalheMobileAberto(true);
                  }}
                  className={`flex w-full cursor-pointer gap-3 border-b border-border-subtle px-3 py-2.5 text-left transition-colors ${
                    ativo ? "bg-primary-fixed-dim" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"
                    aria-hidden
                  >
                    <Icon icon={Scale} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-body-md font-semibold text-on-surface">{condominio}</p>
                      {dataRotulo ? (
                        <span className="shrink-0 text-[11px] leading-[15px] tabular-nums text-on-surface-variant">
                          {dataRotulo}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-body-sm text-on-surface-variant">
                      Unidade {unidade} · {formatarMoeda(String(valor))}
                    </p>
                    <div className="mt-xs flex flex-wrap items-center gap-xs">
                      <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                      {etapa ? (
                        <span className="text-label-sm text-on-surface-variant">
                          {etapa === "entrada"
                            ? "Entrada"
                            : etapa === "analise"
                              ? "Análise"
                              : etapa === "decisao"
                                ? "Decisão"
                                : "Encerramento"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className={`min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden border-t border-border-subtle min-[1024px]:border-t-0 min-[1024px]:border-l ${
            detalheMobileAberto ? "max-[1023px]:flex" : "max-[1023px]:hidden"
          } min-[1024px]:flex`}
        >
          <EncaminhamentoJuridicoPainelDetalhe
            item={selecionado}
            cadastros={cadastros}
            podeEditar={podeEditar}
            onAbrirAcompanhamento={() => {
              if (selecionado) onAbrirAcompanhamento(selecionado);
            }}
            onVoltar={() => setDetalheMobileAberto(false)}
          />
        </div>
      </div>
    </div>
  );
}