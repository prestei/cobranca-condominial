"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, CalendarClock, ChevronDown, ListOrdered, User } from "lucide-react";
import { AtalhosContatoAtendente } from "@/components/atendimentos/atalhos-contato-atendente";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import {
  listGroupAccordionPanelClassName,
  listGroupAccordionToggleClassName,
  listGroupEmbeddedTableContainerClassName,
  listGroupEmbeddedTableHeaderClassName,
  listGroupEmbeddedTableRowClassName,
} from "@/components/list-group-accordion";
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
import { formatarData, nomeCondominio, type Cadastros } from "@/data/catalogo";
import type { CanalAtalhoContato } from "@/lib/contato-responsavel";
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

function tituloCobrancaMobile(item: FilaCobrancaItem, modo: "condominio" | "atendente", cadastros: Cadastros) {
  if (modo === "condominio") return rotuloUnidade(item);
  return `${nomeCondominio(item.condominioId, cadastros)} - ${rotuloUnidade(item)}`;
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

export function agruparFilaPorCondominio(itens: FilaCobrancaItem[], cadastros: Cadastros): GrupoFila[] {
  const mapa = new Map<number, FilaCobrancaItem[]>();
  for (const item of itens) {
    const lista = mapa.get(item.condominioId) ?? [];
    lista.push(item);
    mapa.set(item.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, lista]) => ({
      id: condominioId,
      nome: nomeCondominio(condominioId, cadastros),
      itens: [...lista].sort((a, b) => rotuloUnidade(a).localeCompare(rotuloUnidade(b), "pt-BR")),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function agruparFilaPorAtendente(itens: FilaCobrancaItem[], cadastros: Cadastros): GrupoFila[] {
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
          const condo = nomeCondominio(a.condominioId, cadastros).localeCompare(
            nomeCondominio(b.condominioId, cadastros),
            "pt-BR",
          );
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

/** Larguras fixas iguais em todos os painéis por condomínio para alinhar colunas na vertical. */
function ColgroupFilaDesktop({
  modo,
  visaoGeral,
  mostraContato,
}: {
  modo: "condominio" | "atendente";
  visaoGeral: boolean;
  mostraContato: boolean;
}) {
  if (visaoGeral && modo === "condominio") {
    return (
      <colgroup>
        <col className="w-[4%]" />
        <col className="w-[11%]" />
        <col className="w-[15%]" />
        <col className="w-[13%]" />
        <col className="w-[12%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[15%]" />
      </colgroup>
    );
  }
  if (visaoGeral && modo === "atendente") {
    return (
      <colgroup>
        <col className="w-[4%]" />
        <col className="w-[14%]" />
        <col className="w-[11%]" />
        <col className="w-[15%]" />
        <col className="w-[13%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[13%]" />
      </colgroup>
    );
  }
  if (!visaoGeral && modo === "condominio") {
    return (
      <colgroup>
        <col className="w-[12%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[18%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[10%]" />
      </colgroup>
    );
  }
  if (mostraContato) {
    return (
      <colgroup>
        <col className="w-[13%]" />
        <col className="w-[11%]" />
        <col className="w-[14%]" />
        <col className="w-[12%]" />
        <col className="w-[18%]" />
        <col className="w-[14%]" />
        <col className="w-[13%]" />
        <col className="w-[5%]" />
      </colgroup>
    );
  }
  return (
    <colgroup>
      <col className="w-[14%]" />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
      <col className="w-[14%]" />
      <col className="w-[16%]" />
      <col className="w-[14%]" />
      <col className="w-[14%]" />
    </colgroup>
  );
}

type TabelaProps = {
  itens: FilaCobrancaItem[];
  modo: "condominio" | "atendente";
  cadastros: Cadastros;
  emptyState: ReactNode;
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
  onIniciarCanal?: (unidadeId: number, canal: Extract<CanalAtalhoContato, "WhatsApp" | "E-mail">) => void;
  embutida?: boolean;
  pageOffset?: number;
  totalItens?: number;
};

function TabelaDesktop({
  itens,
  modo,
  cadastros,
  emptyState,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
  onIniciarCanal,
  embutida = false,
}: TabelaProps) {
  const mostraContato = !visaoGeral && Boolean(onIniciarCanal);
  const colSpan =
    (visaoGeral ? 1 : 0) +
    (modo === "condominio" ? 6 : 7) +
    (mostraContato && modo === "atendente" ? 1 : 0) +
    1;

  return (
    <Table
      aria-label={modo === "condominio" ? "Fila do condomínio" : "Fila do atendente"}
      showExport={false}
      fitContainer
      containerClassName={embutida ? listGroupEmbeddedTableContainerClassName : undefined}
    >
      <ColgroupFilaDesktop modo={modo} visaoGeral={visaoGeral} mostraContato={mostraContato} />
      <TableHeader className={embutida ? listGroupEmbeddedTableHeaderClassName : undefined}>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          {visaoGeral ? <TableHead className="w-12" /> : null}
          {modo === "atendente" ? <TableHead>Condomínio</TableHead> : null}
          <TableHead>Unidade</TableHead>
          <TableHead>Inadimplência</TableHead>
          <TableHead>Situação</TableHead>
          {modo === "condominio" ? (
            visaoGeral ? <TableHead>RE responsável</TableHead> : <TableHead>Iniciar contato</TableHead>
          ) : null}
          {mostraContato && modo === "atendente" ? <TableHead>Iniciar contato</TableHead> : null}
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
                  : embutida
                    ? listGroupEmbeddedTableRowClassName
                    : "border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
              }
            >
              {visaoGeral ? (
                <TableCell className="w-12">
                  <div className="flex justify-start">
                    <Checkbox
                      aria-label={`Selecionar ${rotuloUnidade(item)}`}
                      checked={selecionadas.has(item.unidadeId)}
                      onChange={(event) => onToggleUnidade(item.unidadeId, event.target.checked)}
                    />
                  </div>
                </TableCell>
              ) : null}
              {modo === "atendente" ? (
                <TableCell className="text-on-surface">
                  {nomeCondominio(item.condominioId, cadastros)}
                </TableCell>
              ) : null}
              <TableCell className="font-medium text-on-surface">
                {rotuloUnidade(item)}
              </TableCell>
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
              <TableCell className="align-middle">
                <div className="flex justify-start">
                  <BadgeSituacaoCobranca situacao={item.situacao} />
                </div>
              </TableCell>
              {modo === "condominio" ? (
                visaoGeral ? (
                  <TableCell className="text-on-surface">
                    {item.codigoRe ?? <span className="text-on-surface-variant">Sem responsável</span>}
                  </TableCell>
                ) : (
                  <TableCell>
                    <div className="flex justify-start">
                      <AtalhosContatoAtendente
                        compacto
                        unidadeId={item.unidadeId}
                        condominioId={item.condominioId}
                        identificacao={item.identificacao}
                        bloco={item.bloco}
                        onIniciar={(canal) => onIniciarCanal?.(item.unidadeId, canal)}
                      />
                    </div>
                  </TableCell>
                )
              ) : null}
              {mostraContato && modo === "atendente" ? (
                <TableCell>
                  <div className="flex justify-start">
                    <AtalhosContatoAtendente
                      compacto
                      unidadeId={item.unidadeId}
                      condominioId={item.condominioId}
                      identificacao={item.identificacao}
                      bloco={item.bloco}
                      onIniciar={(canal) => onIniciarCanal?.(item.unidadeId, canal)}
                    />
                  </div>
                </TableCell>
              ) : null}
              <TableCell className="text-on-surface-variant">
                {item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—"}
              </TableCell>
              <TableCell className="align-middle">
                <div className="flex justify-start">
                  <CelulaProximoRetorno data={item.proximoRetorno} />
                </div>
              </TableCell>
              <TableActionsCell
                label={`Ações da cobrança ${rotuloUnidade(item)}`}
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
  visaoGeral,
  selecionadas,
  onToggleUnidade,
  acoesLinha,
  onIniciarCanal,
  pageOffset = 0,
  totalItens = 0,
}: TabelaProps) {
  if (itens.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  const mostraContato = !visaoGeral && Boolean(onIniciarCanal);

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
          <TableMobileCard
            key={item.unidadeId}
            id={`fila-unidade-${item.unidadeId}`}
            className={
              mostraContato
                ? "border-brass/25 bg-gradient-to-b from-gold-subtle/70 to-surface-card"
                : undefined
            }
          >
            <TableMobileCardHeader>
              {visaoGeral ? (
                <Checkbox
                  aria-label={`Selecionar ${rotuloUnidade(item)}`}
                  checked={selecionadas.has(item.unidadeId)}
                  onChange={(event) => onToggleUnidade(item.unidadeId, event.target.checked)}
                />
              ) : (
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    mostraContato ? "bg-brass/15 text-brass" : "bg-surface-subtle text-on-surface-variant"
                  }`}
                  aria-hidden="true"
                >
                  <Icon icon={ListOrdered} size="sm" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {tituloCobrancaMobile(item, modo, cadastros)}
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
                {modo === "condominio" && visaoGeral ? (
                  <div className="min-w-0">
                    <p className="text-label-sm uppercase text-on-surface-variant">RE</p>
                    <p className="text-body-md text-on-surface">{item.codigoRe ?? "Sem responsável"}</p>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-label-sm uppercase text-on-surface-variant">
                      {modo === "atendente" ? "Condomínio" : "Último"}
                    </p>
                    <p className="truncate text-body-md text-on-surface">
                      {modo === "atendente"
                        ? nomeCondominio(item.condominioId, cadastros)
                        : item.ultimoAtendimento
                          ? formatarData(item.ultimoAtendimento)
                          : "—"}
                    </p>
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
            {mostraContato ? (
              <div className="mt-sm">
                <AtalhosContatoAtendente
                  unidadeId={item.unidadeId}
                  condominioId={item.condominioId}
                  identificacao={item.identificacao}
                  bloco={item.bloco}
                  onIniciar={(canal) => onIniciarCanal?.(item.unidadeId, canal)}
                />
              </div>
            ) : null}
            {acoesRapidas.length > 0 ? (
              <div className="mt-sm flex flex-col gap-xs">
                {acoesRapidas.find((a) => a.label === "Registrar contato") ? (
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 w-full"
                    variant={mostraContato ? "outline" : "primary"}
                    onClick={() => acoesRapidas.find((a) => a.label === "Registrar contato")?.onSelect()}
                  >
                    <Icon
                      icon={acoesRapidas.find((a) => a.label === "Registrar contato")!.icon}
                      size="sm"
                      aria-hidden
                    />
                    {mostraContato ? "Registrar sem abrir canal" : "Registrar contato"}
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
  cadastros,
  aberto,
  onToggle,
  variante,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
  onIniciarCanal,
}: {
  grupo: GrupoFila;
  modo: "condominio" | "atendente";
  cadastros: Cadastros;
  aberto: boolean;
  onToggle: () => void;
  variante: "desktop" | "mobile";
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
  onIniciarCanal?: (unidadeId: number, canal: Extract<CanalAtalhoContato, "WhatsApp" | "E-mail">) => void;
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
          className={listGroupAccordionPanelClassName}
        >
          {variante === "desktop" ? (
            <TabelaDesktop
              itens={pageItens}
              modo={modo}
              cadastros={cadastros}
              emptyState={null}
              visaoGeral={visaoGeral}
              selecionadas={selecionadas}
              destaqueUnidadeId={destaqueUnidadeId}
              onToggleUnidade={onToggleUnidade}
              acoesLinha={acoesLinha}
              onIniciarCanal={onIniciarCanal}
              embutida
            />
          ) : (
            <TabelaMobile
              itens={pageItens}
              modo={modo}
              cadastros={cadastros}
              emptyState={null}
              visaoGeral={visaoGeral}
              selecionadas={selecionadas}
              destaqueUnidadeId={destaqueUnidadeId}
              onToggleUnidade={onToggleUnidade}
              acoesLinha={acoesLinha}
              onIniciarCanal={onIniciarCanal}
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
  grupos: GrupoFila[];
  modo: "condominio" | "atendente";
  cadastros: Cadastros;
  emptyState: ReactNode;
  variante: "desktop" | "mobile";
  visaoGeral: boolean;
  selecionadas: Set<number>;
  destaqueUnidadeId: number | null;
  onToggleUnidade: (unidadeId: number, checked: boolean) => void;
  acoesLinha: (item: FilaCobrancaItem) => FilaLinhaAcao[];
  onIniciarCanal?: (unidadeId: number, canal: Extract<CanalAtalhoContato, "WhatsApp" | "E-mail">) => void;
};

export function FilaPorGruposLista({
  grupos,
  modo,
  cadastros,
  emptyState,
  variante,
  visaoGeral,
  selecionadas,
  destaqueUnidadeId,
  onToggleUnidade,
  acoesLinha,
  onIniciarCanal,
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
          cadastros={cadastros}
          aberto={abertos.has(grupo.id)}
          onToggle={() => alternar(grupo.id)}
          variante={variante}
          visaoGeral={visaoGeral}
          selecionadas={selecionadas}
          destaqueUnidadeId={destaqueUnidadeId}
          onToggleUnidade={onToggleUnidade}
          acoesLinha={acoesLinha}
          onIniciarCanal={onIniciarCanal}
        />
      ))}
    </div>
  );
}
