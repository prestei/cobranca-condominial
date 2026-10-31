"use client";

import { Eye, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { listarModulosPermitidos, parsePermissoesJson, resumoPermissoes } from "@/lib/permissions/parse";

type ResumoPermissoesCargoProps = {
  permissaoJson: string;
  /** `badges`: tags compactas (legado). `painel`: bloco da listagem de cargos. */
  variant?: "badges" | "painel";
  onVerPermissoes?: () => void;
};

function rotuloQuantidadeAreas(quantidade: number) {
  if (quantidade === 1) return "1 área";
  return `${quantidade} áreas`;
}

export function ResumoPermissoesCargo({
  permissaoJson,
  variant = "painel",
  onVerPermissoes,
}: ResumoPermissoesCargoProps) {
  const permissoes = parsePermissoesJson(permissaoJson);
  const modulos = listarModulosPermitidos(permissoes);

  if (modulos.length === 0) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const detalhe = resumoPermissoes(permissoes);
  const rotulos = modulos.map((item) => item.label).join(" • ");

  if (variant === "badges") {
    return (
      <div className="flex flex-wrap gap-xs" title={detalhe}>
        {modulos.map((item) => (
          <Badge key={item.modulo} variant="primary" className="font-normal">
            {item.label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 items-stretch overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card"
      title={detalhe}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-xs px-md py-sm min-[768px]:py-md">
        <div className="flex items-center gap-sm">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/50 text-primary-container"
            aria-hidden
          >
            <Icon icon={LayoutGrid} size="sm" className="text-primary-container" />
          </span>
          <span className="text-label-md font-semibold tabular-nums text-primary-container">
            {rotuloQuantidadeAreas(modulos.length)}
          </span>
        </div>
        <p className="text-body-sm leading-snug text-on-surface-variant">{rotulos}</p>
      </div>
      {onVerPermissoes ? (
        <div className="flex shrink-0 items-center border-l border-border-subtle px-sm min-[768px]:px-md">
          <button
            type="button"
            onClick={onVerPermissoes}
            className="inline-flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full bg-primary-fixed/45 px-sm py-sm text-label-sm font-medium text-primary-container transition-colors hover:bg-primary-fixed/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass min-[768px]:min-h-[3.25rem] min-[768px]:flex-row min-[768px]:gap-xs min-[768px]:px-md min-[768px]:py-sm"
          >
            <Icon icon={Eye} size="sm" aria-hidden />
            <span className="max-w-[4.75rem] text-center leading-tight min-[768px]:max-w-none">Ver permissões</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
