import { Building } from "lucide-react";
import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";

export function EmptyStateShowcase() {
  return (
    <DesignSystemShowcase id="vazio" title="Estado vazio">
      <DesignSystemPanel className="p-0 shadow-card">
        <EmptyState
          icon={<Building className="size-6" strokeWidth={1.75} />}
          title="Carteira vazia"
          description="Quando não há dados na tela, use EmptyState sozinho ou dentro de TableEmpty."
          action={<Button variant="outline" size="sm">Ver documentação</Button>}
        />
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
