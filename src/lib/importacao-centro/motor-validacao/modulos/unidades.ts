import type { UnidadeInput } from "@/lib/unidades/service";
import type { ContextoImportacaoUnidades } from "@/lib/importacao-centro/adaptadores/unidades";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import type {
  EntradaValidacaoRegistro,
  InconsistenciaValidacao,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao/types";

const COLUNAS_RECONHECIDAS = new Set(
  [
    "unidade",
    "identificacao",
    "identificação",
    "condominio",
    "condomínio",
    "condominio id",
    "condominio_id",
    "bloco",
    "tipo",
    "cadastro",
    "status",
    "cobranca",
    "cobrança",
    "situacao",
    "situação",
  ].map(normalizarCabecalhoPlanilha),
);

const COLUNAS_OBRIGATORIAS = ["unidade", "condominio"];

function validarRelacionalUnidade(
  payload: UnidadeInput,
  contexto: ContextoImportacaoUnidades,
): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const condominio = contexto.condominios.find((item) => item.id === payload.condominioId);
  if (!condominio) {
    itens.push(
      criarInconsistencia({
        categoria: "relacional",
        severidade: "erro",
        codigo: "relacional.condominio_inexistente",
        mensagem: "Unidade sem condomínio correspondente no escopo.",
        campo: "condominioId",
      }),
    );
  }
  return itens;
}

export const validadorImportacaoUnidades: ValidadorModuloImportacao<UnidadeInput, ContextoImportacaoUnidades> = {
  modulo: "unidades",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,

  validarEstruturaArquivo(matriz) {
    const cabecalho = extrairCabecalhoNormalizado(matriz);
    const temCondominio =
      cabecalho.includes("condominio") || cabecalho.includes("condominio id");
    const obrigatorias = temCondominio ? ["unidade"] : COLUNAS_OBRIGATORIAS;
    return validarCabecalhoEstrutural({
      cabecalho,
      colunasReconhecidas: COLUNAS_RECONHECIDAS,
      colunasObrigatorias: obrigatorias.map(normalizarCabecalhoPlanilha),
    });
  },

  validarRegistro(entrada: EntradaValidacaoRegistro<UnidadeInput, ContextoImportacaoUnidades>) {
    const inconsistencias: InconsistenciaValidacao[] = [];
    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      if (!entrada.payload.identificacao?.trim()) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "cadastral",
            severidade: "erro",
            codigo: "cadastral.campo_obrigatorio",
            mensagem: "Identificação da unidade é obrigatória.",
            campo: "identificacao",
          }),
        );
      }
      inconsistencias.push(...validarRelacionalUnidade(entrada.payload, entrada.contexto));
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas: ["motor.validar_registro"],
    };
  },
};
