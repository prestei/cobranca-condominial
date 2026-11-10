import { montarResumoLinhaDebitoImportacao } from "@/lib/importacao-centro/adaptadores/debitos";
import { aplicarCorrecoesPayloadDebitos } from "@/lib/importacao-centro/correcao-previa/modulos/debitos";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import {
  atualizarSessaoPreviaImportacao,
  obterSessaoPreviaImportacao,
  registrarSessaoPreviaImportacao,
  removerSessaoPreviaImportacao,
  type SessaoPreviaImportacao,
} from "@/lib/importacao-centro/correcao-previa/sessao";
import { montarPreview, pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import { revalidarLinhaMotorImportacao } from "@/lib/importacao-centro/motor-validacao/revalidar-linha";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
import { agoraIso } from "@/data/catalogo";
import type { AdaptadorImportacao, LinhaConferencia, LinhaParseada, PreviewImportacaoCentral } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import { assertPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";

export type EntradaRegistrarSessaoPrevia<TPayload, TContexto> = {
  sessaoPreviaId: string;
  userId: number;
  hashArquivo: string;
  origem: string;
  arquivo: string;
  matriz: string[][];
  contexto: TContexto;
  adapter: AdaptadorImportacao<TPayload, TContexto>;
  parseadas: LinhaParseada<TPayload>[];
  linhasInternas: LinhaConferencia<TPayload>[];
  inconsistenciasArquivo: import("@/lib/importacao-centro/motor-validacao/types").InconsistenciaValidacao[];
};

export function criarSessaoPreviaAposPreview<TPayload, TContexto>(
  entrada: EntradaRegistrarSessaoPrevia<TPayload, TContexto>,
): void {
  const sessao: SessaoPreviaImportacao<TPayload, TContexto> = {
    sessaoPreviaId: entrada.sessaoPreviaId,
    userId: entrada.userId,
    hashArquivo: entrada.hashArquivo,
    modulo: entrada.adapter.modulo,
    origem: entrada.origem,
    arquivo: entrada.arquivo,
    matriz: entrada.matriz,
    contexto: entrada.contexto,
    parseadas: entrada.parseadas,
    linhasInternas: entrada.linhasInternas,
    inconsistenciasArquivo: entrada.inconsistenciasArquivo,
    historicoCorrecoes: [],
    correcoesPorLinha: new Map(),
    criadoEm: Date.now(),
  };
  registrarSessaoPreviaImportacao(sessao);
}

export function obterPreviewDaSessao<TPayload, TContexto>(
  userId: number,
  sessaoPreviaId: string,
  hashArquivo: string,
  adapter: AdaptadorImportacao<TPayload, TContexto>,
): PreviewImportacaoCentral | null {
  const sessao = obterSessaoPreviaImportacao<TPayload, TContexto>(userId, sessaoPreviaId, hashArquivo);
  if (!sessao) return null;

  return montarPreview({
    hashArquivo: sessao.hashArquivo,
    origem: sessao.origem,
    arquivo: sessao.arquivo,
    adapter,
    contexto: sessao.contexto,
    linhas: sessao.linhasInternas,
    inconsistenciasArquivo: sessao.inconsistenciasArquivo,
  });
}

export type ResultadoCorrecaoLinhaPrevia = {
  preview: PreviewImportacaoCentral;
  linha: LinhaConferencia<DebitoImportRow>;
  historicoCorrecoes: RegistroHistoricoCorrecaoPrevia[];
  correcaoAceita: boolean;
  mensagens?: string[];
};

export async function corrigirLinhaPreviaDebitos(
  userId: number,
  input: {
    sessaoPreviaId: string;
    hashArquivo: string;
    linha: number;
    campos: Record<string, string>;
  },
  adapter: AdaptadorImportacao<DebitoImportRow, import("@/lib/importacao-centro/adaptadores/debitos").ContextoImportacaoDebitos>,
): Promise<ResultadoCorrecaoLinhaPrevia> {
  await assertPermissaoAcaoImportacao(userId, "corrigirRegistros");
  const sessao = obterSessaoPreviaImportacao<DebitoImportRow, import("@/lib/importacao-centro/adaptadores/debitos").ContextoImportacaoDebitos>(
    userId,
    input.sessaoPreviaId,
    input.hashArquivo,
  );
  if (!sessao) {
    throw new ImportacaoCentroError("Sessão de pré-visualização expirada ou inválida. Valide o arquivo novamente.", 404);
  }

  if (adapter.modulo !== "debitos") {
    throw new ImportacaoCentroError("Correção na prévia não suportada para este módulo.", 400);
  }

  const indice = sessao.parseadas.findIndex((item) => item.linha === input.linha);
  if (indice < 0) {
    throw new ImportacaoCentroError(`Linha ${input.linha} não encontrada na pré-visualização.`, 404);
  }

  const atual = sessao.parseadas[indice];
  const payloadBase =
    atual.payload ??
    (atual.validacao?.dadosNormalizados && typeof atual.validacao.dadosNormalizados === "object"
      ? (atual.validacao.dadosNormalizados as DebitoImportRow)
      : undefined);
  if (!payloadBase) {
    throw new ImportacaoCentroError("Esta linha não possui dados corrigíveis.", 400);
  }

  const { payload: payloadCorrigido, aplicadas, erros } = aplicarCorrecoesPayloadDebitos(payloadBase, input.campos);
  if (aplicadas.length === 0 && erros.length === 0) {
    throw new ImportacaoCentroError("Nenhuma alteração válida foi informada.", 400);
  }
  if (erros.length > 0) {
    throw new ImportacaoCentroError(erros.join(" "), 400);
  }

  const dadosOriginaisPreservados = atual.validacao?.dadosOriginais ?? {};
  const linhaRevalidada = revalidarLinhaMotorImportacao(
    { ...atual, payload: payloadCorrigido, erro: undefined },
    {
      modulo: adapter.modulo,
      matriz: sessao.matriz,
      contexto: sessao.contexto,
      inconsistenciasArquivo: sessao.inconsistenciasArquivo,
      dadosOriginaisPreservados,
    },
  );

  const parseadas = [...sessao.parseadas];
  parseadas[indice] = linhaRevalidada;

  const linhasInternas = pipelineConferencia(parseadas, adapter, sessao.contexto).map((item) => {
    if (item.linha !== input.linha) return item;
    if (!item.payload) return item;
    return {
      ...item,
      resumo: montarResumoLinhaDebitoImportacao(item.payload),
    };
  });

  const agora = agoraIso();
  const novosHistoricos: RegistroHistoricoCorrecaoPrevia[] = aplicadas.map((item) => ({
    linha: input.linha,
    campo: item.campo,
    valorOriginal: item.valorOriginal,
    valorCorrigido: item.valorCorrigido,
    aplicadoEm: agora,
    usuarioId: userId,
    revalidacao: linhaRevalidada.validacao?.resultado ?? "erro",
  }));

  const historicoCorrecoes = [...sessao.historicoCorrecoes, ...novosHistoricos];
  const correcoesPorLinha = new Map(sessao.correcoesPorLinha);
  const linhaCorrecoes = { ...(correcoesPorLinha.get(input.linha) ?? {}) };
  for (const item of aplicadas) {
    const existente = linhaCorrecoes[item.campo];
    linhaCorrecoes[item.campo] = {
      original: existente?.original ?? item.valorOriginal,
      corrigido: item.valorCorrigido,
    };
  }
  correcoesPorLinha.set(input.linha, linhaCorrecoes);

  atualizarSessaoPreviaImportacao(userId, input.sessaoPreviaId, {
    parseadas,
    linhasInternas,
    historicoCorrecoes,
    correcoesPorLinha,
  });

  const preview = montarPreview({
    hashArquivo: sessao.hashArquivo,
    origem: sessao.origem,
    arquivo: sessao.arquivo,
    adapter,
    contexto: sessao.contexto,
    linhas: linhasInternas,
    inconsistenciasArquivo: sessao.inconsistenciasArquivo,
  });

  const linhaAtualizada = linhasInternas.find((item) => item.linha === input.linha);
  if (!linhaAtualizada) {
    throw new ImportacaoCentroError("Não foi possível atualizar a linha após a correção.", 500);
  }

  const correcaoAceita = linhaRevalidada.validacao?.resultado !== "erro";

  return {
    preview,
    linha: linhaAtualizada,
    historicoCorrecoes: novosHistoricos,
    correcaoAceita,
    mensagens: linhaRevalidada.validacao?.inconsistencias.map((item) => item.mensagem),
  };
}

export function obterEstadoSessaoPreviaParaConfirmacao<TPayload, TContexto>(
  userId: number,
  sessaoPreviaId: string | undefined,
  hashArquivo: string,
): {
  parseadas: LinhaParseada<TPayload>[];
  linhasInternas: LinhaConferencia<TPayload>[];
  contexto: TContexto;
  historicoCorrecoes: RegistroHistoricoCorrecaoPrevia[];
  origem: string;
  arquivo: string;
} | null {
  if (!sessaoPreviaId) return null;
  const sessao = obterSessaoPreviaImportacao<TPayload, TContexto>(userId, sessaoPreviaId, hashArquivo);
  if (!sessao) return null;
  return {
    parseadas: sessao.parseadas,
    linhasInternas: sessao.linhasInternas,
    contexto: sessao.contexto,
    historicoCorrecoes: sessao.historicoCorrecoes,
    origem: sessao.origem,
    arquivo: sessao.arquivo,
  };
}

export function encerrarSessaoPrevia(userId: number, sessaoPreviaId: string | undefined): void {
  if (!sessaoPreviaId) return;
  removerSessaoPreviaImportacao(userId, sessaoPreviaId);
}
