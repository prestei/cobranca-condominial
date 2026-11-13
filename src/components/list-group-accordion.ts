/** Cabeçalho de acordeão de listagem agrupada — mesmo fundo do painel de filtros (`FilterBar` default). */
export const listGroupAccordionToggleClassName =
  "flex w-full cursor-pointer items-center justify-between gap-md bg-surface-subtle px-md py-md text-left transition-[filter] hover:brightness-[0.98] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

/** Corpo expandido do acordeão — tabela colada ao card, sem “caixa” cinza com padding. */
export const listGroupAccordionPanelClassName = "flex flex-col gap-md border-t border-border-subtle";

/** Tabela embutida no acordeão (sem borda/sombra/fundo próprio). */
export const listGroupEmbeddedTableContainerClassName =
  "rounded-none border-0 bg-transparent shadow-none";

export const listGroupEmbeddedTableHeaderClassName = "!bg-transparent";

export const listGroupEmbeddedTableRowClassName = "border-b border-border-subtle";
