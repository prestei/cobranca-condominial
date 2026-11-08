"use client";

import { Network } from "lucide-react";
import { Icon } from "@/components/icon";
import { SkeletonForm } from "@/components/skeleton";
import {
  DistribuicaoAutomaticaConfigForm,
  rotuloEstrategiaDistribuicao,
  useDistribuicaoAutomaticaConfig,
} from "@/components/atendimentos/distribuicao-automatica-config";

export { rotuloEstrategiaDistribuicao };

type Props = {
  onSalvo?: () => void;
  refreshKey?: string;
};

/** @deprecated Preferir `DistribuicaoAutomaticaSheet` no header de Atendimentos. */
export function DistribuicaoAutomaticaPanel({ onSalvo, refreshKey }: Props) {
  const config = useDistribuicaoAutomaticaConfig({ refreshKey, onSalvo });

  if (config.carregando) {
    return (
      <section
        aria-label="Distribuição automática"
        className="rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg"
      >
        <SkeletonForm fields={3} label="Carregando distribuição automática" />
      </section>
    );
  }

  return (
    <section
      aria-label="Distribuição automática"
      className="rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg"
    >
      <div className="mb-md flex items-start gap-md">
        <Icon icon={Network} size="lg" className="mt-0.5 shrink-0 text-primary-container" />
        <div className="min-w-0 flex flex-col gap-xs">
          <h2 className="text-title-sm font-semibold text-primary-container">Distribuição automática</h2>
          <p className="text-body-sm leading-snug text-on-surface-variant">
            Defina a regra e salve para atribuir cobranças sem RE automaticamente.
          </p>
        </div>
      </div>
      <DistribuicaoAutomaticaConfigForm {...config} idsPrefix="distribuicao-auto-panel" showInlineSaveButton />
    </section>
  );
}
