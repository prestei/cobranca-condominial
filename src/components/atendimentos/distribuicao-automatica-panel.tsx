"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Network, UserPlus } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Select, Switch } from "@/components/input";
import { useToast } from "@/components/toast";
import { aplicarSnapshotAtribuicoes } from "@/lib/distribuicao/sync-cliente";
import type { AtribuicaoCobranca } from "@/data/catalogo";
import type { DistribuicaoAutomaticaEstrategia } from "@/lib/distribuicao/service";

const rotuloEstrategia: Record<DistribuicaoAutomaticaEstrategia, string> = {
  carga: "Distribuição equilibrada",
  rodizio: "Rodízio entre REs",
  condominio: "Por condomínio",
  volume: "Por volume de inadimplência",
};

function DivisorVertical() {
  return (
    <div
      role="presentation"
      aria-hidden
      className="hidden h-14 w-px shrink-0 bg-border-subtle min-[1024px]:block"
    />
  );
}

type Props = {
  onDistribuido?: () => void;
  refreshKey?: string;
};

export function DistribuicaoAutomaticaPanel({ onDistribuido, refreshKey }: Props) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [ativada, setAtivada] = useState(true);
  const [estrategia, setEstrategia] = useState<DistribuicaoAutomaticaEstrategia>("carga");
  const [aguardando, setAguardando] = useState(0);
  const [executando, setExecutando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch("/api/distribuicao/automatica", { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        config?: { ativada: boolean; estrategia: DistribuicaoAutomaticaEstrategia };
        aguardandoAtribuicao?: number;
      };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar distribuição automática.");
      setAtivada(payload.config?.ativada ?? false);
      setEstrategia(payload.config?.estrategia ?? "carga");
      setAguardando(payload.aguardandoAtribuicao ?? 0);
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
    void recarregar();
  }, [recarregar, refreshKey]);

  async function persistirConfig(patch: { ativada?: boolean; estrategia?: DistribuicaoAutomaticaEstrategia }) {
    const response = await fetch("/api/distribuicao/automatica", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = (await response.json()) as {
      error?: string;
      config?: { ativada: boolean; estrategia: DistribuicaoAutomaticaEstrategia };
      aguardandoAtribuicao?: number;
    };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");
    setAtivada(payload.config?.ativada ?? ativada);
    setEstrategia(payload.config?.estrategia ?? estrategia);
    setAguardando(payload.aguardandoAtribuicao ?? aguardando);
  }

  async function alternarAtivada(checked: boolean) {
    const anterior = ativada;
    setAtivada(checked);
    try {
      await persistirConfig({ ativada: checked });
    } catch (error) {
      setAtivada(anterior);
      toast({
        variant: "error",
        title: "Não foi possível alterar",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function alterarEstrategia(value: string) {
    const next = value as DistribuicaoAutomaticaEstrategia;
    const anterior = estrategia;
    setEstrategia(next);
    try {
      await persistirConfig({ estrategia: next });
    } catch (error) {
      setEstrategia(anterior);
      toast({
        variant: "error",
        title: "Não foi possível alterar a regra",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function distribuirAgora() {
    if (executando || !ativada) return;
    setExecutando(true);
    try {
      const response = await fetch("/api/distribuicao/automatica/executar", {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        error?: string;
        atribuidas?: number;
        ignoradasMesmoResponsavel?: number;
        aguardandoAtribuicao?: number;
        atribuicoesCobranca?: AtribuicaoCobranca[];
      };
      if (!response.ok) throw new Error(payload.error ?? "Falha na distribuição.");
      if (payload.atribuicoesCobranca?.length) {
        aplicarSnapshotAtribuicoes(payload.atribuicoesCobranca);
      }
      setAguardando(payload.aguardandoAtribuicao ?? 0);
      const atribuidas = payload.atribuidas ?? 0;
      toast({
        variant: "success",
        title: atribuidas > 0 ? `${atribuidas} cobrança(s) distribuída(s)` : "Nenhuma unidade pendente",
        description:
          (payload.ignoradasMesmoResponsavel ?? 0) > 0
            ? `${payload.ignoradasMesmoResponsavel} já tinham o mesmo RE.`
            : undefined,
      });
      onDistribuido?.();
      void recarregar();
    } catch (error) {
      toast({
        variant: "error",
        title: "Distribuir agora",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setExecutando(false);
    }
  }

  if (carregando) {
    return (
      <section
        aria-busy="true"
        aria-label="Distribuição automática"
        className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card"
      >
        <p className="text-body-sm text-on-surface-variant">Carregando distribuição automática…</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="distribuicao-automatica-titulo"
      className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card"
    >
      <div className="flex flex-col gap-lg min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:gap-0">
        <div className="flex min-w-0 flex-1 items-start gap-md min-[1024px]:pr-lg">
          <Icon icon={Network} size="lg" className="mt-0.5 shrink-0 text-primary-container" />
          <div className="min-w-0 flex flex-col gap-xs">
            <h2 id="distribuicao-automatica-titulo" className="text-title-sm font-semibold text-primary-container">
              Distribuição automática
            </h2>
            <p className="text-body-sm leading-snug text-on-surface-variant">
              Atribua unidades sem responsável conforme as regras de distribuição por RE.
            </p>
          </div>
        </div>

        <DivisorVertical />

        <div className="flex shrink-0 items-center min-[1024px]:px-lg">
          <label htmlFor="distribuicao-auto-switch" className="inline-flex cursor-pointer items-center gap-sm">
            <Switch
              id="distribuicao-auto-switch"
              checked={ativada}
              onChange={(event) => void alternarAtivada(event.target.checked)}
            />
            <span className="text-body-md font-medium text-primary-container">
              {ativada ? "Ativada" : "Desativada"}
            </span>
          </label>
        </div>

        <DivisorVertical />

        <div className="shrink-0 min-[1024px]:px-lg">
          <FormField label="Regra:" htmlFor="distribuicao-auto-regra" className="min-w-[13.75rem]">
            <Select
              id="distribuicao-auto-regra"
              value={estrategia}
              className="h-control! w-full bg-surface-card"
              onChange={(event) => void alterarEstrategia(event.target.value)}
            >
              {(Object.keys(rotuloEstrategia) as DistribuicaoAutomaticaEstrategia[]).map((key) => (
                <option key={key} value={key}>
                  {rotuloEstrategia[key]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <DivisorVertical />

        <div className="flex flex-wrap items-center gap-md min-[1024px]:ml-auto min-[1024px]:pl-lg">
          <p className="flex items-center gap-sm text-body-sm font-medium text-primary-container">
            <Info className="size-4 shrink-0 text-primary-container" aria-hidden />
            <span className="whitespace-nowrap">
              {aguardando} unidade{aguardando === 1 ? "" : "s"} aguardando atribuição
            </span>
          </p>
          <Button type="button" size="md" disabled={!ativada || executando} onClick={() => void distribuirAgora()}>
            <Icon icon={UserPlus} size="sm" />
            {executando ? "Distribuindo…" : "Distribuir agora"}
          </Button>
        </div>
      </div>
    </section>
  );
}
