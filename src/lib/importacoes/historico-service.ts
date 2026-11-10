import { setImportacoes, type Importacao } from "@/data/catalogo";
import {
  sanitizarImportacaoParaConsulta,
  type ImportacaoConsulta,
} from "@/lib/importacao-centro/historico-auditoria";
import { removerSessaoPreviaImportacao } from "@/lib/importacao-centro/correcao-previa/sessao";
import { normalizarSituacaoImportacao } from "@/lib/importacao-centro/situacao-importacao";
import { assertPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { parseObservacaoImportacao } from "@/lib/importacoes/hash-arquivo";
import { obterProcessoArquivoTemporario, removerProcessoArquivoTemporario } from "@/lib/importacoes/armazenamento-temporario";
import type { ModuloImportacaoArquivo } from "@/lib/importacoes/limites";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { deleteImport, findImportById, listImports } from "@/lib/db/repositories/import-repository";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

export class HistoricoImportacaoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type RetomadaImportacaoHistorico =
  | {
      disponivel: true;
      processoId: string;
      hashArquivo: string;
      origem: string;
      arquivo: string;
      modulo: ModuloImportacaoArquivo;
    }
  | { disponivel: false; motivo: string };

export async function listarImportacoesHistorico(
  userId: number,
  opcoes?: { exporDetalhesInternos?: boolean },
): Promise<ImportacaoConsulta[]> {
  await assertPermissaoAcaoImportacao(userId, "consultarHistorico");
  const perm = await resolverPermissoesUsuario(userId);
  const exporDetalhesInternos =
    opcoes?.exporDetalhesInternos ??
    (temPermissao(perm, "auditoria", "ler") || temPermissao(perm, "importacoes", "editar"));

  const importacoes = await listImports();
  return [...importacoes]
    .sort((a, b) => (b.aprovadoEm ?? b.dataImportacao).localeCompare(a.aprovadoEm ?? a.dataImportacao))
    .map((item) => sanitizarImportacaoParaConsulta(item, { exporDetalhesInternos }));
}

export async function obterImportacaoHistorico(
  userId: number,
  id: number,
  opcoes?: { exporDetalhesInternos?: boolean },
): Promise<ImportacaoConsulta | null> {
  await assertPermissaoAcaoImportacao(userId, "consultarHistorico");
  const item = await findImportById(id);
  if (!item) return null;
  const perm = await resolverPermissoesUsuario(userId);
  const exporDetalhesInternos =
    opcoes?.exporDetalhesInternos ??
    (temPermissao(perm, "auditoria", "ler") || temPermissao(perm, "importacoes", "editar"));
  return sanitizarImportacaoParaConsulta(item, { exporDetalhesInternos });
}

export function filtrarImportacoesPorSituacao(importacoes: Importacao[], situacaoFiltro: string): Importacao[] {
  if (situacaoFiltro === "todos") return importacoes;
  const alvo = normalizarSituacaoImportacao(situacaoFiltro);
  return importacoes.filter((item) => normalizarSituacaoImportacao(item.status) === alvo);
}

const MODULOS_ARQUIVO = new Set<ModuloImportacaoArquivo>(["debitos", "unidades", "condominios", "responsaveis"]);

function importacaoPendenteConferencia(status: string): boolean {
  const sit = normalizarSituacaoImportacao(status);
  return sit === "Aguardando conferencia" || sit === "Aguardando aprovacao" || sit === "Em processamento";
}

export async function avaliarRetomadaImportacao(
  userId: number,
  importacao: Importacao,
): Promise<RetomadaImportacaoHistorico> {
  if (!importacaoPendenteConferencia(importacao.status)) {
    return { disponivel: false, motivo: "Esta importação já foi finalizada; não há conferência pendente." };
  }
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "importacoes", "criar")) {
    return { disponivel: false, motivo: "Sem permissão para retomar importações." };
  }
  const processoId = importacao.processoId?.trim() ?? parseObservacaoImportacao(importacao.observacaoInterna).processoId;
  if (!processoId) {
    return {
      disponivel: false,
      motivo: "Não há processo de envio associado; envie o arquivo novamente.",
    };
  }
  const processo = obterProcessoArquivoTemporario(processoId, userId);
  if (!processo) {
    return {
      disponivel: false,
      motivo: "O arquivo temporário expirou (retenção de 1 hora). Envie o arquivo novamente ou exclua este registro.",
    };
  }
  const modulo = importacao.tipo.trim() as ModuloImportacaoArquivo;
  if (!MODULOS_ARQUIVO.has(modulo)) {
    return { disponivel: false, motivo: "Módulo de importação não suportado para retomada." };
  }
  return {
    disponivel: true,
    processoId: processo.id,
    hashArquivo: processo.hashArquivo,
    origem: importacao.origem,
    arquivo: importacao.arquivo,
    modulo,
  };
}

export async function excluirImportacaoHistorico(
  userId: number,
  id: number,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "importacoes", "excluir")) {
    throw new HistoricoImportacaoError("Sem permissão para excluir registros de importação.", 403);
  }
  const item = await findImportById(id);
  if (!item) {
    throw new HistoricoImportacaoError("Importação não encontrada.", 404);
  }

  const processoId = item.processoId?.trim();
  if (processoId) {
    removerSessaoPreviaImportacao(userId, processoId);
    await removerProcessoArquivoTemporario(processoId);
  }

  await deleteImport(id);
  // Mantém espelho em memória alinhado até remoção total do catálogo em RAM.
  setImportacoes((current) => current.filter((registro) => registro.id !== id));

  await writeAuditLog({
    entity: "import",
    recordId: String(id),
    action: "DELETE",
    previousData: JSON.stringify({
      arquivo: item.arquivo,
      tipo: item.tipo,
      status: item.status,
      processoId: item.processoId,
    }),
    newData: "",
    changedFields: "historico_importacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}
