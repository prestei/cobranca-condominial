"use client";

import { Building2, CalendarClock, History } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { listGroupEmbeddedTableContainerClassName } from "@/components/list-group-accordion";
import { DelinquencyTrackingBadge } from "@/components/debitos/delinquency-tracking-badge";
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
  TableMobileField,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableAction,
} from "@/components/table";
import {
  formatarData,
  formatarMoeda,
  nomeCondominio,
  nomeUnidade,
  nomeUsuario,
  type Cadastros,
  type Debito,
} from "@/data/catalogo";
import type { DebitoNegociacaoFinanceira } from "@/lib/debitos/negotiation-financial-sync";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import { computeDelinquencyTrackingForDebt } from "@/lib/inadimplencia/delinquency-tracking";
import type { RecorteListagemInadimplenciaId } from "@/lib/debitos/painel-situacao";
import {
  contextoCobrancaUnidade,
  diasAtrasoDebito,
  propostaNegociacaoDoDebito,
  rotuloResponsavelUnidade,
  saldoPendenteDebito,
} from "@/lib/debitos/recorte-listagem-operacional";

type Props = {
  recorte: RecorteListagemInadimplenciaId;
  itens: Debito[];
  pageRows: Debito[];
  cadastros: Cadastros;
  dataBase: string;
  negociacaoPorDebito: Map<number, DebitoNegociacaoFinanceira>;
  emptyState: ReactNode;
  acoes: (item: Debito) => TableAction[];
  currentPage: number;
  total: number;
  pageSize: number;
  onAbrirHistoricoUnidade?: (unidadeId: number) => void;
  /** Separa blocos por condomínio na visão Geral (cabeçalho entre grupos). */
  destacarCondominios?: boolean;
  /** Tabela embutida em painel por condomínio (sem borda duplicada). */
  embutida?: boolean;
};

function CelulaProximoRetorno({ data }: { data: string | null }) {
  const texto = formatarProximoRetorno(data);
  if (!data?.trim() || texto === "—") {
    return <span className="text-on-surface-variant">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-sm text-body-sm text-on-surface">
      <CalendarClock className="size-4 shrink-0 text-on-surface-variant" aria-hidden />
      {texto}
    </span>
  );
}

function celulaDiasAtraso(item: Debito, dataBase: string, cadastros: Cadastros) {
  const dias = diasAtrasoDebito(item, dataBase);
  if (dias === null) return "—";
  const metricas = computeDelinquencyTrackingForDebt(item.condominioId, item.dataVencimento, dataBase, cadastros);
  return (
    <div className="flex flex-col items-end gap-xs">
      <span className="tabular-nums font-medium text-on-surface">{dias} dias</span>
      <DelinquencyTrackingBadge status={metricas.status} />
    </div>
  );
}

