import { escopoCondominios } from "@/data/catalogo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoDebitosError, previewImportacaoDebitos } from "@/lib/importacoes/debitos-service";

function parseBody(
  body: unknown,
): {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const origem = typeof record.origem === "string" ? record.origem : "";
  const arquivo = typeof record.arquivo === "string" ? record.arquivo : undefined;
  const conteudo = typeof record.conteudo === "string" ? record.conteudo : undefined;
  const processoId = typeof record.processoId === "string" ? record.processoId : undefined;
  const hashArquivo = typeof record.hashArquivo === "string" ? record.hashArquivo : undefined;
  return { origem, arquivo, conteudo, processoId, hashArquivo };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "visualizarPrevia");
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
    const preview = await previewImportacaoDebitos(session.userId, input);
    // Condomínio/unidade/responsável podem ter sido provisionados na prévia — sincroniza o cliente.
    const cadastros = await loadFullOperationalCadastros();
    const condominios = escopoCondominios(cadastros, session.userId);
    const scopeIds = new Set(condominios.map((item) => item.id));
    const unidades = cadastros.unidades.filter((item) => scopeIds.has(item.condominioId));
    const unidadeIds = new Set(unidades.map((item) => item.id));
    const vinculos = cadastros.vinculos.filter((item) => unidadeIds.has(item.unidadeId));
    const responsavelIds = new Set(vinculos.map((item) => item.responsavelId));
    const responsaveis = cadastros.responsaveis.filter((item) => responsavelIds.has(item.id));
    return Response.json({ preview, condominios, unidades, responsaveis, vinculos });
  } catch (error) {
    if (error instanceof ImportacaoDebitosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível validar o arquivo." }, { status: 500 });
  }
}
