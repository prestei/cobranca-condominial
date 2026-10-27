import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  RetornoServiceError,
  listarRetornosAgenda,
  type RetornoAgendaFiltros,
} from "@/lib/retornos/service";

function parseFiltros(searchParams: URLSearchParams): RetornoAgendaFiltros {
  const filtros: RetornoAgendaFiltros = {};
  const estado = searchParams.get("estado");
  if (estado === "pendente" || estado === "concluido" || estado === "todos") filtros.estado = estado;
  const situacao = searchParams.get("situacao");
  if (situacao === "atrasado" || situacao === "hoje" || situacao === "semana" || situacao === "agendado") {
    filtros.situacao = situacao;
  } else if (situacao === "todos") {
    filtros.situacao = "todos";
  }
  const de = searchParams.get("de");
  if (de?.trim()) filtros.de = de.trim();
  const ate = searchParams.get("ate");
  if (ate?.trim()) filtros.ate = ate.trim();
  const condominioId = Number(searchParams.get("condominioId"));
  if (Number.isFinite(condominioId) && condominioId > 0) filtros.condominioId = condominioId;
  const atendenteId = Number(searchParams.get("atendenteId"));
  if (Number.isFinite(atendenteId) && atendenteId > 0) filtros.atendenteId = atendenteId;
  const codigoRe = searchParams.get("codigoRe");
  if (codigoRe?.trim()) filtros.codigoRe = codigoRe.trim();
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  return filtros;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  try {
    const resultado = listarRetornosAgenda(session.userId, parseFiltros(searchParams), { page, pageSize });
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof RetornoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar a agenda de retornos." }, { status: 500 });
  }
}
