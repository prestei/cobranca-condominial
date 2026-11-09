import { statusUnidade, tiposUnidade } from "@/data/catalogo";
import type { UnidadeInput } from "@/lib/unidades/service";
import type { ContextoImportacaoUnidades } from "@/lib/importacao-centro/adaptadores/unidades";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  inconsistenciaRegistroExistente,
  validarCodigoQuandoInformado,
} from "@/lib/importacao-centro/motor-validacao/cadastral";
import { CODIGOS_VALIDACAO, REGRAS_CADASTRAIS_MOTOR, REGRAS_NEGOCIO_MOTOR, REGRAS_RELACIONAIS_MOTOR } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import { validarClassificacaoPermitida, validarRestricaoCadastroInativo } from "@/lib/importacao-centro/motor-validacao/negocio";
import {
  localizarCondominioRelacional,
  validarUnidadeComCondominio,
} from "@/lib/importacao-centro/motor-validacao/relacional";
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

function validarCadastralUnidade(payload: UnidadeInput, contexto: ContextoImportacaoUnidades): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  if (!payload.identificacao?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "erro",
        codigo: CODIGOS_VALIDACAO.cadastral.campoObrigatorio,
        mensagem: "Identificação da unidade é obrigatória.",
        campo: "identificacao",
      }),
    );
  }
  itens.push(...validarCodigoQuandoInformado(payload.identificacao, "identificacao", "Código da unidade"));
  const existente = contexto.unidades.find(
    (item) =>
      item.condominioId === payload.condominioId &&
      item.identificacao.trim().toLocaleLowerCase("pt-BR") === payload.identificacao.trim().toLocaleLowerCase("pt-BR") &&
      (item.bloco ?? "") === (payload.bloco ?? ""),
  );
  if (existente) {
    itens.push(
      inconsistenciaRegistroExistente(
        "identificacao",
        "Já existe unidade com o mesmo código neste condomínio; confira se não é duplicidade.",
      ),
    );
  }
  return itens;
}

export const validadorImportacaoUnidades: ValidadorModuloImportacao<UnidadeInput, ContextoImportacaoUnidades> = {
  modulo: "unidades",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,
  regrasDoModulo: [...REGRAS_CADASTRAIS_MOTOR, ...REGRAS_RELACIONAIS_MOTOR, ...REGRAS_NEGOCIO_MOTOR],

  validarEstruturaArquivo(matriz) {
    const cabecalho = extrairCabecalhoNormalizado(matriz);
    const temCondominio = cabecalho.includes("condominio") || cabecalho.includes("condominio id");
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
      inconsistencias.push(...validarCadastralUnidade(entrada.payload, entrada.contexto));
      inconsistencias.push(
        ...validarUnidadeComCondominio({
          condominioId: entrada.payload.condominioId,
          condominios: entrada.contexto.condominios,
        }),
      );
      const condominio = localizarCondominioRelacional(entrada.contexto.condominios, entrada.payload.condominioId);
      inconsistencias.push(...validarRestricaoCadastroInativo({ condominio }));
      inconsistencias.push(
        ...validarClassificacaoPermitida(entrada.payload.tipo, tiposUnidade, "tipo", "Tipo da unidade"),
      );
      inconsistencias.push(
        ...validarClassificacaoPermitida(entrada.payload.status, statusUnidade, "status", "Situação cadastral da unidade"),
      );
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas: [CODIGOS_VALIDACAO.motor.validarRegistro],
    };
  },
};
