"use client";

import { useEffect, useState } from "react";
import { FileUp } from "lucide-react";
import { Icon } from "@/components/icon";

const LABEL_POR_ETAPA = [
  "Validando arquivo",
  "Preparando conferência",
  "Finalizando",
] as const;

type Props = {
  step?: number;
  label?: string;
  className?: string;
};

function progressoSimulado(elapsedMs: number) {
  // Sobe rápido no início e desacelera perto de 95% enquanto a requisição roda.
  return Math.min(95, 95 * (1 - Math.exp(-elapsedMs / 1400)));
}

export function ImportacaoWizardLoading({ step = 0, label, className }: Props) {
  const rotulo =
    label?.trim() ||
    LABEL_POR_ETAPA[Math.min(Math.max(step, 0), LABEL_POR_ETAPA.length - 1)] ||
    LABEL_POR_ETAPA[0];
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const reduzMovimento =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzMovimento) {
      setProgresso(70);
      return;
    }

    const inicio = performance.now();
    let quadro = 0;

    const atualizar = (agora: number) => {
      setProgresso(progressoSimulado(agora - inicio));
      quadro = requestAnimationFrame(atualizar);
    };

    quadro = requestAnimationFrame(atualizar);
    return () => cancelAnimationFrame(quadro);
  }, []);

  const percentual = Math.round(progresso);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`flex items-center justify-center bg-surface-card/90 px-md py-xl backdrop-blur-[2px] ${className ?? ""}`}
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-lg">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary-container">
          <Icon icon={FileUp} size="md" />
        </div>

        <div className="flex flex-col items-center gap-xs text-center">
          <p className="text-metric tabular-nums text-primary-container">{percentual}%</p>
          <p className="text-label-lg text-on-surface">{rotulo}</p>
          <span className="sr-only">
            {rotulo}: {percentual} por cento
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentual}
          aria-label={rotulo}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-container to-brass transition-[width] duration-150 ease-out"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>
    </div>
  );
}
