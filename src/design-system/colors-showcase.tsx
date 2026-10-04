import { DesignSystemShowcaseWide } from "@/design-system/showcase-layout";

const colorGroups = [
  {
    name: "Marca",
    swatches: [
      { name: "Navy", token: "primary-container", chip: "bg-primary-container", ink: "text-on-primary" },
      { name: "Navy hover", token: "primary-hover", chip: "bg-primary-hover", ink: "text-on-primary" },
      { name: "Brass", token: "brass", chip: "bg-brass", ink: "text-primary-container" },
      { name: "Gold subtle", token: "gold-subtle", chip: "bg-gold-subtle", ink: "text-primary-container" },
    ],
  },
  {
    name: "Superfície",
    swatches: [
      { name: "Canvas", token: "surface-canvas", chip: "bg-surface-canvas", ink: "text-on-surface" },
      { name: "Card", token: "surface-card", chip: "bg-surface-card", ink: "text-on-surface" },
      { name: "Subtle", token: "surface-subtle", chip: "bg-surface-subtle", ink: "text-on-surface" },
      { name: "Borda", token: "border-subtle", chip: "bg-border-subtle", ink: "text-on-surface" },
      { name: "Borda forte", token: "border-strong", chip: "bg-border-strong", ink: "text-on-surface" },
      { name: "Texto", token: "on-surface", chip: "bg-on-surface", ink: "text-surface-card" },
      { name: "Texto secundário", token: "on-surface-variant", chip: "bg-on-surface-variant", ink: "text-surface-card" },
    ],
  },
  {
    name: "Status",
    swatches: [
      { name: "Quitado", token: "status-settled", chip: "bg-status-settled", ink: "text-on-primary" },
      { name: "Pendente", token: "status-pending", chip: "bg-status-pending", ink: "text-on-primary" },
      { name: "Crítico", token: "status-critical", chip: "bg-status-critical", ink: "text-on-primary" },
    ],
  },
] as const;

export function ColorsShowcase() {
  return (
    <DesignSystemShowcaseWide id="cores" title="Cores">
      {colorGroups.map((group) => (
        <div key={group.name} className="flex flex-col gap-sm">
          <h3 className="text-label-sm text-on-surface-variant uppercase">{group.name}</h3>
          <ul className="grid grid-cols-2 gap-md min-[961px]:grid-cols-4">
            {group.swatches.map((swatch) => (
              <li
                key={swatch.token}
                className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card"
              >
                <div className={`px-md py-lg ${swatch.chip}`}>
                  <p className={`text-label-md ${swatch.ink}`}>{swatch.name}</p>
                </div>
                <p className="px-md py-sm text-body-sm text-on-surface-variant">{swatch.token}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </DesignSystemShowcaseWide>
  );
}
