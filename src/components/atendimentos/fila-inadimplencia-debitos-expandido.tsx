"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronUp, Eye, Handshake } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Checkbox } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import {
  debitoEmAberto,
  formatarData,
  formatarMoeda,
  persistedDebtBalanceAmount,
  type Cadastros,
  type Debito,
} from "@/data/catalogo";
import { debitosAbertosParaProposta, debitosInadimplenciaAtivaUnidade } from "@/lib/fila/debitos-inadimplencia-unidade";

function valorNumerico(valor: string) {
  const n = Number.parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
}

function jurosMultaTotal(debito: Debito) {
  return valorNumerico(debito.juros) + valorNumerico(debito.multa);
}

function badgeVariantSituacao(situacao: string): "error" | "secondary" | "neutral" {
  const norm = situacao.trim().toLowerCase();
  if (norm === "em aberto") return "error";
  if (norm === "em negociação") return "secondary";
  return "neutral";
}

type Props = {
  cadastros: Cadastros;
  unidadeId: number;
  totalRotulo: string | null;
  onFechar: () => void;
  onVerDetalhes: () => void;
  onFazerProposta: (debitoIds: number[]) => void;
  podeProposta: boolean;
  variante: "desktop" | "mobile";
};

export function FilaInadimplenciaDebitosExpandido({
  cadastros,
  unidadeId,
  totalRotulo,
  onFechar,
  onVerDetalhes,
  onFazerProposta,
  podeProposta,
  variante,
}: Props) {
  const debitos = useMemo(
    () => debitosInadimplenciaAtivaUnidade(cadastros, unidadeId),
    [cadastros, unidadeId],
  );
  const propostaIds = useMemo(() => debitosAbertosParaProposta(cadastros, unidadeId).map((d) => d.id), [cadastros, unidadeId]);

  const [selecionados, setSelecionados] = useState<Set<number>>(() => new Set(propostaIds));

  useEffect(() => {
    setSelecionados(new Set(propostaIds));
  }, [unidadeId, propostaIds.join(",")]);

  const totalInadimplencia = useMemo(() => {
    let soma = 0;
    for (const debito of debitos) {
      soma += persistedDebtBalanceAmount(debito);
    }
    return soma > 0 ? formatarMoeda(soma.toFixed(2)) : null;
  }, [debitos]);

  const totalSelecionado = useMemo(() => {
    let soma = 0;
    for (const debito of debitos) {
      if (!selecionados.has(debito.id)) continue;
      soma += persistedDebtBalanceAmount(debito);
    }
    return soma > 0 ? formatarMoeda(soma.toFixed(2)) : null;
  }, [debitos, selecionados]);

  const todosMarcados = propostaIds.length > 0 && propostaIds.every((id) => selecionados.has(id));

  function alternarTodos(checked: boolean) {
    setSelecionados(checked ? new Set(propostaIds) : new Set());
  }

  function alternarDebito(id: number, checked: boolean) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (checked) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }

  const idsProposta = [...selecionados].filter((id) => propostaIds.includes(id));

  return (
    <PainelDebitos
      variante={variante}
      onFechar={onFechar}
      debitos={debitos}
      selecionados={selecionados}
      propostaIds={propostaIds}
      todosMarcados={todosMarcados}
      alternarTodos={alternarTodos}
      alternarDebito={alternarDebito}
      totalInadimplencia={totalInadimplencia}
      totalSelecionado={totalSelecionado}
      totalRotulo={totalRotulo}
      onVerDetalhes={onVerDetalhes}
      podeProposta={podeProposta}
      idsProposta={idsProposta}
      onFazerProposta={onFazerProposta}
    />
  );
}

