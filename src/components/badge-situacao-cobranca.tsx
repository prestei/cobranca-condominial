import { situacoesUnidade } from "@/data/catalogo";

/** Cores alinhadas à listagem de unidades / design system (fundo suave + texto contrastante). */
const estiloSituacao: Record<(typeof situacoesUnidade)[number], string> = {
  "Sem cobrança": "border border-border-subtle bg-surface-subtle text-on-surface-variant",
  "Em cobrança": "bg-secondary-fixed text-on-secondary-fixed-variant",
  "Em acordo":
    "bg-[color-mix(in_srgb,var(--color-status-settled)_16%,var(--color-surface-card))] text-status-settled",
  Notificada: "bg-primary-fixed text-on-primary-fixed-variant",
  Ajuizada: "bg-error-container text-on-error-container",
  "Unidade prescrita":
    "border border-border-subtle bg-surface-card text-on-surface-variant",
  Quitada: "bg-badge-success-subtle text-badge-success-emphasis",
};

type BadgeSituacaoCobrancaProps = {
  situacao: string;
  className?: string;
};

export function BadgeSituacaoCobranca({ situacao, className }: BadgeSituacaoCobrancaProps) {
  const label = situacao.trim() || "—";
  const estilo =
    estiloSituacao[label as (typeof situacoesUnidade)[number]] ??
    "border border-border-subtle bg-surface-subtle text-on-surface-variant";

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
