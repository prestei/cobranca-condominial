"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Flag, FileText, Scale, UserRound } from "lucide-react";
import { EncaminhamentoJuridicoDocumentosTab } from "@/components/juridico/encaminhamento-juridico-documentos-tab";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Switch, Textarea } from "@/components/input";
import { SkeletonCardList } from "@/components/skeleton";
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
  SheetHelpText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import {
  debitoEmAberto,
  formatarData,
  formatarMoeda,
  statusEncaminhamentoJuridico,
  type EncaminhamentoJuridico,
} from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";

type Props = {
  unidadeId: number | null;
  condominioId: number | null;
  tituloUnidade?: string;
  tituloCondominio?: string;
  encaminhamentoId?: string | null;
  onClose: () => void;
  onSalvo?: () => void;
};

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  "Aguardando aprovação": "neutral",
  Encaminhado: "secondary",
  Rejeitado: "error",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

const orientacaoPorStatus: Record<string, string> = {
  Encaminhado: "Esta demanda está aguardando sua análise para definir a próxima ação.",
  "Em análise": "Análise em andamento. Atualize o status conforme documentação e estratégia definidas.",
  "Documentação pendente": "Há pendências documentais. Registre referências internas nos documentos do caso.",
  "Aguardando decisão": "Ação jurídica definida. Execute ou atualize o acompanhamento conforme o plano.",
  "Pronto para ajuizamento": "Caso em processo. O sistema não envia automaticamente a tribunais.",
  "Retornado à cobrança amigável": "Caso devolvido à cobrança extrajudicial.",
  Arquivado: "Encaminhamento encerrado e arquivado.",
};

