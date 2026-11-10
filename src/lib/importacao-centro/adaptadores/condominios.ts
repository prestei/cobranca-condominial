import { agoraIso, opcoesAdvogadosResponsaveis, proximoNumero, type Condominio, type Importacao } from "@/data/catalogo";
import { getCadastros, registrarAuditoria, setCondominios } from "@/data/catalogo-store";
import {
  interpretarPlanilhaCondominios,
  type CondominioImportPayload,
} from "@/lib/condominios/importar-planilha";
import { serializarObservacaoImportacao } from "@/lib/importacoes/hash-arquivo";
import {
  chaveDuplicidadeCondominioNoArquivo,
  detectarDuplicidadeCondominio,
} from "@/lib/importacao-centro/detecao-duplicidades";
import { situacaoAPartirDaDetecao } from "@/lib/importacao-centro/detecao-duplicidades/mapear-linha";
import { chaveIdentificadorExterno } from "@/lib/importacao-centro/detecao-duplicidades/chaves";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
} from "@/lib/importacao-centro/types";

export const FORMATO_IMPORTACAO_CONDOMINIOS_V1 = "planilha-condominios-v1";

export type ContextoImportacaoCondominios = {
  advogadosValidos: string[];
  condominios: Condominio[];
  condominiosMutaveis: Condominio[];
  identificadoresEmUso: Set<string>;
};

function classificarCondominio(
  payload: CondominioImportPayload,
  contexto: ContextoImportacaoCondominios,
): Pick<LinhaConferencia<CondominioImportPayload>, "situacao" | "mensagem" | "resumo" | "conflito"> {
  const ext = chaveIdentificadorExterno(payload.identificadorExterno);
  if (ext && contexto.identificadoresEmUso.has(ext)) {
    return {
      situacao: "duplicado",
      mensagem: "Identificador repetido na planilha.",
      resumo: { nome: payload.nome, identificadorExterno: payload.identificadorExterno },
    };
  }

  const detecao = detectarDuplicidadeCondominio(payload, contexto.condominios);
  const mapeado = situacaoAPartirDaDetecao(detecao);
  return {
    ...mapeado,
    resumo: { nome: payload.nome, identificadorExterno: payload.identificadorExterno },
  };
}

export function criarContextoImportacaoCondominios(advogadosValidos: string[]): ContextoImportacaoCondominios {
  const condominios = [...getCadastros().condominios];
  const identificadoresEmUso = new Set(
    condominios
      .map((item) => chaveIdentificadorExterno(item.identificadorExterno))
      .filter((item): item is string => Boolean(item)),
  );
  return {
    advogadosValidos,
    condominios,
    condominiosMutaveis: [...condominios],
    identificadoresEmUso,
  };
}

export const adaptadorImportacaoCondominios: AdaptadorImportacao<CondominioImportPayload, ContextoImportacaoCondominios> =
  {
    modulo: "condominios",
    tipoImportacao: "condominios",
    formato: FORMATO_IMPORTACAO_CONDOMINIOS_V1,
    politicaAprovacao: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },

    prepararContexto(userId) {
      void userId;
      const advogadosValidos = opcoesAdvogadosResponsaveis(getCadastros());
      return criarContextoImportacaoCondominios(advogadosValidos);
    },

    interpretarMatriz(matriz, contexto): LinhaParseada<CondominioImportPayload>[] {
      const { linhas } = interpretarPlanilhaCondominios(matriz, contexto.advogadosValidos);
      return linhas;
    },

    validarOrigem(origem) {
      if (!origem.trim()) {
        return "Informe a origem do arquivo (ex.: exportação da carteira).";
      }
      return null;
    },

    chaveDuplicidadeNoArquivo(payload) {
      return chaveDuplicidadeCondominioNoArquivo(payload);
    },

    classificarContraBase(payload, contexto) {
      const classificacao = classificarCondominio(payload, contexto);
      const ext = chaveIdentificadorExterno(payload.identificadorExterno);
      if (ext && classificacao.situacao === "novo") {
        contexto.identificadoresEmUso.add(ext);
      }
      return classificacao;
    },

    arquivoJaImportado() {
      return false;
    },

    buscarImportacaoIdempotente() {
      return undefined;
    },

    persistirLinha(payload, situacao, contexto) {
      if (situacao !== "novo") return "ignorado";
      const nextId = proximoNumero(contexto.condominiosMutaveis.map((item) => item.id));
      const novo: Condominio = { id: nextId, ...payload };
      contexto.condominiosMutaveis = [...contexto.condominiosMutaveis, novo];
      const ext = chaveIdentificadorExterno(payload.identificadorExterno);
      if (ext) contexto.identificadoresEmUso.add(ext);
      return "novo";
    },

    finalizarPersistencia(contexto) {
      setCondominios(contexto.condominiosMutaveis);
    },

    montarRegistroImportacao(input) {
      const importacaoId = proximoNumero(getCadastros().importacoes.map((item) => item.id));
      const observacaoInterna = serializarObservacaoImportacao({
        hashArquivo: input.hashArquivo,
        formato: FORMATO_IMPORTACAO_CONDOMINIOS_V1,
        relatorio: input.relatorio,
      });

      return {
        id: importacaoId,
        origem: input.origem,
        tipo: "condominios",
        arquivo: input.arquivo,
        status: input.contadores.erros > 0 && input.contadores.novos === 0 ? "Erro" : "Concluida",
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
      aprovacao?: import("@/lib/importacao-centro/types").DadosAprovacaoImportacao,
    ) {
      registrarAuditoria(
        {
          entidade: "import",
          registroId: String(importacao.id),
          acao: "INSERT",
          dadosAnteriores: "",
          dadosNovos: JSON.stringify({
            tipo: "condominios",
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
