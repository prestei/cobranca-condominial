import type { ColunaPreVisualizacao, LinhaPreVisualizacaoImportacaoUi } from "@/components/importacao-pre-visualizacao/types";

export const ROTULO_MODULO_IMPORTACAO: Record<string, string> = {
  debitos: "Inadimplência",
  condominios: "Condomínios",
  unidades: "Unidades",
  responsaveis: "Responsáveis",
};

const ROTULO_SITUACAO: Record<string, string> = {
  novo: "Novo",
  atualizacao: "Atualização",
  duplicado: "Duplicado",
  erro: "Erro",
  revisao: "Revisão",
  manual_protegido: "Manual protegido",
  ignorado: "Ignorado",
};

function celula(item: LinhaPreVisualizacaoImportacaoUi, chave: string): string {
  const editado = item.valoresEditados?.[chave]?.trim();
  if (editado) return editado;
  const valor = item.resumo?.[chave]?.trim();
  return valor && valor.length > 0 ? valor : "—";
}

function colunaTexto(
  id: string,
  rotulo: string,
  extras?: Partial<ColunaPreVisualizacao>,
): ColunaPreVisualizacao {
  return {
    id,
    rotulo,
    valor: (item) => celula(item, id),
    ...extras,
  };
}

function colunaSituacao(): ColunaPreVisualizacao {
  return {
    id: "situacao",
    rotulo: "Situação",
    valor: (item) => ROTULO_SITUACAO[item.situacao] ?? item.situacao,
  };
}

const COLUNAS: Record<string, ColunaPreVisualizacao[]> = {
  debitos: [
    colunaTexto("condominio", "Condomínio", { className: "min-w-[10rem]" }),
    colunaTexto("unidade", "Unidade"),
    colunaTexto("responsavel", "Responsável", { className: "min-w-[9rem]" }),
    colunaTexto("categoria", "Categoria"),
    colunaTexto("referencia", "Referência"),
    colunaTexto("vencimento", "Vencimento"),
    colunaTexto("valorOriginal", "Original", { alinhamento: "right" }),
    colunaTexto("multa", "Multa", { alinhamento: "right" }),
    colunaTexto("juros", "Juros", { alinhamento: "right" }),
    colunaTexto("correcao", "Correção", { alinhamento: "right" }),
    colunaTexto("total", "Total", { alinhamento: "right" }),
    colunaSituacao(),
  ],
  condominios: [
    colunaTexto("nome", "Nome", { className: "min-w-[12rem]" }),
    colunaTexto("identificadorExterno", "Identificador externo"),
    colunaSituacao(),
  ],
  unidades: [
    colunaTexto("condominio", "Condomínio", { className: "min-w-[10rem]" }),
    colunaTexto("unidade", "Unidade"),
    colunaTexto("bloco", "Bloco"),
    colunaSituacao(),
  ],
  responsaveis: [
    colunaTexto("condominio", "Condomínio", { className: "min-w-[10rem]" }),
    colunaTexto("unidade", "Unidade"),
    colunaTexto("responsavel", "Responsável"),
    colunaTexto("documento", "CPF/CNPJ"),
    colunaTexto("tipoVinculo", "Vínculo"),
    colunaSituacao(),
  ],
};

export function colunasPreVisualizacaoPorModulo(modulo: string): ColunaPreVisualizacao[] {
  return COLUNAS[modulo] ?? COLUNAS.debitos;
}
