"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChevronDown, DoorOpen } from "lucide-react";
import { Badge } from "@/components/badge";
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
} from "@/components/table";
import { nomeCondominio, type Cadastros, type Unidade } from "@/data/catalogo";

export type GrupoUnidadesCondominio = {
  condominioId: number;
  nome: string;
  itens: Unidade[];
};

export type UnidadeLinhaAcao = {
  label: string;
  icon: typeof DoorOpen;
  onSelect: () => void;
  destructive?: boolean;
};

export function agruparUnidadesPorCondominio(itens: Unidade[], cadastros: Cadastros): GrupoUnidadesCondominio[] {
  const mapa = new Map<number, Unidade[]>();
  for (const item of itens) {
    const lista = mapa.get(item.condominioId) ?? [];
    lista.push(item);
    mapa.set(item.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, lista]) => ({
      condominioId,
      nome: nomeCondominio(condominioId, cadastros),
      itens: [...lista].sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR")),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

type TabelaProps = {
  itens: Unidade[];
  emptyState: ReactNode;
  badgeStatus: Record<string, "success" | "error">;
  renderResponsavel: (item: Unidade) => ReactNode;
  renderDiasAtraso: (item: Unidade) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  renderDebito: (item: Unidade) => ReactNode;
  acoes: (item: Unidade) => UnidadeLinhaAcao[];
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  itens,
  emptyState,
  badgeStatus,
  renderResponsavel,
  renderDiasAtraso,
  renderSituacao,
  renderDebito,
  acoes,
  embutida = false,
}: TabelaProps) {
  return (
    <Table
      aria-label="Unidades do condomínio"
      showExport={false}
      fitContainer
      containerClassName={embutida ? "rounded-none border-0 shadow-none" : undefined}
    >
      <colgroup>
        <col className="w-[13%]" />
        <col className="w-[21%]" />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[19%]" />
        <col className="w-[12%]" />
        <col className="w-[13%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Unidade</TableHead>
          <TableHead align="center">Responsável</TableHead>
          <TableHead align="center">Cadastro</TableHead>
          <TableHead align="center" className="min-w-[7rem] whitespace-nowrap">
            Dias em atraso
          </TableHead>
          <TableHead align="center">Situações</TableHead>
          <TableHead align="center">Débito</TableHead>
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
              className="border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
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
              <TableCell align="center" className="max-w-0 align-middle">
                {renderResponsavel(item)}
              </TableCell>
              <TableCell align="center" className="align-middle">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell align="center" className="align-middle whitespace-nowrap">
                {renderDiasAtraso(item)}
              </TableCell>
              <TableCell align="center" className="max-w-0 align-middle">
                {renderSituacao(item)}
              </TableCell>
              <TableCell align="center" className="max-w-0 align-middle">
                {renderDebito(item)}
              </TableCell>
              <TableActionsCell
                label={`Ações da unidade ${item.identificacao}`}
                actions={acoes(item)}
                className="bg-surface-subtle/80 group-hover/row:bg-surface-subtle"
              />
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function TabelaMobile({
  itens,
  emptyState,
  badgeStatus,
  renderResponsavel,
  renderDiasAtraso,
  renderSituacao,
  renderDebito,
  acoes,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  return (
    <TableMobileList aria-label="Unidades do condomínio">
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
            <TableActionsButton label={`Ações da unidade ${item.identificacao}`} actions={acoes(item)} />
          </TableMobileCardHeader>
          <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
            <div className="min-w-0">
              <p className="text-label-sm uppercase text-on-surface-variant">Responsável</p>
              {renderResponsavel(item)}
            </div>
            <div className="min-w-0 border-t border-border-subtle/30 pt-sm">
              <p className="text-label-sm uppercase text-on-surface-variant">Dias em atraso</p>
              <div className="mt-xs">{renderDiasAtraso(item)}</div>
            </div>
            <div className="min-w-0 border-t border-border-subtle/30 pt-sm">
              <p className="text-label-sm uppercase text-on-surface-variant">Situações</p>
              <div className="mt-xs">{renderSituacao(item)}</div>
            </div>
            <div className="flex items-start justify-between gap-md border-t border-border-subtle/30 pt-sm">
              <div className="min-w-0">
                <p className="text-label-sm uppercase text-on-surface-variant">Débito</p>
                <div className="mt-xs">{renderDebito(item)}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-xs">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
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
  emptyState,
  badgeStatus,
  renderResponsavel,
  renderDiasAtraso,
  renderSituacao,
  renderDebito,
  acoes,
}: {
  grupo: GrupoUnidadesCondominio;
  aberto: boolean;
  onToggle: () => void;
  variante: "desktop" | "mobile";
  emptyState: ReactNode;
  badgeStatus: Record<string, "success" | "error">;
  renderResponsavel: (item: Unidade) => ReactNode;
  renderDiasAtraso: (item: Unidade) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  renderDebito: (item: Unidade) => ReactNode;
  acoes: (item: Unidade) => UnidadeLinhaAcao[];
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

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
      <h3 className="text-label-lg text-on-surface">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-md bg-surface-dim px-md py-md text-left transition-[filter] hover:brightness-[0.97] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-expanded={aberto}
          aria-controls={painelId}
          onClick={onToggle}
        >
          <span className="flex min-w-0 items-center gap-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-on-surface-variant">
              <Icon icon={Building2} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-on-surface">{grupo.nome}</span>
              <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                {total} unidade{total === 1 ? "" : "s"}
                {ativas > 0 ? ` · ${ativas} ativa${ativas === 1 ? "" : "s"}` : ""}
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
          aria-label={`Unidades de ${grupo.nome}`}
          className="flex flex-col gap-md border-t border-border-subtle p-md"
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              emptyState={null}
              badgeStatus={badgeStatus}
              renderResponsavel={renderResponsavel}
              renderDiasAtraso={renderDiasAtraso}
              renderSituacao={renderSituacao}
              renderDebito={renderDebito}
              acoes={acoes}
              embutida
            />
          ) : (
            <TabelaMobile
              itens={pageItens}
              emptyState={null}
              badgeStatus={badgeStatus}
              renderResponsavel={renderResponsavel}
              renderDiasAtraso={renderDiasAtraso}
              renderSituacao={renderSituacao}
              renderDebito={renderDebito}
              acoes={acoes}
              pageOffset={(currentPage - 1) * PAGE_SIZE}
              totalItens={total}
            />
          )}
          {total > 0 ? <Pagination page={currentPage} total={total} onPageChange={setPage} /> : null}
        </div>
      ) : null}
    </section>
  );
}

type ListaProps = {
  grupos: GrupoUnidadesCondominio[];
  emptyState: ReactNode;
  variante: "desktop" | "mobile";
  badgeStatus: Record<string, "success" | "error">;
  renderResponsavel: (item: Unidade) => ReactNode;
  renderDiasAtraso: (item: Unidade) => ReactNode;
  renderSituacao: (item: Unidade) => ReactNode;
  renderDebito: (item: Unidade) => ReactNode;
  acoes: (item: Unidade) => UnidadeLinhaAcao[];
};

export function UnidadesPorCondominioLista({
  grupos,
  emptyState,
  variante,
  badgeStatus,
  renderResponsavel,
  renderDiasAtraso,
  renderSituacao,
  renderDebito,
  acoes,
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
    <div className="flex flex-col gap-lg" aria-label="Unidades por condomínio">
      {grupos.map((grupo) => (
        <PainelCondominio
          key={grupo.condominioId}
          grupo={grupo}
          aberto={abertos.has(grupo.condominioId)}
          onToggle={() => alternar(grupo.condominioId)}
          variante={variante}
          emptyState={emptyState}
          badgeStatus={badgeStatus}
          renderResponsavel={renderResponsavel}
          renderDiasAtraso={renderDiasAtraso}
          renderSituacao={renderSituacao}
          renderDebito={renderDebito}
          acoes={acoes}
        />
      ))}
    </div>
  );
}
