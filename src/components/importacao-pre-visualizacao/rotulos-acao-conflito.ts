import type { AcaoConflitoImportacao, TipoCorrespondencia } from "@/lib/importacao-centro/detecao-duplicidades/types";

export const ROTULO_ACAO_CONFLITO: Record<AcaoConflitoImportacao, string> = {
  importar_novo: "Importar como novo",
  ignorar_existente: "Ignorar (já existe)",
  atualizar_existente: "Atualizar registro existente",
  solicitar_correcao: "Solicitar correção",
  revisao_manual: "Encaminhar para revisão manual",
};

export const ROTULO_CORRESPONDENCIA: Record<TipoCorrespondencia, string> = {
  nenhuma: "Sem correspondência na base",
  exata: "Correspondência exata",
  possivel: "Possível duplicidade — revisar",
};

export function rotuloCriterioConflito(criterio: string): string {
  const mapa: Record<string, string> = {
    nome: "Nome",
    identificadorExterno: "Identificador externo",
    cpfCnpj: "Documento",
    condominio: "Condomínio",
    bloco: "Bloco",
    identificacao: "Código da unidade",
    unidade: "Unidade",
    referencia: "Referência",
    vencimento: "Vencimento",
    valorPrincipal: "Valor principal",
    valorAtualizado: "Valor atualizado",
    status: "Status",
    categoria: "Categoria",
  };
  return mapa[criterio] ?? criterio;
}
