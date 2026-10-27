"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Handshake } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input, Textarea } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import {
  debitoEmAberto,
  formatarData,
  formatarMoeda,
  getCadastros,
  nomeUsuario,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { AcordoAcompanhamentoBlock } from "@/components/negociacoes/acordo-acompanhamento-block";
import { aplicarPropostaSalva } from "@/lib/negociacoes/sync-cliente";
import { usePermissao } from "@/hooks/use-permissao";

type Props = {
  unidadeId: number | null;
  condominioId: number | null;
  tituloUnidade?: string;
  tituloCondominio?: string;
  onClose: () => void;
  onSalvo?: () => void;
};

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  "Em análise": "secondary",
  Aceita: "success",
  Recusada: "error",
  Cancelada: "neutral",
};

export function PropostaNegociacaoSheet({
  unidadeId,
  condominioId,
  tituloUnidade,
  tituloCondominio,
  onClose,
  onSalvo,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const { pode } = usePermissao();
  const podeCriar = pode("atendimentos", "criar");
  const podeEditar = pode("atendimentos", "editar");

  const [propostas, setPropostas] = useState<PropostaNegociacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valorProposto, setValorProposto] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [debitoIds, setDebitoIds] = useState<number[]>([]);
  const [termosPorId, setTermosPorId] = useState<Record<string, string>>({});
  const [termosErroPorId, setTermosErroPorId] = useState<Record<string, string>>({});
  const [statusSalvandoId, setStatusSalvandoId] = useState<string | null>(null);

  const debitosUnidade = useMemo(() => {
    if (unidadeId === null) return [];
    return getCadastros()
      .debitos.filter((item) => item.unidadeId === unidadeId)
      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
  }, [unidadeId, propostas.length]);

  const debitosSelecionaveis = debitosUnidade.filter(debitoEmAberto);

  const carregar = useCallback(async () => {
    if (unidadeId === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/propostas?unidadeId=${unidadeId}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; propostas?: PropostaNegociacao[] };
      if (!response.ok) {
        setPropostas([]);
        toast({ variant: "error", title: "Erro ao carregar", description: payload.error });
        return;
      }
      setPropostas(payload.propostas ?? []);
    } finally {
      setLoading(false);
    }
  }, [toast, unidadeId]);

  useEffect(() => {
    if (unidadeId === null) {
      setPropostas([]);
      setValorProposto("");
      setObservacoes("");
      setDebitoIds([]);
      return;
    }
    void carregar();
  }, [carregar, unidadeId]);

  useEffect(() => {
    if (debitoIds.length === 0 && debitosSelecionaveis.length > 0) {
      setDebitoIds(debitosSelecionaveis.map((item) => item.id));
    }
  }, [debitoIds.length, debitosSelecionaveis]);

  function toggleDebito(id: number) {
    setDebitoIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (unidadeId === null || condominioId === null || !podeCriar) return;
    setSalvando(true);
    try {
      const response = await fetch("/api/propostas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominioId,
          unidadeId,
          valorProposto,
          observacoes,
          debitoIds,
        }),
      });
      const payload = (await response.json()) as { error?: string; proposta?: PropostaNegociacao };
      if (!response.ok || !payload.proposta) {
        toast({ variant: "error", title: "Não foi possível salvar", description: payload.error });
        return;
      }
      aplicarPropostaSalva(payload.proposta, "INSERT");
      toast({ variant: "success", title: "Proposta registrada" });
      setValorProposto("");
      setObservacoes("");
      setDebitoIds(debitosSelecionaveis.map((item) => item.id));
      await carregar();
      onSalvo?.();
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(proposta: PropostaNegociacao, status: string) {
    if (!podeEditar || statusSalvandoId !== null) return;
    const termosAprovados = (termosPorId[proposta.id] ?? "").trim();
    if (status === "Aceita" && !termosAprovados) {
      const mensagem = "Informe os termos aprovados do acordo antes de confirmar.";
      setTermosErroPorId((current) => ({ ...current, [proposta.id]: mensagem }));
      toast({ variant: "error", title: "Termos obrigatórios", description: mensagem });
      return;
    }
    setTermosErroPorId((current) => {
      if (!current[proposta.id]) return current;
      const next = { ...current };
      delete next[proposta.id];
      return next;
    });
    setStatusSalvandoId(proposta.id);
    try {
      const response = await fetch(`/api/propostas/${proposta.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "Aceita" ? { termosAprovados } : {}),
        }),
      });
      const payload = (await response.json()) as { error?: string; proposta?: PropostaNegociacao };
      if (!response.ok || !payload.proposta) {
        toast({ variant: "error", title: "Alteração não realizada", description: payload.error });
        return;
      }
      aplicarPropostaSalva(payload.proposta, "UPDATE");
      toast({ variant: "success", title: `Status: ${status}` });
      await carregar();
      onSalvo?.();
    } finally {
      setStatusSalvandoId(null);
    }
  }

  const aberto = unidadeId !== null && condominioId !== null;
  const titulo = tituloUnidade ?? "Unidade";
  const condominio = tituloCondominio ?? "";

  return (
    <Sheet
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent aria-labelledby={`${formId}-proposta-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Handshake} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-proposta-title`}>Proposta de negociação</SheetTitle>
              <SheetDescription>
                {condominio ? `${titulo} · ${condominio}` : titulo}
                {" — "}
                não equivale a pagamento recebido.
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody className="flex flex-col gap-lg">
          <SheetPanel>
            <h3 className="text-label-lg text-on-surface">Propostas anteriores</h3>
            {loading ? (
              <p className="mt-sm text-body-sm text-on-surface-variant">Carregando…</p>
            ) : propostas.length === 0 ? (
              <p className="mt-sm text-body-sm text-on-surface-variant">Nenhuma proposta registrada.</p>
            ) : (
              <ul className="mt-sm flex flex-col gap-sm">
                {propostas.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-sm rounded-md border border-border-subtle bg-surface px-md py-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-sm">
                      <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                      <time className="text-body-sm tabular-nums text-on-surface-variant" dateTime={item.criadoEm}>
                        {formatarData(item.criadoEm)}
                      </time>
                    </div>
                    <p className="text-body-sm text-on-surface">
                      Valor proposto: <strong>{formatarMoeda(item.valorProposto)}</strong>
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      Autor: {nomeUsuario(item.usuarioId)} · Débitos {item.debitoIds.join(", ")}
                    </p>
                    {item.observacoes ? (
                      <p className="text-body-sm text-on-surface-variant">{item.observacoes}</p>
                    ) : null}
                    {item.termosAprovados ? (
                      <p className="text-body-sm text-on-surface">
                        <span className="text-on-surface-variant">Termos aprovados: </span>
                        {item.termosAprovados}
                      </p>
                    ) : null}
                    {item.status === "Aceita" ? (
                      <AcordoAcompanhamentoBlock
                        propostaId={item.id}
                        podeRegistrar={podeCriar}
                        podeCorrigir={podeEditar}
                        onChanged={() => {
                          onSalvo?.();
                        }}
                      />
                    ) : null}
                    {item.status === "Em análise" && podeEditar ? (
                      <div className="flex flex-col gap-sm border-t border-border-subtle pt-sm">
                        <FormField
                          label="Termos do acordo (obrigatório ao aceitar)"
                          error={termosErroPorId[item.id]}
                          required
                        >
                          <Textarea
                            value={termosPorId[item.id] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setTermosPorId((current) => ({ ...current, [item.id]: value }));
                              if (value.trim()) {
                                setTermosErroPorId((current) => {
                                  if (!current[item.id]) return current;
                                  const next = { ...current };
                                  delete next[item.id];
                                  return next;
                                });
                              }
                            }}
                            rows={2}
                            placeholder="Descreva o que foi aprovado (sem parcelas automáticas)."
                            aria-invalid={termosErroPorId[item.id] ? true : undefined}
                          />
                        </FormField>
                        <div className="flex flex-wrap gap-sm">
                          <Button
                            type="button"
                            size="sm"
                            disabled={statusSalvandoId === item.id || !(termosPorId[item.id] ?? "").trim()}
                            onClick={() => void alterarStatus(item, "Aceita")}
                          >
                            {statusSalvandoId === item.id ? "Salvando…" : "Confirmar acordo"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={statusSalvandoId === item.id}
                            onClick={() => void alterarStatus(item, "Recusada")}
                          >
                            Recusar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={statusSalvandoId === item.id}
                            onClick={() => void alterarStatus(item, "Cancelada")}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SheetPanel>

          {podeCriar ? (
            <SheetForm onSubmit={(event) => void handleSubmit(event)}>
              <SheetPanel className="flex flex-col gap-md">
                <h3 className="text-label-lg text-on-surface">Nova proposta</h3>
                <FormField label="Valor proposto (R$)" required>
                  <Input
                    value={valorProposto}
                    onChange={(event) => setValorProposto(event.target.value)}
                    inputMode="decimal"
                    placeholder="Ex.: 1200,00"
                    required
                  />
                </FormField>
                <FormField label="Observações">
                  <Textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    rows={3}
                    placeholder="Contexto da tratativa com o condômino."
                  />
                </FormField>
                <fieldset className="flex flex-col gap-xs">
                  <legend className="text-label-md text-on-surface">Débitos vinculados</legend>
                  {debitosSelecionaveis.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">
                      Não há débitos em aberto nesta unidade. A proposta exige ao menos um débito pertinente.
                    </p>
                  ) : (
                    debitosSelecionaveis.map((debito) => (
                      <label key={debito.id} className="flex cursor-pointer items-start gap-sm text-body-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={debitoIds.includes(debito.id)}
                          onChange={() => toggleDebito(debito.id)}
                        />
                        <span>
                          {debito.referencia} · {debito.descricao} · {formatarMoeda(debito.valorAtualizado)} · venc.{" "}
                          {formatarData(debito.dataVencimento)}
                        </span>
                      </label>
                    ))
                  )}
                </fieldset>
              </SheetPanel>
              <SheetFooterForm onClose={onClose} saveLabel={salvando ? "Salvando…" : "Registrar proposta"} saveDisabled={salvando || debitosSelecionaveis.length === 0 || debitoIds.length === 0} />
            </SheetForm>
          ) : (
            <p className="text-body-sm text-on-surface-variant">Sem permissão para registrar novas propostas.</p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
