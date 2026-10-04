import { Building, Inbox, Plus, ShieldCheck, User } from "lucide-react";
import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Icon, iconSizes, iconStrokeWidths, type IconSize } from "@/components/icon";

const iconSizeSamples: { size: IconSize; usage: string }[] = [
  { size: "sm", usage: "Botões pequenos e ações inline" },
  { size: "md", usage: "Alertas, métricas e listas" },
  { size: "lg", usage: "Empty state e destaques" },
];

export function IconsShowcase() {
  return (
    <DesignSystemShowcase id="icones" title="Ícones">
      <DesignSystemPanel className="flex flex-col gap-lg">
        <p className="text-body-sm text-on-surface-variant">
          Biblioteca padrão:{" "}
          <code className="text-body-sm text-on-surface">lucide-react</code>. Use o componente{" "}
          <code className="text-body-sm text-on-surface">Icon</code> para tamanho e traço consistentes.
        </p>
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          {iconSizeSamples.map((sample) => (
            <div
              key={sample.size}
              className="flex flex-col items-start gap-md rounded-lg border border-border-subtle bg-surface-subtle/50 p-md"
            >
              <Icon icon={Inbox} size={sample.size} className="text-primary-container" />
              <div>
                <p className="text-label-lg text-on-surface">{sample.size}</p>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {iconSizes[sample.size]} · stroke {iconStrokeWidths[sample.size]}
                </p>
                <p className="mt-sm text-body-sm text-on-surface-variant">{sample.usage}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-lg border-t border-border-subtle pt-lg">
          <Icon icon={Building} size="md" className="text-on-surface-variant" />
          <Icon icon={User} size="md" className="text-on-surface-variant" />
          <Icon icon={ShieldCheck} size="md" className="text-brass" />
          <Icon icon={Plus} size="sm" className="text-primary-container" />
        </div>
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
