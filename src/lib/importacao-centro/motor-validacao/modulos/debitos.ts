import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import type { ContextoImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
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

function valorNumerico(valor: string): number | null {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function validarFinanceiro(row: DebitoImportRow): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const atualizado = valorNumerico(row.valorAtualizado);
  if (atualizado !== null && atualizado < 0) {
    itens.push(
      criarInconsistencia({
        categoria: "financeira",
        severidade: "erro",
        codigo: "financeira.valor_negativo",
        mensagem: "Valor atualizado não pode ser negativo.",
        campo: "valorAtualizado",
      }),
    );
  }

  const componentes = ["valorOriginal", "multa", "juros", "correcao"] as const;
  for (const campo of componentes) {
    const n = valorNumerico(row[campo]);
    if (n !== null && n < 0) {
      itens.push(
        criarInconsistencia({
          categoria: "financeira",
          severidade: "erro",
          codigo: "financeira.valor_negativo",
          mensagem: `Campo ${campo} não pode ser negativo.`,
          campo,
        }),
      );
    }
  }

  if (atualizado !== null && atualizado > 0) {
    const soma =
      (valorNumerico(row.valorOriginal) ?? valorNumerico(row.valor) ?? 0) +
      (valorNumerico(row.multa) ?? 0) +
      (valorNumerico(row.juros) ?? 0) +
      (valorNumerico(row.correcao) ?? 0);
    if (soma > 0 && Math.abs(soma - atualizado) > 0.02) {
      itens.push(
        criarInconsistencia({
          categoria: "financeira",
          severidade: "atencao",
          codigo: "financeira.soma_divergente",
          mensagem: "Soma de componentes difere do valor atualizado; confira antes de importar.",
          campo: "valorAtualizado",
        }),
      );
    }
  }

  if (!row.dataVencimento?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "financeira",
        severidade: "erro",
        codigo: "financeira.vencimento_invalido",
        mensagem: "Data de vencimento inválida ou ausente.",
        campo: "dataVencimento",
      }),
    );
  }

  return itens;
}

function validarRelacional(
  row: DebitoImportRow,
  contexto: ContextoImportacaoDebitos,
): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const condominio = contexto.condominios.find((item) => item.id === row.condominioId);
  if (!condominio) {
    itens.push(
      criarInconsistencia({
        categoria: "relacional",
        severidade: "erro",
        codigo: "relacional.condominio_inexistente",
        mensagem: "Condomínio não encontrado no escopo.",
        campo: "condominioId",
      }),
    );
  }

  const unidade = contexto.unidades.find((item) => item.id === row.unidadeId);
  if (!unidade) {
    itens.push(
      criarInconsistencia({
        categoria: "relacional",
        severidade: "erro",
        codigo: "relacional.unidade_inexistente",
        mensagem: "Unidade não encontrada no escopo.",
        campo: "unidadeId",
      }),
    );
  } else if (unidade.condominioId !== row.condominioId) {
    itens.push(
      criarInconsistencia({
        categoria: "relacional",
        severidade: "erro",
        codigo: "relacional.vinculo_incompativel",
        mensagem: "Unidade não pertence ao condomínio informado.",
        campo: "unidadeId",
      }),
    );
  }

  return itens;
}

export const validadorImportacaoDebitos: ValidadorModuloImportacao<DebitoImportRow, ContextoImportacaoDebitos> = {
  modulo: "debitos",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,

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
    const regrasAplicadas: string[] = ["motor.validar_registro"];

    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      inconsistencias.push(...validarRelacional(entrada.payload, entrada.contexto));
      inconsistencias.push(...validarFinanceiro(entrada.payload));
      if (!entrada.payload.referencia?.trim()) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "cadastral",
            severidade: "erro",
            codigo: "cadastral.campo_obrigatorio",
            mensagem: "Referência da cobrança é obrigatória.",
            campo: "referencia",
          }),
        );
      }
      if (!entrada.payload.descricao?.trim()) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "cadastral",
            severidade: "atencao",
            codigo: "cadastral.categoria_ausente",
            mensagem: "Categoria do débito não informada.",
            campo: "descricao",
          }),
        );
      }
      if (!entrada.payload.metaOrigem?.responsavel?.trim()) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "cadastral",
            severidade: "atencao",
            codigo: "cadastral.responsavel_ausente",
            mensagem: "Responsável financeiro não identificado na linha.",
            campo: "responsavel",
          }),
        );
      }
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
          codigo: "estrutural.registro_vazio",
          mensagem: "Registro sem dados interpretáveis.",
        }),
      );
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas,
    };
  },
};
