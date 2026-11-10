"use client";

import { useCadastrosStatus } from "@/hooks/use-cadastros";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/button";
import { FormField, Select, Switch } from "@/components/input";
import { SheetToggleRow } from "@/components/sheet";
import { useToast } from "@/components/toast";
import type { AtribuicaoCobranca } from "@/data/catalogo";
import {
  descricaoEstrategiaDistribuicaoAutomatica,
  type DistribuicaoAutomaticaEstrategia,
} from "@/lib/distribuicao/service";
import { Alert } from "@/components/alert";
import { SkeletonForm } from "@/components/skeleton";

export const ordemEstrategiasDistribuicao: DistribuicaoAutomaticaEstrategia[] = [
  "carga",
  "condominio",
  "volume",
  "rodizio",
];

export const rotuloEstrategiaDistribuicao: Record<DistribuicaoAutomaticaEstrategia, string> = {
  carga: "Carga equilibrada",
  rodizio: "Rodízio entre REs",
  condominio: "Por condomínio",
  volume: "Por volume de inadimplência",
};

type Options = {
  refreshKey?: string;
  onSalvo?: () => void;
  enabled?: boolean;
};

export function useDistribuicaoAutomaticaConfig({ refreshKey, onSalvo, enabled = true }: Options = {}) {
  const { refetch } = useCadastrosStatus();
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [ativada, setAtivada] = useState(true);
  const [estrategia, setEstrategia] = useState<DistribuicaoAutomaticaEstrategia>("carga");
  const [salvoAtivada, setSalvoAtivada] = useState(true);
  const [salvoEstrategia, setSalvoEstrategia] = useState<DistribuicaoAutomaticaEstrategia>("carga");
  const [salvando, setSalvando] = useState(false);

  const temAlteracao = useMemo(
    () => ativada !== salvoAtivada || estrategia !== salvoEstrategia,
    [ativada, estrategia, salvoAtivada, salvoEstrategia],
  );

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch("/api/distribuicao/automatica", { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        config?: { ativada: boolean; estrategia: DistribuicaoAutomaticaEstrategia };
      };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar distribuição automática.");
      const nextAtivada = payload.config?.ativada ?? false;
      const nextEstrategia = payload.config?.estrategia ?? "carga";
      setAtivada(nextAtivada);
      setEstrategia(nextEstrategia);
      setSalvoAtivada(nextAtivada);
      setSalvoEstrategia(nextEstrategia);
    } catch (error) {
      toast({
        variant: "error",
        title: "Distribuição automática",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!enabled) return;
    void recarregar();
  }, [recarregar, refreshKey, enabled]);

  async function salvar() {
    if (salvando || !temAlteracao) return;
    setSalvando(true);
    try {
      const response = await fetch("/api/distribuicao/automatica", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativada, estrategia }),
      });
      const payload = (await response.json()) as {
        error?: string;
        config?: { ativada: boolean; estrategia: DistribuicaoAutomaticaEstrategia };
      };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");

      const config = payload.config ?? { ativada, estrategia };
      setAtivada(config.ativada);
      setEstrategia(config.estrategia);
      setSalvoAtivada(config.ativada);
      setSalvoEstrategia(config.estrategia);

      let atribuidas = 0;
      if (config.ativada) {
        const execResponse = await fetch("/api/distribuicao/automatica/executar", {
          method: "POST",
          credentials: "same-origin",
        });
        const execPayload = (await execResponse.json()) as {
          error?: string;
          atribuidas?: number;
          atribuicoesCobranca?: AtribuicaoCobranca[];
        };
        if (!execResponse.ok) throw new Error(execPayload.error ?? "Falha ao distribuir automaticamente.");
        if (execPayload.atribuicoesCobranca?.length) {
          void refetch()
        }
        atribuidas = execPayload.atribuidas ?? 0;
        onSalvo?.();
      }

      toast({
        variant: "success",
        title: "Configuração salva",
        description: config.ativada
          ? atribuidas > 0
            ? `${atribuidas} cobrança(s) atribuída(s) com a regra ${rotuloEstrategiaDistribuicao[config.estrategia]}.`
            : "Novas cobranças sem RE (importação e verificação a cada 5 min) serão atribuídas conforme a regra escolhida."
          : "A distribuição automática está desativada. Importações entram na fila sem RE até atribuição manual.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Salvar",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  return {
    carregando,
    ativada,
    estrategia,
    salvando,
    temAlteracao,
    setAtivada,
    setEstrategia,
    salvar,
  };
}

type FormProps = ReturnType<typeof useDistribuicaoAutomaticaConfig> & {
  idsPrefix?: string;
  showInlineSaveButton?: boolean;
};

export function DistribuicaoAutomaticaConfigForm({
  carregando,
  ativada,
  estrategia,
  salvando,
  temAlteracao,
  setAtivada,
  setEstrategia,
  salvar,
  idsPrefix = "distribuicao-auto",
  showInlineSaveButton = false,
}: FormProps) {
  if (carregando) {
    return <SkeletonForm fields={3} label="Carregando configuração" />;
  }

  return (
    <div className="flex flex-col gap-lg">
      <SheetToggleRow
        htmlFor={`${idsPrefix}-ativada`}
        label="Distribuição automática"
        description="Ativa a atribuição automática de cobranças sem RE conforme a regra abaixo."
      >
        <Switch
          id={`${idsPrefix}-ativada`}
          checked={ativada}
          onChange={(event) => setAtivada(event.target.checked)}
        />
      </SheetToggleRow>

      <FormField label="Regra de distribuição" htmlFor={`${idsPrefix}-estrategia`}>
        <Select
          id={`${idsPrefix}-estrategia`}
          icon={Shuffle}
          value={estrategia}
          className="h-control! w-full bg-surface-card"
          disabled={!ativada}
          onChange={(event) => setEstrategia(event.target.value as DistribuicaoAutomaticaEstrategia)}
        >
          {ordemEstrategiasDistribuicao.map((key) => (
            <option key={key} value={key}>
              {rotuloEstrategiaDistribuicao[key]}
            </option>
          ))}
        </Select>
      </FormField>

      <Alert variant="info">{descricaoEstrategiaDistribuicaoAutomatica[estrategia]}</Alert>

      {showInlineSaveButton ? (
        <Button
          type="button"
          size="md"
          className="w-full"
          disabled={salvando || !temAlteracao}
          onClick={() => void salvar()}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      ) : null}
    </div>
  );
}