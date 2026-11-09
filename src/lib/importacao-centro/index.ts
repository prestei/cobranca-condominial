export type {
  AdaptadorImportacao,
  ContadoresImportacao,
  DadosAprovacaoImportacao,
  EntradaConfirmacaoImportacao,
  EntradaGanchosLeituraImportacao,
  EntradaImportacaoArquivo,
  LinhaConferencia,
  LinhaParseada,
  MetadadosLeituraArquivoImportacao,
  PreviewImportacaoCentral,
  ResultadoConfirmacaoCentral,
  SituacaoLinhaImportacao,
  MetaExecucaoImportacao,
  PoliticaAprovacaoModuloImportacao,
} from "@/lib/importacao-centro/types";
export { ImportacaoCentroError } from "@/lib/importacao-centro/types";

export { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
export { normalizarCabecalhoPlanilha, normalizarConteudoParaHash, textoVazio } from "@/lib/importacao-centro/normalizacao";
export type {
  OpcoesDecimal,
  OpcoesValorMonetario,
  ResultadoNormalizacao,
  SpecCampoNormalizacao,
  TipoCampoNormalizacao,
} from "@/lib/importacao-centro/normalizacao-resultado";
export {
  aplicarNormalizacaoRegistro,
  mapaValoresNormalizados,
  normalizarCampoTipadoImportacao,
  normalizarCampoVazioImportacao,
  normalizarCategoriaImportacao,
  normalizarClassificacaoImportacao,
  normalizarCodigoIdentificacaoImportacao,
  normalizarCpfCnpjImportacao,
  normalizarDataImportacao,
  normalizarDecimalImportacao,
  normalizarEmailImportacao,
  normalizarNomeImportacao,
  normalizarStatusDebitoImportacao,
  normalizarTelefoneImportacao,
  normalizarValorMonetarioImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
export { inconsistenciasDeNormalizacao } from "@/lib/importacao-centro/inconsistencias-normalizacao";
export { validarEntradaLeitura } from "@/lib/importacao-centro/validacao";
export { marcarDuplicidadesNoArquivo, contarPorSituacao } from "@/lib/importacao-centro/duplicidades";
export {
  detectarDuplicidadeDebito,
  detectarDuplicidadeCondominio,
  detectarDuplicidadeUnidade,
  detectarDuplicidadeResponsavel,
  aplicarDecisoesNasLinhas,
  type AcaoConflitoImportacao,
  type DecisaoLinhaImportacao,
  type ConflitoImportacaoLinha,
} from "@/lib/importacao-centro/detecao-duplicidades";
export { conferirLinhasComBase, montarPreview, pipelineConferencia, montarContadores } from "@/lib/importacao-centro/conferencia";
export {
  contarPreVisualizacao,
  indicadorLinhaPreVisualizacao,
  linhaSeraGravada,
  mensagensLinhaPreVisualizacao,
  serializarLinhasPreVisualizacao,
  type ContagensPreVisualizacaoImportacao,
  type IndicadorPreVisualizacaoImportacao,
  type LinhaPreVisualizacaoSerializada,
} from "@/lib/importacao-centro/pre-visualizacao";
export { montarResumoAprovacaoDoPreview, validarAprovacao } from "@/lib/importacao-centro/aprovacao";
export { politicaAprovacaoModuloImportacao } from "@/lib/importacao-centro/politica-aprovacao";
export { montarResumoAprovacaoImportacao, type ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
export { executarPersistenciaAprovada } from "@/lib/importacao-centro/persistencia";
export { registrarHistoricoImportacao } from "@/lib/importacao-centro/historico-auditoria";
export { executarConfirmacaoImportacaoTransacional } from "@/lib/importacao-centro/confirmacao";
export {
  previewImportacaoCentral,
  confirmarImportacaoCentral,
  previewImportacaoPorModulo,
  confirmarImportacaoPorModulo,
} from "@/lib/importacao-centro/servico-central";
export { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
export {
  listarModulosAdaptadorImportacao,
  MODULOS_IMPORTACAO_CENTRAL,
  obterAdaptadorImportacao,
  registrarAdaptadorImportacao,
  type ModuloImportacaoCentral,
} from "@/lib/importacao-centro/registro-adaptadores";

export type {
  CategoriaValidacaoImportacao,
  InconsistenciaValidacao,
  RegistroValidadoImportacao,
  ResultadoValidacaoImportacao,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao";
export {
  aplicarMotorValidacaoImportacao,
  classificarResultadoValidacao,
  CODIGOS_VALIDACAO,
  obterValidadorModuloImportacao,
  registrarValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao";

export { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
export { adaptadorImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
export { adaptadorImportacaoUnidades } from "@/lib/importacao-centro/adaptadores/unidades";
export { adaptadorImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis";
