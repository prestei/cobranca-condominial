"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { EncaminhamentoJuridicoDetalheSheet } from "@/components/juridico/encaminhamento-juridico-detalhe-sheet";
import { JuridicoKanbanCard } from "@/components/juridico/juridico-kanban-card";
import {
  acaoRapidaKanban,
  COLUNAS_KANBAN_JURIDICO,
  colunaKanbanDoStatus,
  type ColunaKanbanJuridico,
} from "@/lib/juridico/kanban-colunas";
import type { Cadastros } from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

type Props = {
  itens: EncaminhamentoJuridicoDetalhe[];
  cadastros: Cadastros;
  selecionadoId: string | null;
  onSelecionar: (id: string | null) => void;
  podeEditar: boolean;
  onSalvo?: () => void;
  vazioPorFiltro?: boolean;
};

type ColunaComItens = ColunaKanbanJuridico & { itens: EncaminhamentoJuridicoDetalhe[] };

function JuridicoKanbanColuna({
  coluna,
  cadastros,
  detalheAberto,
  selecionadoId,
  onAbrirCard,
  podeEditar,
  onAbrirAcao,
}: {
  coluna: ColunaComItens;
  cadastros: Cadastros;
  detalheAberto: boolean;
  selecionadoId?: string;
  podeEditar: boolean;
  onAbrirCard: (id: string) => void;
  onAbrirAcao: (id: string, proximoStatus: string) => void;
}) {
  return (
    <article className="flex w-[min(100%,19rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card min-[1280px]:w-auto min-[1280px]:min-w-0">
      <header
        className={`flex items-center justify-between gap-sm px-md py-sm ${coluna.headerClassName}`}
      >
        <h3 className="truncate text-label-lg font-semibold">{coluna.rotulo}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-body-sm font-semibold tabular-nums ${coluna.contadorClassName}`}
        >
          {coluna.itens.length}
        </span>
      </header>
      <div className="flex max-h-[min(70vh,36rem)] min-h-[14rem] flex-1 flex-col gap-sm overflow-y-auto overscroll-contain bg-surface-subtle/35 p-sm">
        {coluna.itens.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-md py-lg text-center text-body-sm text-on-surface-variant">
            Nenhum caso nesta etapa
          </p>
        ) : (
          coluna.itens.map((item) => (
              <JuridicoKanbanCard
                key={item.id}
                item={item}
                cadastros={cadastros}
                selecionado={detalheAberto && selecionadoId === item.id}
                podeEditar={podeEditar}
                onClick={() => onAbrirCard(item.id)}
                onAbrirAcao={(proximoStatus) => onAbrirAcao(item.id, proximoStatus)}
              />
          ))
        )}
      </div>
    </article>
  );
}

export function JuridicoAdvogadoPainel({
  itens,
  cadastros,
  selecionadoId,
  onSelecionar,
  podeEditar,
  onSalvo,
  vazioPorFiltro = false,
}: Props) {
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [sheetAbaInicial, setSheetAbaInicial] = useState<"resumo" | "acao">("resumo");
  const [statusSugerido, setStatusSugerido] = useState<string | undefined>(undefined);

  function abaPadraoDoItem(id: string): "resumo" | "acao" {
    if (!podeEditar) return "resumo";
    const alvo = itens.find((item) => item.id === id);
    if (!alvo) return "resumo";
    if (acaoRapidaKanban(alvo.status)) return "acao";
    return "resumo";
  }

  function abrirCard(id: string) {
    onSelecionar(id);
    setStatusSugerido(undefined);
    setSheetAbaInicial(abaPadraoDoItem(id));
    setDetalheAberto(true);
  }

  function abrirParaAcao(id: string, proximoStatus: string) {
    onSelecionar(id);
    setStatusSugerido(proximoStatus);
    setSheetAbaInicial("acao");
    setDetalheAberto(true);
  }

  const itensKanban = useMemo(
    () => itens.filter((item) => colunaKanbanDoStatus(item.status) !== null),
    [itens],
  );

  const colunasComItens = useMemo(() => {
    return COLUNAS_KANBAN_JURIDICO.map((coluna) => ({
      ...coluna,
      itens: itensKanban.filter((item) => colunaKanbanDoStatus(item.status) === coluna.id),
    }));
  }, [itensKanban]);

  const selecionado = useMemo(
    () => itens.find((item) => item.id === selecionadoId) ?? null,
    [itens, selecionadoId],
  );

  if (itensKanban.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
        <EmptyState
          icon={<Icon icon={Scale} size="lg" className="text-on-surface-variant" />}
          title={vazioPorFiltro ? "Nenhum caso neste filtro" : "Nenhum encaminhamento ativo"}
          description={
            vazioPorFiltro
              ? "Ajuste a busca ou os filtros acima para ver outros casos."
              : "Não há casos em andamento no seu escopo no momento."
          }
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex min-h-[28rem] gap-md overflow-x-auto pb-xs [-ms-overflow-style:none] [scrollbar-width:thin] min-[1280px]:grid min-[1280px]:grid-cols-4 min-[1280px]:overflow-visible"
        role="region"
        aria-label="Casos jurídicos por etapa"
      >
        {colunasComItens.map((coluna) => (
          <JuridicoKanbanColuna
            key={coluna.id}
            coluna={coluna}
            cadastros={cadastros}
            detalheAberto={detalheAberto}
            selecionadoId={selecionado?.id}
            podeEditar={podeEditar}
            onAbrirCard={abrirCard}
            onAbrirAcao={abrirParaAcao}
          />
        ))}
      </div>

      <EncaminhamentoJuridicoDetalheSheet
        item={selecionado}
        open={detalheAberto}
        onOpenChange={(aberto) => {
          setDetalheAberto(aberto);
          if (!aberto) {
            onSelecionar(null);
            setStatusSugerido(undefined);
            setSheetAbaInicial("resumo");
          }
        }}
        cadastros={cadastros}
        podeEditar={podeEditar}
        abaInicial={sheetAbaInicial}
        statusSugerido={statusSugerido}
        onSalvo={() => {
          onSalvo?.();
        }}
      />
    </>
  );
}