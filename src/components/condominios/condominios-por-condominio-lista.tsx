"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Briefcase, Building2, ChevronDown, DoorOpen, MapPin } from "lucide-react";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  Table,
  TableActionsButton,
  TableActionsCell,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableAction,
} from "@/components/table";
import {
  listGroupAccordionPanelClassName,
  listGroupAccordionPanelFooterClassName,
  listGroupAccordionActionColumn12,
  listGroupAccordionChevronClassName,
  listGroupAccordionChevronDesktopClassName,
  listGroupAccordionToggleClassName,
  listGroupEmbeddedTableContainerClassName,
  listGroupEmbeddedTableHeaderClassName,
  listGroupEmbeddedTableRowClassName,
} from "@/components/list-group-accordion";
import type { Condominio, Unidade } from "@/data/catalogo";

export type GrupoUnidadesCondominioCarteira = {
  condominioId: number;
  nome: string;
  condominio: Condominio;
  itens: Unidade[];
};

export type UnidadeCarteiraLinhaAcao = {
  label: string;
  icon: typeof DoorOpen;
  onSelect: () => void;
  destructive?: boolean;
};

export function agruparUnidadesPorCondominioCarteira(
  condominios: Condominio[],
  unidadesPorCondominio: Map<number, Unidade[]>,
): GrupoUnidadesCondominioCarteira[] {
  return condominios.map((condominio) => {
    const itens = unidadesPorCondominio.get(condominio.id) ?? [];
    return {
      condominioId: condominio.id,
      nome: condominio.nome,
      condominio,
      itens: [...itens].sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR")),
    };
  });
}

