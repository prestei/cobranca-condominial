import { DesignSystemShowcase } from "@/design-system/showcase-layout";

const typeScale = [
  { token: "headline-xl", className: "text-headline-xl", sample: "Cobrança condominial" },
  { token: "headline-lg", className: "text-headline-lg", sample: "Visão geral" },
  { token: "headline-sm", className: "text-headline-sm", sample: "Condomínios" },
  { token: "metric", className: "text-metric tabular-nums", sample: "1.247" },
  { token: "body-lg", className: "text-body-lg", sample: "Acompanhamento das cobranças e da inadimplência." },
  { token: "body-md", className: "text-body-md", sample: "Unidades acompanhadas na carteira ativa." },
  { token: "body-sm", className: "text-body-sm", sample: "condomínios na carteira" },
  { token: "label-lg", className: "text-label-lg", sample: "Salvar atendimento" },
  { token: "label-md", className: "text-label-md", sample: "Situação" },
  { token: "label-sm", className: "text-label-sm uppercase", sample: "Notificação" },
] as const;

export function TypographyShowcase() {
  return (
    <DesignSystemShowcase id="tipografia" title="Tipografia">
      <div className="max-w-3xl overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
        <ul>
          {typeScale.map((item) => (
            <li
              key={item.token}
              className="flex flex-col gap-xs border-b border-surface-subtle px-lg py-md last:border-b-0 min-[768px]:flex-row min-[768px]:items-baseline min-[768px]:justify-between min-[768px]:gap-md"
            >
              <p className={`min-w-0 text-on-surface ${item.className}`}>{item.sample}</p>
              <p className="shrink-0 text-label-sm text-on-surface-variant uppercase">{item.token}</p>
            </li>
          ))}
        </ul>
      </div>
    </DesignSystemShowcase>
  );
}
