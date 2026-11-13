"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { FormField, Input, Textarea } from "@/components/input";
import { SkeletonCardList } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { formatarData, type PropostaNegociacao } from "@/data/catalogo";
import { AcordoAcompanhamentoBlock } from "@/components/negociacoes/acordo-acompanhamento-block";
import { PropostaDetalheResumo } from "@/components/negociacoes/proposta-detalhe-resumo";
import { useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import type { PropostaNegociacaoDetalhe } from "@/lib/negociacoes/detalhe";

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  "Em análise": "secondary",
  Aceita: "success",
  Recusada: "error",
  Cancelada: "neutral",
};

type Props = {
  propostaId: string | null;
  /** Quando false, não dispara fetch (ex.: sheet fechado). */
  ativo?: boolean;
  onChanged?: () => void;
  className?: string;
};

export function PropostaNegociacaoDetalheConteudo({
  propostaId,
  ativo = true,
  onChanged,
  className,
}: Props) {
  const { toast } = useToast();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const podeEditar = pode("atendimentos", "editar") || pode("negociacoes", "editar");

  const [detalhe, setDetalhe] = useState<PropostaNegociacaoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [termos, setTermos] = useState("");
  const [termosErro, setTermosErro] = useState("");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [statusSalvando, setStatusSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!propostaId) {
      setDetalhe(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/propostas/${propostaId}`, { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        detalhe?: PropostaNegociacaoDetalhe;
        proposta?: PropostaNegociacao;
      };
      if (!response.ok || !payload.detalhe) {
        setDetalhe(null);
        toast({ variant: "error", title: "Proposta", description: payload.error ?? "Erro ao carregar." });
        return;
      }
      setDetalhe(payload.detalhe);
      setTermos("");
      setTermosErro("");
      setPrimeiroVencimento("");
    } finally {
      setLoading(false);
    }
  }, [propostaId, toast]);

  useEffect(() => {
    if (!ativo) {
      setDetalhe(null);
      return;
    }
    if (propostaId) void carregar();
    else setDetalhe(null);
  }, [ativo, propostaId, carregar]);

  async function alterarStatus(status: string) {
    if (!detalhe || !podeEditar) return;
    const termosAprovados = termos.trim();
    if (status === "Aceita" && !termosAprovados) {
      setTermosErro("Informe os termos aprovados do acordo.");
      return;
    }
    setTermosErro("");
    setStatusSalvando(true);
    try {
      const response = await fetch(`/api/propostas/${detalhe.proposta.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          termosAprovados: status === "Aceita" ? termosAprovados : undefined,
          primeiroVencimento: status === "Aceita" ? primeiroVencimento.trim() || undefined : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; proposta?: PropostaNegociacao };
      if (!response.ok || !payload.proposta) {
        toast({ variant: "error", title: "Status", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Proposta atualizada" });
      void refetch();
      onChanged?.();
      await carregar();
    } finally {
      setStatusSalvando(false);
    }
  }

  if (!ativo || !propostaId) {
    return null;
  }

  if (loading) {
    return (
      <div className={className}>
        <SkeletonCardList rows={4} label="Carregando proposta" />
      </div>
    );
  }

  const proposta = detalhe?.proposta;
  if (!detalhe || !proposta) {
    return (
      <p className={`text-body-sm text-on-surface-variant ${className ?? ""}`}>
        Proposta não encontrada ou fora do seu escopo.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <Badge variant={badgeStatus[proposta.status] ?? "secondary"}>{proposta.status}</Badge>
          <time className="text-body-sm tabular-nums text-on-surface-variant" dateTime={proposta.criadoEm}>
            Criada em {formatarData(proposta.criadoEm)}
          </time>
        </div>
        <PropostaDetalheResumo
          proposta={proposta}
          condominioNome={detalhe.condominioNome}
          unidadeIdentificacao={detalhe.unidadeIdentificacao}
          devedorNome={detalhe.devedorNome}
          descontoConcedido={detalhe.descontoConcedido}
          descontoPercent={detalhe.descontoPercent}
          valorParcelaIndicativo={detalhe.valorParcelaIndicativo}
        />
        {proposta.observacoes ? (
          <p className="rounded-md border border-border-subtle bg-surface-subtle px-md py-sm text-body-sm text-on-surface-variant">
            {proposta.observacoes}
          </p>
        ) : null}
        {proposta.termosAprovados ? (
          <p className="rounded-md border border-primary-container/25 bg-primary-fixed/20 px-md py-sm text-body-sm text-on-surface">
            <span className="font-medium text-on-surface-variant">Termos aprovados: </span>
            {proposta.termosAprovados}
          </p>
        ) : null}
        {proposta.status === "Aceita" ? (
          <AcordoAcompanhamentoBlock
            propostaId={proposta.id}
            podeRegistrar={pode("atendimentos", "criar") || pode("negociacoes", "criar")}
            podeCorrigir={podeEditar}
            onChanged={() => {
              void refetch();
              onChanged?.();
            }}
          />
        ) : null}
        {proposta.status === "Em análise" && podeEditar ? (
          <div className="flex flex-col gap-sm rounded-md border border-border-subtle bg-surface px-md py-md">
            <p className="text-label-md text-on-surface">Decisão do advogado / gestão</p>
            <FormField label="1º vencimento do cronograma (opcional)">
              <Input
                type="date"
                value={primeiroVencimento}
                onChange={(event) => setPrimeiroVencimento(event.target.value)}
              />
            </FormField>
            <FormField label="Termos do acordo (obrigatório ao aceitar)" error={termosErro} required>
              <Textarea
                icon={FileText}
                value={termos}
                onChange={(event) => {
                  const value = event.target.value;
                  setTermos(value);
                  if (value.trim()) setTermosErro("");
                }}
                rows={3}
                placeholder="Descreva o que foi aprovado."
                aria-invalid={termosErro ? true : undefined}
              />
            </FormField>
            <div className="flex flex-wrap gap-sm">
              <Button
                type="button"
                size="sm"
                disabled={statusSalvando || !termos.trim()}
                onClick={() => void alterarStatus("Aceita")}
              >
                {statusSalvando ? "Salvando…" : "Confirmar acordo"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={statusSalvando}
                onClick={() => void alterarStatus("Recusada")}
              >
                Recusar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={statusSalvando}
                onClick={() => void alterarStatus("Cancelada")}
              >
                Cancelar proposta
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
