import { Building, ShieldCheck, User } from "lucide-react";
import { DesignSystemShowcase } from "@/design-system/showcase-layout";
import { CardMetric } from "@/components/card-metric";

export function CardMetricShowcase() {
  return (
    <DesignSystemShowcase id="cartoes" title="Cartão de métrica">
      <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-3" aria-label="Resumo da carteira">
        <CardMetric
          iconClassName="bg-surface-subtle text-on-surface-variant"
          icon={<Building className="size-5" strokeWidth={1.75} />}
        >
          <p className="text-metric text-on-surface tabular-nums">03</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">condomínios na carteira</p>
        </CardMetric>
        <CardMetric
          iconClassName="bg-surface-subtle text-on-surface-variant"
          icon={<User className="size-5" strokeWidth={1.75} />}
        >
          <p className="text-metric text-on-surface tabular-nums">268</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">unidades acompanhadas</p>
        </CardMetric>
        <CardMetric
          iconClassName="bg-gold-subtle text-brass"
          icon={<ShieldCheck className="size-5" strokeWidth={1.75} />}
        >
          <p className="text-metric text-on-surface tabular-nums">
            02
            <span className="font-semibold text-on-surface-variant"> / 03</span>
          </p>
          <span
            className="mt-xs block h-xs w-[calc(var(--spacing-xl)+var(--spacing-lg)+var(--spacing-sm))] overflow-hidden rounded-md bg-gold-subtle"
            aria-hidden="true"
          >
            <span className="block h-full w-2/3 bg-brass" />
          </span>
          <p className="mt-sm text-body-sm text-on-surface-variant">com situação ativa</p>
        </CardMetric>
      </div>
    </DesignSystemShowcase>
  );
}
