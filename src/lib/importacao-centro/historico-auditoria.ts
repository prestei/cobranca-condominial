import { agoraIso, proximoNumero, type Importacao } from "@/data/catalogo";
import { getCadastros, registrarAuditoria, setImportacoes } from "@/data/catalogo-store";
import type { AcaoAuditoriaImportacao, RegistroAcaoImportacao } from "@/lib/importacao-centro/historico-types";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import {
  importacaoConcluidaOuParcial,
  montarResumoInconsistencias,
  resultadoFinanceiroDeResumo,
  type ResumoInconsistenciasImportacao,
  type SituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";
import type { ContadoresImportacao, DadosAprovacaoImportacao, MetaExecucaoImportacao } from "@/lib/importacao-centro/types";
import {
  mergeObservacaoImportacao,
  parseObservacaoImportacao,
  serializarObservacaoImportacao,
  type MetaObservacaoImportacao,
} from "@/lib/importacoes/hash-arquivo";

export type { AcaoAuditoriaImportacao, RegistroAcaoImportacao } from "@/lib/importacao-centro/historico-types";

export type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-consulta-types";
import type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-consulta-types";

/**
 * Persiste o registro de importação no histórico (tabela `import`).
 */
export function registrarHistoricoImportacao(importacao: Importacao): void {
  const existente = importacao.processoId
    ? getCadastros().importacoes.find((item) => item.processoId === importacao.processoId)
    : undefined;
  if (existente) {
    atualizarImportacaoPorId(existente.id, importacao);
    return;
  }
  setImportacoes((current) => [importacao, ...current]);
}

function atualizarImportacaoPorId(id: number, patch: Importacao): Importacao | null {
  let atualizado: Importacao | null = null;
  setImportacoes((current) =>
    current.map((item) => {
      if (item.id !== id) return item;
      atualizado = { ...item, ...patch, id: item.id };
      return atualizado;
    }),
  );
  return atualizado;
}

function buscarPorProcessoId(processoId: string): Importacao | undefined {
  return getCadastros().importacoes.find((item) => item.processoId === processoId);
}

export function obterImportacaoPorId(id: number): Importacao | undefined {
  return getCadastros().importacoes.find((item) => item.id === id);
}

export function registrarAcaoImportacao(
  importacaoId: number,
  acao: AcaoAuditoriaImportacao,
  userId: number,
  detalhe?: string,
): void {
  const registro: RegistroAcaoImportacao = { acao, usuarioId: userId, em: agoraIso(), detalhe };
  setImportacoes((current) =>
    current.map((item) => {
      if (item.id !== importacaoId) return item;
      const meta = parseObservacaoImportacao(item.observacaoInterna);
      const acoes = [...(meta.acoes ?? []), registro];
      return {
        ...item,
        observacaoInterna: serializarObservacaoImportacao(mergeObservacaoImportacao(meta, { acoes })),
      };
    }),
  );
}

export function criarImportacaoEmProcessamento(params: {
  processoId: string;
  userId: number;
  modulo: string;
  arquivo: string;
  quantidadeRegistros?: number;
  hashArquivo?: string;
}): Importacao {
  const existente = buscarPorProcessoId(params.processoId);
  if (existente && !importacaoConcluidaOuParcial(existente.status)) {
    return existente;
  }

  const agora = agoraIso();
  const observacaoInterna = serializarObservacaoImportacao({
    processoId: params.processoId,
    hashArquivo: params.hashArquivo,
    iniciadoEm: agora,
    usuarioIniciouId: params.userId,
    acoes: [
      {
        acao: "arquivo_recebido",
        usuarioId: params.userId,
        em: agora,
        detalhe: params.arquivo,
      },
    ],
  });

  const importacao: Importacao = {
    id: proximoNumero(getCadastros().importacoes.map((item) => item.id)),
    processoId: params.processoId,
    origem: "",
    tipo: params.modulo,
    arquivo: params.arquivo,
    status: "Em processamento",
    quantidadeRegistros: String(params.quantidadeRegistros ?? 0),
    quantidadeImportados: "0",
    quantidadeAtualizados: "0",
    quantidadeIgnorados: "0",
    quantidadeErros: "0",
    observacaoInterna,
    usuarioId: params.userId,
    iniciadoEm: agora,
    dataImportacao: agora,
    usuarioAprovacaoId: null,
    aprovadoEm: null,
  };

  setImportacoes((current) => [importacao, ...current]);
  return importacao;
}

export function registrarPreviaImportacao(params: {
  processoId: string;
  userId: number;
  modulo: string;
  origem: string;
  arquivo: string;
  hashArquivo: string;
  quantidadeRegistros: number;
  contadores: ContadoresImportacao;
  resumoAprovacao?: ResumoAprovacaoImportacao;
  relatorio?: MetaObservacaoImportacao["relatorio"];
}): Importacao {
  let alvo = buscarPorProcessoId(params.processoId);
  if (!alvo) {
    alvo = criarImportacaoEmProcessamento({
      processoId: params.processoId,
      userId: params.userId,
      modulo: params.modulo,
      arquivo: params.arquivo,
      quantidadeRegistros: params.quantidadeRegistros,
      hashArquivo: params.hashArquivo,
    });
  }

  const agora = agoraIso();
  const resumoInconsistencias = montarResumoInconsistencias({
    contadores: params.contadores,
    contagensPrevia: params.resumoAprovacao?.contagens,
    relatorio: params.relatorio,
  });
  const resultadoFinanceiro = resultadoFinanceiroDeResumo(params.resumoAprovacao);

  const metaAtual = parseObservacaoImportacao(alvo.observacaoInterna);
  const acao: RegistroAcaoImportacao = {
    acao: "previa_gerada",
    usuarioId: params.userId,
    em: agora,
    detalhe: `${params.quantidadeRegistros} linha(s) processada(s)`,
  };

  const observacaoInterna = serializarObservacaoImportacao(
    mergeObservacaoImportacao(metaAtual, {
      processoId: params.processoId,
      hashArquivo: params.hashArquivo,
      resumoInconsistencias,
      resultadoFinanceiro,
      acoes: [...(metaAtual.acoes ?? []), acao],
    }),
  );

  const ignorados =
    params.contadores.ignorados +
    params.contadores.duplicados +
    params.contadores.manualProtegido +
    params.contadores.revisoes;

  return (
    atualizarImportacaoPorId(alvo.id, {
      ...alvo,
      origem: params.origem,
      arquivo: params.arquivo,
      status: "Aguardando conferencia",
      quantidadeRegistros: String(params.quantidadeRegistros),
      quantidadeIgnorados: String(ignorados),
      quantidadeErros: String(params.contadores.erros),
      observacaoInterna,
    }) ?? alvo
  );
}

export function registrarAprovacaoPendente(processoId: string, userId: number): Importacao | null {
  const alvo = buscarPorProcessoId(processoId);
  if (!alvo) return null;
  const agora = agoraIso();
  const meta = parseObservacaoImportacao(alvo.observacaoInterna);
  const acao: RegistroAcaoImportacao = {
    acao: "aprovacao_solicitada",
    usuarioId: userId,
    em: agora,
  };
  return (
    atualizarImportacaoPorId(alvo.id, {
      ...alvo,
      status: "Aguardando aprovacao",
      observacaoInterna: serializarObservacaoImportacao(
        mergeObservacaoImportacao(meta, { acoes: [...(meta.acoes ?? []), acao] }),
      ),
    }) ?? null
  );
}

export function montarCamposHistoricoFinal(params: {
  situacao: SituacaoImportacao;
  contadores: ContadoresImportacao;
  quantidadeRegistros: number;
  relatorio?: MetaObservacaoImportacao["relatorio"];
  hashArquivo: string;
  formato?: string;
  aprovacao?: DadosAprovacaoImportacao;
  resumoInconsistencias?: ResumoInconsistenciasImportacao;
  resultadoFinanceiro?: { valor: string; moeda: "BRL" };
  processoId?: string;
  iniciadoEm?: string;
  usuarioIniciouId?: number;
}): Pick<
  Importacao,
  | "status"
  | "quantidadeRegistros"
  | "quantidadeImportados"
  | "quantidadeAtualizados"
  | "quantidadeIgnorados"
  | "quantidadeErros"
  | "observacaoInterna"
  | "usuarioAprovacaoId"
  | "aprovadoEm"
  | "dataImportacao"
> {
  const ignorados =
    params.contadores.ignorados +
    params.contadores.duplicados +
    params.contadores.manualProtegido +
    params.contadores.revisoes;

  const resumoInconsistencias =
    params.resumoInconsistencias ??
    montarResumoInconsistencias({ contadores: params.contadores, relatorio: params.relatorio });

  const observacaoInterna = serializarObservacaoImportacao({
    processoId: params.processoId,
    hashArquivo: params.hashArquivo,
    formato: params.formato,
    relatorio: params.relatorio,
    resumoInconsistencias,
    resultadoFinanceiro: params.resultadoFinanceiro,
    iniciadoEm: params.iniciadoEm,
    aprovadoEm: params.aprovacao?.aprovadoEm,
    usuarioIniciouId: params.usuarioIniciouId,
    usuarioAprovouId: params.aprovacao?.aprovadoPorUsuarioId,
  });

  const aprovadoEm = params.aprovacao?.aprovadoEm ?? agoraIso();

  return {
    status: params.situacao,
    quantidadeRegistros: String(params.quantidadeRegistros),
    quantidadeImportados: String(params.contadores.novos),
    quantidadeAtualizados: String(params.contadores.atualizacoes),
    quantidadeIgnorados: String(ignorados),
    quantidadeErros: String(params.contadores.erros),
    observacaoInterna,
    usuarioAprovacaoId: params.aprovacao?.aprovadoPorUsuarioId ?? null,
    aprovadoEm,
    dataImportacao: aprovadoEm,
  };
}

export function anexarAcaoConfirmacao(
  importacao: Importacao,
  userId: number,
  idempotente: boolean,
  meta?: MetaExecucaoImportacao,
): void {
  const acao: AcaoAuditoriaImportacao = idempotente ? "confirmacao_idempotente" : "confirmacao_gravada";
  registrarAcaoImportacao(importacao.id, acao, userId, idempotente ? "Reconfirmação do mesmo arquivo" : undefined);
  registrarAuditoriaImportacaoConfirmacao(importacao, userId, meta, acao);
}

export function registrarAuditoriaImportacaoConfirmacao(
  importacao: Importacao,
  userId: number,
  meta: MetaExecucaoImportacao | undefined,
  acao: AcaoAuditoriaImportacao,
  contadores?: ContadoresImportacao,
): void {
  const metaObs = parseObservacaoImportacao(importacao.observacaoInterna);
  registrarAuditoria(
    {
      entidade: "import",
      registroId: String(importacao.id),
      acao: acao === "confirmacao_idempotente" ? "UPDATE" : "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        processoId: importacao.processoId ?? metaObs.processoId,
        tipo: importacao.tipo,
        arquivo: importacao.arquivo,
        status: importacao.status,
        quantidadeRegistros: importacao.quantidadeRegistros,
        quantidadeImportados: importacao.quantidadeImportados,
        quantidadeAtualizados: importacao.quantidadeAtualizados,
        quantidadeIgnorados: importacao.quantidadeIgnorados,
        quantidadeErros: importacao.quantidadeErros,
        usuarioIniciouId: importacao.usuarioId,
        usuarioAprovouId: importacao.usuarioAprovacaoId,
        iniciadoEm: importacao.iniciadoEm,
        aprovadoEm: importacao.aprovadoEm,
        contadores,
        acaoHistorico: acao,
      }),
      camposAlterados: "status, quantidades, aprovacao",
    },
    userId,
    meta,
  );
}