export function EncaminhamentoJuridicoSheet({
  unidadeId,
  condominioId,
  tituloUnidade,
  tituloCondominio,
  encaminhamentoId,
  onClose,
  onSalvo,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const podeCriar = pode("juridico", "criar");
  const podeEditar = pode("juridico", "editar");
  const podeLerDocs = pode("juridico", "ler");
  const podeAprovar = pode("usuarios", "criar");
  const ehSolicitacao = podeCriar && !podeAprovar;

  const [lista, setLista] = useState<EncaminhamentoJuridicoDetalhe[]>([]);
  const [detalhe, setDetalhe] = useState<EncaminhamentoJuridicoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [observacoes, setObservacoes] = useState("");
  const [resumoContexto, setResumoContexto] = useState("");
  const [advogadoResponsavel, setAdvogadoResponsavel] = useState("");
  const [debitoIds, setDebitoIds] = useState<number[]>([]);

  const [statusPorId, setStatusPorId] = useState<Record<string, string>>({});
  const [observacoesPorId, setObservacoesPorId] = useState<Record<string, string>>({});
  const condominio = useMemo(() => {
    if (condominioId === null) return undefined;
    return cadastros.condominios.find((item) => item.id === condominioId);
  }, [cadastros.condominios, condominioId]);

  const advogadosOpcoes = condominio?.advogados ?? [];

  const debitosUnidade = useMemo(() => {
    if (unidadeId === null) return [];
    return cadastros.debitos
      .filter((item) => item.unidadeId === unidadeId)
      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
  }, [cadastros.debitos, unidadeId]);

  const debitosSelecionaveis = useMemo(
    () => debitosUnidade.filter(debitoEmAberto),
    [debitosUnidade],
  );

  function toggleDebito(debitoId: number) {
    setDebitoIds((atual) =>
      atual.includes(debitoId) ? atual.filter((id) => id !== debitoId) : [...atual, debitoId],
    );
  }

  const carregar = useCallback(async () => {
    if (encaminhamentoId) {
      setLoading(true);
      try {
        const response = await fetch(`/api/juridico/encaminhamentos/${encaminhamentoId}`, {
          credentials: "same-origin",
        });
        const payload = (await response.json()) as { error?: string; encaminhamento?: EncaminhamentoJuridicoDetalhe };
        if (!response.ok) {
          setDetalhe(null);
          toast({ variant: "error", title: "Erro ao carregar", description: payload.error });
          return;
        }
        setDetalhe(payload.encaminhamento ?? null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (unidadeId === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/juridico/encaminhamentos?unidadeId=${unidadeId}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; encaminhamentos?: EncaminhamentoJuridicoDetalhe[] };
      if (!response.ok) {
        setLista([]);
        toast({ variant: "error", title: "Erro ao carregar", description: payload.error });
        return;
      }
      setLista(payload.encaminhamentos ?? []);
    } finally {
      setLoading(false);
    }
  }, [encaminhamentoId, toast, unidadeId]);

  useEffect(() => {
    if (encaminhamentoId) {
      void carregar();
      return;
    }
    if (unidadeId === null) {
      setLista([]);
      setDetalhe(null);
      return;
    }
    if (condominio?.advogados[0]) {
      setAdvogadoResponsavel(condominio.advogados[0]);
    }
    void carregar();
  }, [carregar, condominio?.advogados, encaminhamentoId, unidadeId]);

  useEffect(() => {
    if (unidadeId === null || encaminhamentoId) return;
    const proximosIds = debitosSelecionaveis.map((item) => item.id);
    setDebitoIds((atual) => {
      if (
        atual.length === proximosIds.length &&
        atual.every((id, indice) => id === proximosIds[indice])
      ) {
        return atual;
      }
      return proximosIds;
    });
  }, [debitosSelecionaveis, encaminhamentoId, unidadeId]);

  const aberto = encaminhamentoId ? true : unidadeId !== null;
  const titulo = tituloUnidade ?? "Unidade";
  const condominioNome = tituloCondominio ?? condominio?.nome ?? "";

  async function enviarNovo(event: FormEvent) {
    event.preventDefault();
    if (condominioId === null || unidadeId === null || !podeCriar) return;
    setSalvando(true);
    try {
      const response = await fetch("/api/juridico/encaminhamentos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominioId,
          unidadeId,
          advogadoResponsavel,
          observacoes,
          resumoContexto,
          debitoIds,
        }),
      });
      const payload = (await response.json()) as { error?: string; encaminhamento?: EncaminhamentoJuridico };
      if (!response.ok) {
        toast({
          variant: "error",
          title: ehSolicitacao ? "Não foi possível solicitar" : "Não foi possível encaminhar",
          description: payload.error,
        });
        return;
      }
      toast({
        variant: "success",
        title: ehSolicitacao ? "Solicitação enviada à gestão" : "Encaminhamento registrado",
        description: ehSolicitacao
          ? "Aguarde a aprovação ou rejeição do administrador."
          : undefined,
      });
      setObservacoes("");
      setResumoContexto("");
      onSalvo?.();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatusEncaminhamento(id: string, status: string, observacoesAtual?: string) {
    if (!podeEditar && !podeAprovar) return;
    setSalvando(true);
    try {
      const obs = observacoesAtual ?? observacoesPorId[id] ?? "";
      const response = await fetch(`/api/juridico/encaminhamentos/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, observacoes: obs }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Erro ao atualizar", description: payload.error });
        return;
      }
      const titulo =
        status === "Encaminhado"
          ? "Encaminhamento aprovado"
          : status === "Rejeitado"
            ? "Solicitação rejeitada"
            : "Acompanhamento atualizado";
      toast({ variant: "success", title: titulo });
      onSalvo?.();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEncaminhamento(id: string) {
    if (!podeEditar) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/juridico/encaminhamentos/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusPorId[id],
          observacoes: observacoesPorId[id],
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Erro ao atualizar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Acompanhamento atualizado" });
      onSalvo?.();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  function renderItem(item: EncaminhamentoJuridicoDetalhe) {
    const statusAtual = statusPorId[item.id] ?? item.status;
    const obsAtual = observacoesPorId[item.id] ?? item.observacoes ?? "";
    const valorTotal = valorDebitosEncaminhamento(item, cadastros);
    const editaAcompanhamento = podeEditar && item.status !== "Aguardando aprovação";
    const exibeObservacoesSomenteLeitura =
      !editaAcompanhamento && !(podeAprovar && item.status === "Aguardando aprovação") && Boolean(item.observacoes);

    return (
      <div key={item.id} className="flex flex-col gap-lg">
        <SheetPanel className="flex flex-col gap-md">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
            <p className="text-body-sm text-on-surface-variant">
              <time className="tabular-nums" dateTime={item.encaminhadoEm}>
                {formatarData(item.encaminhadoEm)}
              </time>
              {" · "}
              Adv. {item.advogadoResponsavel}
            </p>
          </div>

          {orientacaoPorStatus[item.status] ? (
            <Alert variant="info">{orientacaoPorStatus[item.status]}</Alert>
          ) : null}

          <p className="text-body-sm text-on-surface">
            <span className="text-on-surface-variant">Total em cobrança: </span>
            <span className="font-semibold tabular-nums">{formatarMoeda(String(valorTotal))}</span>
          </p>

          {item.resumoContexto ? (
            <div>
              <p className="text-label-sm text-on-surface-variant">Contexto do encaminhamento</p>
              <p className="mt-xs break-words whitespace-pre-wrap text-body-sm text-on-surface">{item.resumoContexto}</p>
            </div>
          ) : null}

          {exibeObservacoesSomenteLeitura ? (
            <div>
              <p className="text-label-sm text-on-surface-variant">Observações registradas</p>
              <p className="mt-xs whitespace-pre-wrap text-body-sm text-on-surface-variant">{item.observacoes}</p>
            </div>
          ) : null}
        </SheetPanel>

        {podeAprovar && item.status === "Aguardando aprovação" ? (
          <div className="flex flex-col gap-md">
            <h3 className="text-label-lg text-on-surface">Decisão da gestão</h3>
            <SheetPanel className="flex flex-col gap-md">
              <FormField label="Observações da gestão">
                <Textarea
                  icon={FileText}
                  value={obsAtual}
                  onChange={(event) => setObservacoesPorId((atual) => ({ ...atual, [item.id]: event.target.value }))}
                  rows={3}
                  placeholder="Motivo da aprovação ou rejeição (opcional)."
                />
              </FormField>
              <div className="flex flex-wrap gap-sm">
                <Button
                  type="button"
                  disabled={salvando}
                  onClick={() => void atualizarStatusEncaminhamento(item.id, "Encaminhado", obsAtual)}
                >
                  Aprovar encaminhamento
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={salvando}
                  onClick={() => void atualizarStatusEncaminhamento(item.id, "Rejeitado", obsAtual)}
                >
                  Rejeitar solicitação
                </Button>
              </div>
            </SheetPanel>
          </div>
        ) : editaAcompanhamento ? (
          <div className="flex flex-col gap-md">
            <h3 className="text-label-lg text-on-surface">Definir ação</h3>
            <SheetPanel className="flex flex-col gap-md">
              <SheetHelpText>
                Atualize o status do caso e, se precisar, registre observações internas. O contexto do encaminhamento
                permanece no bloco acima.
              </SheetHelpText>
              <FormField label="Próximo status">
                <Select
                  icon={Flag}
                  value={statusAtual}
                  onChange={(event) => setStatusPorId((atual) => ({ ...atual, [item.id]: event.target.value }))}
                >
                  {statusEncaminhamentoJuridico
                    .filter((status) => status !== "Aguardando aprovação" && status !== "Rejeitado")
                    .map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField label="Observações internas">
                <Textarea
                  icon={FileText}
                  value={obsAtual}
                  onChange={(event) => setObservacoesPorId((atual) => ({ ...atual, [item.id]: event.target.value }))}
                  rows={4}
                  placeholder="Estratégia ou decisão (opcional)."
                />
              </FormField>
              <Button type="button" disabled={salvando} onClick={() => void salvarEncaminhamento(item.id)}>
                {salvando ? "Salvando…" : "Salvar ação"}
              </Button>
            </SheetPanel>
          </div>
        ) : null}

        <div className="flex flex-col gap-md">
          <h3 className="text-label-lg text-on-surface">Documentos</h3>
          {!podeLerDocs ? (
            <p className="text-body-sm text-on-surface-variant">
              Documentos disponíveis apenas para perfis com permissão jurídica.
            </p>
          ) : (
            <EncaminhamentoJuridicoDocumentosTab
              encaminhamentoId={item.id}
              documentos={item.documentos}
              podeEditar={editaAcompanhamento}
              onRegistrado={() => {
                onSalvo?.();
                void carregar();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const itens = detalhe ? [detalhe] : lista;

  return (
    <Sheet
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent aria-labelledby={`${formId}-juridico-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Scale} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-juridico-title`}>Jurídico — {titulo}</SheetTitle>
              <SheetDescription>
                {condominioNome ? `${condominioNome} — encaminhamento e acompanhamento` : "Encaminhamento jurídico"}
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        {podeCriar && !encaminhamentoId ? (
          <SheetForm id={`${formId}-novo`} className="flex min-h-0 flex-1 flex-col" onSubmit={enviarNovo}>
            <SheetBody className="flex flex-col gap-md">
              <div className="flex flex-col gap-md">
                <p className="text-label-md text-on-surface">
                  {ehSolicitacao ? "Solicitar encaminhamento jurídico" : "Novo encaminhamento"}
                </p>
                <SheetHelpText>
                  {ehSolicitacao
                    ? "Identifique o caso e envie para aprovação da gestão. O advogado só acompanha após aprovação."
                    : "Registra análise jurídica sem ajuizar ações nem enviar documentos a tribunais automaticamente."}
                </SheetHelpText>
                <div className="flex flex-col gap-md">
                  <FormField label="Advogado responsável">
                    <Select
                      icon={UserRound}
                      value={advogadoResponsavel}
                      onChange={(event) => setAdvogadoResponsavel(event.target.value)}
                    >
                      {advogadosOpcoes.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {debitosSelecionaveis.length > 0 ? (
                    <FormField label="Débitos incluídos" labelId={`${formId}-debitos`}>
                      <div
                        className="flex max-h-40 flex-col gap-xs overflow-y-auto"
                        role="group"
                        aria-labelledby={`${formId}-debitos`}
                      >
                        {debitosSelecionaveis.map((debito) => {
                          const debitoInputId = `${formId}-debito-${debito.id}`;
                          return (
                            <label
                              key={debito.id}
                              htmlFor={debitoInputId}
                              className="flex cursor-pointer items-center gap-sm py-0.5"
                            >
                              <Switch
                                id={debitoInputId}
                                className="shrink-0"
                                checked={debitoIds.includes(debito.id)}
                                onChange={() => toggleDebito(debito.id)}
                              />
                              <span className="min-w-0 flex-1 text-body-md leading-tight text-on-surface">
                                {debito.referencia} — {debito.status}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </FormField>
                  ) : null}
                  <FormField label="Contexto adicional">
                    <Textarea
                      icon={FileText}
                      value={resumoContexto}
                      onChange={(event) => setResumoContexto(event.target.value)}
                      rows={2}
                      placeholder="Histórico de contatos, proposta recusada ou motivo do encaminhamento."
                    />
                  </FormField>
                  <FormField label="Observações">
                    <Textarea
                      icon={FileText}
                      value={observacoes}
                      onChange={(event) => setObservacoes(event.target.value)}
                      rows={3}
                      placeholder="Instruções internas para o advogado (opcional)."
                    />
                  </FormField>
                </div>
              </div>
              {loading ? (
                <SkeletonCardList rows={3} label="Carregando encaminhamentos" />
              ) : itens.length > 0 ? (
                <div className="flex flex-col gap-md border-t border-border-subtle pt-md">{itens.map(renderItem)}</div>
              ) : null}
            </SheetBody>
            <SheetFooterForm
              onClose={onClose}
              saveLabel={
                salvando
                  ? ehSolicitacao
                    ? "Enviando…"
                    : "Encaminhando…"
                  : ehSolicitacao
                    ? "Enviar solicitação"
                    : "Encaminhar para análise"
              }
              saveDisabled={salvando || condominioId === null}
            />
          </SheetForm>
        ) : (
          <SheetBody className="flex flex-col gap-md">
            {loading ? (
              <SkeletonCardList rows={3} label="Carregando encaminhamentos" />
            ) : itens.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Nenhum encaminhamento registrado para esta unidade.</p>
            ) : (
              <div className="flex flex-col gap-md">{itens.map(renderItem)}</div>
            )}
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
