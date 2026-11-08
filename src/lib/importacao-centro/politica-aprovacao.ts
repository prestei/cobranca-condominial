/** Regras de aprovação por módulo (Ticket 09). */
export type PoliticaAprovacaoModuloImportacao = {
  /** Permite gravar apenas registros válidos quando há erros nas demais linhas. */
  permitirImportacaoParcial: boolean;
  /** Calcula total financeiro para exibição no resumo final, quando aplicável. */
  suportaTotalFinanceiro: boolean;
};

const POLITICAS: Record<string, PoliticaAprovacaoModuloImportacao> = {
  debitos: { permitirImportacaoParcial: true, suportaTotalFinanceiro: true },
  condominios: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },
  unidades: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },
  responsaveis: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },
  teste: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },
};

export function politicaAprovacaoModuloImportacao(modulo: string): PoliticaAprovacaoModuloImportacao {
  return POLITICAS[modulo] ?? { permitirImportacaoParcial: false, suportaTotalFinanceiro: false };
}
