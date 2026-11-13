"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChevronDown, Scale, User } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import {
  listGroupAccordionPanelClassName,
  listGroupAccordionPanelFooterClassName,
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
  type TableAction,
} from "@/components/table";
import { formatarData, nomeCondominio, nomeUnidade, type Cadastros } from "@/data/catalogo";
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

export type GrupoJuridico = {
  id: string;
  nome: string;
  itens: EncaminhamentoJuridicoDetalhe[];
};

export type JuridicoLinhaAcao = TableAction;

export function agruparEncaminhamentosPorCondominio(
  itens: EncaminhamentoJuridicoDetalhe[],
  cadastros: Cadastros,
): GrupoJuridico[] {
  const mapa = new Map<number, EncaminhamentoJuridicoDetalhe[]>();
  for (const item of itens) {
    const lista = mapa.get(item.condominioId) ?? [];
    lista.push(item);
    mapa.set(item.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, lista]) => ({
      id: String(condominioId),
      nome: nomeCondominio(condominioId, cadastros),
      itens: [...lista].sort((a, b) => b.encaminhadoEm.localeCompare(a.encaminhadoEm)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function agruparEncaminhamentosPorAdvogado(
  itens: EncaminhamentoJuridicoDetalhe[],
  cadastros: Cadastros,
): GrupoJuridico[] {
  const mapa = new Map<string, EncaminhamentoJuridicoDetalhe[]>();
  for (const item of itens) {
    const key = item.advogadoResponsavel?.trim() || "Sem advogado";
    const lista = mapa.get(key) ?? [];
    lista.push(item);
    mapa.set(key, lista);
  }

  return [...mapa.entries()]
    .map(([nome, lista]) => ({
      id: nome,
      nome,
      itens: [...lista].sort((a, b) => {
        const condo = nomeCondominio(a.condominioId, cadastros).localeCompare(
          nomeCondominio(b.condominioId, cadastros),
          "pt-BR",
        );
        if (condo !== 0) return condo;
        return b.encaminhadoEm.localeCompare(a.encaminhadoEm);
      }),
    }))
    .sort((a, b) => {
      if (a.id === "Sem advogado") return 1;
      if (b.id === "Sem advogado") return -1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function identificacaoUnidade(cadastros: Cadastros, unidadeId: number) {
  return cadastros.unidades.find((item) => item.id === unidadeId)?.identificacao?.trim() || nomeUnidade(unidadeId);
}

function rotuloEncaminhamento(
  item: EncaminhamentoJuridicoDetalhe,
  cadastros: Cadastros,
) {
  return `Unidade ${identificacaoUnidade(cadastros, item.unidadeId)} — ${nomeCondominio(item.condominioId, cadastros)}`;
}

type TabelaProps = {
  itens: EncaminhamentoJuridicoDetalhe[];
  modo: "condominio" | "advogado";
  cadastros: Cadastros;
  emptyState: ReactNode;
  acoesLinha: (item: EncaminhamentoJuridicoDetalhe) => JuridicoLinhaAcao[];
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  itens,
  modo,
  cadastros,
  emptyState,
  acoesLinha,
  embutida = false,
}: TabelaProps) {
  const colSpan = 6;

  return (
    <Table
      aria-label={modo === "advogado" ? "Encaminhamentos do advogado" : "Encaminhamentos do condomínio"}
      showExport={false}
      fitContainer
      containerClassName={embutida ? listGroupEmbeddedTableContainerClassName : undefined}
    >
      <colgroup>
        <col className="w-[17%]" />
        {modo === "advogado" ? <col className="w-[22%]" /> : null}
        <col className="w-[12%]" />
        {modo === "condominio" ? <col className="w-[20%]" /> : null}
        <col className="w-[20%]" />
        <col className="w-[10%]" />
      </colgroup>
      <TableHeader className={embutida ? listGroupEmbeddedTableHeaderClassName : undefined}>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Encaminhado</TableHead>
          {modo === "advogado" ? (
            <TableHead className="min-w-[7rem]">
              Condomínio
            </TableHead>
          ) : null}
          <TableHead>Unidade</TableHead>
          {modo === "condominio" ? <TableHead>Advogado</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead>Documentos</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={colSpan}>{emptyState}</TableEmpty>
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
              <TableCell className="align-middle font-medium whitespace-nowrap">
                {formatarData(item.encaminhadoEm)}
              </TableCell>
              {modo === "advogado" ? (
                <TableCell className="max-w-0 align-middle">
                  <span className="block truncate">{nomeCondominio(item.condominioId, cadastros)}</span>
                </TableCell>
              ) : null}
              <TableCell className="align-middle font-medium">
                {identificacaoUnidade(cadastros, item.unidadeId)}
              </TableCell>
              {modo === "condominio" ? (
                <TableCell className="max-w-0 align-middle">
                  <span className="block truncate">{item.advogadoResponsavel}</span>
                </TableCell>
              ) : null}
              <TableCell className="align-middle">
                <div className="flex justify-start">
                  <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                </div>
              </TableCell>
              <TableCell align="right" className="align-middle tabular-nums">
                {item.documentos?.length ?? 0}
              </TableCell>
              <TableActionsCell
                label={`Ações do encaminhamento — ${rotuloEncaminhamento(item, cadastros)}`}
                actions={acoesLinha(item)}
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
  modo,
  cadastros,
  emptyState,
  acoesLinha,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  return (
    <TableMobileList
      aria-label={modo === "advogado" ? "Encaminhamentos do advogado" : "Encaminhamentos do condomínio"}
    >
      {itens.map((item, index) => (
        <TableMobileCard key={item.id}>
          <TableMobileCardHeader>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
              aria-hidden="true"
            >
              <Icon icon={Scale} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                  {modo === "advogado"
                    ? `${nomeCondominio(item.condominioId, cadastros)} · Unidade ${identificacaoUnidade(cadastros, item.unidadeId)}`
                    : `Unidade ${identificacaoUnidade(cadastros, item.unidadeId)}`}
                </TableMobileTitle>
                {totalItens > 0 ? (
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + pageOffset} de {totalItens}
                  </span>
                ) : null}
              </div>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                Encaminhado em {formatarData(item.encaminhadoEm)}
              </p>
            </div>
            <TableActionsButton
              label={`Ações do encaminhamento — ${rotuloEncaminhamento(item, cadastros)}`}
              actions={acoesLinha(item)}
            />
          </TableMobileCardHeader>
          <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
            <div className="flex items-start justify-between gap-md">
              <div className="min-w-0">
                <p className="text-label-sm uppercase text-on-surface-variant">
                  {modo === "advogado" ? "Condomínio" : "Advogado"}
                </p>
                <p className="text-body-md font-semibold text-on-surface">
                  {modo === "advogado" ? nomeCondominio(item.condominioId, cadastros) : item.advogadoResponsavel}
                </p>
              </div>
              <Badge variant={badgeStatus[item.status] ?? "secondary"} className="shrink-0">
                {item.status}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="text-label-sm uppercase text-on-surface-variant">Documentos</p>
              <p className="text-body-md tabular-nums text-on-surface">{item.documentos?.length ?? 0}</p>
            </div>
          </div>
        </TableMobileCard>
      ))}
    </TableMobileList>
  );
}

function PainelGrupo({
  grupo,
  modo,
  aberto,
  onToggle,
  cadastros,
  acoesLinha,
  variante,
}: {
  grupo: GrupoJuridico;
  modo: "condominio" | "advogado";
  aberto: boolean;
  onToggle: () => void;
  cadastros: Cadastros;
  acoesLinha: (item: EncaminhamentoJuridicoDetalhe) => JuridicoLinhaAcao[];
  variante: "desktop" | "mobile";
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
  }, [grupo.id, total]);

  const emAnalise = grupo.itens.filter((item) => item.status === "Em análise").length;
  const IconeGrupo = modo === "advogado" ? User : Building2;

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
              <Icon icon={IconeGrupo} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-on-surface">{grupo.nome}</span>
              <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                {total} encaminhamento{total === 1 ? "" : "s"}
                {emAnalise > 0 ? ` · ${emAnalise} em análise` : ""}
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
          aria-label={`Encaminhamentos de ${grupo.nome}`}
          className={listGroupAccordionPanelClassName}
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              modo={modo}
              cadastros={cadastros}
              emptyState={null}
              acoesLinha={acoesLinha}
              embutida
            />
          ) : (
            <TabelaMobile
              itens={pageItens}
              modo={modo}
              cadastros={cadastros}
              emptyState={null}
              acoesLinha={acoesLinha}
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
  grupos: GrupoJuridico[];
  modo: "condominio" | "advogado";
  cadastros: Cadastros;
  emptyState: ReactNode;
  acoesLinha: (item: EncaminhamentoJuridicoDetalhe) => JuridicoLinhaAcao[];
  variante: "desktop" | "mobile";
};

export function JuridicoPorGruposLista({
  grupos,
  modo,
  cadastros,
  emptyState,
  acoesLinha,
  variante,
}: ListaProps) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setAbertos(new Set(grupos.map((item) => item.id)));
  }, [grupos]);

  if (grupos.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
        {emptyState}
      </div>
    );
  }

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <div
      className="flex flex-col gap-lg"
      aria-label={modo === "advogado" ? "Jurídico por advogado" : "Jurídico por condomínio"}
    >
      {grupos.map((grupo) => (
        <PainelGrupo
          key={grupo.id}
          grupo={grupo}
          modo={modo}
          aberto={abertos.has(grupo.id)}
          onToggle={() => alternar(grupo.id)}
          cadastros={cadastros}
          acoesLinha={acoesLinha}
          variante={variante}
        />
      ))}
    </div>
  );
}
