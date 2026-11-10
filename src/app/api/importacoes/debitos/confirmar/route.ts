import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { escopoCondominios, getCadastros } from "@/data/catalogo";
import type { AcaoConflitoImportacao, DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades";
import { ImportacaoDebitosError, confirmarImportacaoDebitos } from "@/lib/importacoes/debitos-service";
import { requestMeta } from "@/lib/unidades/service";

const ACOES_CONFLITO = new Set<AcaoConflitoImportacao>([
  "importar_novo",
  "ignorar_existente",
  "atualizar_existente",
  "solicitar_correcao",
  "revisao_manual",
]);

function parseAcaoConflito(acao: string): AcaoConflitoImportacao {
  return ACOES_CONFLITO.has(acao as AcaoConflitoImportacao) ? (acao as AcaoConflitoImportacao) : "revisao_manual";
}

function parseBody(
  body: unknown,
): {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
  decisoesLinha?: DecisaoLinhaImportacao[];
  confirmacaoExplicita?: boolean;
  cienciaImportacaoParcial?: boolean;
  linhasIgnoradas?: number[];
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const origem = typeof record.origem === "string" ? record.origem : "";
  const arquivo = typeof record.arquivo === "string" ? record.arquivo : undefined;
  const conteudo = typeof record.conteudo === "string" ? record.conteudo : undefined;
  const processoId = typeof record.processoId === "string" ? record.processoId : undefined;
  const hashArquivo = typeof record.hashArquivo === "string" ? record.hashArquivo : undefined;
  const decisoesRaw = record.decisoesLinha;
  const decisoesLinha = Array.isArray(decisoesRaw)
    ? decisoesRaw
        .filter(
          (item): item is { linha: number; acao: string; motivo?: string } =>
            Boolean(item && typeof item === "object" && typeof (item as { linha?: unknown }).linha === "number"),
        )
        .map((item) => ({
          linha: item.linha,
          acao: parseAcaoConflito(item.acao),
          motivo: typeof item.motivo === "string" ? item.motivo : undefined,
        }))
    : undefined;
  const confirmacaoExplicita = record.confirmacaoExplicita === true ? true : undefined;
  const cienciaImportacaoParcial = record.cienciaImportacaoParcial === true ? true : undefined;
  const linhasIgnoradas = Array.isArray(record.linhasIgnoradas)
    ? record.linhasIgnoradas.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : undefined;
  return {
    origem,
    arquivo,
    conteudo,
    processoId,
    hashArquivo,
    decisoesLinha,
    confirmacaoExplicita,
    cienciaImportacaoParcial,
    linhasIgnoradas,
  };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "aprovarImportacao");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Dados da importação inválidos." }, { status: 400 });
  }

  try {
    const resultado = await confirmarImportacaoDebitos(session.userId, input, requestMeta(request));
    const cadastros = getCadastros();
    const condominiosEscopo = escopoCondominios(cadastros, session.userId);
    const scopeIds = new Set(condominiosEscopo.map((item) => item.id));
    // Inclui condomínios/unidades da carteira após a distribuição automática pós-importação.
    const unidades = cadastros.unidades.filter((item) => scopeIds.has(item.condominioId));
    const unidadeIds = new Set(unidades.map((item) => item.id));
    const condominioIdsUnidades = new Set(unidades.map((item) => item.condominioId));
    const condominios = cadastros.condominios.filter(
      (item) => scopeIds.has(item.id) || condominioIdsUnidades.has(item.id),
    );
    const debitos = cadastros.debitos.filter((item) => scopeIds.has(item.condominioId) || unidadeIds.has(item.unidadeId));
    const vinculos = cadastros.vinculos.filter((item) => unidadeIds.has(item.unidadeId));
    const responsavelIds = new Set(vinculos.map((item) => item.responsavelId));
    const responsaveis = cadastros.responsaveis.filter((item) => responsavelIds.has(item.id));
    return Response.json({
      resultado,
      debitos,
      condominios,
      unidades,
      responsaveis,
      vinculos,
      atribuicoesCobranca: cadastros.atribuicoesCobranca,
    });
  } catch (error) {
    if (error instanceof ImportacaoDebitosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível concluir a importação." }, { status: 500 });
  }
}
