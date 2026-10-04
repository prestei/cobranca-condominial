import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Badge } from "@/components/badge";

const badgeSamples = [
  { variant: "primary" as const, label: "Novo" },
  { variant: "secondary" as const, label: "Destaque" },
  { variant: "success" as const, label: "Concluído" },
  { variant: "error" as const, label: "Urgente" },
] as const;

export function BadgesShowcase() {
  return (
    <DesignSystemShowcase id="badges" title="Badges">
      <DesignSystemPanel>
        <div className="flex flex-wrap gap-md">
          {badgeSamples.map((sample) => (
            <Badge key={sample.variant} variant={sample.variant}>{sample.label}</Badge>
          ))}
        </div>
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
