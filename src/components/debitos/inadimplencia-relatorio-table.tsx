"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChevronDown, Receipt } from "lucide-react";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  Table,
  TableActionsButton,
  TableActionsCell,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileField,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableAction,
} from "@/components/table";
import { formatarData, formatarMoeda, grupoDebito, nomeCondominio, nomeResponsavel, type Debito, type Cadastros } from "@/data/catalogo";

export type TotaisDebitoRelatorio = {
  valor: number;
  juros: number;
  multa: number;
  correcao: number;
  projRec: number;
};

export type GrupoUnidadeInadimplencia = {
  condominioId: number;
  unidadeId: number;
  identificacao: string;
  responsavel: string;
  debitos: Debito[];
  totais: TotaisDebitoRelatorio;
};

function valorNumerico(valor: string) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function somarTotaisDebitos(itens: Debito[]): TotaisDebitoRelatorio {
  return itens.reduce<TotaisDebitoRelatorio>(
    (acc, item) => ({
      valor: acc.valor + valorNumerico(item.valorOriginal || item.valor),
      juros: acc.juros + valorNumerico(item.juros),
      multa: acc.multa + valorNumerico(item.multa),
      correcao: acc.correcao + valorNumerico(item.correcao),
      projRec: acc.projRec + valorNumerico(item.valorAtualizado),
    }),
    { valor: 0, juros: 0, multa: 0, correcao: 0, projRec: 0 },
  );
}

function responsavelDaUnidade(cadastros: Cadastros, unidadeId: number) {
  const vinculos = cadastros.vinculos.filter((item) => item.unidadeId === unidadeId);
  const principal = vinculos.find((item) => item.principal) ?? vinculos[0];
  return principal ? nomeResponsavel(principal.responsavelId) : "—";
}

export function agruparDebitosPorUnidade(
  debitos: Debito[],
  cadastros: Cadastros,
): GrupoUnidadeInadimplencia[] {
  const mapa = new Map<number, GrupoUnidadeInadimplencia>();

  for (const item of debitos) {
    let grupo = mapa.get(item.unidadeId);
    if (!grupo) {
      const unidade = cadastros.unidades.find((u) => u.id === item.unidadeId);
      grupo = {
        condominioId: item.condominioId,
        unidadeId: item.unidadeId,
        identificacao: unidade?.identificacao?.trim() || String(item.unidadeId),
        responsavel: responsavelDaUnidade(cadastros, item.unidadeId),
        debitos: [],
        totais: { valor: 0, juros: 0, multa: 0, correcao: 0, projRec: 0 },
      };
      mapa.set(item.unidadeId, grupo);
    }
    grupo.debitos.push(item);
  }

  const grupos = [...mapa.values()].map((grupo) => {
    const debitos = [...grupo.debitos].sort((a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento),
    );
    return { ...grupo, debitos, totais: somarTotaisDebitos(debitos) };
  });

  return grupos.sort((a, b) => {
    const condo = nomeCondominio(a.condominioId).localeCompare(nomeCondominio(b.condominioId), "pt-BR");
    if (condo !== 0) return condo;
    return a.identificacao.localeCompare(b.identificacao, "pt-BR");
  });
}

export type GrupoCondominioInadimplencia = {
  condominioId: number;
  nome: string;
  unidades: GrupoUnidadeInadimplencia[];
  totais: TotaisDebitoRelatorio;
};

