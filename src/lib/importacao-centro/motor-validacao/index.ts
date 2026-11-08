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
