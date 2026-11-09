import { obterAdaptadorImportacao } from "@/lib/importacao-centro/registro-adaptadores";
import type { PoliticaAprovacaoModuloImportacao } from "@/lib/importacao-centro/types";

export type { PoliticaAprovacaoModuloImportacao };

const POLITICA_ADAPTADOR_NAO_REGISTRADO: PoliticaAprovacaoModuloImportacao = {
  permitirImportacaoParcial: true,
  suportaTotalFinanceiro: false,
};

/** Lê a política no adaptador do módulo. O orquestrador não ramifica por nome de aba. */
export function politicaAprovacaoModuloImportacao(modulo: string): PoliticaAprovacaoModuloImportacao {
  try {
    const adapter = obterAdaptadorImportacao(modulo);
    return adapter.politicaAprovacao ?? POLITICA_ADAPTADOR_NAO_REGISTRADO;
  } catch {
    return POLITICA_ADAPTADOR_NAO_REGISTRADO;
  }
}
