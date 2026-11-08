import type { LinhaParseada } from "@/lib/importacao-centro/types";
import { classificarResultadoValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
import { extrairCabecalhoNormalizado } from "@/lib/importacao-centro/motor-validacao/estrutural";
import { finalizarRegistroValidado, registroValidadoParaLinhaParseada } from "@/lib/importacao-centro/motor-validacao/registro";
import { obterValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/registry";
import type { InconsistenciaValidacao, RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

export type ResultadoMotorValidacaoImportacao<TPayload> = {
  linhas: LinhaParseada<TPayload>[];
  registros: RegistroValidadoImportacao<TPayload>[];
  inconsistenciasArquivo: InconsistenciaValidacao[];
};

/**
 * Motor central de validação (Ticket 05).
 * Não grava em tabelas de negócio — apenas enriquece linhas parseadas.
 */
export function aplicarMotorValidacaoImportacao<TPayload, TContexto>(
  parseadas: LinhaParseada<TPayload>[],
  params: {
    modulo: string;
    matriz: string[][];
    contexto: TContexto;
  },
): ResultadoMotorValidacaoImportacao<TPayload> {
  const validador = obterValidadorModuloImportacao(params.modulo);
  const cabecalho = extrairCabecalhoNormalizado(params.matriz);

  const inconsistenciasArquivo: InconsistenciaValidacao[] = [];
  if (validador?.validarEstruturaArquivo) {
    inconsistenciasArquivo.push(...validador.validarEstruturaArquivo(params.matriz));
  }

  const registros: RegistroValidadoImportacao<TPayload>[] = [];
  const linhas: LinhaParseada<TPayload>[] = [];

  const linhaPorNumero = new Map<number, string[]>();
  for (let i = 1; i < params.matriz.length; i += 1) {
    linhaPorNumero.set(i + 1, params.matriz[i] ?? []);
  }

  const aplicarLinha = (item: LinhaParseada<TPayload>) => {
    if (!validador) {
      linhas.push(item);
      return;
    }

    const parcial = validador.validarRegistro({
      linha: item.linha,
      linhaBruta: linhaPorNumero.get(item.linha) ?? [],
      cabecalho,
      payload: item.payload,
      erroParse: item.erro,
      contexto: params.contexto,
    });

    const registro = finalizarRegistroValidado(params.modulo, item.linha, {
      ...parcial,
      inconsistencias: [...inconsistenciasArquivo, ...parcial.inconsistencias],
      regrasAplicadas: [
        ...parcial.regrasAplicadas,
        ...(inconsistenciasArquivo.length > 0 ? ["motor.validar_estrutura_arquivo"] : []),
      ],
    });
    registro.resultado = classificarResultadoValidacao(registro.inconsistencias);
    registros.push(registro);

    const convertido = registroValidadoParaLinhaParseada(registro, item.payload);
    linhas.push({
      linha: item.linha,
      ...convertido,
    });
  };

  for (const item of parseadas) {
    aplicarLinha(item);
  }

  if (parseadas.length === 0) {
    const registro = finalizarRegistroValidado(params.modulo, 1, {
      dadosOriginais: {},
      dadosNormalizados: null,
      inconsistencias: inconsistenciasArquivo,
      regrasAplicadas: ["motor.validar_estrutura_arquivo"],
    });
    if (registro.inconsistencias.length > 0) {
      registros.push(registro);
      linhas.push({
        linha: 1,
        erro: registro.resultado === "erro" ? registro.inconsistencias.map((item) => item.mensagem).join(" ") : undefined,
        validacao: registro,
      });
    }
  }

  return { linhas, registros, inconsistenciasArquivo };
}
