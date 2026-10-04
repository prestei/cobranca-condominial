import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { CondominiumsTableDemo, CondominiumsTableEmptyDemo } from "@/design-system/table-demo";

export function TableShowcase() {
  return (
    <DesignSystemShowcase id="tabela" title="Tabela">
      <article className="flex flex-col gap-lg">
        <CondominiumsTableDemo />
        <CondominiumsTableEmptyDemo />
      </article>
      <DesignSystemPanel className="min-[768px]:hidden">
        <h3 className="text-label-lg text-on-surface">Modelo smartphone</h3>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Abaixo de <span className="text-on-surface">768px</span>, a mesma listagem vira cards com checkbox, título,
          ações e campos label + valor.
        </p>
      </DesignSystemPanel>
      <div className="hidden flex-col gap-md min-[768px]:flex">
        <h3 className="text-label-lg text-on-surface">Preview smartphone (forçado)</h3>
        <p className="text-body-sm text-on-surface-variant">
          Simulação estreita para revisar o layout mobile no desktop.
        </p>
        <div className="mx-auto w-full max-w-[24rem] rounded-xl border border-border-strong bg-surface-canvas p-sm shadow-modal">
          <CondominiumsTableDemo viewport="mobile" />
        </div>
      </div>
    </DesignSystemShowcase>
  );
}