export function resumoContadoresParaAuditoria(contadores: ContadoresImportacao): Record<string, number> {
  return {
    novos: contadores.novos,
    atualizados: contadores.atualizacoes,
    duplicados: contadores.duplicados,
    erros: contadores.erros,
    manualProtegido: contadores.manualProtegido,
    revisoes: contadores.revisoes,
    ignorados: contadores.ignorados,
  };
}

function mascararHash(hash?: string): string | undefined {
  if (!hash?.trim()) return undefined;
  if (hash.length <= 12) return "••••••••";
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

/** Remove metadados internos para perfis sem permissão de auditoria completa. */
export function sanitizarImportacaoParaConsulta(
  importacao: Importacao,
  opcoes: { exporDetalhesInternos: boolean },
): ImportacaoConsulta {
  const meta = parseObservacaoImportacao(importacao.observacaoInterna);
  const base: ImportacaoConsulta = {
    ...importacao,
    processoId: importacao.processoId ?? meta.processoId,
    iniciadoEm: importacao.iniciadoEm ?? meta.iniciadoEm,
    aprovadoEm: importacao.aprovadoEm ?? meta.aprovadoEm ?? null,
    usuarioAprovacaoId: importacao.usuarioAprovacaoId ?? meta.usuarioAprovouId ?? null,
    resumoInconsistencias: meta.resumoInconsistencias,
    resultadoFinanceiro: meta.resultadoFinanceiro,
    acoes: meta.acoes,
  };

  if (opcoes.exporDetalhesInternos) {
    return base;
  }

  return {
    ...base,
    observacaoInterna: "",
    hashArquivoMascarado: mascararHash(meta.hashArquivo),
    acoes: base.acoes?.map((item) => ({
      ...item,
      detalhe: item.detalhe ? "[oculto]" : undefined,
    })),
  };
}

export type CallbackAuditoriaImportacao = (
  importacao: Importacao,
  contadores: ContadoresImportacao,
  userId: number,
  meta?: MetaExecucaoImportacao,
) => void;
