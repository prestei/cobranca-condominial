import type { LinhaParseada } from "@/lib/importacao-centro/types";
import { inconsistenciasDeNormalizacao } from "@/lib/importacao-centro/inconsistencias-normalizacao";
import { classificarResultadoValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { extrairCabecalhoNormalizado } from "@/lib/importacao-centro/motor-validacao/estrutural";
import { finalizarRegistroValidado, registroValidadoParaLinhaParseada } from "@/lib/importacao-centro/motor-validacao/registro";
import { obterValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/registry";
import { criarValidadorGenericoImportacao } from "@/lib/importacao-centro/motor-validacao/validador-generico";

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
  const validador =
    obterValidadorModuloImportacao(params.modulo) ?? criarValidadorGenericoImportacao(params.modulo);

  const cabecalho = extrairCabecalhoNormalizado(params.matriz);
  const linhaPorNumero = new Map<number, string[]>();
  for (let i = 1; i < params.matriz.length; i += 1) {
    linhaPorNumero.set(i + 1, params.matriz[i] ?? []);
  }

  const parcial = validador.validarRegistro({
    linha: item.linha,
    linhaBruta: linhaPorNumero.get(item.linha) ?? [],
    cabecalho,
    payload: item.payload,
    erroParse: item.erro,
    contexto: params.contexto,
    camposNormalizados: item.camposNormalizados,
  });

  const dadosOriginais =
    params.dadosOriginaisPreservados && Object.keys(params.dadosOriginaisPreservados).length > 0
      ? params.dadosOriginaisPreservados
      : parcial.dadosOriginais;

  const inconsistenciasNorm = inconsistenciasDeNormalizacao(item.camposNormalizados);
  const registro = finalizarRegistroValidado(params.modulo, item.linha, {
    ...parcial,
    dadosOriginais,
    dadosNormalizados: item.payload ?? parcial.dadosNormalizados,
    inconsistencias: [...inconsistenciasNorm, ...parcial.inconsistencias],
    regrasAplicadas: [...parcial.regrasAplicadas, CODIGOS_VALIDACAO.motor.revalidarLinha],
  });
  registro.resultado = classificarResultadoValidacao(registro.inconsistencias);

  const convertido = registroValidadoParaLinhaParseada(registro, item.payload);
  return {
    linha: item.linha,
    camposNormalizados: item.camposNormalizados,
    ...convertido,
  };
}
