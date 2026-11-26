"use client";

import { ChevronDown } from "lucide-react";
import { Icon } from "@/components/icon";
import type { FilaCobrancaItem } from "@/lib/fila/service";

type ValorProps = {
  item: FilaCobrancaItem;
  alinhamento?: "center" | "start";
};

/** Valor total e dias em atraso (sem controle de expansão). */
export function CelulaInadimplenciaExpansivel({ item, alinhamento = "center" }: ValorProps) {
  const textAlign = alinhamento === "center" ? "text-center" : "text-start";

  return (
    <div className={`min-w-0 ${textAlign}`}>
      {item.valorInadimplencia ? (
        <span className="font-semibold tabular-nums text-on-surface">{item.valorInadimplencia}</span>
      ) : (
        "—"
      )}
      {item.diasAtrasoMax > 0 ? (
        <span className={`mt-xs block text-body-sm text-on-surface-variant ${textAlign}`}>
          {item.diasAtrasoMax} dias em atraso
        </span>
      ) : null}
    </div>
  );
}

type BotaoProps = {
  expandido: boolean;
  onToggle: () => void;
  rotuloUnidade?: string;
};

/** Seta na primeira coluna da tabela para expandir débitos vinculados. */
export function BotaoExpandirDebitosFila({ expandido, onToggle, rotuloUnidade }: BotaoProps) {
  return (
    <button
      type="button"
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface"
      aria-expanded={expandido}
      aria-label={
        expandido
          ? `Recolher débitos vinculados${rotuloUnidade ? ` — ${rotuloUnidade}` : ""}`
          : `Expandir débitos vinculados${rotuloUnidade ? ` — ${rotuloUnidade}` : ""}`
      }
      onClick={onToggle}
    >
      <Icon
        icon={ChevronDown}
        size="sm"
        className={`transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}