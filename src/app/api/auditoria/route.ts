import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { AuditoriaServiceError, listarAuditoria, type AuditoriaFiltros } from "@/lib/auditoria/service";

function parseFiltros(searchParams: URLSearchParams): AuditoriaFiltros {
  const filtros: AuditoriaFiltros = {};
  const entidade = searchParams.get("entidade");
  if (entidade?.trim()) filtros.entidade = entidade.trim();
  const acao = searchParams.get("acao");
  if (acao?.trim()) filtros.acao = acao.trim();
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  const dataDe = searchParams.get("dataDe") ?? searchParams.get("de");
  if (dataDe?.trim()) filtros.dataDe = dataDe.trim();
  const dataAte = searchParams.get("dataAte") ?? searchParams.get("ate");
  if (dataAte?.trim()) filtros.dataAte = dataAte.trim();
  const usuarioId = Number(searchParams.get("usuarioId"));
  if (Number.isFinite(usuarioId) && usuarioId > 0) filtros.usuarioId = usuarioId;
  const autor = searchParams.get("autor") ?? searchParams.get("re");
  if (autor?.trim()) filtros.autor = autor.trim();
  return filtros;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "auditoria", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  try {
    const auditoria = listarAuditoria(session.userId, parseFiltros(searchParams));
    return Response.json({ auditoria });
  } catch (error) {
    if (error instanceof AuditoriaServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar a auditoria." }, { status: 500 });
  }
}