function PainelDebitos({
  variante,
  onFechar,
  debitos,
  selecionados,
  propostaIds,
  todosMarcados,
  alternarTodos,
  alternarDebito,
  totalInadimplencia,
  totalSelecionado,
  totalRotulo,
  onVerDetalhes,
  podeProposta,
  idsProposta,
  onFazerProposta,
}: {
  variante: "desktop" | "mobile";
  onFechar: () => void;
  debitos: Debito[];
  selecionados: Set<number>;
  propostaIds: number[];
  todosMarcados: boolean;
  alternarTodos: (checked: boolean) => void;
  alternarDebito: (id: number, checked: boolean) => void;
  totalInadimplencia: string | null;
  totalSelecionado: string | null;
  totalRotulo: string | null;
  onVerDetalhes: () => void;
  podeProposta: boolean;
  idsProposta: number[];
  onFazerProposta: (debitoIds: number[]) => void;
}) {
  return (
    <div
      className={
        variante === "desktop"
          ? "mx-sm mb-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card"
          : "mt-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card"
      }
    >
      <div className="mb-md flex flex-wrap items-start justify-between gap-sm">
        <h4 className="text-label-md font-semibold text-on-surface">Débitos vinculados a esta inadimplência</h4>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-xs" onClick={onFechar}>
          Fechar detalhes
          <Icon icon={ChevronUp} size="sm" aria-hidden />
        </Button>
      </div>

      {debitos.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhum débito operacional ativo nesta unidade.</p>
      ) : variante === "desktop" ? (
        <Table aria-label="Débitos da inadimplência" showExport={false} fitContainer containerClassName="rounded-lg border border-border-subtle">
          <TableHeader className="bg-surface-subtle">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar todos os débitos para proposta"
                  checked={todosMarcados}
                  disabled={propostaIds.length === 0}
                  onChange={(event) => alternarTodos(event.target.checked)}
                />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead align="right">Valor original</TableHead>
              <TableHead align="right">Juros/multa</TableHead>
              <TableHead align="right">Valor atualizado</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debitos.map((debito) => {
              const podeMarcar = debitoEmAberto(debito);
              return (
                <TableRow key={debito.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Incluir ${debito.descricao} na proposta`}
                      checked={selecionados.has(debito.id)}
                      disabled={!podeMarcar}
                      onChange={(event) => alternarDebito(debito.id, event.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate font-medium text-on-surface" title={debito.descricao}>
                    {debito.descricao}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-on-surface">{debito.referencia || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-on-surface">{formatarData(debito.dataVencimento)}</TableCell>
                  <TableCell align="right" className="tabular-nums">
                    {formatarMoeda(debito.valorOriginal || debito.valor)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">
                    {formatarMoeda(String(jurosMultaTotal(debito)))}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums font-medium">
                    {formatarMoeda(debito.valorAtualizado)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantSituacao(debito.situacaoOperacional)}>
                      {debito.situacaoOperacional || "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <ul className="flex flex-col gap-sm" aria-label="Débitos da inadimplência">
          {debitos.map((debito) => {
            const podeMarcar = debitoEmAberto(debito);
            return (
              <li
                key={debito.id}
                className="flex flex-col gap-xs rounded-lg border border-border-subtle/60 bg-surface-subtle/40 p-sm"
              >
                <label className="flex items-start gap-sm">
                  <Checkbox
                    className="mt-0.5"
                    aria-label={`Incluir ${debito.descricao} na proposta`}
                    checked={selecionados.has(debito.id)}
                    disabled={!podeMarcar}
                    onChange={(event) => alternarDebito(debito.id, event.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-on-surface">{debito.descricao}</span>
                    <span className="mt-xs block text-body-sm text-on-surface-variant">
                      {debito.referencia} · venc. {formatarData(debito.dataVencimento)}
                    </span>
                  </span>
                  <Badge variant={badgeVariantSituacao(debito.situacaoOperacional)} className="shrink-0">
                    {debito.situacaoOperacional || "—"}
                  </Badge>
                </label>
                <div className="flex flex-wrap justify-between gap-xs ps-8 text-body-sm tabular-nums text-on-surface">
                  <span>Atualizado: {formatarMoeda(debito.valorAtualizado)}</span>
                  <span className="text-on-surface-variant">
                    Orig. {formatarMoeda(debito.valorOriginal || debito.valor)} · enc.{" "}
                    {formatarMoeda(String(jurosMultaTotal(debito)))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-md flex flex-col gap-md border-t border-border-subtle/50 pt-md min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <p className="text-body-md text-on-surface">
          Total desta inadimplência:{" "}
          <span className="font-semibold tabular-nums text-brass">
            {totalInadimplencia || totalRotulo || "—"}
          </span>
          {podeProposta && totalSelecionado && totalSelecionado !== totalInadimplencia ? (
            <span className="ms-sm text-body-sm text-on-surface-variant">
              (selecionados para proposta: {totalSelecionado})
            </span>
          ) : null}
        </p>
        <div className="flex flex-col gap-sm min-[480px]:flex-row min-[480px]:items-center">
          <Button type="button" variant="surface" size="sm" className="w-full min-[480px]:w-auto" onClick={onVerDetalhes}>
            <Icon icon={Eye} size="sm" aria-hidden />
            Ver detalhes
          </Button>
          {podeProposta ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full min-[480px]:w-auto"
              disabled={idsProposta.length === 0}
              onClick={() => onFazerProposta(idsProposta)}
            >
              <Icon icon={Handshake} size="sm" aria-hidden />
              Fazer proposta
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}