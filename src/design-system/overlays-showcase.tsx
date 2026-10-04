import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { OverlaysDemo } from "@/design-system/overlays-demo";

export function OverlaysShowcase() {
  return (
    <DesignSystemShowcase id="overlays" title="Dialog, sheet e toast">
      <DesignSystemPanel>
        <p className="mb-lg text-body-sm text-on-surface-variant">
          Confirmações modais com <code className="text-body-sm text-on-surface">Dialog</code>, cadastros laterais com{" "}
          <code className="text-body-sm text-on-surface">Sheet</code> e feedback global com{" "}
          <code className="text-body-sm text-on-surface">useToast</code> (provider no layout da app).
        </p>
        <OverlaysDemo />
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
