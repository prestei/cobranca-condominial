import type { CondominioImportPayload } from "@/lib/condominios/importar-planilha";
import type { ContextoImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
import { statusCondominio } from "@/data/catalogo";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  inconsistenciaRegistroExistente,
  validarCodigoQuandoInformado,
  validarEmailQuandoInformado,
  validarNomeInformado,
} from "@/lib/importacao-centro/motor-validacao/cadastral";
import { CODIGOS_VALIDACAO, REGRAS_CADASTRAIS_MOTOR, REGRAS_NEGOCIO_MOTOR } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import { inconsistenciaNegocio, validarClassificacaoPermitida } from "@/lib/importacao-centro/motor-validacao/negocio";
import type {
  EntradaValidacaoRegistro,
  InconsistenciaValidacao,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao/types";

const COLUNAS_RECONHECIDAS = new Set(
  [
    "nome",
    "identificador",
    "identificador externo",
    "situacao",
    "situação",
    "status",
    "cidade",
    "estado",
    "administradora",
    "advogados",
    "advogado responsavel",
    "advogado responsável",
    "unidades",
    "cep",
    "logradouro",
    "numero",
    "número",
    "complemento",
    "observacao",
    "observação",
    "email",
    "e-mail",
  ].map((item) => normalizarCabecalhoPlanilha(item)),
);

const COLUNAS_OBRIGATORIAS = ["nome", "advogados"];

function validarCadastralCondominio(
  payload: CondominioImportPayload,
  contexto: ContextoImportacaoCondominios,
  dadosOriginais: Record<string, string>,
): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [
    ...validarNomeInformado(payload.nome, "nome", "Nome do condomínio"),
    ...validarCodigoQuandoInformado(payload.identificadorExterno, "identificadorExterno", "Identificador externo"),
    ...validarEmailQuandoInformado(dadosOriginais.email ?? dadosOriginais["e-mail"]),
  ];

  if (payload.advogados.length === 0) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "erro",
        codigo: CODIGOS_VALIDACAO.cadastral.campoObrigatorio,
        mensagem: "Informe ao menos um advogado responsável.",
        campo: "advogados",
      }),
    );
  }

  const nomeAlvo = payload.nome.trim().toLocaleLowerCase("pt-BR");
  const existente = contexto.condominios.find(
    (item) => item.nome.trim().toLocaleLowerCase("pt-BR") === nomeAlvo,
  );
  if (existente && !payload.identificadorExterno?.trim()) {
    itens.push(
      inconsistenciaRegistroExistente("nome", "Já existe condomínio com o mesmo nome; confira se não é duplicidade."),
    );
  }

  return itens;
}

function validarNegocioCondominio(
  payload: CondominioImportPayload,
  contexto: ContextoImportacaoCondominios,
): InconsistenciaValidacao[] {
  const itens = validarClassificacaoPermitida(payload.status, statusCondominio, "status", "Situação do condomínio");
  const validos = new Set(contexto.advogadosValidos);
  const invalidos = payload.advogados.filter((item) => !validos.has(item));
  if (invalidos.length > 0) {
    itens.push(
      inconsistenciaNegocio({
        codigo: CODIGOS_VALIDACAO.negocio.restricao,
        mensagem: `Advogado(s) fora das restrições do cadastro: ${invalidos.join(", ")}.`,
        campo: "advogados",
        severidade: "erro",
      }),
    );
  }
  return itens;
}

export const validadorImportacaoCondominios: ValidadorModuloImportacao<
  CondominioImportPayload,
  ContextoImportacaoCondominios
> = {
  modulo: "condominios",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,
  regrasDoModulo: [...REGRAS_CADASTRAIS_MOTOR, ...REGRAS_NEGOCIO_MOTOR],

  validarEstruturaArquivo(matriz) {
    return validarCabecalhoEstrutural({
      cabecalho: extrairCabecalhoNormalizado(matriz),
      colunasReconhecidas: COLUNAS_RECONHECIDAS,
      colunasObrigatorias: COLUNAS_OBRIGATORIAS.map(normalizarCabecalhoPlanilha),
    });
  },

  validarRegistro(entrada: EntradaValidacaoRegistro<CondominioImportPayload, ContextoImportacaoCondominios>) {
    const inconsistencias: InconsistenciaValidacao[] = [];
    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      inconsistencias.push(...validarCadastralCondominio(entrada.payload, entrada.contexto, dadosOriginais));
      inconsistencias.push(...validarNegocioCondominio(entrada.payload, entrada.contexto));
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas: [CODIGOS_VALIDACAO.motor.validarRegistro],
    };
  },
};
