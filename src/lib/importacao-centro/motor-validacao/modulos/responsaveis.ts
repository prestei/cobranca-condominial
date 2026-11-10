import { tiposVinculo } from "@/data/catalogo";
import type { ContextoImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis-types";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { normalizarCpfCnpjImportacao } from "@/lib/importacao-centro/normalizacao-campos";
import {
  inconsistenciaDocumentoInvalido,
  inconsistenciaRegistroExistente,
  validarCodigoQuandoInformado,
  validarEmailQuandoInformado,
  validarNomeInformado,
} from "@/lib/importacao-centro/motor-validacao/cadastral";
import { CODIGOS_VALIDACAO, REGRAS_CADASTRAIS_MOTOR, REGRAS_NEGOCIO_MOTOR, REGRAS_RELACIONAIS_MOTOR } from "@/lib/importacao-centro/motor-validacao/codigos";
import { inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import { validarClassificacaoPermitida } from "@/lib/importacao-centro/motor-validacao/negocio";
import { validarResponsavelComUnidade } from "@/lib/importacao-centro/motor-validacao/relacional";
import type {
  EntradaValidacaoRegistro,
  InconsistenciaValidacao,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao/types";
import type { ResponsavelVinculoImportPayload } from "@/lib/responsaveis/importar-planilha";

const COLUNAS_RECONHECIDAS = new Set(
  [
    "unidade",
    "identificacao",
    "identificação",
    "bloco",
    "condominio",
    "condomínio",
    "condominio id",
    "nome",
    "cpf cnpj",
    "cpf/cnpj",
    "cpf",
    "cnpj",
    "documento",
    "tipo pessoa",
    "telefone",
    "whatsapp",
    "email",
    "e-mail",
    "endereco",
    "endereço",
    "observacoes",
    "observações",
    "tipo vinculo",
    "tipo vínculo",
    "vinculo",
    "vínculo",
    "principal",
    "identificador externo",
    "identificador",
  ].map(normalizarCabecalhoPlanilha),
);

const COLUNAS_OBRIGATORIAS = ["unidade", "condominio", "nome", "cpf cnpj"];

export const validadorImportacaoResponsaveis: ValidadorModuloImportacao<
  ResponsavelVinculoImportPayload,
  ContextoImportacaoResponsaveis
> = {
  modulo: "responsaveis",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,
  regrasDoModulo: [...REGRAS_CADASTRAIS_MOTOR, ...REGRAS_RELACIONAIS_MOTOR, ...REGRAS_NEGOCIO_MOTOR],

  validarEstruturaArquivo(matriz) {
    const cabecalho = extrairCabecalhoNormalizado(matriz);
    const temCondominio = cabecalho.includes("condominio") || cabecalho.includes("condominio id");
    const temDocumento =
      cabecalho.includes("cpf cnpj") ||
      cabecalho.includes("cpf/cnpj") ||
      cabecalho.includes("cpf") ||
      cabecalho.includes("cnpj") ||
      cabecalho.includes("documento");
    const obrigatorias = temCondominio ? ["unidade", "nome"] : ["unidade", "condominio", "nome"];
    const lista = obrigatorias.map(normalizarCabecalhoPlanilha);
    if (!temDocumento) lista.push(normalizarCabecalhoPlanilha("cpf cnpj"));

    return validarCabecalhoEstrutural({
      cabecalho,
      colunasReconhecidas: COLUNAS_RECONHECIDAS,
      colunasObrigatorias: lista,
    });
  },

  validarRegistro(entrada: EntradaValidacaoRegistro<ResponsavelVinculoImportPayload, ContextoImportacaoResponsaveis>) {
    const inconsistencias: InconsistenciaValidacao[] = [];
    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      inconsistencias.push(
        ...validarNomeInformado(entrada.payload.responsavel.nome, "nome", "Nome do responsável"),
      );
      inconsistencias.push(
        ...validarCodigoQuandoInformado(
          entrada.payload.identificadorExterno,
          "identificadorExterno",
          "Identificador externo",
        ),
      );
      inconsistencias.push(...validarEmailQuandoInformado(entrada.payload.responsavel.email));
      const doc = entrada.payload.responsavel.cpfCnpj?.trim() ?? "";
      if (doc) {
        const norm = normalizarCpfCnpjImportacao(doc);
        if (norm.erro) {
          inconsistencias.push(inconsistenciaDocumentoInvalido("cpfCnpj", norm.erro));
        }
      }
      const docDigitos = doc.replace(/\D/g, "");
      if (docDigitos) {
        const existente = entrada.contexto.responsaveis.find(
          (item) => item.cpfCnpj.replace(/\D/g, "") === docDigitos,
        );
        if (existente) {
          inconsistencias.push(
            inconsistenciaRegistroExistente(
              "cpfCnpj",
              "Já existe responsável com o mesmo documento; o vínculo será conferido na prévia.",
            ),
          );
        }
      }
      inconsistencias.push(
        ...validarResponsavelComUnidade({
          unidadeId: entrada.payload.unidadeId,
          unidades: entrada.contexto.unidades,
        }),
      );
      inconsistencias.push(
        ...validarClassificacaoPermitida(
          entrada.payload.tipoVinculo,
          tiposVinculo,
          "tipoVinculo",
          "Tipo de vínculo",
        ),
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
