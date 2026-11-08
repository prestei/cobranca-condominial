import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  nomeCondominio,
  nomeUnidade,
  proximoNumero,
  registrarAuditoria,
  setDebitos,
  type Debito,
  type Importacao,
} from "@/data/catalogo";
import {
  chaveDuplicidadeDebitoNoArquivo,
  detectarDuplicidadeDebito,
  encontrarDebitoCorrespondente,
} from "@/lib/importacao-centro/detecao-duplicidades";
import { situacaoAPartirDaDetecao } from "@/lib/importacao-centro/detecao-duplicidades/mapear-linha";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import {
  FORMATO_IMPORTACAO_DEBITOS_V1,
  interpretarPlanilhaDebitos,
  origemImportacaoValida,
  type DebitoImportRow,
} from "@/lib/importacoes/importar-debitos-planilha";
import { montarCamposHistoricoFinal } from "@/lib/importacao-centro/historico-auditoria";
import { resolverSituacaoFinalImportacao, importacaoConcluidaOuParcial } from "@/lib/importacao-centro/situacao-importacao";
import { parseObservacaoImportacao } from "@/lib/importacoes/hash-arquivo";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
} from "@/lib/importacao-centro/types";

export type ContextoImportacaoDebitos = {
  condominios: Array<{ id: number; nome: string; identificadorExterno: string }>;
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>;
  debitos: Debito[];
  debitosMutaveis: Debito[];
  formatoDetectado?: string;
  inconsistenciasRelatorio?: InconsistenciaValidacao[];
};

export function montarResumoLinhaDebitoImportacao(row: DebitoImportRow): Record<string, string> {
  return {
    condominio: nomeCondominio(row.condominioId),
    unidade: nomeUnidade(row.unidadeId),
    responsavel: row.metaOrigem?.responsavel?.trim() || "—",
    categoria: row.descricao.trim() || row.status.trim() || "—",
    referencia: row.referencia,
    vencimento: row.dataVencimento,
    valorOriginal: row.valorOriginal || row.valor,
    multa: row.multa,
    juros: row.juros,
    correcao: row.correcao,
    total: row.valorAtualizado,
    valorAtualizado: row.valorAtualizado,
    identificadorExterno: row.identificadorExterno,
  };
}

function celulaDadosOriginais(dados: Record<string, string>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = dados[chave]?.trim();
    if (valor && valor !== "—") return valor;
  }
  return "—";
}

/** Exibe valores do PDF/planilha na prévia mesmo quando o parse ainda não gerou payload. */
export function montarResumoDebitoDeDadosOriginais(dados: Record<string, string>): Record<string, string> {
  return {
    condominio: celulaDadosOriginais(dados, "condominio"),
    unidade: celulaDadosOriginais(dados, "unidade"),
    responsavel: celulaDadosOriginais(dados, "responsavel", "responsável"),
    categoria: celulaDadosOriginais(dados, "categoria", "descricao", "descrição"),
    referencia: celulaDadosOriginais(dados, "referencia", "referência"),
    vencimento: celulaDadosOriginais(dados, "vencimento", "data vencimento"),
    valorOriginal: celulaDadosOriginais(dados, "valor original", "valor"),
    juros: celulaDadosOriginais(dados, "juros"),
    multa: celulaDadosOriginais(dados, "multa"),
    correcao: celulaDadosOriginais(dados, "correcao", "correção"),
    total: celulaDadosOriginais(dados, "total", "valor atualizado"),
    valorAtualizado: celulaDadosOriginais(dados, "total", "valor atualizado"),
  };
}

export function enriquecerLinhasConferenciaDebitos(
  linhas: LinhaConferencia<DebitoImportRow>[],
): LinhaConferencia<DebitoImportRow>[] {
  return linhas.map((item) => {
    if (item.resumo && Object.values(item.resumo).some((valor) => valor.trim() && valor !== "—")) {
      return item;
    }
    const dados = item.validacao?.dadosOriginais;
    if (!dados || Object.keys(dados).length === 0) return item;
    return { ...item, resumo: montarResumoDebitoDeDadosOriginais(dados) };
  });
}

