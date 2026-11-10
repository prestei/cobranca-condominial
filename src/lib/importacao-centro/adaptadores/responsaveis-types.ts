import type { Responsavel, Vinculo } from "@/data/catalogo";

export const FORMATO_IMPORTACAO_RESPONSAVEIS_V1 = "planilha-responsaveis-v1";

export type ContextoImportacaoResponsaveis = {
  condominios: Array<{ id: number; nome: string }>;
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>;
  responsaveis: Responsavel[];
  vinculos: Vinculo[];
  responsaveisMutaveis: Responsavel[];
  vinculosMutaveis: Vinculo[];
};
