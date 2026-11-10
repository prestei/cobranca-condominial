"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, CalendarClock, ChevronDown, ListOrdered, User } from "lucide-react";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Checkbox } from "@/components/input";
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
import { formatarData, nomeCondominio } from "@/data/catalogo";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { FilaCobrancaItem } from "@/lib/fila/service";

export type GrupoFila = {
  id: number;
  nome: string;
  itens: FilaCobrancaItem[];
};

export type FilaLinhaAcao = {
  label: string;
  icon: typeof ListOrdered;
  onSelect: () => void;
  destructive?: boolean;
};

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} - ${item.bloco}`;
  return item.identificacao;
}

function tituloCobrancaMobile(item: FilaCobrancaItem, modo: "condominio" | "atendente") {
  if (modo === "condominio") return rotuloUnidade(item);
  return `${nomeCondominio(item.condominioId)} - ${rotuloUnidade(item)}`;
}

function CelulaProximoRetorno({ data }: { data: string | null }) {
  const texto = formatarProximoRetorno(data);
  if (!data?.trim() || texto === "—") {
    return <span className="text-on-surface-variant">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-sm text-body-md text-on-surface">
      <CalendarClock className="size-4 shrink-0 text-on-surface-variant" aria-hidden />
      {texto}
    </span>
  );
}

export function agruparFilaPorCondominio(itens: FilaCobrancaItem[]): GrupoFila[] {
  const mapa = new Map<number, FilaCobrancaItem[]>();
  for (const item of itens) {
    const lista = mapa.get(item.condominioId) ?? [];
    lista.push(item);
    mapa.set(item.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, lista]) => ({
      id: condominioId,
      nome: nomeCondominio(condominioId),
      itens: [...lista].sort((a, b) => rotuloUnidade(a).localeCompare(rotuloUnidade(b), "pt-BR")),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function agruparFilaPorAtendente(itens: FilaCobrancaItem[]): GrupoFila[] {
  const mapa = new Map<number, FilaCobrancaItem[]>();
  for (const item of itens) {
    const key = item.atendenteId ?? 0;
    const lista = mapa.get(key) ?? [];
    lista.push(item);
    mapa.set(key, lista);
  }

  return [...mapa.entries()]
    .map(([atendenteId, lista]) => {
      const amostra = lista[0];
      const nome =
        atendenteId === 0
          ? "Sem responsável"
          : [amostra?.nomeAtendente?.trim(), amostra?.codigoRe ? `RE ${amostra.codigoRe}` : null]
              .filter(Boolean)
              .join(" · ") || `Atendente #${atendenteId}`;
      return {
        id: atendenteId,
        nome,
        itens: [...lista].sort((a, b) => {
          const condo = nomeCondominio(a.condominioId).localeCompare(nomeCondominio(b.condominioId), "pt-BR");
          if (condo !== 0) return condo;
          return rotuloUnidade(a).localeCompare(rotuloUnidade(b), "pt-BR");
        }),
      };
    })
    .sort((a, b) => {
      if (a.id === 0) return 1;
      if (b.id === 0) return -1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

type TabelaProps = {
  itens: FilaCobrancaItem[];
  modo: "condominio" | "atendente";
  emptyState: ReactNode;
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  itens,
  modo,
  emptyState,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
  embutida = false,
}: TabelaProps) {
  const colSpan = (visaoGeral ? 1 : 0) + (modo === "condominio" ? 6 : 7) + 1;

  return (
    <Table
      aria-label={modo === "condominio" ? "Fila do condomínio" : "Fila do atendente"}
      showExport={false}
      containerClassName={embutida ? "rounded-none border-0 shadow-none" : undefined}
    >
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          {visaoGeral ? <TableHead className="w-12" /> : null}
          {modo === "atendente" ? <TableHead>Condomínio</TableHead> : null}
          <TableHead>Unidade</TableHead>
          <TableHead>Inadimplência</TableHead>
          <TableHead>Situação</TableHead>
          {modo === "condominio" ? <TableHead>RE responsável</TableHead> : null}
          <TableHead>Último atendimento</TableHead>
          <TableHead>Próximo retorno</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={colSpan}>{emptyState}</TableEmpty>
        ) : (
          itens.map((item) => (
            <TableRow
              key={item.unidadeId}
              id={`fila-unidade-${item.unidadeId}`}
              className={
                destaqueUnidadeId === item.unidadeId
                  ? "border-b border-border-subtle bg-[#FFF8E6] hover:bg-[#FFF8E6]"
                  : "border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
              }
            >
              {visaoGeral ? (
                <TableCell align="center" className="w-12">
                  <div className="flex justify-center">
                    <Checkbox
                      aria-label={`Selecionar ${rotuloUnidade(item)}`}
                      checked={selecionadas.has(item.unidadeId)}
                      onChange={(event) => onToggleUnidade(item.unidadeId, event.target.checked)}
                    />
                  </div>
                </TableCell>
              ) : null}
              {modo === "atendente" ? (
                <TableCell className="text-on-surface">{nomeCondominio(item.condominioId)}</TableCell>
              ) : null}
              <TableCell className="font-medium text-on-surface">{rotuloUnidade(item)}</TableCell>
              <TableCell>
                {item.valorInadimplencia ? (
                  <span className="font-semibold text-on-surface">{item.valorInadimplencia}</span>
                ) : (
                  "—"
                )}
                {item.diasAtrasoMax > 0 ? (
                  <span className="mt-xs block text-body-sm text-on-surface-variant">
                    {item.diasAtrasoMax} dias em atraso
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                <BadgeSituacaoCobranca situacao={item.situacao} />
              </TableCell>
              {modo === "condominio" ? (
                <TableCell className="text-on-surface">
                  {item.codigoRe ?? <span className="text-on-surface-variant">Sem responsável</span>}
                </TableCell>
              ) : null}
              <TableCell className="text-on-surface-variant">
                {item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—"}
              </TableCell>
              <TableCell>
                <CelulaProximoRetorno data={item.proximoRetorno} />
              </TableCell>
              <TableActionsCell
                label={`Ações da cobrança ${rotuloUnidade(item)}`}
                actions={acoesLinha(item)}
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
  modo,
  emptyState,
  visaoGeral,
  selecionadas,
  onToggleUnidade,
  acoesLinha,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  return (
    <TableMobileList aria-label={modo === "condominio" ? "Fila do condomínio" : "Fila do atendente"}>
      {itens.map((item, index) => {
        const acoes = acoesLinha(item);
        const acoesRapidas = acoes.filter((acao) =>
          ["Histórico", "Registrar contato", "Proposta", "Jurídico"].includes(acao.label),
        );
        const acoesExtras = acoes.filter(
          (acao) => !["Histórico", "Registrar contato", "Proposta", "Jurídico"].includes(acao.label),
        );
        return (
          <TableMobileCard key={item.unidadeId} id={`fila-unidade-${item.unidadeId}`}>
            <TableMobileCardHeader>
              {visaoGeral ? (
                <Checkbox
                  aria-label={`Selecionar ${rotuloUnidade(item)}`}
                  checked={selecionadas.has(item.unidadeId)}
                  onChange={(event) => onToggleUnidade(item.unidadeId, event.target.checked)}
                />
              ) : (
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                  aria-hidden="true"
                >
                  <Icon icon={ListOrdered} size="sm" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {tituloCobrancaMobile(item, modo)}
                  </TableMobileTitle>
                  {totalItens > 0 ? (
                    <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                      {index + 1 + pageOffset} de {totalItens}
                    </span>
                  ) : null}
                </div>
              </div>
              {acoesExtras.length > 0 ? (
                <TableActionsButton label={`Mais ações — ${rotuloUnidade(item)}`} actions={acoesExtras} />
              ) : (
                <span aria-hidden="true" />
              )}
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Inadimplência</p>
                  <p className="text-body-md font-semibold tabular-nums text-on-surface">
                    {item.valorInadimplencia ?? "—"}
                  </p>
                  {item.diasAtrasoMax > 0 ? (
                    <p className="text-body-sm text-on-surface-variant">{item.diasAtrasoMax} dias em atraso</p>
                  ) : null}
                </div>
                <BadgeSituacaoCobranca situacao={item.situacao} className="shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                {modo === "condominio" ? (
                  <div className="min-w-0">
                    <p className="text-label-sm uppercase text-on-surface-variant">RE</p>
                    <p className="text-body-md text-on-surface">{item.codigoRe ?? "Sem responsável"}</p>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-label-sm uppercase text-on-surface-variant">Condomínio</p>
                    <p className="truncate text-body-md text-on-surface">{nomeCondominio(item.condominioId)}</p>
                  </div>
                )}
                <div className="min-w-0 text-end">
                  <p className="text-label-sm uppercase text-on-surface-variant">Retorno</p>
                  <div className="flex justify-end text-body-md">
                    <CelulaProximoRetorno data={item.proximoRetorno} />
                  </div>
                </div>
              </div>
            </div>
            {acoesRapidas.length > 0 ? (
              <div className="mt-sm flex flex-col gap-xs">
                {acoesRapidas.find((a) => a.label === "Registrar contato") ? (
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 w-full"
                    onClick={() => acoesRapidas.find((a) => a.label === "Registrar contato")?.onSelect()}
                  >
                    <Icon
                      icon={acoesRapidas.find((a) => a.label === "Registrar contato")!.icon}
                      size="sm"
                      aria-hidden
                    />
                    Registrar contato
                  </Button>
                ) : null}
                <div className="grid grid-cols-2 gap-xs">
                  {acoesRapidas
                    .filter((acao) => acao.label !== "Registrar contato")
                    .map((acao) => (
                      <Button
                        key={acao.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-10 w-full px-sm text-body-sm"
                        onClick={acao.onSelect}
                      >
                        <Icon icon={acao.icon} size="sm" className="shrink-0" aria-hidden />
                        {acao.label}
                      </Button>
                    ))}
                </div>
              </div>
            ) : null}
          </TableMobileCard>
        );
      })}
    </TableMobileList>
  );
}

function PainelGrupo({
  grupo,
  modo,
  aberto,
  onToggle,
  variante,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
}: {
  grupo: GrupoFila;
  modo: "condominio" | "atendente";
  aberto: boolean;
  onToggle: () => void;
  variante: "desktop" | "mobile";
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
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

  const semResponsavel = grupo.itens.filter((item) => !item.codigoRe).length;
  const IconeGrupo = modo === "condominio" ? Building2 : User;

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
              <Icon icon={IconeGrupo} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-on-surface">{grupo.nome}</span>
              <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                {total} unidade{total === 1 ? "" : "s"}
                {modo === "condominio" && semResponsavel > 0
                  ? ` · ${semResponsavel} sem responsável`
                  : ""}
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
          aria-label={`Cobranças de ${grupo.nome}`}
          className="flex flex-col gap-md border-t border-border-subtle p-md"
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              modo={modo}
              emptyState={null}
              visaoGeral={visaoGeral}
              selecionadas={selecionadas}
              destaqueUnidadeId={destaqueUnidadeId}
              onToggleUnidade={onToggleUnidade}
              acoesLinha={acoesLinha}
              embutida
            />
          ) : (
            <TabelaMobile
              itens={pageItens}
              modo={modo}
              emptyState={null}
              visaoGeral={visaoGeral}
              selecionadas={selecionadas}
              destaqueUnidadeId={destaqueUnidadeId}
              onToggleUnidade={onToggleUnidade}
              acoesLinha={acoesLinha}
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
  grupos: GrupoFila[];
  modo: "condominio" | "atendente";
  emptyState: ReactNode;
  variante: "desktop" | "mobile";
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
};

export function FilaPorGruposLista({
  grupos,
  modo,
  emptyState,
  variante,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
}: ListaProps) {
  const [abertos, setAbertos] = useState<Set<number>>(() => new Set());

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

  function alternar(id: number) {
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
      aria-label={modo === "condominio" ? "Fila por condomínio" : "Fila por atendente"}
    >
      {grupos.map((grupo) => (
        <PainelGrupo
          key={grupo.id}
          grupo={grupo}
          modo={modo}
          aberto={abertos.has(grupo.id)}
          onToggle={() => alternar(grupo.id)}
          variante={variante}
          visaoGeral={visaoGeral}
          selecionadas={selecionadas}
          destaqueUnidadeId={destaqueUnidadeId}
          onToggleUnidade={onToggleUnidade}
          acoesLinha={acoesLinha}
        />
      ))}
    </div>
  );
}
