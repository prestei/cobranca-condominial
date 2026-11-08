import type { ContextoImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  normalizarCpfCnpjImportacao,
  normalizarEmailImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
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

function validarRelacionalResponsavel(
  payload: ResponsavelVinculoImportPayload,
  contexto: ContextoImportacaoResponsaveis,
): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const unidade = contexto.unidades.find((item) => item.id === payload.unidadeId);
  if (!unidade) {
    itens.push(
      criarInconsistencia({
        categoria: "relacional",
        severidade: "erro",
        codigo: "relacional.unidade_inexistente",
        mensagem: "Unidade não encontrada no escopo do usuário.",
        campo: "unidadeId",
      }),
    );
  }
  return itens;
}

export const validadorImportacaoResponsaveis: ValidadorModuloImportacao<
  ResponsavelVinculoImportPayload,
  ContextoImportacaoResponsaveis
> = {
  modulo: "responsaveis",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,

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
      const email = entrada.payload.responsavel.email?.trim();
      if (email) {
        const norm = normalizarEmailImportacao(email);
        if (norm.erro) {
          inconsistencias.push(
            criarInconsistencia({
              categoria: "cadastral",
              severidade: "atencao",
              codigo: "cadastral.email_invalido",
              mensagem: norm.erro,
              campo: "email",
            }),
          );
        }
      }
      const doc = normalizarCpfCnpjImportacao(entrada.payload.responsavel.cpfCnpj);
      if (doc.erro) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "cadastral",
            severidade: "erro",
            codigo: "cadastral.documento_invalido",
            mensagem: doc.erro,
            campo: "cpfCnpj",
          }),
        );
      }
      inconsistencias.push(...validarRelacionalResponsavel(entrada.payload, entrada.contexto));
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas: ["motor.validar_registro"],
    };
  },
};
