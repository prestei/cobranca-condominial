import { Plus } from "lucide-react";
import { DesignSystemPanel, DesignSystemShowcase } from "@/design-system/showcase-layout";
import { Button } from "@/components/button";

const buttonRows = [
  {
    name: "Primary",
    detail: "Ação principal",
    variant: "primary" as const,
    samples: [
      { size: "sm" as const, label: "Pequeno" },
      { size: "md" as const, label: "Normal" },
      { size: "lg" as const, label: "Grande", icon: true },
    ],
  },
  {
    name: "Secondary",
    detail: "Ação de destaque",
    variant: "secondary" as const,
    samples: [
      { size: "sm" as const, label: "Boleto" },
      { size: "md" as const, label: "Emitir termo" },
      { size: "lg" as const, label: "Gerar boleto" },
    ],
  },
  {
    name: "Outline",
    detail: "Ação neutra",
    variant: "outline" as const,
    samples: [
      { size: "sm" as const, label: "Filtro" },
      { size: "md" as const, label: "Exportar" },
      { size: "lg" as const, label: "Cancelar" },
    ],
  },
  {
    name: "Ghost",
    detail: "Ação discreta",
    variant: "ghost" as const,
    samples: [
      { size: "sm" as const, label: "Ver todas" },
      { size: "md" as const, label: "Ver histórico" },
      { size: "lg" as const, label: "Limpar filtros" },
    ],
  },
] as const;

export function ButtonsShowcase() {
  return (
    <DesignSystemShowcase id="botoes" title="Botões">
      <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-2">
        {buttonRows.map((row) => (
          <DesignSystemPanel key={row.variant}>
            <header>
              <h3 className="text-label-lg text-on-surface">{row.name}</h3>
              <p className="mt-xs text-body-sm text-on-surface-variant">{row.detail}</p>
            </header>
            <div className="mt-lg flex flex-wrap items-start gap-lg">
              {row.samples.map((sample) => (
                <div key={sample.size} className="flex flex-col items-start gap-sm">
                  <p className="text-label-sm text-on-surface-variant uppercase">{sample.size}</p>
                  <Button variant={row.variant} size={sample.size}>
                    {"icon" in sample ? (
                      <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                    ) : null}
                    {sample.label}
                  </Button>
                </div>
              ))}
            </div>
          </DesignSystemPanel>
        ))}
      </div>
      <DesignSystemPanel>
        <h3 className="text-label-lg text-on-surface">Desabilitado</h3>
        <div className="mt-lg flex flex-wrap items-center gap-md">
          <Button disabled>Salvar</Button>
          <Button variant="secondary" disabled>Emitir termo</Button>
          <Button variant="outline" disabled>Exportar</Button>
          <Button variant="ghost" disabled>Ver todas</Button>
        </div>
      </DesignSystemPanel>
    </DesignSystemShowcase>
  );
}
