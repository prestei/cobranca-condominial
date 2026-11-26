import { SITUACOES_FILA_OPERACIONAL, type SituacaoFilaOperacional } from "@/lib/fila/situacao-operacional";

const estiloSituacao: Record<SituacaoFilaOperacional, string> = {
  Novo: "border border-border-subtle bg-surface-subtle text-on-surface-variant",
  "Em cobrança": "bg-secondary-fixed text-on-secondary-fixed-variant",
  "Em negociação":
    "bg-[color-mix(in_srgb,var(--color-status-settled)_16%,var(--color-surface-card))] text-status-settled",
};

type BadgeSituacaoFilaProps = {
  situacao: string;
  className?: string;
};

export function BadgeSituacaoFila({ situacao, className }: BadgeSituacaoFilaProps) {
  const label = situacao.trim() || "—";
  const canonico = SITUACOES_FILA_OPERACIONAL.includes(label as SituacaoFilaOperacional)
    ? (label as SituacaoFilaOperacional)
    : null;
  const estilo = canonico ? estiloSituacao[canonico] : estiloSituacao.Novo;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-body-sm font-medium ${estilo} ${className ?? ""}`}
    >
      {label === "Em cobrança" ? (
        <span className="size-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}