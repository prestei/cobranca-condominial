/**
 * Nove serviços da arquitetura central de importação (Ticket 02).
 * Novos módulos entram por adaptador + `registrarAdaptadorImportacao`, sem alterar estes arquivos.
 */

export {
  confirmarImportacaoCentral,
  confirmarImportacaoPorModulo,
  previewImportacaoCentral,
  previewImportacaoPorModulo,
} from "@/lib/importacao-centro/servico-central";
export { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
export { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
export { aplicarNormalizacaoRegistro } from "@/lib/importacao-centro/normalizacao-campos";
export { validarEntradaLeitura } from "@/lib/importacao-centro/validacao";
export { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
export { marcarDuplicidadesNoArquivo } from "@/lib/importacao-centro/duplicidades";
export {
  detectarDuplicidadeCondominio,
  detectarDuplicidadeDebito,
  detectarDuplicidadeResponsavel,
  detectarDuplicidadeUnidade,
} from "@/lib/importacao-centro/detecao-duplicidades";
export { conferirLinhasComBase, montarPreview, pipelineConferencia } from "@/lib/importacao-centro/conferencia";
export { validarAprovacao } from "@/lib/importacao-centro/aprovacao";
export { executarPersistenciaAprovada } from "@/lib/importacao-centro/persistencia";
export { registrarHistoricoImportacao } from "@/lib/importacao-centro/historico-auditoria";
