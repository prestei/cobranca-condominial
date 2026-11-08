import type { LinhaParseada } from "@/lib/importacao-centro/types";
import { classificarResultadoValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
import { extrairCabecalhoNormalizado } from "@/lib/importacao-centro/motor-validacao/estrutural";
import { finalizarRegistroValidado, registroValidadoParaLinhaParseada } from "@/lib/importacao-centro/motor-validacao/registro";
import { obterValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/registry";

/**
 * Revalida um único registro após correção na pré-visualização (Ticket 08).
 * Preserva `dadosOriginais` quando informados — não altera silenciosamente a origem.
 */
export function revalidarLinhaMotorImportacao<TPayload, TContexto>(
  item: LinhaParseada<TPayload>,
  params: {
    modulo: string;
    matriz: string[][];
    contexto: TContexto;
    inconsistenciasArquivo?: import("@/lib/importacao-centro/motor-validacao/types").InconsistenciaValidacao[];
    dadosOriginaisPreservados?: Record<string, string>;
  },
): LinhaParseada<TPayload> {
  const validador = obterValidadorModuloImportacao(params.modulo);
  if (!validador) return item;

  const cabecalho = extrairCabecalhoNormalizado(params.matriz);
  const linhaPorNumero = new Map<number, string[]>();
  for (let i = 1; i < params.matriz.length; i += 1) {
    linhaPorNumero.set(i + 1, params.matriz[i] ?? []);
  }

  const inconsistenciasArquivo = params.inconsistenciasArquivo ?? [];
  const parcial = validador.validarRegistro({
    linha: item.linha,
    linhaBruta: linhaPorNumero.get(item.linha) ?? [],
    cabecalho,
    payload: item.payload,
    erroParse: item.erro,
    contexto: params.contexto,
  });

  const dadosOriginais =
    params.dadosOriginaisPreservados && Object.keys(params.dadosOriginaisPreservados).length > 0
      ? params.dadosOriginaisPreservados
      : parcial.dadosOriginais;

  const registro = finalizarRegistroValidado(params.modulo, item.linha, {
    ...parcial,
    dadosOriginais,
    dadosNormalizados: item.payload ?? parcial.dadosNormalizados,
    inconsistencias: [...inconsistenciasArquivo, ...parcial.inconsistencias],
    regrasAplicadas: [
      ...parcial.regrasAplicadas,
      ...(inconsistenciasArquivo.length > 0 ? ["motor.validar_estrutura_arquivo"] : []),
      "motor.revalidar_linha_previa",
    ],
  });
  registro.resultado = classificarResultadoValidacao(registro.inconsistencias);

  const convertido = registroValidadoParaLinhaParseada(registro, item.payload);
  return {
    linha: item.linha,
    ...convertido,
  };
}
