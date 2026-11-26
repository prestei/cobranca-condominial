"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Icon } from "@/components/icon";
import {
  listGroupAccordionPanelClassName,
  listGroupAccordionActionColumn12,
  listGroupAccordionChevronClassName,
  listGroupAccordionChevronDesktopClassName,
  listGroupAccordionDesktopHeaderGridClassName,
  listGroupAccordionDesktopToggleSubgridClassName,
  listGroupAccordionToggleClassName,
} from "@/components/list-group-accordion";
import { InadimplenciaRecorteListagem } from "@/components/debitos/inadimplencia-recorte-listagem";
import type { GrupoCondominioInadimplencia } from "@/components/debitos/inadimplencia-relatorio-table";
import {
  formatarMoeda,
  persistedDebtBalanceAmount,
  type Cadastros,
  type Debito,
} from "@/data/catalogo";
import type { DebitoNegociacaoFinanceira } from "@/lib/debitos/negotiation-financial-sync";
import type { RecorteListagemInadimplenciaId } from "@/lib/debitos/painel-situacao";
import type { TableAction } from "@/components/table";

type ListaProps = {
  recorte: RecorteListagemInadimplenciaId;
  condominios: GrupoCondominioInadimplencia[];
  cadastros: Cadastros;
  dataBase: string;
  negociacaoPorDebito: Map<number, DebitoNegociacaoFinanceira>;
  emptyState: ReactNode;
  acoes: (item: Debito) => TableAction[];
  variante: "desktop" | "mobile";
  onAbrirHistoricoUnidade?: (unidadeId: number) => void;
};

function totaisPainelCondominio(
  recorte: RecorteListagemInadimplenciaId,
  condominio: GrupoCondominioInadimplencia,
  negociacaoPorDebito: Map<number, DebitoNegociacaoFinanceira>,
): { valor: number; rotulo: string } | null {
  let soma = 0;
  let temNegociado = false;
  for (const unidade of condominio.unidades) {
    for (const debito of unidade.debitos) {
      if (recorte === "em_negociacao") {
        const neg = negociacaoPorDebito.get(debito.id);
        const cent = Number(neg?.valorNegociado?.replace(",", "."));
        if (Number.isFinite(cent) && cent > 0) {
          soma += cent;
          temNegociado = true;
          continue;
        }
      }
      soma += persistedDebtBalanceAmount(debito);
    }
  }
  if (soma <= 0) return null;
  if (recorte === "em_negociacao" && temNegociado) {
    return { valor: soma, rotulo: "Valor negociado" };
  }
  return { valor: soma, rotulo: "Saldo" };
}

function PainelRecorteCondominio({
  recorte,
  condominio,
  aberto,
  onToggle,
  cadastros,
  dataBase,
  negociacaoPorDebito,
  acoes,
  variante,
  onAbrirHistoricoUnidade,
}: {
  recorte: RecorteListagemInadimplenciaId;
  condominio: GrupoCondominioInadimplencia;
  aberto: boolean;
  onToggle: () => void;
  cadastros: Cadastros;
  dataBase: string;
  negociacaoPorDebito: Map<number, DebitoNegociacaoFinanceira>;
  acoes: (item: Debito) => TableAction[];
  variante: "desktop" | "mobile";
  onAbrirHistoricoUnidade?: (unidadeId: number) => void;
}) {
  const painelId = useId();
  const debitos = condominio.unidades.flatMap((item) => item.debitos);
  const qtdUnidades = condominio.unidades.length;
  const qtdDebitos = debitos.length;
  const totais = totaisPainelCondominio(recorte, condominio, negociacaoPorDebito);

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
      <h3 className="text-label-lg text-on-surface">
        {variante === "desktop" ? (
          <div className={listGroupAccordionDesktopHeaderGridClassName(listGroupAccordionActionColumn12)}>
            <button
              type="button"
              className={listGroupAccordionDesktopToggleSubgridClassName}
              aria-expanded={aberto}
              aria-controls={painelId}
              onClick={onToggle}
            >
              <span className="flex min-w-0 items-center gap-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant">
                  <Icon icon={Building2} size="sm" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-on-surface">{condominio.nome}</span>
                  <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                    {qtdUnidades} unidade{qtdUnidades === 1 ? "" : "s"} · {qtdDebitos} lançamento
                    {qtdDebitos === 1 ? "" : "s"}
                    {totais ? ` · ${totais.rotulo} ${formatarMoeda(String(totais.valor))}` : ""}
                  </span>
                </span>
              </span>
              <span
                className={`${listGroupAccordionChevronClassName} ${listGroupAccordionChevronDesktopClassName}`}
                aria-hidden
              >
                <Icon
                  icon={ChevronDown}
                  size="sm"
                  className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                />
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={listGroupAccordionToggleClassName}
            aria-expanded={aberto}
            aria-controls={painelId}
            onClick={onToggle}
          >
            <span className="flex min-w-0 items-center gap-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant">
                <Icon icon={Building2} size="sm" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-on-surface">{condominio.nome}</span>
                <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                  {qtdUnidades} unidade{qtdUnidades === 1 ? "" : "s"} · {qtdDebitos} lançamento
                  {qtdDebitos === 1 ? "" : "s"}
                </span>
              </span>
            </span>
            <span className={listGroupAccordionChevronClassName} aria-hidden>
              <Icon
                icon={ChevronDown}
                size="sm"
                className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        )}
      </h3>
      {aberto ? (
        <div
          id={painelId}
          role="region"
          aria-label={`${condominio.nome} — recorte ${recorte}`}
          className={listGroupAccordionPanelClassName}
        >
          <InadimplenciaRecorteListagem
            recorte={recorte}
            itens={debitos}
            pageRows={debitos}
            cadastros={cadastros}
            dataBase={dataBase}
            negociacaoPorDebito={negociacaoPorDebito}
            emptyState={null}
            acoes={acoes}
            currentPage={1}
            total={debitos.length}
            pageSize={debitos.length || 1}
            onAbrirHistoricoUnidade={onAbrirHistoricoUnidade}
            embutida
          />
        </div>
      ) : null}
    </section>
  );
}

/** Painéis recolhíveis por condomínio para recortes além de Em aberto. */
export function InadimplenciaRecortePorCondominioLista({
  recorte,
  condominios,
  cadastros,
  dataBase,
  negociacaoPorDebito,
  emptyState,
  acoes,
  variante,
  onAbrirHistoricoUnidade,
}: ListaProps) {
  const [abertos, setAbertos] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setAbertos(new Set(condominios.map((item) => item.condominioId)));
  }, [condominios]);

  if (condominios.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
        {emptyState}
      </div>
    );
  }

  function alternar(condominioId: number) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(condominioId)) proximo.delete(condominioId);
      else proximo.add(condominioId);
      return proximo;
    });
  }

  return (
    <div className="flex flex-col gap-lg" aria-label={`Inadimplência por condomínio — ${recorte}`}>
      {condominios.map((condominio) => (
        <PainelRecorteCondominio
          key={condominio.condominioId}
          recorte={recorte}
          condominio={condominio}
          aberto={abertos.has(condominio.condominioId)}
          onToggle={() => alternar(condominio.condominioId)}
          cadastros={cadastros}
          dataBase={dataBase}
          negociacaoPorDebito={negociacaoPorDebito}
          acoes={acoes}
          variante={variante}
          onAbrirHistoricoUnidade={onAbrirHistoricoUnidade}
        />
      ))}
    </div>
  );
}