/** Um bloco por condomínio, na ordem do nome — base da paginação (1 página = 1 condomínio). */
export function agruparDebitosPorCondominio(
  debitos: Debito[],
  cadastros: Cadastros,
): GrupoCondominioInadimplencia[] {
  const unidades = agruparDebitosPorUnidade(debitos, cadastros);
  const mapa = new Map<number, GrupoUnidadeInadimplencia[]>();

  for (const unidade of unidades) {
    const lista = mapa.get(unidade.condominioId) ?? [];
    lista.push(unidade);
    mapa.set(unidade.condominioId, lista);
  }

  return [...mapa.entries()]
    .map(([condominioId, unidadesDoCondo]) => ({
      condominioId,
      nome: nomeCondominio(condominioId),
      unidades: unidadesDoCondo,
      totais: somarTotaisDebitos(unidadesDoCondo.flatMap((item) => item.debitos)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function moedaTotais(valor: number) {
  return formatarMoeda(String(valor));
}

function CelulaMoeda({
  valor,
  destaque = false,
}: {
  valor: number | string;
  destaque?: boolean;
}) {
  const texto = typeof valor === "number" ? moedaTotais(valor) : formatarMoeda(valor);
  return (
    <TableCell align="right" className={`tabular-nums whitespace-nowrap ${destaque ? "font-semibold" : ""}`}>
      {texto}
    </TableCell>
  );
}

type Props = {
  grupos: GrupoUnidadeInadimplencia[];
  totalGeral: TotaisDebitoRelatorio;
  emptyState: ReactNode;
  acoes: (item: Debito) => TableAction[];
  destacarCondominios?: boolean;
  /** Remove borda/sombra do wrapper quando a tabela fica dentro do painel do condomínio. */
  embutida?: boolean;
};

const COL_SPAN = 9;

export function InadimplenciaRelatorioDesktop({
  grupos,
  totalGeral,
  emptyState,
  acoes,
  destacarCondominios = false,
  embutida = false,
}: Props) {
  let condominioAnterior: number | null = null;

  return (
    <Table
      aria-label="Inadimplência por condomínio"
      showExport={false}
      containerClassName={embutida ? "rounded-none border-0 shadow-none" : undefined}
    >
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead>Lançamento</TableHead>
          <TableHead>Mês ref.</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead align="right">Valor</TableHead>
          <TableHead align="right">Juros</TableHead>
          <TableHead align="right">Multa</TableHead>
          <TableHead align="right">Correção</TableHead>
          <TableHead align="right">Proj. rec.</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.length === 0 ? (
          <TableEmpty colSpan={COL_SPAN}>{emptyState}</TableEmpty>
        ) : (
          grupos.flatMap((grupo) => {
            const linhas: ReactNode[] = [];

            if (destacarCondominios && grupo.condominioId !== condominioAnterior) {
              condominioAnterior = grupo.condominioId;
              linhas.push(
                <TableRow
                  key={`condo-${grupo.condominioId}`}
                  className="border-t-2 border-border-strong bg-surface-dim hover:bg-surface-dim"
                >
                  <TableCell colSpan={COL_SPAN} className="py-sm">
                    <div className="flex items-center gap-sm text-label-lg font-semibold text-on-surface">
                      <Icon icon={Building2} size="sm" className="text-on-surface-variant" />
                      {nomeCondominio(grupo.condominioId)}
                    </div>
                  </TableCell>
                </TableRow>,
              );
            }

            linhas.push(
              <TableRow
                key={`unidade-${grupo.unidadeId}`}
                className="bg-surface-subtle hover:bg-surface-subtle"
              >
                <TableCell colSpan={COL_SPAN} className="py-sm text-body-md font-semibold text-on-surface">
                  Unidade {grupo.identificacao}
                  {grupo.responsavel !== "—" ? (
                    <span className="font-normal text-on-surface-variant"> — {grupo.responsavel}</span>
                  ) : null}
                </TableCell>
              </TableRow>,
            );

            for (const item of grupo.debitos) {
              linhas.push(
                <TableRow
                  key={item.id}
                  className="border-b border-border-subtle bg-surface-subtle/80 hover:bg-surface-subtle"
                >
                  <TableCell className="pl-lg">
                    {grupoDebito(item.descricao) || item.descricao || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item.referencia || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatarData(item.dataVencimento)}</TableCell>
                  <CelulaMoeda valor={item.valorOriginal || item.valor} />
                  <CelulaMoeda valor={item.juros} />
                  <CelulaMoeda valor={item.multa} />
                  <CelulaMoeda valor={item.correcao} />
                  <CelulaMoeda valor={item.valorAtualizado} destaque />
                  <TableActionsCell
                    label={`Ações do débito ${item.referencia}`}
                    actions={acoes(item)}
                    className="bg-surface-subtle/80 group-hover/row:bg-surface-subtle"
                  />
                </TableRow>,
              );
            }

            linhas.push(
              <TableRow
                key={`total-unidade-${grupo.unidadeId}`}
                className="border-b border-border-subtle bg-surface-dim hover:bg-surface-dim"
              >
                <TableCell className="pl-lg text-body-sm font-semibold text-on-surface-variant">
                  Total {grupo.identificacao}
                </TableCell>
                <TableCell />
                <TableCell />
                <CelulaMoeda valor={grupo.totais.valor} destaque />
                <CelulaMoeda valor={grupo.totais.juros} destaque />
                <CelulaMoeda valor={grupo.totais.multa} destaque />
                <CelulaMoeda valor={grupo.totais.correcao} destaque />
                <CelulaMoeda valor={grupo.totais.projRec} destaque />
                <TableCell />
              </TableRow>,
            );

            return linhas;
          })
        )}
      </TableBody>
      {grupos.length > 0 ? (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="font-semibold">Total do condomínio</TableCell>
            <TableCell />
            <TableCell />
            <CelulaMoeda valor={totalGeral.valor} destaque />
            <CelulaMoeda valor={totalGeral.juros} destaque />
            <CelulaMoeda valor={totalGeral.multa} destaque />
            <CelulaMoeda valor={totalGeral.correcao} destaque />
            <CelulaMoeda valor={totalGeral.projRec} destaque />
            <TableCell />
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}

export function InadimplenciaRelatorioMobile({
  grupos,
  totalGeral,
  emptyState,
  acoes,
  destacarCondominios = false,
  pageOffset = 0,
  totalGrupos = 0,
}: Props & { pageOffset?: number; totalGrupos?: number }) {
  if (grupos.length === 0) {
    return <TableMobileEmpty>{emptyState}</TableMobileEmpty>;
  }

  let condominioAnterior: number | null = null;

  return (
    <TableMobileList aria-label="Inadimplência por condomínio">
      {grupos.map((grupo, index) => {
        const mostrarCondo = destacarCondominios && grupo.condominioId !== condominioAnterior;
        if (mostrarCondo) condominioAnterior = grupo.condominioId;

        return (
          <div key={grupo.unidadeId} className="flex flex-col gap-sm">
            {mostrarCondo ? (
              <p className="flex items-center gap-sm px-xs text-label-lg font-semibold text-on-surface">
                <Icon icon={Building2} size="sm" className="text-on-surface-variant" />
                {nomeCondominio(grupo.condominioId)}
              </p>
            ) : null}
            <TableMobileCard>
              <TableMobileCardHeader>
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                  aria-hidden="true"
                >
                  <Icon icon={Receipt} size="sm" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                    <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                      Unidade {grupo.identificacao}
                    </TableMobileTitle>
                    {totalGrupos > 0 ? (
                      <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                        {index + 1 + pageOffset} de {totalGrupos}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-xs truncate text-body-sm text-on-surface-variant">{grupo.responsavel}</p>
                </div>
              </TableMobileCardHeader>
              <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
                {grupo.debitos.map((item) => (
                  <div key={item.id} className="flex flex-col gap-xs border-b border-border-subtle/30 pb-sm last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-sm">
                      <div className="min-w-0">
                        <p className="text-body-md font-medium text-on-surface">
                          {grupoDebito(item.descricao) || item.descricao || "—"}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {item.referencia || "—"} · {formatarData(item.dataVencimento)}
                        </p>
                      </div>
                      <TableActionsButton
                        label={`Ações do débito ${item.referencia}`}
                        actions={acoes(item)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-xs text-body-sm">
                      <span className="text-on-surface-variant">Valor</span>
                      <span className="text-end tabular-nums">{formatarMoeda(item.valorOriginal || item.valor)}</span>
                      <span className="text-on-surface-variant">Juros</span>
                      <span className="text-end tabular-nums">{formatarMoeda(item.juros)}</span>
                      <span className="text-on-surface-variant">Multa</span>
                      <span className="text-end tabular-nums">{formatarMoeda(item.multa)}</span>
                      <span className="text-on-surface-variant">Correção</span>
                      <span className="text-end tabular-nums">{formatarMoeda(item.correcao)}</span>
                      <span className="font-medium text-on-surface">Proj. rec.</span>
                      <span className="text-end font-semibold tabular-nums">
                        {formatarMoeda(item.valorAtualizado)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="-mx-md rounded-b-lg bg-surface-dim px-md py-sm">
                  <TableMobileField label={`Total ${grupo.identificacao}`} stacked>
                    <span className="font-semibold tabular-nums">{moedaTotais(grupo.totais.projRec)}</span>
                    <span className="block text-body-sm text-on-surface-variant">
                      Valor {moedaTotais(grupo.totais.valor)} · Juros {moedaTotais(grupo.totais.juros)} · Multa{" "}
                      {moedaTotais(grupo.totais.multa)} · Correção {moedaTotais(grupo.totais.correcao)}
                    </span>
                  </TableMobileField>
                </div>
              </div>
            </TableMobileCard>
          </div>
        );
      })}
      <div className="rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm">
        <p className="text-label-lg font-semibold text-on-surface">Total do condomínio</p>
        <p className="mt-xs text-body-md font-semibold tabular-nums text-on-surface">
          {moedaTotais(totalGeral.projRec)}
        </p>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Valor {moedaTotais(totalGeral.valor)} · Juros {moedaTotais(totalGeral.juros)} · Multa{" "}
          {moedaTotais(totalGeral.multa)} · Correção {moedaTotais(totalGeral.correcao)}
        </p>
      </div>
    </TableMobileList>
  );
}

type ListaProps = {
  condominios: GrupoCondominioInadimplencia[];
  emptyState: ReactNode;
  acoes: (item: Debito) => TableAction[];
  /** `desktop` usa tabela; `mobile` usa cards. */
  variante: "desktop" | "mobile";
};

function PainelCondominio({
  condominio,
  aberto,
  onToggle,
  acoes,
  variante,
}: {
  condominio: GrupoCondominioInadimplencia;
  aberto: boolean;
  onToggle: () => void;
  acoes: (item: Debito) => TableAction[];
  variante: "desktop" | "mobile";
}) {
  const painelId = useId();
  const [page, setPage] = useState(1);
  const qtdUnidades = condominio.unidades.length;
  const qtdDebitos = condominio.unidades.reduce((acc, item) => acc + item.debitos.length, 0);

  const pageCount = Math.max(1, Math.ceil(qtdUnidades / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const unidadesPagina = useMemo(
    () => condominio.unidades.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [condominio.unidades, currentPage],
  );

  useEffect(() => {
    setPage(1);
  }, [condominio.condominioId, qtdUnidades]);

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
              <span className="block truncate font-semibold text-on-surface">{condominio.nome}</span>
              <span className="mt-xs block text-body-sm font-normal text-on-surface-variant">
                {qtdUnidades} unidade{qtdUnidades === 1 ? "" : "s"} · {qtdDebitos} lançamento
                {qtdDebitos === 1 ? "" : "s"} · Proj. rec. {moedaTotais(condominio.totais.projRec)}
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
          aria-label={`Débitos de ${condominio.nome}`}
          className="flex flex-col gap-md border-t border-border-subtle p-md"
        >
          {variante === "desktop" ? (
            <InadimplenciaRelatorioDesktop
              grupos={unidadesPagina}
              totalGeral={condominio.totais}
              emptyState={null}
              acoes={acoes}
              destacarCondominios={false}
              embutida
            />
          ) : (
            <InadimplenciaRelatorioMobile
              grupos={unidadesPagina}
              totalGeral={condominio.totais}
              emptyState={null}
              acoes={acoes}
              destacarCondominios={false}
              pageOffset={(currentPage - 1) * PAGE_SIZE}
              totalGrupos={qtdUnidades}
            />
          )}
          {qtdUnidades > 0 ? (
            <Pagination page={currentPage} total={qtdUnidades} onPageChange={setPage} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Lista todos os condomínios com espaço entre blocos e painel recolhível por condomínio. */
export function InadimplenciaPorCondominioLista({
  condominios,
  emptyState,
  acoes,
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
    <div className="flex flex-col gap-lg" aria-label="Inadimplência por condomínio">
      {condominios.map((condominio) => (
        <PainelCondominio
          key={condominio.condominioId}
          condominio={condominio}
          aberto={abertos.has(condominio.condominioId)}
          onToggle={() => alternar(condominio.condominioId)}
          acoes={acoes}
          variante={variante}
        />
      ))}
    </div>
  );
}
