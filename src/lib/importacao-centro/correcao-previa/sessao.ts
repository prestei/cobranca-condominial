import type { LinhaConferencia, LinhaParseada } from "@/lib/importacao-centro/types";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import { LIMITES_ARQUIVO_IMPORTACAO } from "@/lib/importacoes/limites";

export type SessaoPreviaImportacao<TPayload = unknown, TContexto = unknown> = {
  sessaoPreviaId: string;
  userId: number;
  hashArquivo: string;
  modulo: string;
  origem: string;
  arquivo: string;
  matriz: string[][];
  contexto: TContexto;
  parseadas: LinhaParseada<TPayload>[];
  linhasInternas: LinhaConferencia<TPayload>[];
  inconsistenciasArquivo: InconsistenciaValidacao[];
  historicoCorrecoes: RegistroHistoricoCorrecaoPrevia[];
  correcoesPorLinha: Map<number, Record<string, { original: string; corrigido: string }>>;
  criadoEm: number;
};

const sessoes = new Map<string, SessaoPreviaImportacao>();

function chaveSessao(userId: number, sessaoPreviaId: string): string {
  return `${userId}:${sessaoPreviaId}`;
}

export function registrarSessaoPreviaImportacao<TPayload, TContexto>(
  sessao: SessaoPreviaImportacao<TPayload, TContexto>,
): void {
  sessoes.set(chaveSessao(sessao.userId, sessao.sessaoPreviaId), sessao as SessaoPreviaImportacao);
}

export function obterSessaoPreviaImportacao<TPayload, TContexto>(
  userId: number,
  sessaoPreviaId: string,
  hashArquivo?: string,
): SessaoPreviaImportacao<TPayload, TContexto> | null {
  const sessao = sessoes.get(chaveSessao(userId, sessaoPreviaId)) as
    | SessaoPreviaImportacao<TPayload, TContexto>
    | undefined;
  if (!sessao) return null;
  if (Date.now() - sessao.criadoEm > LIMITES_ARQUIVO_IMPORTACAO.retencaoTemporariaMs) {
    removerSessaoPreviaImportacao(userId, sessaoPreviaId);
    return null;
  }
  if (hashArquivo && sessao.hashArquivo !== hashArquivo) return null;
  return sessao;
}

export function atualizarSessaoPreviaImportacao<TPayload, TContexto>(
  userId: number,
  sessaoPreviaId: string,
  atualizar: Pick<SessaoPreviaImportacao<TPayload, TContexto>, "parseadas" | "linhasInternas" | "historicoCorrecoes" | "correcoesPorLinha">,
): void {
  const sessao = obterSessaoPreviaImportacao<TPayload, TContexto>(userId, sessaoPreviaId);
  if (!sessao) return;
  sessao.parseadas = atualizar.parseadas;
  sessao.linhasInternas = atualizar.linhasInternas;
  sessao.historicoCorrecoes = atualizar.historicoCorrecoes;
  sessao.correcoesPorLinha = atualizar.correcoesPorLinha;
}

export function removerSessaoPreviaImportacao(userId: number, sessaoPreviaId: string): void {
  sessoes.delete(chaveSessao(userId, sessaoPreviaId));
}

/** Apenas para testes. */
export function _limparSessoesPreviaParaTeste(): void {
  sessoes.clear();
}
