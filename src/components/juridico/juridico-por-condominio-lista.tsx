"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChevronDown, Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  Table,
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

export type GrupoCondominioJuridico = {
  condominioId: number;
  nome: string;
  itens: EncaminhamentoJuridicoDetalhe[];
};

export function agruparEncaminhamentosPorCondominio(
  itens: EncaminhamentoJuridicoDetalhe[],
): GrupoCondominioJuridico[] {
  const mapa = new Map<number, EncaminhamentoJuridicoDetalhe[]>();
  for (const item of itens) {
    const lista = mapa.get(item.condominioId) ?? [];
    lista.push(item);
    mapa.set(item.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, lista]) => ({
      condominioId,
      nome: nomeCondominio(condominioId),
      itens: [...lista].sort((a, b) => b.encaminhadoEm.localeCompare(a.encaminhadoEm)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function identificacaoUnidade(cadastros: Cadastros, unidadeId: number) {
  return cadastros.unidades.find((item) => item.id === unidadeId)?.identificacao?.trim() || nomeUnidade(unidadeId);
}

type TabelaProps = {
  itens: EncaminhamentoJuridicoDetalhe[];
  cadastros: Cadastros;
  emptyState: ReactNode;
  onAbrir: (item: EncaminhamentoJuridicoDetalhe) => void;
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({ itens, cadastros, emptyState, onAbrir, embutida = false }: TabelaProps) {
  return (
    <Table
      aria-label="Encaminhamentos do condomínio"
      showExport={false}
      containerClassName={embutida ? "rounded-none border-0 shadow-none" : undefined}
    >
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Encaminhado</TableHead>
          <TableHead>Unidade</TableHead>
          <TableHead>Advogado</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="right">Documentos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={5}>{emptyState}</TableEmpty>
        ) : (
          itens.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
              onClick={() => onAbrir(item)}
            >
              <TableCell className="font-medium">{formatarData(item.encaminhadoEm)}</TableCell>
              <TableCell>{identificacaoUnidade(cadastros, item.unidadeId)}</TableCell>
              <TableCell>{item.advogadoResponsavel}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell align="right" className="tabular-nums">
                {item.documentos?.length ?? 0}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function TabelaMobile({
  itens,
  cadastros,
  emptyState,
  onAbrir,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  return (
    <TableMobileList aria-label="Encaminhamentos do condomínio">
      {itens.map((item, index) => (
        <TableMobileCard key={item.id} className="cursor-pointer" onClick={() => onAbrir(item)}>
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
                  Unidade {identificacaoUnidade(cadastros, item.unidadeId)}
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
            <span aria-hidden="true" />
          </TableMobileCardHeader>
          <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
            <div className="flex items-start justify-between gap-md">
              <div className="min-w-0">
                <p className="text-label-sm uppercase text-on-surface-variant">Advogado</p>
                <p className="text-body-md font-semibold text-on-surface">{item.advogadoResponsavel}</p>
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

function PainelCondominio({
  grupo,
  aberto,
  onToggle,
  cadastros,
  onAbrir,
  variante,
}: {
  grupo: GrupoCondominioJuridico;
  aberto: boolean;
  onToggle: () => void;
  cadastros: Cadastros;
  onAbrir: (item: EncaminhamentoJuridicoDetalhe) => void;
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
  }, [grupo.condominioId, total]);

  const emAnalise = grupo.itens.filter((item) => item.status === "Em análise").length;

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
          className="flex flex-col gap-md border-t border-border-subtle p-md"
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              cadastros={cadastros}
              emptyState={null}
              onAbrir={onAbrir}
              embutida
            />
          ) : (
            <TabelaMobile
              itens={pageItens}
              cadastros={cadastros}
              emptyState={null}
              onAbrir={onAbrir}
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
  condominios: GrupoCondominioJuridico[];
  cadastros: Cadastros;
  emptyState: ReactNode;
  onAbrir: (item: EncaminhamentoJuridicoDetalhe) => void;
  variante: "desktop" | "mobile";
};

export function JuridicoPorCondominioLista({
  condominios,
  cadastros,
  emptyState,
  onAbrir,
  variante,
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
    <div className="flex flex-col gap-lg" aria-label="Jurídico por condomínio">
      {condominios.map((grupo) => (
        <PainelCondominio
          key={grupo.condominioId}
          grupo={grupo}
          aberto={abertos.has(grupo.condominioId)}
          onToggle={() => alternar(grupo.condominioId)}
          cadastros={cadastros}
          onAbrir={onAbrir}
          variante={variante}
        />
      ))}
    </div>
  );
}
