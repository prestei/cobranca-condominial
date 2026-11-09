import { formatarMoeda } from "@/data/catalogo";
import type { ColunaPreVisualizacaoImportacao } from "@/components/importacao-pre-visualizacao/types";

function moeda(valor: string | undefined): string {
  const bruto = (valor ?? "").trim();
  if (!bruto || bruto === "—") return "—";
  return formatarMoeda(bruto);
}

function texto(resumo: Record<string, string> | undefined, chave: string): string {
  const valor = resumo?.[chave]?.trim();
  return valor && valor.length > 0 ? valor : "—";
}

export const ROTULO_MODULO_IMPORTACAO: Record<string, string> = {
  debitos: "Inadimplência",
  condominios: "Condomínios",
  unidades: "Unidades",
  responsaveis: "Responsáveis",
};

export const COLUNAS_PRE_VISUALIZACAO_DEBITOS: ColunaPreVisualizacaoImportacao[] = [
  {
    id: "condominio",
    rotulo: "Condomínio",
    className: "min-w-[8.5rem] max-w-[11rem]",
    valor: (l) => texto(l.resumo, "condominio"),
  },
  {
    id: "unidade",
    rotulo: "Unidade",
    className: "min-w-[5.5rem] whitespace-nowrap",
    valor: (l) => texto(l.resumo, "unidade"),
  },
  {
    id: "responsavel",
    rotulo: "Responsável",
    className: "min-w-[8rem] max-w-[12rem]",
    valor: (l) => texto(l.resumo, "responsavel"),
  },
  {
    id: "categoria",
    rotulo: "Categoria",
    className: "min-w-[6rem] max-w-[9rem]",
    valor: (l) => texto(l.resumo, "categoria"),
  },
  {
    id: "referencia",
    rotulo: "Referência",
    className: "min-w-[4.5rem] whitespace-nowrap",
    valor: (l) => texto(l.resumo, "referencia"),
  },
  {
    id: "vencimento",
    rotulo: "Vencimento",
    className: "min-w-[5.5rem] whitespace-nowrap",
    valor: (l) => texto(l.resumo, "vencimento"),
  },
  {
    id: "valorOriginal",
    rotulo: "Valor original",
    alinhamento: "right",
    className: "min-w-[6.5rem] whitespace-nowrap",
    valor: (l) => moeda(l.valoresEditados?.valorOriginal ?? texto(l.resumo, "valorOriginal")),
    editavel: true,
    campoNormalizado: "valorOriginal",
  },
  {
    id: "juros",
    rotulo: "Juros",
    alinhamento: "right",
    className: "min-w-[5rem] whitespace-nowrap",
    valor: (l) => moeda(l.valoresEditados?.juros ?? texto(l.resumo, "juros")),
    editavel: true,
    campoNormalizado: "juros",
  },
  {
    id: "multa",
    rotulo: "Multa",
    alinhamento: "right",
    className: "min-w-[5rem] whitespace-nowrap",
    valor: (l) => moeda(l.valoresEditados?.multa ?? texto(l.resumo, "multa")),
    editavel: true,
    campoNormalizado: "multa",
  },
  {
    id: "correcao",
    rotulo: "Correção",
    alinhamento: "right",
    className: "min-w-[5.5rem] whitespace-nowrap",
    valor: (l) => moeda(l.valoresEditados?.correcao ?? texto(l.resumo, "correcao")),
    editavel: true,
    campoNormalizado: "correcao",
  },
  {
    id: "total",
    rotulo: "Total",
    alinhamento: "right",
    className: "min-w-[6rem] whitespace-nowrap font-medium",
    valor: (l) => moeda(l.valoresEditados?.total ?? texto(l.resumo, "total")),
    editavel: true,
    campoNormalizado: "valorAtualizado",
  },
];

const COLUNAS_PRE_VISUALIZACAO_CONDOMINIOS: ColunaPreVisualizacaoImportacao[] = [
  { id: "nome", rotulo: "Nome", valor: (l) => texto(l.resumo, "nome") },
  { id: "identificador", rotulo: "ID externo", valor: (l) => texto(l.resumo, "identificadorExterno") },
];

const COLUNAS_PRE_VISUALIZACAO_UNIDADES: ColunaPreVisualizacaoImportacao[] = [
  { id: "condominio", rotulo: "Condomínio", valor: (l) => texto(l.resumo, "condominio") },
  { id: "unidade", rotulo: "Unidade", valor: (l) => texto(l.resumo, "unidade") },
  { id: "bloco", rotulo: "Bloco", valor: (l) => texto(l.resumo, "bloco") },
];

const COLUNAS_PRE_VISUALIZACAO_RESPONSAVEIS: ColunaPreVisualizacaoImportacao[] = [
  { id: "condominio", rotulo: "Condomínio", valor: (l) => texto(l.resumo, "condominio") },
  { id: "unidade", rotulo: "Unidade", valor: (l) => texto(l.resumo, "unidade") },
  { id: "responsavel", rotulo: "Responsável", valor: (l) => texto(l.resumo, "responsavel") },
  { id: "documento", rotulo: "CPF/CNPJ", valor: (l) => texto(l.resumo, "documento") },
  { id: "vinculo", rotulo: "Vínculo", valor: (l) => texto(l.resumo, "tipoVinculo") },
];

export function colunasPreVisualizacaoPorModulo(modulo: string): ColunaPreVisualizacaoImportacao[] {
  if (modulo === "debitos") return COLUNAS_PRE_VISUALIZACAO_DEBITOS;
  if (modulo === "condominios") return COLUNAS_PRE_VISUALIZACAO_CONDOMINIOS;
  if (modulo === "unidades") return COLUNAS_PRE_VISUALIZACAO_UNIDADES;
  if (modulo === "responsaveis") return COLUNAS_PRE_VISUALIZACAO_RESPONSAVEIS;
  return [
    {
      id: "resumo",
      rotulo: "Resumo",
      valor: (l) => {
        const partes = Object.entries(l.resumo ?? {})
          .slice(0, 4)
          .map(([k, v]) => `${k}: ${v}`);
        return partes.length > 0 ? partes.join(" · ") : "—";
      },
    },
  ];
}
