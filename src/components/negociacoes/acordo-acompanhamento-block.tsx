"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { FormField, Input, Select } from "@/components/input";
import { useToast } from "@/components/toast";
import {
  confirmacaoPagamentoAcordo,
  formatarData,
  formatarMoeda,
  type PagamentoAcordo,
} from "@/data/catalogo";
import { aplicarPagamentoSalvo, aplicarParcelasSalvas } from "@/lib/acordos/sync-cliente";
import type { ResumoAcordo } from "@/lib/acordos/resumo";

type Props = {
  propostaId: string;
  podeRegistrar: boolean;
  podeCorrigir: boolean;
  onChanged?: () => void;
};

const badgeParcela: Record<string, "success" | "secondary" | "error"> = {
  Prevista: "secondary",
  Vencida: "error",
  Quitada: "success",
};

export function AcordoAcompanhamentoBlock({ propostaId, podeRegistrar, podeCorrigir, onChanged }: Props) {
  const formId = useId();
  const { toast } = useToast();
  const [resumo, setResumo] = useState<ResumoAcordo | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novaNumero, setNovaNumero] = useState("1");
  const [novaValor, setNovaValor] = useState("");
  const [novaVencimento, setNovaVencimento] = useState("");

  const [parcelaPagamentoId, setParcelaPagamentoId] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [referenciaPagamento, setReferenciaPagamento] = useState("");
  const [confirmacaoPagamento, setConfirmacaoPagamento] = useState<string>("Informado");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/propostas/${propostaId}/parcelas`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; resumo?: ResumoAcordo };
      if (!response.ok || !payload.resumo) {
        setResumo(null);
        toast({ variant: "error", title: "Acordo", description: payload.error ?? "Erro ao carregar parcelas." });
        return;
      }
      setResumo(payload.resumo);
      if (!parcelaPagamentoId && payload.resumo.parcelas.length > 0) {
        setParcelaPagamentoId(payload.resumo.parcelas[0]?.id ?? "");
      }
      const proximoNumero = payload.resumo.parcelas.reduce((max, item) => Math.max(max, item.numero), 0) + 1;
      setNovaNumero(String(proximoNumero));
    } finally {
      setLoading(false);
    }
  }, [propostaId, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function registrarParcela() {
    if (!podeRegistrar) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/propostas/${propostaId}/parcelas`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcelas: [{ numero: Number(novaNumero), valorPrevisto: novaValor, vencimentoEm: novaVencimento }],
        }),
      });
      const payload = (await response.json()) as { error?: string; parcelas?: ResumoAcordo["parcelas"]; resumo?: ResumoAcordo };
      if (!response.ok || !payload.resumo) {
        toast({ variant: "error", title: "Parcela", description: payload.error });
        return;
      }
      if (payload.parcelas) aplicarParcelasSalvas(propostaId, payload.parcelas);
      setResumo(payload.resumo);
      setNovaValor("");
      setNovaVencimento("");
      toast({ variant: "success", title: "Parcela registrada" });
      onChanged?.();
    } finally {
      setSalvando(false);
    }
  }

  async function registrarPagamento() {
    if (!podeRegistrar || !parcelaPagamentoId) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/propostas/${propostaId}/pagamentos`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcelaId: parcelaPagamentoId,
          valor: valorPagamento,
          dataPagamento,
          referenciaComprovante: referenciaPagamento,
          confirmacao: confirmacaoPagamento,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        pagamento?: PagamentoAcordo;
        resumo?: ResumoAcordo;
      };
      if (!response.ok || !payload.resumo) {
        toast({ variant: "error", title: "Pagamento", description: payload.error });
        return;
      }
      if (payload.pagamento) aplicarPagamentoSalvo(payload.pagamento, "INSERT");
      setResumo(payload.resumo);
      setValorPagamento("");
      setReferenciaPagamento("");
      toast({ variant: "success", title: "Pagamento registrado" });
      onChanged?.();
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p className="text-body-sm text-on-surface-variant">Carregando parcelas do acordo…</p>;
  }

  if (!resumo) {
    return null;
  }

  return (
    <div className="flex flex-col gap-md border-t border-border-subtle pt-sm">
      <div className="flex flex-wrap items-center gap-sm">
        <h4 className="text-label-md text-on-surface">Acompanhamento do acordo</h4>
        {resumo.potencialDescumprimento ? (
          <Badge variant="error">Potencial descumprimento</Badge>
        ) : (
          <Badge variant="secondary">Em acompanhamento</Badge>
        )}
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Valores previstos não equivalem a recebimento. Saldo usa apenas pagamentos{" "}
        <strong>Confirmados</strong> (regra de saldo oficial pendente).
      </p>
      <dl className="grid grid-cols-2 gap-sm text-body-sm sm:grid-cols-4">
        <div>
          <dt className="text-on-surface-variant">Acordado</dt>
          <dd className="font-medium tabular-nums">{formatarMoeda(resumo.valorAcordado)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Pago (confirmado)</dt>
          <dd className="font-medium tabular-nums">{formatarMoeda(resumo.valorPagoConfirmado)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Pago (informado)</dt>
          <dd className="font-medium tabular-nums">{formatarMoeda(resumo.valorPagoInformado)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Saldo (confirmado)</dt>
          <dd className="font-medium tabular-nums">{formatarMoeda(resumo.saldoRestante)}</dd>
        </div>
      </dl>

      {resumo.parcelas.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nenhuma parcela definida. Registre o cronograma acordado.</p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {resumo.parcelas.map((parcela) => (
            <li
              key={parcela.id}
              className="flex flex-wrap items-center justify-between gap-sm rounded-sm bg-surface-container px-sm py-xs text-body-sm"
            >
              <span>
                Parcela {parcela.numero} · venc. {formatarData(parcela.vencimentoEm)} ·{" "}
                {formatarMoeda(parcela.valorPrevisto)}
              </span>
              <span className="flex items-center gap-sm">
                <Badge variant={badgeParcela[parcela.status] ?? "secondary"}>{parcela.status}</Badge>
                <span className="text-on-surface-variant tabular-nums">
                  conf. {formatarMoeda(parcela.valorPagoConfirmado)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {podeRegistrar ? (
        <div className="flex flex-col gap-sm rounded-md border border-border-subtle bg-surface px-md py-sm">
          <p className="text-label-sm text-on-surface">Nova parcela (prevista)</p>
          <div className="grid gap-sm sm:grid-cols-3">
            <FormField label="Nº">
              <Input
                id={`${formId}-numero`}
                value={novaNumero}
                onChange={(event) => setNovaNumero(event.target.value)}
                inputMode="numeric"
              />
            </FormField>
            <FormField label="Valor (R$)">
              <Input
                value={novaValor}
                onChange={(event) => setNovaValor(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Vencimento">
              <Input
                type="date"
                value={novaVencimento}
                onChange={(event) => setNovaVencimento(event.target.value)}
              />
            </FormField>
          </div>
          <Button type="button" size="sm" disabled={salvando} onClick={() => void registrarParcela()}>
            Adicionar parcela
          </Button>
        </div>
      ) : null}

      {podeRegistrar && resumo.parcelas.length > 0 ? (
        <div className="flex flex-col gap-sm rounded-md border border-border-subtle bg-surface px-md py-sm">
          <p className="text-label-sm text-on-surface">Registrar pagamento</p>
          <FormField label="Parcela">
            <Select
              value={parcelaPagamentoId}
              onChange={(event) => setParcelaPagamentoId(event.target.value)}
            >
              {resumo.parcelas.map((parcela) => (
                <option key={parcela.id} value={parcela.id}>
                  {parcela.numero} — {formatarMoeda(parcela.valorPrevisto)} — venc.{" "}
                  {formatarData(parcela.vencimentoEm)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid gap-sm sm:grid-cols-2">
            <FormField label="Valor (R$)">
              <Input
                value={valorPagamento}
                onChange={(event) => setValorPagamento(event.target.value)}
                inputMode="decimal"
              />
            </FormField>
            <FormField label="Data">
              <Input type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} />
            </FormField>
          </div>
          <FormField label="Referência / comprovante">
            <Input
              value={referenciaPagamento}
              onChange={(event) => setReferenciaPagamento(event.target.value)}
              placeholder="Opcional"
            />
          </FormField>
          <FormField label="Confirmação">
            <Select
              value={confirmacaoPagamento}
              onChange={(event) => setConfirmacaoPagamento(event.target.value)}
            >
              {confirmacaoPagamentoAcordo.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FormField>
          <Button type="button" size="sm" disabled={salvando} onClick={() => void registrarPagamento()}>
            Registrar pagamento
          </Button>
        </div>
      ) : null}

      {podeCorrigir ? (
        <p className="text-body-sm text-on-surface-variant">
          Correções administrativas de parcelas e pagamentos: use a API PATCH ou o módulo de auditoria (valores
          anteriores preservados no log).
        </p>
      ) : null}
    </div>
  );
}