type TabelaProps = {
  grupo: GrupoUnidadesCondominioCarteira;
  itens: Unidade[];
  emptyState: ReactNode;
  renderResponsavel: (item: Unidade) => ReactNode;
  renderAdvogados: (condominio: Condominio) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  acoes: (item: Unidade, condominio: Condominio) => UnidadeCarteiraLinhaAcao[];
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  grupo,
  itens,
  emptyState,
  renderResponsavel,
  renderAdvogados,
  renderSituacao,
  acoes,
  embutida = false,
}: TabelaProps) {
  const condominio = grupo.condominio;
  const cidade = condominio.cidade.trim();
  const administradora = condominio.administradora.trim();

  return (
    <Table
      aria-label={`Unidades de ${grupo.nome}`}
      showExport={false}
      fitContainer
      containerClassName={embutida ? listGroupEmbeddedTableContainerClassName : undefined}
    >
      <colgroup>
        <col className="w-[12%]" />
        <col className="w-[18%]" />
        <col className="w-[12%]" />
        <col className="w-[14%]" />
        <col className="w-[20%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
      </colgroup>
      <TableHeader className={embutida ? listGroupEmbeddedTableHeaderClassName : undefined}>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Unidade</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Cidade</TableHead>
          <TableHead>Administradora</TableHead>
          <TableHead>Advogado responsável</TableHead>
          <TableHead>Situações</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={7}>{emptyState}</TableEmpty>
        ) : (
          itens.map((item) => (
            <TableRow
              key={item.id}
              className={
                embutida
                  ? listGroupEmbeddedTableRowClassName
                  : "border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
              }
            >
              <TableCell className="max-w-0 align-middle font-medium">
                <div className="flex min-w-0 items-center gap-sm">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant"
                    aria-hidden="true"
                  >
                    <Icon icon={DoorOpen} size="sm" />
                  </span>
                  <span className="truncate">{item.identificacao}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                {renderResponsavel(item)}
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                {cidade ? (
                  <div className="flex min-w-0 items-center justify-start gap-sm">
                    <Icon icon={MapPin} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden="true" />
                    <span className="truncate">{cidade}</span>
                  </div>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                {administradora ? (
                  <div className="flex min-w-0 items-center justify-start gap-sm">
                    <Icon icon={Briefcase} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden="true" />
                    <span className="min-w-0 truncate">{administradora}</span>
                  </div>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                {renderAdvogados(condominio)}
              </TableCell>
              <TableCell className="align-middle">
                {renderSituacao(item)}
              </TableCell>
              <TableActionsCell
                label={`Ações da unidade ${item.identificacao}`}
                actions={acoes(item, condominio)}
              />
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function TabelaMobile({
  grupo,
  itens,
  emptyState,
  renderResponsavel,
  renderAdvogados,
  renderSituacao,
  acoes,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  const condominio = grupo.condominio;

  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  return (
    <TableMobileList aria-label={`Unidades de ${grupo.nome}`}>
      {itens.map((item, index) => (
        <TableMobileCard key={item.id}>
          <TableMobileCardHeader>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
              aria-hidden="true"
            >
              <Icon icon={DoorOpen} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                  {item.identificacao}
                </TableMobileTitle>
                {totalItens > 0 ? (
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + pageOffset} de {totalItens}
                  </span>
                ) : null}
              </div>
            </div>
            <TableActionsButton label={`Ações da unidade ${item.identificacao}`} actions={acoes(item, condominio)} />
          </TableMobileCardHeader>
          <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
            <div className="min-w-0">
              <p className="text-label-sm uppercase text-on-surface-variant">Responsável</p>
              {renderResponsavel(item)}
            </div>
            <div className="min-w-0">
              <p className="text-label-sm uppercase text-on-surface-variant">Advogado responsável</p>
              {renderAdvogados(condominio)}
            </div>
            <div className="flex flex-col gap-xs border-t border-border-subtle/30 pt-sm">
              <div className="min-w-0 text-body-sm text-on-surface-variant">
                {[condominio.cidade.trim(), condominio.administradora.trim()].filter(Boolean).join(" · ") || "—"}
              </div>
              <div>
                <p className="text-label-sm uppercase text-on-surface-variant">Situações</p>
                <div className="mt-xs">{renderSituacao(item)}</div>
              </div>
            </div>
          </div>
        </TableMobileCard>
      ))}
    </TableMobileList>
  );
}

function PainelCondominio({
  grupo,
  aberto,
  onToggle,
  variante,
  emptyStateUnidades,
  renderResponsavel,
  renderAdvogados,
  renderSituacao,
  acoes,
  acoesCondominio,
  descricaoPrazoCondominio,
}: {
  grupo: GrupoUnidadesCondominioCarteira;
  aberto: boolean;
  onToggle: () => void;
  variante: "desktop" | "mobile";
  emptyStateUnidades: ReactNode;
  renderResponsavel: (item: Unidade) => ReactNode;
  renderAdvogados: (condominio: Condominio) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  acoes: (item: Unidade, condominio: Condominio) => UnidadeCarteiraLinhaAcao[];
  acoesCondominio?: (condominio: Condominio) => TableAction[];
  descricaoPrazoCondominio?: (condominio: Condominio) => string;
}) {
  const painelId = useId();
  const [page, setPage] = useState(1);
  const total = grupo.itens.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItens = useMemo(
    () => grupo.itens.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [grupo.itens, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [grupo.condominioId, total]);

  const ativas = grupo.itens.filter((item) => item.status === "Ativa").length;
  const acoesDoCondominio = acoesCondominio?.(grupo.condominio) ?? [];
  const linhaPrazo = descricaoPrazoCondominio?.(grupo.condominio);
  const mostrarAcoesDesktop = variante === "desktop" && acoesDoCondominio.length > 0;

  const cabecalhoConteudo = (
    <>
      <span className="flex min-w-0 items-center gap-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant">
          <Icon icon={Building2} size="sm" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-on-surface">{grupo.nome}</span>
          <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
            {total} unidade{total === 1 ? "" : "s"}
            {ativas > 0 ? ` · ${ativas} ativa${ativas === 1 ? "" : "s"}` : ""}
            {linhaPrazo ? ` · ${linhaPrazo}` : ""}
          </span>
        </span>
      </span>
      <span
        className={`${listGroupAccordionChevronClassName} ${
          variante === "desktop" ? listGroupAccordionChevronDesktopClassName : ""
        }`}
        aria-hidden
      >
        <Icon
          icon={ChevronDown}
          size="sm"
          className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
        />
      </span>
    </>
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
      <h3 className="text-label-lg text-on-surface">
        {variante === "desktop" ? (
          <div
            className={`grid w-full items-center bg-surface-subtle ${
              mostrarAcoesDesktop
                ? `grid-cols-[minmax(0,1fr)_minmax(3.5rem,${listGroupAccordionActionColumn12})_${listGroupAccordionActionColumn12}]`
                : `grid-cols-[minmax(0,1fr)_minmax(3.5rem,${listGroupAccordionActionColumn12})]`
            }`}
          >
            <button
              type="button"
              className={`col-span-2 grid min-w-0 cursor-pointer grid-cols-subgrid items-center py-md pl-md text-left transition-[filter] hover:brightness-[0.98] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
                mostrarAcoesDesktop ? "" : "pr-md"
              }`}
              aria-expanded={aberto}
              aria-controls={painelId}
              onClick={onToggle}
            >
              {cabecalhoConteudo}
            </button>
            {mostrarAcoesDesktop ? (
              <div
                className="flex w-full min-w-14 shrink-0 items-center justify-center py-md pr-md"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <TableActionsButton label={`Ações de ${grupo.nome}`} actions={acoesDoCondominio} />
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className={listGroupAccordionToggleClassName}
            aria-expanded={aberto}
            aria-controls={painelId}
            onClick={onToggle}
          >
            {cabecalhoConteudo}
          </button>
        )}
      </h3>
      {aberto ? (
        <div
          id={painelId}
          role="region"
          aria-label={`Unidades de ${grupo.nome}`}
          className={listGroupAccordionPanelClassName}
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              grupo={grupo}
              itens={pageItens}
              emptyState={emptyStateUnidades}
              renderResponsavel={renderResponsavel}
              renderAdvogados={renderAdvogados}
              renderSituacao={renderSituacao}
              acoes={acoes}
              embutida
            />
          ) : (
            <TabelaMobile
              grupo={grupo}
              itens={pageItens}
              emptyState={emptyStateUnidades}
              renderResponsavel={renderResponsavel}
              renderAdvogados={renderAdvogados}
              renderSituacao={renderSituacao}
              acoes={acoes}
              pageOffset={(currentPage - 1) * PAGE_SIZE}
              totalItens={total}
            />
          )}
          {total > 0 ? (
            <div className={listGroupAccordionPanelFooterClassName}>
              <Pagination page={currentPage} total={total} onPageChange={setPage} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type ListaProps = {
  grupos: GrupoUnidadesCondominioCarteira[];
  emptyState: ReactNode;
  emptyStateUnidades: ReactNode;
  variante: "desktop" | "mobile";
  renderResponsavel: (item: Unidade) => ReactNode;
  renderAdvogados: (condominio: Condominio) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  acoes: (item: Unidade, condominio: Condominio) => UnidadeCarteiraLinhaAcao[];
  acoesCondominio?: (condominio: Condominio) => TableAction[];
  descricaoPrazoCondominio?: (condominio: Condominio) => string;
};

export function CondominiosPorCondominioLista({
  grupos,
  emptyState,
  emptyStateUnidades,
  variante,
  renderResponsavel,
  renderAdvogados,
  renderSituacao,
  acoes,
  acoesCondominio,
  descricaoPrazoCondominio,
}: ListaProps) {
  const [abertos, setAbertos] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setAbertos(new Set(grupos.map((item) => item.condominioId)));
  }, [grupos]);

  if (grupos.length === 0) {
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
    <div className="flex flex-col gap-lg" aria-label="Condomínios por condomínio">
      {grupos.map((grupo) => (
        <PainelCondominio
          key={grupo.condominioId}
          grupo={grupo}
          aberto={abertos.has(grupo.condominioId)}
          onToggle={() => alternar(grupo.condominioId)}
          variante={variante}
          emptyStateUnidades={emptyStateUnidades}
          renderResponsavel={renderResponsavel}
          renderAdvogados={renderAdvogados}
          renderSituacao={renderSituacao}
          acoes={acoes}
          acoesCondominio={acoesCondominio}
          descricaoPrazoCondominio={descricaoPrazoCondominio}
        />
      ))}
    </div>
  );
}
