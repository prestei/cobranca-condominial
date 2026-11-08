export type {
  TipoCorrespondencia,
  AcaoConflitoImportacao,
  ResultadoDetecaoDuplicidade,
  DecisaoLinhaImportacao,
  ConflitoImportacaoLinha,
} from "@/lib/importacao-centro/detecao-duplicidades/types";

export {
  detectarDuplicidadeCondominio,
  chaveDuplicidadeCondominioNoArquivo,
} from "@/lib/importacao-centro/detecao-duplicidades/condominios";

export {
  detectarDuplicidadeUnidade,
  chaveDuplicidadeUnidadeNoArquivo,
} from "@/lib/importacao-centro/detecao-duplicidades/unidades";

export {
  detectarDuplicidadeResponsavel,
  chaveDuplicidadeResponsavelNoArquivo,
  type ResponsavelImportDetecao,
} from "@/lib/importacao-centro/detecao-duplicidades/responsaveis";

export {
  detectarDuplicidadeDebito,
  encontrarDebitoCorrespondente,
  chaveDuplicidadeDebitoNoArquivo,
  chaveNaturalDebito,
} from "@/lib/importacao-centro/detecao-duplicidades/debitos";

export { conflitoAPartirDaDetecao, situacaoAPartirDaDetecao } from "@/lib/importacao-centro/detecao-duplicidades/mapear-linha";

export {
  aplicarDecisoesNasLinhas,
  type LinhaComDecisaoAplicada,
} from "@/lib/importacao-centro/detecao-duplicidades/aplicar-decisoes";
