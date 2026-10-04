import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { SheetDemo } from "@/design-system/sheet-demo";

export function SheetShowcase() {
  return (
    <DesignSystemShowcase id="sheet" title="Sheet (cadastro lateral)">
      <DesignSystemPanel>
        <p className="mb-lg text-body-sm text-on-surface-variant">
          Formulários de cadastro em painel lateral fixo à direita, com rolagem no corpo e ações no rodapé.
        </p>
        <SheetDemo />
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
