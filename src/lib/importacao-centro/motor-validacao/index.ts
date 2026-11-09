export type {
  CategoriaValidacaoImportacao,
  EntradaValidacaoRegistro,
  InconsistenciaValidacao,
  RegistroValidadoImportacao,
  ResultadoValidacaoImportacao,
  SeveridadeInconsistencia,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao/types";

export { classificarResultadoValidacao, mensagemPrincipalValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
export { aplicarMotorValidacaoImportacao, type ResultadoMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/motor";
export { obterValidadorModuloImportacao, registrarValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/registry";
export { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
export { revalidarLinhaMotorImportacao } from "@/lib/importacao-centro/motor-validacao/revalidar-linha";