function debitoEquivalente(a: Debito, row: DebitoImportRow): boolean {
  return (
    a.unidadeId === row.unidadeId &&
    a.referencia.trim() === row.referencia.trim() &&
    a.dataVencimento === row.dataVencimento &&
    a.valor.trim() === row.valor.trim() &&
    a.valorAtualizado === row.valorAtualizado &&
    a.status === row.status &&
    a.identificadorExterno.trim() === row.identificadorExterno.trim()
  );
}

function classificarDebitoContraBase(
  row: DebitoImportRow,
  debitos: Debito[],
): Pick<LinhaConferencia<DebitoImportRow>, "situacao" | "mensagem" | "resumo" | "conflito"> {
  const detecao = detectarDuplicidadeDebito(row, debitos);
  const mapeado = situacaoAPartirDaDetecao(detecao, { manualProtegido: detecao.manualProtegido });
  return { ...mapeado, resumo: montarResumoLinhaDebitoImportacao(row) };
}

function aplicarRow(debitos: Debito[], row: DebitoImportRow, origem: string): { debitos: Debito[]; acao: "novo" | "atualizacao" | "ignorado" } {
  const { debito: existente } = encontrarDebitoCorrespondente(debitos, row);
  if (!existente) {
    const nextId = proximoNumero(debitos.map((item) => item.id));
    const novo: Debito = {
      id: nextId,
      ...row,
      origem,
      fonteValores: "origem",
      atualizadoEm: agoraIso(),
    };
    return { debitos: [...debitos, novo], acao: "novo" };
  }

  if (!existente.identificadorExterno.trim() && !row.identificadorExterno.trim()) {
    if (debitoEquivalente(existente, row)) {
      return { debitos, acao: "ignorado" };
    }
    return { debitos, acao: "ignorado" };
  }

  if (debitoEquivalente(existente, row)) {
    return { debitos, acao: "ignorado" };
  }

  const atualizado: Debito = {
    ...existente,
    ...row,
    id: existente.id,
    origem: existente.origem || origem,
    fonteValores: "origem",
    atualizadoEm: agoraIso(),
  };
  return {
    debitos: debitos.map((item) => (item.id === existente.id ? atualizado : item)),
    acao: "atualizacao",
  };
}

function importacaoConcluidaComHash(hash: string): boolean {
  return getCadastros().importacoes.some((item) => {
    if (item.tipo !== "debitos" || !importacaoConcluidaOuParcial(item.status)) return false;
    const meta = parseObservacaoImportacao(item.observacaoInterna);
    if (meta.hashArquivo !== hash) return false;
    const novos = Number.parseInt(item.quantidadeImportados, 10) || 0;
    const atualizados = Number.parseInt(item.quantidadeAtualizados, 10) || 0;
    return novos + atualizados > 0;
  });
}

