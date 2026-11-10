import { origensDebito } from "@/data/catalogo";
import { extensoesPermitidas, type ModuloImportacaoArquivo } from "@/lib/importacoes/limites";

// Constantes literais — evita importar adaptadores/servidor (catalogo-store) no wizard cliente.
const FORMATO_IMPORTACAO_CONDOMINIOS_V1 = "planilha-condominios-v1";
const FORMATO_IMPORTACAO_UNIDADES_V1 = "planilha-unidades-v1";
const FORMATO_IMPORTACAO_RESPONSAVEIS_V1 = "planilha-responsaveis-v1";
const FORMATO_IMPORTACAO_DEBITOS_V1 = "planilha-inadimplencia-v1";

export type ModuloWizardImportacao = ModuloImportacaoArquivo;

export const MODULOS_WIZARD_IMPORTACAO: ModuloWizardImportacao[] = [
  "debitos",
  "condominios",
  "unidades",
  "responsaveis",
];

export type ConfigWizardImportacao = {
  tituloSheet: string;
  tituloBotao: string;
  formato: string;
  descricaoArquivo: string;
  accept: string;
  origens: readonly string[];
  origemPadraoCarteira: string;
  apiBase: string;
  suportaCorrecaoPrevia: boolean;
};

const ORIGEM_CARTEIRA = "Exportação da carteira";

const CONFIG: Record<ModuloWizardImportacao, ConfigWizardImportacao> = {
  debitos: {
    tituloSheet: "Importar inadimplência",
    tituloBotao: "Importar inadimplência",
    formato: FORMATO_IMPORTACAO_DEBITOS_V1,
    descricaoArquivo:
      "CSV (;), XLSX, XLS ou PDF com colunas Unidade, Condomínio, Referência, Vencimento e valor. Condomínio, unidade e responsável ausentes são cadastrados automaticamente nos módulos certos.",
    accept:
      ".csv,.xls,.xlsx,.pdf,.txt,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    origens: origensDebito,
    origemPadraoCarteira: "",
    apiBase: "/api/importacoes/debitos",
    suportaCorrecaoPrevia: true,
  },
  condominios: {
    tituloSheet: "Importar condomínios",
    tituloBotao: "Importar condomínios",
    formato: FORMATO_IMPORTACAO_CONDOMINIOS_V1,
    descricaoArquivo:
      "CSV (;) ou XLS/XLSX com colunas Nome e Advogados. PDF/planilha de inadimplência também é aceito: o sistema redireciona e grava cada dado no cadastro certo.",
    accept: extensoesPermitidas("condominios")
      .concat([
        "text/csv",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ])
      .join(","),
    origens: [ORIGEM_CARTEIRA, "Outra administradora"],
    origemPadraoCarteira: ORIGEM_CARTEIRA,
    apiBase: "/api/importacoes/condominios",
    suportaCorrecaoPrevia: false,
  },
  unidades: {
    tituloSheet: "Importar unidades",
    tituloBotao: "Importar unidades",
    formato: FORMATO_IMPORTACAO_UNIDADES_V1,
    descricaoArquivo:
      "CSV (;) ou XLS/XLSX com Unidade, Condomínio e Tipo.",
    accept: extensoesPermitidas("unidades")
      .concat([
        "text/csv",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ])
      .join(","),
    origens: [ORIGEM_CARTEIRA, "Outra administradora"],
    origemPadraoCarteira: ORIGEM_CARTEIRA,
    apiBase: "/api/importacoes/unidades",
    suportaCorrecaoPrevia: false,
  },
  responsaveis: {
    tituloSheet: "Importar responsáveis",
    tituloBotao: "Importar responsáveis",
    formato: FORMATO_IMPORTACAO_RESPONSAVEIS_V1,
    descricaoArquivo:
      "CSV (;) ou XLS/XLSX com Condomínio, Unidade, Nome, CPF/CNPJ e Tipo de vínculo.",
    accept: extensoesPermitidas("responsaveis")
      .concat([
        "text/csv",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ])
      .join(","),
    origens: [ORIGEM_CARTEIRA, "Outra administradora"],
    origemPadraoCarteira: ORIGEM_CARTEIRA,
    apiBase: "/api/importacoes/responsaveis",
    suportaCorrecaoPrevia: false,
  },
};

export function configWizardImportacao(modulo: ModuloWizardImportacao): ConfigWizardImportacao {
  return CONFIG[modulo];
}

export function moduloWizardValido(valor: string): valor is ModuloWizardImportacao {
  return MODULOS_WIZARD_IMPORTACAO.includes(valor as ModuloWizardImportacao);
}