export function InadimplenciaRecorteListagem({
  recorte,
  itens,
  pageRows,
  cadastros,
  dataBase,
  negociacaoPorDebito,
  emptyState,
  acoes,
  currentPage,
  total,
  pageSize,
  onAbrirHistoricoUnidade,
  destacarCondominios = false,
  embutida = false,
}: Props) {
  const aria = `Inadimplência — ${recorte}`;

  function neg(item: Debito) {
    return negociacaoPorDebito.get(item.id);
  }

  const colSpan =
    recorte === "em_aberto"
      ? 9
      : recorte === "em_negociacao"
        ? 10
        : recorte === "quitadas"
          ? 8
          : recorte === "prescritas"
            ? 7
            : 7;

  const desktopHead =
    recorte === "em_aberto" ? (
      <TableRow className="border-border-subtle/50 hover:bg-transparent">
        <TableHead>Condomínio</TableHead>
        <TableHead>Unidade</TableHead>
        <TableHead align="right">Valor original</TableHead>
        <TableHead align="right">Saldo pendente</TableHead>
        <TableHead align="right">Atraso</TableHead>
        <TableHead>Responsável (RE)</TableHead>
        <TableHead>Último atendimento</TableHead>
        <TableHead>Próximo retorno</TableHead>
        <TableHead actions />
      </TableRow>
    ) : recorte === "em_negociacao" ? (
      <TableRow className="border-border-subtle/50 hover:bg-transparent">
        <TableHead>Condomínio</TableHead>
        <TableHead>Unidade</TableHead>
        <TableHead align="right">Valor original</TableHead>
        <TableHead align="right">Valor negociado</TableHead>
        <TableHead align="right">Desconto</TableHead>
        <TableHead align="right">Valor pago</TableHead>
        <TableHead align="right">Saldo restante</TableHead>
        <TableHead align="center">Parcelas</TableHead>
        <TableHead>Situação</TableHead>
        <TableHead actions />
      </TableRow>
    ) : recorte === "quitadas" ? (
      <TableRow className="border-border-subtle/50 hover:bg-transparent">
        <TableHead>Condomínio</TableHead>
        <TableHead>Unidade</TableHead>
        <TableHead align="right">Valor original</TableHead>
        <TableHead align="right">Valor quitado</TableHead>
        <TableHead>Data da quitação</TableHead>
        <TableHead>Negociação</TableHead>
        <TableHead>Confirmação</TableHead>
        <TableHead actions />
      </TableRow>
    ) : recorte === "prescritas" ? (
      <TableRow className="border-border-subtle/50 hover:bg-transparent">
        <TableHead>Condomínio</TableHead>
        <TableHead>Unidade</TableHead>
        <TableHead align="right">Valor original</TableHead>
        <TableHead>Classificação em</TableHead>
        <TableHead>Responsável</TableHead>
        <TableHead>Justificativa</TableHead>
        <TableHead actions />
      </TableRow>
    ) : (
      <TableRow className="border-border-subtle/50 hover:bg-transparent">
        <TableHead>Condomínio</TableHead>
        <TableHead>Unidade</TableHead>
        <TableHead>Referência</TableHead>
        <TableHead>Vencimento</TableHead>
        <TableHead>Situação do débito</TableHead>
        <TableHead>Situação operacional</TableHead>
        <TableHead actions />
      </TableRow>
    );

  function desktopRow(item: Debito) {
    const n = neg(item);
    const ctx = contextoCobrancaUnidade(cadastros, item.unidadeId);
    const proposta = propostaNegociacaoDoDebito(cadastros, n);

    if (recorte === "em_aberto") {
      return (
        <TableRow key={item.id}>
          <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
          <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
          <TableCell align="right" className="tabular-nums">
            {formatarMoeda(item.valorOriginal)}
          </TableCell>
          <TableCell align="right" className="tabular-nums font-medium">
            {formatarMoeda(String(saldoPendenteDebito(item, n, dataBase)))}
          </TableCell>
          <TableCell align="right">{celulaDiasAtraso(item, dataBase, cadastros)}</TableCell>
          <TableCell>{rotuloResponsavelUnidade(cadastros, item.unidadeId)}</TableCell>
          <TableCell className="whitespace-nowrap tabular-nums">
            {ctx.ultimoAtendimento ? formatarData(ctx.ultimoAtendimento) : "—"}
          </TableCell>
          <TableCell>
            <CelulaProximoRetorno data={ctx.proximoRetorno} />
          </TableCell>
          <TableActionsCell label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
        </TableRow>
      );
    }

    if (recorte === "em_negociacao") {
      return (
        <TableRow key={item.id}>
          <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
          <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
          <TableCell align="right" className="tabular-nums">
            {formatarMoeda(item.valorOriginal)}
          </TableCell>
          <TableCell align="right" className="tabular-nums">
            {n?.valorNegociado ? formatarMoeda(n.valorNegociado) : "—"}
          </TableCell>
          <TableCell align="right" className="tabular-nums">
            {n?.descontoConcedido ? formatarMoeda(n.descontoConcedido) : "—"}
          </TableCell>
          <TableCell align="right" className="tabular-nums">
            {n?.valorPagoConfirmado ? formatarMoeda(n.valorPagoConfirmado) : "—"}
          </TableCell>
          <TableCell align="right" className="tabular-nums font-medium">
            {n?.saldoRestante ? formatarMoeda(n.saldoRestante) : "—"}
          </TableCell>
          <TableCell align="center" className="tabular-nums">
            {proposta?.quantidadeParcelas ?? "—"}
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{n?.situacao ?? proposta?.status ?? "Em negociação"}</Badge>
          </TableCell>
          <TableActionsCell label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
        </TableRow>
      );
    }

    if (recorte === "quitadas") {
      return (
        <TableRow key={item.id}>
          <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
          <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
          <TableCell align="right" className="tabular-nums">
            {formatarMoeda(item.valorOriginal)}
          </TableCell>
          <TableCell align="right" className="tabular-nums font-medium">
            {formatarMoeda(item.valorPago || item.valorAtualizado)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {item.dataPagamento ? formatarData(item.dataPagamento) : "—"}
          </TableCell>
          <TableCell className="text-body-sm text-on-surface-variant">
            {n?.propostaId ? (
              <span title={n.propostaId}>Acordo {n.propostaId.slice(0, 8)}…</span>
            ) : (
              "—"
            )}
          </TableCell>
          <TableCell>
            {item.usuarioSituacaoOperacionalId
              ? nomeUsuario(item.usuarioSituacaoOperacionalId, cadastros)
              : "—"}
          </TableCell>
          <TableActionsCell label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
        </TableRow>
      );
    }

    if (recorte === "prescritas") {
      return (
        <TableRow key={item.id}>
          <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
          <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
          <TableCell align="right" className="tabular-nums">
            {formatarMoeda(item.valorOriginal)}
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {item.prescritoEm ? formatarData(item.prescritoEm) : "—"}
          </TableCell>
          <TableCell>
            {item.usuarioPrescricaoId ? nomeUsuario(item.usuarioPrescricaoId, cadastros) : "—"}
          </TableCell>
          <TableCell className="max-w-xs truncate text-body-sm" title={item.justificativaPrescricao}>
            {item.justificativaPrescricao || "—"}
          </TableCell>
          <TableActionsCell label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
        </TableRow>
      );
    }

    return (
      <TableRow key={item.id}>
        <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
        <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
        <TableCell className="font-medium">{item.referencia}</TableCell>
        <TableCell className="whitespace-nowrap">{formatarData(item.dataVencimento)}</TableCell>
        <TableCell>
          <Badge variant="secondary">{item.status}</Badge>
        </TableCell>
        <TableCell className="text-body-sm text-on-surface-variant">
          {item.situacaoOperacional || "—"}
        </TableCell>
        <TableActionsCell
          label={`Ações do débito ${item.referencia}`}
          actions={[
            ...(onAbrirHistoricoUnidade
              ? [
                  {
                    label: "Histórico da unidade",
                    icon: History,
                    onSelect: () => onAbrirHistoricoUnidade(item.unidadeId),
                  } satisfies TableAction,
                ]
              : []),
            ...acoes(item),
          ]}
        />
      </TableRow>
    );
  }

  const linhasDesktop = (() => {
    if (itens.length === 0) return [];
    let condominioAnterior: number | null = null;
    const saida: ReactNode[] = [];
    for (const item of pageRows) {
      if (destacarCondominios && item.condominioId !== condominioAnterior) {
        condominioAnterior = item.condominioId;
        saida.push(
          <TableRow
            key={`condo-${item.condominioId}`}
            className="border-t-2 border-border-strong bg-surface-subtle hover:bg-surface-subtle"
          >
            <TableCell colSpan={colSpan} className="py-sm">
              <div className="flex items-center gap-sm text-label-lg font-semibold text-on-surface">
                <Icon icon={Building2} size="sm" className="text-on-surface-variant" />
                {nomeCondominio(item.condominioId, cadastros)}
              </div>
            </TableCell>
          </TableRow>,
        );
      }
      saida.push(desktopRow(item));
    }
    return saida;
  })();

  const desktop = (
    <Table
      aria-label={aria}
      showExport={false}
      fitContainer={embutida}
      containerClassName={embutida ? listGroupEmbeddedTableContainerClassName : undefined}
    >
      <TableHeader>
        {desktopHead}
      </TableHeader>
      <TableBody>
        {itens.length === 0 ? (
          <TableEmpty colSpan={colSpan}>{emptyState}</TableEmpty>
        ) : (
          linhasDesktop
        )}
      </TableBody>
    </Table>
  );

  const mobile =
    itens.length === 0 ? (
      <TableMobileEmpty>{emptyState}</TableMobileEmpty>
    ) : (
      <TableMobileList aria-label={aria}>
        {pageRows.map((item, index) => {
          const n = neg(item);
          const ctx = contextoCobrancaUnidade(cadastros, item.unidadeId);
          const proposta = propostaNegociacaoDoDebito(cadastros, n);
          return (
            <TableMobileCard key={item.id}>
              <TableMobileCardHeader>
                <div className="min-w-0 flex-1">
                  <TableMobileTitle className="text-body-md font-semibold">
                    {nomeUnidade(item.unidadeId, cadastros)}
                  </TableMobileTitle>
                  <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                    {nomeCondominio(item.condominioId, cadastros)}
                    {recorte === "historico" ? ` · ${item.referencia}` : ""}
                  </p>
                  <span className="mt-xs inline-block rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * pageSize} de {total}
                  </span>
                </div>
                <TableActionsButton
                  label={`Ações do débito ${item.referencia}`}
                  actions={acoes(item)}
                />
              </TableMobileCardHeader>
              <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm text-body-sm">
                {recorte === "em_aberto" ? (
                  <>
                    <TableMobileField label="Saldo pendente" stacked>
                      <span className="font-semibold tabular-nums">
                        {formatarMoeda(String(saldoPendenteDebito(item, n, dataBase)))}
                      </span>
                      <span className="text-on-surface-variant">Original {formatarMoeda(item.valorOriginal)}</span>
                    </TableMobileField>
                    <TableMobileField label="Atraso" stacked>
                      {celulaDiasAtraso(item, dataBase, cadastros)}
                    </TableMobileField>
                    <TableMobileField label="Responsável (RE)" stacked>
                      {rotuloResponsavelUnidade(cadastros, item.unidadeId)}
                    </TableMobileField>
                    <TableMobileField label="Atendimentos" stacked>
                      <span>Último {ctx.ultimoAtendimento ? formatarData(ctx.ultimoAtendimento) : "—"}</span>
                      <CelulaProximoRetorno data={ctx.proximoRetorno} />
                    </TableMobileField>
                  </>
                ) : null}
                {recorte === "em_negociacao" ? (
                  <>
                    <TableMobileField label="Negociação" stacked>
                      <span className="tabular-nums">Saldo {n?.saldoRestante ? formatarMoeda(n.saldoRestante) : "—"}</span>
                      <span className="text-on-surface-variant">
                        Negociado {n?.valorNegociado ? formatarMoeda(n.valorNegociado) : "—"} · Pago{" "}
                        {n?.valorPagoConfirmado ? formatarMoeda(n.valorPagoConfirmado) : "—"}
                      </span>
                      <span className="text-on-surface-variant">
                        {proposta?.quantidadeParcelas != null
                          ? `${proposta.quantidadeParcelas} parcela(s) · ${proposta.status}`
                          : n?.situacao ?? "Em negociação"}
                      </span>
                    </TableMobileField>
                  </>
                ) : null}
                {recorte === "quitadas" ? (
                  <TableMobileField label="Quitação" stacked>
                    <span className="font-semibold tabular-nums">
                      {formatarMoeda(item.valorPago || item.valorAtualizado)}
                    </span>
                    <span className="text-on-surface-variant">
                      {item.dataPagamento ? formatarData(item.dataPagamento) : "—"}
                      {n?.propostaId ? ` · Acordo` : ""}
                    </span>
                  </TableMobileField>
                ) : null}
                {recorte === "prescritas" ? (
                  <TableMobileField label="Prescrição" stacked>
                    <span>{item.prescritoEm ? formatarData(item.prescritoEm) : "—"}</span>
                    <span className="line-clamp-3 text-on-surface-variant">{item.justificativaPrescricao || "—"}</span>
                  </TableMobileField>
                ) : null}
                {recorte === "historico" ? (
                  <>
                    <TableMobileField label="Referência" stacked>
                      {item.referencia} · {formatarData(item.dataVencimento)}
                    </TableMobileField>
                    <TableMobileField label="Situações" stacked>
                      <Badge variant="secondary">{item.status}</Badge>
                      <span className="text-on-surface-variant">{item.situacaoOperacional || "—"}</span>
                    </TableMobileField>
                    {onAbrirHistoricoUnidade ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => onAbrirHistoricoUnidade(item.unidadeId)}>
                        <Icon icon={History} size="sm" />
                        Histórico da unidade
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </TableMobileCard>
          );
        })}
      </TableMobileList>
    );

  return (
    <div className="flex flex-col gap-md">
      <div className="hidden min-[768px]:block">{desktop}</div>
      <div className="min-[768px]:hidden">{mobile}</div>
    </div>
  );
}