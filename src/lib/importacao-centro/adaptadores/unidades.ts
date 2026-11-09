import {
  agoraIso,
  escopoCondominios,
  getCadastros,
  nomeCondominio,
  proximoNumero,
  registrarAuditoria,
  setUnidades,
  SITUACAO_COBRANCA_PADRAO,
  type Importacao,
  type Unidade,
} from "@/data/catalogo";
import { interpretarPlanilhaUnidades } from "@/lib/unidades/importar-planilha";
import type { UnidadeInput } from "@/lib/unidades/service";
import { serializarObservacaoImportacao } from "@/lib/importacoes/hash-arquivo";
import {
  chaveDuplicidadeUnidadeNoArquivo,
  detectarDuplicidadeUnidade,
} from "@/lib/importacao-centro/detecao-duplicidades";
import { situacaoAPartirDaDetecao } from "@/lib/importacao-centro/detecao-duplicidades/mapear-linha";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
} from "@/lib/importacao-centro/types";

export const FORMATO_IMPORTACAO_UNIDADES_V1 = "planilha-unidades-v1";

export type ContextoImportacaoUnidades = {
  condominios: Array<{ id: number; nome: string; status?: string }>;
  unidades: Unidade[];
  unidadesMutaveis: Unidade[];
};

function classificarUnidade(
  payload: UnidadeInput,
  contexto: ContextoImportacaoUnidades,
): Pick<LinhaConferencia<UnidadeInput>, "situacao" | "mensagem" | "resumo" | "conflito"> {
  const detecao = detectarDuplicidadeUnidade(payload, contexto.unidades);
  const mapeado = situacaoAPartirDaDetecao(detecao);
  return {
    ...mapeado,
    resumo: {
      condominio: nomeCondominio(payload.condominioId),
      unidade: payload.identificacao,
      bloco: payload.bloco ?? "",
    },
  };
}

export const adaptadorImportacaoUnidades: AdaptadorImportacao<UnidadeInput, ContextoImportacaoUnidades> = {
  modulo: "unidades",
  tipoImportacao: "unidades",
  formato: FORMATO_IMPORTACAO_UNIDADES_V1,
  politicaAprovacao: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },

  prepararContexto(userId) {
    const cadastros = getCadastros();
    const condominios = escopoCondominios(cadastros, userId).map((item) => ({
      id: item.id,
      nome: item.nome,
      status: item.status,
    }));
    const unidades = [...cadastros.unidades];
    return { condominios, unidades, unidadesMutaveis: [...unidades] };
  },

  interpretarMatriz(matriz, contexto): LinhaParseada<UnidadeInput>[] {
    const { linhas } = interpretarPlanilhaUnidades(matriz, contexto.condominios);
    return linhas;
  },

  validarOrigem(origem) {
    if (!origem.trim()) {
      return "Informe a origem do arquivo (ex.: exportação da carteira).";
    }
    return null;
  },

  chaveDuplicidadeNoArquivo(payload) {
    return chaveDuplicidadeUnidadeNoArquivo(payload);
  },

  classificarContraBase(payload, contexto) {
    return classificarUnidade(payload, contexto);
  },

  arquivoJaImportado() {
    return false;
  },

  buscarImportacaoIdempotente() {
    return undefined;
  },

  persistirLinha(payload, situacao, contexto) {
    if (situacao !== "novo") return "ignorado";
    const nextId = proximoNumero(contexto.unidadesMutaveis.map((item) => item.id));
    const nova: Unidade = {
      id: nextId,
      condominioId: payload.condominioId,
      identificacao: payload.identificacao,
      bloco: payload.bloco ?? "",
      tipo: payload.tipo,
      status: payload.status,
      situacao: payload.situacao ?? SITUACAO_COBRANCA_PADRAO,
    };
    contexto.unidadesMutaveis = [...contexto.unidadesMutaveis, nova];
    contexto.unidades.push(nova);
    return "novo";
  },

  finalizarPersistencia(contexto) {
    setUnidades(contexto.unidadesMutaveis);
  },

  montarRegistroImportacao(input) {
    const importacaoId = proximoNumero(getCadastros().importacoes.map((item) => item.id));
    const observacaoInterna = serializarObservacaoImportacao({
      hashArquivo: input.hashArquivo,
      formato: FORMATO_IMPORTACAO_UNIDADES_V1,
      relatorio: input.relatorio,
    });

    const status: Importacao["status"] =
      input.contadores.erros > 0 && input.contadores.novos === 0 ? "Erro" : "Concluida";

    return {
      id: importacaoId,
      origem: input.origem,
      tipo: "unidades",
      arquivo: input.arquivo,
      status,
      quantidadeRegistros: String(input.quantidadeRegistros),
      quantidadeImportados: String(input.contadores.novos),
      quantidadeAtualizados: "0",
      quantidadeErros: String(input.contadores.erros + input.contadores.duplicados),
      observacaoInterna,
      usuarioId: input.userId,
      dataImportacao: agoraIso(),
    };
  },

  registrarAuditoriaConfirmacao(
    importacao,
    contadores: ContadoresImportacao,
    userId,
    meta?: MetaExecucaoImportacao,
    aprovacao?,
  ) {
    registrarAuditoria(
      {
        entidade: "import",
        registroId: String(importacao.id),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: JSON.stringify({
          tipo: "unidades",
          novos: contadores.novos,
          duplicados: contadores.duplicados,
          erros: contadores.erros,
          aprovacaoExplicita: aprovacao?.confirmacaoExplicita ?? false,
          aprovadoPorUsuarioId: aprovacao?.aprovadoPorUsuarioId ?? userId,
          aprovadoEm: aprovacao?.aprovadoEm ?? importacao.dataImportacao,
        }),
        camposAlterados: "tipo, arquivo, quantidades, aprovacao",
      },
      userId,
      meta,
    );
  },
};
