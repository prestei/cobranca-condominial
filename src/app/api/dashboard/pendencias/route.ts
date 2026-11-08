import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  listarCentralPendenciasAtendente,
  type CategoriaPendenciaId,
  type PendenciaOrdenacao,
  type TipoPendenciaId,
} from "@/lib/dashboard/central-pendencias-atendente";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

const CATEGORIAS: Set<string> = new Set([
  "todas",
  "hoje",
  "atrasadas",
  "proximos_retornos",
  "aguardando_resposta",
  "sem_movimentacao",
  "prioritarias",
]);

const ORDENACOES: Set<string> = new Set(["prioridade", "data_retorno", "ultima_movimentacao"]);

const TIPOS: Set<string> = new Set([
  "hoje",
  "atrasadas",
  "proximos_retornos",
  "aguardando_resposta",
  "sem_movimentacao",
  "prioritarias",
]);

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const perfil = resolverPerfilOperacional(permissoesDoUsuarioId(session.userId));
  if (perfil !== "atendente") {
    return Response.json({ error: "Central de pendências disponível apenas para atendentes." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoriaRaw = searchParams.get("categoria")?.trim() ?? "todas";
  const categoria = CATEGORIAS.has(categoriaRaw)
    ? (categoriaRaw as CategoriaPendenciaId | "todas")
    : "todas";
  const tipoRaw = searchParams.get("tipo")?.trim();
  const tipo = tipoRaw && TIPOS.has(tipoRaw) ? (tipoRaw as TipoPendenciaId) : undefined;
  const ordenacaoRaw = searchParams.get("ordenacao")?.trim() ?? "prioridade";
  const ordenacao = ORDENACOES.has(ordenacaoRaw)
    ? (ordenacaoRaw as PendenciaOrdenacao)
    : "prioridade";
  const ordem = searchParams.get("ordem") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize")) || 10);

  const resultado = listarCentralPendenciasAtendente(session.userId, {
    categoria,
    tipo,
    ordenacao,
    ordem,
    page,
    pageSize,
  });

  return Response.json({ pendencias: resultado });
}
