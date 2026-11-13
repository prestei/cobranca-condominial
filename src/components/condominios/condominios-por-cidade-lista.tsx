"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChevronDown, MapPin } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import {
  listGroupAccordionPanelClassName,
  listGroupAccordionToggleClassName,
  listGroupEmbeddedTableContainerClassName,
  listGroupEmbeddedTableHeaderClassName,
  listGroupEmbeddedTableRowClassName,
} from "@/components/list-group-accordion";
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
} from "@/components/table";
import type { Condominio } from "@/data/catalogo";

const SEM_CIDADE = "Sem cidade cadastrada";

export type GrupoCondominiosCidade = {
  cidade: string;
  itens: Condominio[];
};

export type CondominioLinhaAcao = {
  label: string;
  icon: typeof Building2;
  onSelect: () => void;
  destructive?: boolean;
};

export function agruparCondominiosPorCidade(itens: Condominio[]): GrupoCondominiosCidade[] {
  const mapa = new Map<string, Condominio[]>();
  for (const item of itens) {
    const cidade = item.cidade.trim() || SEM_CIDADE;
    const lista = mapa.get(cidade) ?? [];
    lista.push(item);
    mapa.set(cidade, lista);
  }

  return [...mapa.entries()]
    .map(([cidade, lista]) => ({
      cidade,
      itens: [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .sort((a, b) => {
      if (a.cidade === SEM_CIDADE) return 1;
      if (b.cidade === SEM_CIDADE) return -1;
      return a.cidade.localeCompare(b.cidade, "pt-BR");
    });
}

type TabelaProps = {
  itens: Condominio[];
  emptyState: ReactNode;
  contarUnidades: (condominioId: number) => number;
  rotuloAdvogados: (item: Condominio) => string;
  acoes: (item: Condominio) => CondominioLinhaAcao[];
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  itens,
  emptyState,
  contarUnidades,
  rotuloAdvogados,
  acoes,
  embutida = false,
}: TabelaProps) {
  return (
    <Table
      aria-label="Condomínios da cidade"
      showExport={false}
      containerClassName={embutida ? listGroupEmbeddedTableContainerClassName : undefined}
    >
      <TableHeader className={embutida ? listGroupEmbeddedTableHeaderClassName : undefined}>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Condomínio</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead>Administradora</TableHead>
          <TableHead>Advogado responsável</TableHead>
          <TableHead align="right" className="w-32">
            Unidades
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
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
              <TableCell className="font-medium">
                <div className="flex items-center gap-sm">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant"
                    aria-hidden="true"
                  >
                    <Icon icon={Building2} size="sm" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-xs">
                    <span>{item.nome}</span>
                    {item.identificadorExterno ? (
                      <span className="text-body-sm text-on-surface-variant">{item.identificadorExterno}</span>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === "Ativo" ? "success" : "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell>{item.administradora || "—"}</TableCell>
              <TableCell>{rotuloAdvogados(item)}</TableCell>
              <TableCell align="right" className="tabular-nums">
                {contarUnidades(item.id)}
              </TableCell>
              <TableActionsCell label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function TabelaMobile({
  itens,
  contarUnidades,
  rotuloAdvogados,
  acoes,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return null;
  }

  return (
    <TableMobileList aria-label="Condomínios da cidade">
      {itens.map((item, index) => (
        <TableMobileCard key={item.id}>
          <TableMobileCardHeader>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
              aria-hidden="true"
            >
              <Icon icon={Building2} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                  {item.nome}
                </TableMobileTitle>
                {totalItens > 0 ? (
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + pageOffset} de {totalItens}
                  </span>
                ) : null}
              </div>
              {item.identificadorExterno ? (
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">{item.identificadorExterno}</p>
              ) : null}
            </div>
            <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
          </TableMobileCardHeader>
          <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
            <div className="flex items-start justify-between gap-md">
              <div className="min-w-0">
                <p className="text-label-sm uppercase text-on-surface-variant">Unidades</p>
                <p className="text-body-md font-semibold tabular-nums text-on-surface">{contarUnidades(item.id)}</p>
                <p className="text-body-sm text-on-surface-variant">{item.administradora.trim() || "—"}</p>
              </div>
              <Badge variant={item.status === "Ativo" ? "success" : "secondary"} className="shrink-0">
                {item.status}
              </Badge>
            </div>
            <div className="min-w-0 border-t border-border-subtle/30 pt-sm">
              <p className="text-label-sm uppercase text-on-surface-variant">Advogados</p>
              <p className="text-body-md text-on-surface">{rotuloAdvogados(item)}</p>
            </div>
          </div>
        </TableMobileCard>
      ))}
    </TableMobileList>
  );
}

function PainelCidade({
  grupo,
  aberto,
  onToggle,
  variante,
  emptyState,
  contarUnidades,
  rotuloAdvogados,
  acoes,
}: {
  grupo: GrupoCondominiosCidade;
  aberto: boolean;
  onToggle: () => void;
  variante: "desktop" | "mobile";
  emptyState: ReactNode;
  contarUnidades: (condominioId: number) => number;
  rotuloAdvogados: (item: Condominio) => string;
  acoes: (item: Condominio) => CondominioLinhaAcao[];
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
  }, [grupo.cidade, total]);

  const ativos = grupo.itens.filter((item) => item.status === "Ativo").length;

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
      <h3 className="text-label-lg text-on-surface">
        <button
          type="button"
          className={listGroupAccordionToggleClassName}
          aria-expanded={aberto}
          aria-controls={painelId}
          onClick={onToggle}
        >
          <span className="flex min-w-0 items-center gap-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant">
              <Icon icon={MapPin} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-on-surface">{grupo.cidade}</span>
              <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                {total} condomínio{total === 1 ? "" : "s"}
                {ativos > 0 ? ` · ${ativos} ativo${ativos === 1 ? "" : "s"}` : ""}
              </span>
            </span>
          </span>
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center text-on-surface-variant"
            aria-hidden
          >
            <Icon
              icon={ChevronDown}
              size="sm"
              className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h3>
      {aberto ? (
        <div
          id={painelId}
          role="region"
          aria-label={`Condomínios em ${grupo.cidade}`}
          className={listGroupAccordionPanelClassName}
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              emptyState={emptyState}
              contarUnidades={contarUnidades}
              rotuloAdvogados={rotuloAdvogados}
              acoes={acoes}
              embutida
            />
          ) : pageItens.length === 0 ? (
            <TableMobileEmpty>{emptyState}</TableMobileEmpty>
          ) : (
            <TabelaMobile
              itens={pageItens}
              emptyState={emptyState}
              contarUnidades={contarUnidades}
              rotuloAdvogados={rotuloAdvogados}
              acoes={acoes}
              pageOffset={(currentPage - 1) * PAGE_SIZE}
              totalItens={total}
            />
          )}
          {total > 0 ? (
            <div className="px-md pb-md">
              <Pagination page={currentPage} total={total} onPageChange={setPage} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type ListaProps = {
  grupos: GrupoCondominiosCidade[];
  emptyState: ReactNode;
  variante: "desktop" | "mobile";
  contarUnidades: (condominioId: number) => number;
  rotuloAdvogados: (item: Condominio) => string;
  acoes: (item: Condominio) => CondominioLinhaAcao[];
};

export function CondominiosPorCidadeLista({
  grupos,
  emptyState,
  variante,
  contarUnidades,
  rotuloAdvogados,
  acoes,
}: ListaProps) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setAbertos(new Set(grupos.map((item) => item.cidade)));
  }, [grupos]);

  if (grupos.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
        {emptyState}
      </div>
    );
  }

  function alternar(cidade: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(cidade)) proximo.delete(cidade);
      else proximo.add(cidade);
      return proximo;
    });
  }

  return (
    <div className="flex flex-col gap-lg" aria-label="Condomínios por cidade">
      {grupos.map((grupo) => (
        <PainelCidade
          key={grupo.cidade}
          grupo={grupo}
          aberto={abertos.has(grupo.cidade)}
          onToggle={() => alternar(grupo.cidade)}
          variante={variante}
          emptyState={emptyState}
          contarUnidades={contarUnidades}
          rotuloAdvogados={rotuloAdvogados}
          acoes={acoes}
        />
      ))}
    </div>
  );
}
