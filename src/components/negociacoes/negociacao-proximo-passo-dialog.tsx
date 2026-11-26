"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Handshake, Loader2 } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { FormField, Select, Textarea } from "@/components/input";
import { useToast } from "@/components/toast";
import { formatarMoeda, type PropostaNegociacao } from "@/data/catalogo";
import type { AcaoProximoPassoNegociacao, DestinoAnaliseNegociacao } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { rotuloAcaoProximoPassoNegociacao } from "@/lib/negociacoes/next-step-decision-labels";
import type { NegociacaoProximoPassoResumo } from "@/lib/negociacoes/next-step-decision";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: PropostaNegociacao | null;
  tituloUnidade?: string;
  tituloCondominio?: string;
  onConcluido?: () => void;
};

const opcoesAcao: Array<{ id: AcaoProximoPassoNegociacao; descricao: string }> = [
  {
    id: "forward_negotiation_queue",
    descricao: "Retira da sua fila e encaminha para acompanhamento em Negociações.",
  },
  {
    id: "continue_service",
    descricao: "Mantém na sua carteira para novos contatos e retornos.",
  },
  {
    id: "forward_analysis",
    descricao: "Envia para análise da gestão ou do advogado responsável.",
  },
];

export function NegociacaoProximoPassoDialog({
  open,
  onOpenChange,
  proposta,
  tituloUnidade,
  tituloCondominio,
  onConcluido,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const podeJuridico = pode("juridico", "criar");

  const [etapa, setEtapa] = useState<"escolha" | "confirmacao">("escolha");
  const [acao, setAcao] = useState<AcaoProximoPassoNegociacao>("continue_service");
  const [destinoAnalise, setDestinoAnalise] = useState<DestinoAnaliseNegociacao>("lawyer_negotiation");
  const [advogadoResponsavel, setAdvogadoResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [resumo, setResumo] = useState<NegociacaoProximoPassoResumo | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const condominio = useMemo(() => {
    if (!proposta) return undefined;
    return cadastros.condominios.find((item) => item.id === proposta.condominioId);
  }, [cadastros.condominios, proposta]);

  const advogadosOpcoes = condominio?.advogados ?? [];

  useEffect(() => {
    if (!open) {
      setEtapa("escolha");
      setAcao("continue_service");
      setDestinoAnalise("lawyer_negotiation");
      setAdvogadoResponsavel("");
      setObservacoes("");
      setResumo(null);
      setIdempotencyKey("");
      return;
    }
    setIdempotencyKey(crypto.randomUUID());
    if (advogadosOpcoes.length > 0 && !advogadoResponsavel) {
      setAdvogadoResponsavel(advogadosOpcoes[0] ?? "");
    }
  }, [open, advogadosOpcoes, advogadoResponsavel]);

  async function avancarParaConfirmacao() {
    if (!proposta) return;
    if (acao === "forward_analysis" && destinoAnalise === "juridico" && !podeJuridico) {
      toast({
        variant: "error",
        title: "Sem permissão",
        description: "Você não pode encaminhar para análise jurídica.",
      });
      return;
    }
    if (acao === "forward_analysis" && destinoAnalise === "juridico" && !advogadoResponsavel.trim()) {
      toast({ variant: "error", title: "Advogado obrigatório", description: "Informe o advogado responsável." });
      return;
    }
    setCarregandoResumo(true);
    try {
      const params = new URLSearchParams({ acao });
      if (acao === "forward_analysis") {
        params.set("destinoAnalise", destinoAnalise);
        if (destinoAnalise === "juridico") {
          params.set("advogadoResponsavel", advogadoResponsavel);
        }
      }
      const response = await fetch(`/api/propostas/${proposta.id}/proximo-passo?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; resumo?: NegociacaoProximoPassoResumo };
      if (!response.ok || !payload.resumo) {
        toast({ variant: "error", title: "Não foi possível continuar", description: payload.error });
        return;
      }
      setResumo(payload.resumo);
      setEtapa("confirmacao");
    } finally {
      setCarregandoResumo(false);
    }
  }

  async function confirmar() {
    if (!proposta || !idempotencyKey) return;
    setConfirmando(true);
    try {
      const response = await fetch(`/api/propostas/${proposta.id}/proximo-passo`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao,
          confirmado: true,
          idempotencyKey,
          observacoes,
          ...(acao === "forward_analysis"
            ? {
                destinoAnalise,
                advogadoResponsavel: destinoAnalise === "juridico" ? advogadoResponsavel : undefined,
                resumoContexto: `Proposta ${proposta.id}`,
              }
            : {}),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível confirmar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Próximo passo registrado" });
      onOpenChange(false);
      onConcluido?.();
    } finally {
      setConfirmando(false);
    }
  }

  const tituloUnidadeExibicao = tituloUnidade ?? "Unidade";
  const tituloCondominioExibicao = tituloCondominio ?? condominio?.nome ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-md p-lg">
        <DialogHeader>
          <DialogTitle id={`${formId}-titulo`}>
            {etapa === "escolha" ? "Próximo passo após a negociação" : "Confirmar próximo passo"}
          </DialogTitle>
          <DialogDescription>
            {tituloCondominioExibicao
              ? `${tituloUnidadeExibicao} · ${tituloCondominioExibicao}`
              : tituloUnidadeExibicao}
            {proposta ? ` — valor ${formatarMoeda(proposta.valorProposto)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {etapa === "escolha" ? (
          <div className="flex flex-col gap-md">
            <p className="text-body-sm text-on-surface-variant">
              Escolha o que acontece com este atendimento. O histórico será preservado.
            </p>
            <fieldset className="flex flex-col gap-sm border-0 p-0">
              <legend className="sr-only">Opções de próximo passo</legend>
              {opcoesAcao.map((opcao) => {
                const selecionado = acao === opcao.id;
                return (
                  <label
                    key={opcao.id}
                    className={[
                      "flex cursor-pointer gap-sm rounded-lg border px-md py-sm",
                      selecionado ? "border-primary bg-primary/5" : "border-border-subtle bg-surface",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={`${formId}-acao`}
                      className="mt-1 shrink-0"
                      checked={selecionado}
                      onChange={() => setAcao(opcao.id)}
                    />
                    <span className="flex min-w-0 flex-col gap-xs">
                      <span className="text-label-md text-on-surface">{rotuloAcaoProximoPassoNegociacao(opcao.id)}</span>
                      <span className="text-body-sm text-on-surface-variant">{opcao.descricao}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {acao === "forward_analysis" ? (
              <div className="flex flex-col gap-sm border-t border-border-subtle pt-md">
                <FormField label="Destino da análise" required>
                  <Select
                    value={destinoAnalise}
                    onChange={(event) =>
                      setDestinoAnalise(event.target.value as DestinoAnaliseNegociacao)
                    }
                  >
                    <option value="lawyer_negotiation">Advogado responsável pela negociação</option>
                    {podeJuridico ? <option value="juridico">Encaminhamento jurídico</option> : null}
                  </Select>
                </FormField>
                {destinoAnalise === "juridico" && podeJuridico ? (
                  <FormField label="Advogado responsável" required>
                    <Select
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
                ) : null}
              </div>
            ) : null}

            <FormField label="Observações (opcional)">
              <Textarea
                icon={Handshake}
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                rows={2}
                placeholder="Contexto para quem receber o caso."
              />
            </FormField>
          </div>
        ) : (
          <div className="flex flex-col gap-sm rounded-lg border border-border-subtle bg-surface-subtle px-md py-md">
            <ResumoLinha rotulo="Unidade" valor={resumo?.unidadeIdentificacao ?? "—"} />
            <ResumoLinha rotulo="Condomínio" valor={resumo?.condominioNome ?? "—"} />
            <ResumoLinha rotulo="Valor negociado" valor={resumo ? formatarMoeda(resumo.valorNegociado) : "—"} />
            <ResumoLinha rotulo="Atendente (RE)" valor={resumo?.atendenteRe ?? "—"} />
            <ResumoLinha rotulo="Ação" valor={resumo?.acaoRotulo ?? "—"} />
            <ResumoLinha rotulo="Destino" valor={resumo?.destino ?? "—"} destaque />
          </div>
        )}

        <DialogFooter className="flex flex-wrap justify-end gap-sm">
          {etapa === "confirmacao" ? (
            <Button type="button" variant="secondary" onClick={() => setEtapa("escolha")} disabled={confirmando}>
              Voltar
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={carregandoResumo}>
              Mais tarde
            </Button>
          )}
          {etapa === "escolha" ? (
            <Button type="button" onClick={() => void avancarParaConfirmacao()} disabled={carregandoResumo || !proposta}>
              {carregandoResumo ? (
                <>
                  <Icon icon={Loader2} size="sm" className="animate-spin" />
                  Carregando…
                </>
              ) : (
                <>
                  Revisar
                  <Icon icon={ArrowRight} size="sm" />
                </>
              )}
            </Button>
          ) : (
            <Button type="button" onClick={() => void confirmar()} disabled={confirmando}>
              {confirmando ? "Confirmando…" : "Confirmar encaminhamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumoLinha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <p className={destaque ? "text-label-md text-on-surface" : "text-body-sm"}>
      <span className="text-on-surface-variant">{rotulo}: </span>
      <span className={destaque ? "font-medium" : ""}>{valor}</span>
    </p>
  );
}