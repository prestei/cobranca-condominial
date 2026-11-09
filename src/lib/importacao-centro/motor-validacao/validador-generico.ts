import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import { montarDadosOriginaisLinha } from "@/lib/importacao-centro/motor-validacao/estrutural";
import type { EntradaValidacaoRegistro, ValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/types";

/**
 * Fallback: todo registro passa pelo motor mesmo sem validador específico do módulo.
 * Não inventa colunas obrigatórias — apenas estrutura mínima e erros de parse.
 */
export function criarValidadorGenericoImportacao(modulo: string): ValidadorModuloImportacao {
  return {
    modulo,
    colunasReconhecidas: new Set(),
    colunasObrigatorias: [],
    regrasDoModulo: [CODIGOS_VALIDACAO.motor.validadorGenerico],
    validarEstruturaArquivo() {
      return [];
    },
    validarRegistro(entrada: EntradaValidacaoRegistro<unknown, unknown>) {
      const inconsistencias = [];
      const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);
      if (entrada.erroParse) {
        inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
      } else if (entrada.payload == null) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "estrutural",
            severidade: "erro",
            codigo: CODIGOS_VALIDACAO.estrutural.registroVazio,
            mensagem: "Registro sem dados interpretáveis.",
          }),
        );
      }
      return {
        dadosOriginais,
        dadosNormalizados: entrada.payload ?? null,
        inconsistencias,
        regrasAplicadas: [CODIGOS_VALIDACAO.motor.validarRegistro, CODIGOS_VALIDACAO.motor.validadorGenerico],
      };
    },
  };
}
