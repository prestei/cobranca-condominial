/** Cabeçalho de acordeão de listagem agrupada — mesmo fundo do painel de filtros (`FilterBar` default). */
export const listGroupAccordionToggleClassName =
  "flex w-full cursor-pointer items-center justify-between gap-md bg-surface-subtle px-md py-md text-left transition-[filter] hover:brightness-[0.98] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

export const listGroupAccordionChevronClassName =
  "inline-flex size-8 shrink-0 items-center justify-center text-on-surface-variant";

/** Largura da coluna de ação / seta — deve coincidir com o último `<col>` da tabela embutida. */
export const listGroupAccordionActionColumn12 = "12%";
export const listGroupAccordionActionColumn13 = "13%";

/** Grade do cabeçalho (desktop), mesma coluna de ação da tabela. */
export function listGroupAccordionDesktopHeaderGridClassName(actionColumn: string) {
  return `grid w-full items-center bg-surface-subtle grid-cols-[minmax(0,1fr)_minmax(3.5rem,${actionColumn})]`;
}

/** Toggle em subgrid nas duas colunas — `pl-md` / `pr-md` iguais à tabela. */
export const listGroupAccordionDesktopToggleSubgridClassName =
  "col-span-2 grid min-w-0 w-full cursor-pointer grid-cols-subgrid items-center bg-surface-subtle py-md pl-md pr-md text-left transition-[filter] hover:brightness-[0.98] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

/** Desktop: seta alinhada à coluna de ação (mesma posição do menu ⋯). */
export const listGroupAccordionChevronDesktopClassName = "justify-self-end";

/** Corpo expandido do acordeão — desktop: tabela 100% do card; mobile: recuo `px-md`. */
export const listGroupAccordionPanelClassName =
  "flex min-w-0 w-full flex-col gap-md border-t border-border-subtle px-md pb-md pt-md md:px-0";

/** Rodapé do painel (paginação) com o mesmo recuo do cabeçalho. */
export const listGroupAccordionPanelFooterClassName = "w-full px-md";

/** Tabela embutida no acordeão (sem borda/sombra/fundo próprio). */
export const listGroupEmbeddedTableContainerClassName =
  "w-full min-w-0 max-w-full rounded-none border-0 bg-transparent shadow-none [&_thead_th:last-child]:static [&_thead_th:last-child]:!w-auto [&_thead_th:last-child]:!min-w-0 [&_thead_th:last-child]:!pr-md [&_thead_th:last-child]:!text-end [&_tbody_td:last-child]:static [&_tbody_td:last-child]:!w-auto [&_tbody_td:last-child]:!min-w-0 [&_tbody_td:last-child]:!pr-md [&_tbody_td:last-child>div]:!justify-end";

export const listGroupEmbeddedTableHeaderClassName = "!bg-transparent";

export const listGroupEmbeddedTableRowClassName = "border-b border-border-subtle";