export const adaptadorImportacaoDebitos: AdaptadorImportacao<DebitoImportRow, ContextoImportacaoDebitos> = {
  modulo: "debitos",
  tipoImportacao: "debitos",
  formato: FORMATO_IMPORTACAO_DEBITOS_V1,

  prepararContexto(userId) {
    const cadastros = getCadastros();
    const condominios = escopoCondominios(cadastros, userId);
    const unidades = escopoUnidades(cadastros, userId).map((item) => ({
      id: item.id,
      condominioId: item.condominioId,
      identificacao: item.identificacao,
      bloco: item.bloco ?? "",
      status: item.status,
    }));
    const idsCondominio = new Set(condominios.map((item) => item.id));
    const debitos = cadastros.debitos.filter((item) => idsCondominio.has(item.condominioId));
    return {
      condominios,
      unidades,
      debitos,
      debitosMutaveis: [...debitos],
      formatoDetectado: FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasRelatorio: [],
    };
  },

  interpretarMatriz(matriz, contexto): LinhaParseada<DebitoImportRow>[] {
    const formato = contexto.formatoDetectado ?? FORMATO_IMPORTACAO_DEBITOS_V1;
    const { linhas } = interpretarPlanilhaDebitos(matriz, contexto.condominios, contexto.unidades, {
      formato,
      inconsistenciasArquivo: contexto.inconsistenciasRelatorio,
    });
    return linhas;
  },

  validarOrigem(origem) {
    if (!origemImportacaoValida(origem)) {
      return "Informe a origem dos dados (Superlógica, PDF ou Outra administradora).";
    }
    return null;
  },

  chaveDuplicidadeNoArquivo(row) {
    return chaveDuplicidadeDebitoNoArquivo(row);
  },

  classificarContraBase(payload, contexto) {
    return classificarDebitoContraBase(payload, contexto.debitos);
  },

  arquivoJaImportado: importacaoConcluidaComHash,

  buscarImportacaoIdempotente(hash) {
    const item = getCadastros().importacoes.find((registro) => {
      const metaObs = parseObservacaoImportacao(registro.observacaoInterna);
      return (
        registro.tipo === "debitos" && importacaoConcluidaOuParcial(registro.status) && metaObs.hashArquivo === hash
      );
    });
    if (!item) return undefined;
    const novos = Number.parseInt(item.quantidadeImportados, 10) || 0;
    const atualizados = Number.parseInt(item.quantidadeAtualizados, 10) || 0;
    if (novos + atualizados === 0) return undefined;
    return item;
  },

  persistirLinha(payload, situacao, contexto, meta) {
    if (situacao !== "novo" && situacao !== "atualizacao") return "ignorado";
    const resultado = aplicarRow(contexto.debitosMutaveis, payload, meta.origem);
    contexto.debitosMutaveis = resultado.debitos;
    return resultado.acao;
  },

  finalizarPersistencia(contexto) {
    const idsCondominio = new Set(contexto.condominios.map((item) => item.id));
    setDebitos((current) => {
      const foraDoEscopo = current.filter((item) => !idsCondominio.has(item.condominioId));
      return [...foraDoEscopo, ...contexto.debitosMutaveis].sort(
        (a, b) => b.dataVencimento.localeCompare(a.dataVencimento) || a.id - b.id,
      );
    });
  },

  montarRegistroImportacao(input) {
    const rascunho = input.processoId
      ? getCadastros().importacoes.find((item) => item.processoId === input.processoId)
      : undefined;
    const importacaoId = rascunho?.id ?? proximoNumero(getCadastros().importacoes.map((item) => item.id));
    const metaRascunho = rascunho ? parseObservacaoImportacao(rascunho.observacaoInterna) : undefined;

    const situacao = resolverSituacaoFinalImportacao({
      contadores: input.contadores,
      importacaoParcial: input.importacaoParcial ?? false,
    });

    const campos = montarCamposHistoricoFinal({
      situacao,
      contadores: input.contadores,
      quantidadeRegistros: input.quantidadeRegistros,
      relatorio: input.relatorio,
      hashArquivo: input.hashArquivo,
      formato: metaRascunho?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      aprovacao: input.aprovacao,
      processoId: input.processoId,
      iniciadoEm: rascunho?.iniciadoEm ?? metaRascunho?.iniciadoEm,
      usuarioIniciouId: rascunho?.usuarioId ?? input.userId,
      resultadoFinanceiro: metaRascunho?.resultadoFinanceiro,
      resumoInconsistencias: metaRascunho?.resumoInconsistencias,
    });

    return {
      id: importacaoId,
      processoId: input.processoId ?? rascunho?.processoId,
      origem: input.origem,
      tipo: "debitos",
      arquivo: input.arquivo,
      usuarioId: rascunho?.usuarioId ?? input.userId,
      iniciadoEm: rascunho?.iniciadoEm ?? metaRascunho?.iniciadoEm ?? campos.aprovadoEm ?? agoraIso(),
      ...campos,
    };
  },

  registrarAuditoriaConfirmacao(importacao, contadores: ContadoresImportacao, userId, meta, aprovacao) {
    registrarAuditoria(
      {
        entidade: "import",
        registroId: String(importacao.id),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: JSON.stringify({
          tipo: "debitos",
          novos: contadores.novos,
          atualizados: contadores.atualizacoes,
          duplicados: contadores.duplicados,
          erros: contadores.erros,
          revisoes: contadores.revisoes,
          aprovacaoExplicita: aprovacao?.confirmacaoExplicita ?? false,
          aprovadoPorUsuarioId: aprovacao?.aprovadoPorUsuarioId ?? userId,
          aprovadoEm: aprovacao?.aprovadoEm ?? importacao.dataImportacao,
          hashArquivo: aprovacao?.hashArquivo,
          importacaoParcial: aprovacao?.importacaoParcial,
        }),
        camposAlterados: "tipo, arquivo, quantidades, aprovacao",
      },
      userId,
      meta,
    );
  },
};
