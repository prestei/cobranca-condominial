import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import type { ContextoImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { detectarDuplicidadeDebito } from "@/lib/importacao-centro/detecao-duplicidades";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { statusDebito } from "@/data/catalogo";
import { validarCodigoQuandoInformado } from "@/lib/importacao-centro/motor-validacao/cadastral";
import {
  REGRAS_CADASTRAIS_MOTOR,
  REGRAS_FINANCEIRAS_MOTOR,
  REGRAS_NEGOCIO_MOTOR,
  REGRAS_RELACIONAIS_MOTOR,
  CODIGOS_VALIDACAO,
} from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  inconsistenciaTipoDadoIncorreto,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import {
  inconsistenciaRegistroFinanceiroDuplicado,
  validarValoresFinanceiros,
} from "@/lib/importacao-centro/motor-validacao/financeira";
import { validarRestricaoCadastroInativo } from "@/lib/importacao-centro/motor-validacao/negocio";
import {
  localizarCondominioRelacional,
  localizarUnidadeRelacional,
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
    "bloco",
    "condominio",
    "condomínio",
    "condominio id",
    "condominio_id",
    "identificador condominio",
    "identificador condomínio",
    "identificador externo condominio",
    "referencia",
    "referência",
    "descricao",
    "descrição",
    "vencimento",
    "data vencimento",
    "valor",
    "valor original",
    "multa",
    "juros",
    "correcao",
    "correção",
    "valor atualizado",
    "status",
    "situacao",
    "situação",
    "data pagamento",
    "valor pago",
    "identificador externo",
    "id_externo",
    "responsavel",
    "responsável",
    "categoria",
    "categoria do debito",
    "categoria do débito",
    "total",
    "pagina",
    "página",
    "linha relatorio",
    "linha relatório",
    "interpretacao segura",
    "interpretação segura",
  ].map(normalizarCabecalhoPlanilha),
);

const COLUNAS_OBRIGATORIAS = ["unidade", "referencia", "vencimento"];

function validarCadastralDebito(row: DebitoImportRow, contexto: ContextoImportacaoDebitos): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  if (!row.referencia?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "erro",
        codigo: CODIGOS_VALIDACAO.cadastral.campoObrigatorio,
        mensagem: "Referência da cobrança é obrigatória.",
        campo: "referencia",
      }),
    );
  }
  itens.push(...validarCodigoQuandoInformado(row.identificadorExterno, "identificadorExterno", "Identificador externo"));
  if (!row.descricao?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "atencao",
        codigo: "cadastral.categoria_ausente",
        mensagem: "Categoria do débito não informada.",
        campo: "descricao",
      }),
    );
  }
  if (!row.metaOrigem?.responsavel?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "atencao",
        codigo: "cadastral.responsavel_ausente",
        mensagem: "Responsável financeiro não identificado na linha.",
        campo: "responsavel",
      }),
    );
  }
  const detecao = detectarDuplicidadeDebito(row, contexto.debitos);
  if (detecao.correspondencia === "possivel") {
    itens.push(
      inconsistenciaRegistroFinanceiroDuplicado(
        "Já existe débito semelhante na base com diferenças; revise antes de atualizar.",
      ),
    );
  }
  return itens;
}

function validarNegocioDebito(row: DebitoImportRow, contexto: ContextoImportacaoDebitos): InconsistenciaValidacao[] {
  const condominio = localizarCondominioRelacional(contexto.condominios, row.condominioId);
  const unidade = localizarUnidadeRelacional(contexto.unidades, row.unidadeId);
  const itens = validarRestricaoCadastroInativo({ condominio, unidade });
  if (row.status?.trim() && !statusDebito.includes(row.status as (typeof statusDebito)[number])) {
    itens.push(
      inconsistenciaTipoDadoIncorreto("status", "Tipo de dado incorreto: situação do débito não reconhecida."),
    );
  }
  return itens;
}

export const validadorImportacaoDebitos: ValidadorModuloImportacao<DebitoImportRow, ContextoImportacaoDebitos> = {
  modulo: "debitos",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,
  regrasDoModulo: [
    ...REGRAS_CADASTRAIS_MOTOR,
    ...REGRAS_RELACIONAIS_MOTOR,
    ...REGRAS_FINANCEIRAS_MOTOR,
    ...REGRAS_NEGOCIO_MOTOR,
  ],

  validarEstruturaArquivo(matriz) {
    const cabecalho = extrairCabecalhoNormalizado(matriz);
    const temCondominio =
      cabecalho.includes("condominio") ||
      cabecalho.includes("condominio id") ||
      cabecalho.includes("identificador condominio");
    const obrigatorias = [...COLUNAS_OBRIGATORIAS, ...(temCondominio ? [] : ["condominio"])];
    return validarCabecalhoEstrutural({
      cabecalho,
      colunasReconhecidas: COLUNAS_RECONHECIDAS,
      colunasObrigatorias: obrigatorias.map(normalizarCabecalhoPlanilha),
    });
  },

  validarRegistro(entrada: EntradaValidacaoRegistro<DebitoImportRow, ContextoImportacaoDebitos>) {
    const inconsistencias: InconsistenciaValidacao[] = [];
    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      inconsistencias.push(
        ...validarUnidadeComCondominio({
          condominioId: entrada.payload.condominioId,
          unidadeId: entrada.payload.unidadeId,
          condominios: entrada.contexto.condominios,
          unidades: entrada.contexto.unidades,
          exigirUnidade: true,
        }),
      );
      inconsistencias.push(...validarValoresFinanceiros(entrada.payload));
      inconsistencias.push(...validarCadastralDebito(entrada.payload, entrada.contexto));
      inconsistencias.push(...validarNegocioDebito(entrada.payload, entrada.contexto));
      if (entrada.payload.metaOrigem?.interpretacaoSegura === false) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "financeira",
            severidade: "atencao",
            codigo: "financeira.interpretacao_insegura",
            mensagem: "Registro não pôde ser interpretado com segurança; confira os valores do relatório.",
            campo: "valorAtualizado",
          }),
        );
      }
    } else if (!entrada.erroParse) {
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
      regrasAplicadas: [CODIGOS_VALIDACAO.motor.validarRegistro],
    };
  },
};
