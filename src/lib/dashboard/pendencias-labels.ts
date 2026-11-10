/** Rótulos/tipos de pendência do dashboard — seguros para o bundle do cliente. */

export type CategoriaPendenciaId =
  | "hoje"
  | "atrasadas"
  | "proximos_retornos"
  | "aguardando_resposta"
  | "sem_movimentacao"
  | "prioritarias";

export type TipoPendenciaId = CategoriaPendenciaId;

export const ROTULO_TIPO_PENDENCIA: Record<TipoPendenciaId, string> = {
  prioritarias: "Prioritária",
  atrasadas: "Atrasada",
  hoje: "Hoje",
  proximos_retornos: "Próximo retorno",
  aguardando_resposta: "Aguardando resposta",
  sem_movimentacao: "Sem movimentação",
};

export const CATEGORIAS_PENDENCIA: { id: CategoriaPendenciaId | "todas"; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "hoje", rotulo: "Pendências de hoje" },
  { id: "atrasadas", rotulo: "Pendências atrasadas" },
  { id: "proximos_retornos", rotulo: "Próximos retornos" },
  { id: "aguardando_resposta", rotulo: "Aguardando resposta" },
  { id: "sem_movimentacao", rotulo: "Sem movimentação" },
  { id: "prioritarias", rotulo: "Pendências prioritárias" },
];
