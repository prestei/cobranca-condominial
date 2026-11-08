"use client";

import { Eye, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { listarModulosPermitidos, parsePermissoesJson, resumoPermissoes } from "@/lib/permissions/parse";

type ResumoPermissoesCargoProps = {
  permissaoJson: string;
  /** `badges`: tags compactas. `painel`: listagem desktop. `mobile`: card empilhado (&lt;768px). */
  variant?: "badges" | "painel" | "mobile";
  onVerPermissoes?: () => void;
  /** Indica matriz expandida na mesma página (acessibilidade e destaque do botão). */
  permissoesAbertas?: boolean;
};

function rotuloQuantidadeAreas(quantidade: number) {
  if (quantidade === 1) return "1 área";
  return `${quantidade} áreas`;
}

export function ResumoPermissoesCargo({
  permissaoJson,
  variant = "painel",
  onVerPermissoes,
  permissoesAbertas = false,
}: ResumoPermissoesCargoProps) {
  const permissoes = parsePermissoesJson(permissaoJson);
  const modulos = listarModulosPermitidos(permissoes);

  if (modulos.length === 0) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const detalhe = resumoPermissoes(permissoes);

  function listaModulosInline() {
    return (
      <p className="m-0 flex flex-wrap gap-x-1 gap-y-0.5 text-body-sm leading-relaxed text-on-surface-variant">
        {modulos.map((item, index) => (
          <span key={item.modulo} className="inline whitespace-normal">
            {index > 0 ? (
              <span aria-hidden="true" className="text-on-surface-variant/70">
                •{" "}
              </span>
            ) : null}
            {item.label}
          </span>
        ))}
      </p>
    );
  }

  if (variant === "badges") {
    return (
      <div className="flex flex-wrap gap-xs" title={detalhe}>
        {modulos.map((item) => (
          <Badge key={item.modulo} variant="primary" className="rounded-md font-normal">
            {item.label}
          </Badge>
        ))}
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div
        className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-subtle/40"
        title={detalhe}
      >
        <div className="flex items-center gap-sm px-md py-sm">
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
        <div className="border-t border-border-subtle/60 px-md py-sm">{listaModulosInline()}</div>
        {onVerPermissoes ? (
          <div className="border-t border-border-subtle/60 px-md py-sm">
            <button
              type="button"
              onClick={onVerPermissoes}
              aria-expanded={permissoesAbertas}
              className={[
                "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-sm rounded-lg px-md py-sm text-label-md font-medium text-primary-container transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
                permissoesAbertas ? "bg-primary-fixed/70" : "bg-primary-fixed/45 hover:bg-primary-fixed/60",
              ].join(" ")}
            >
              <Icon icon={Eye} size="sm" aria-hidden />
              Ver permissões
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 w-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card"
      title={detalhe}
    >
      <div className="flex min-w-0 flex-col justify-center gap-xs px-md py-sm min-[768px]:py-md">
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
        {listaModulosInline()}
      </div>
      {onVerPermissoes ? (
        <div className="border-t border-border-subtle px-md py-sm">
          <button
            type="button"
            onClick={onVerPermissoes}
            aria-expanded={permissoesAbertas}
            className={[
              "inline-flex min-h-9 w-full cursor-pointer items-center justify-center gap-sm rounded-lg px-md py-sm text-label-md font-medium text-primary-container transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
              permissoesAbertas ? "bg-primary-fixed/70" : "bg-primary-fixed/45 hover:bg-primary-fixed/60",
            ].join(" ")}
          >
            <Icon icon={Eye} size="sm" aria-hidden />
            Ver permissões
          </button>
        </div>
      ) : null}
    </div>
  );
}
