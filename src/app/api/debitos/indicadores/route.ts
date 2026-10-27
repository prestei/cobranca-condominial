import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { escopoCondominios, getCadastros } from "@/data/catalogo";
import { DebitoServiceError, obterIndicadoresDebitos, type DebitoFiltros } from "@/lib/debitos/service";

function parseFiltros(searchParams: URLSearchParams): DebitoFiltros {
  const filtros: DebitoFiltros = {};
  const condominioId = Number(searchParams.get("condominioId"));
  if (Number.isFinite(condominioId) && condominioId > 0) filtros.condominioId = condominioId;
  const unidadeId = Number(searchParams.get("unidadeId"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) filtros.unidadeId = unidadeId;
  const status = searchParams.get("status");
  if (status && status !== "todos") filtros.status = status;
  const origem = searchParams.get("origem");
  if (origem && origem !== "todas") filtros.origem = origem;
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  const vencimentoDe = searchParams.get("vencimentoDe");
  if (vencimentoDe?.trim()) filtros.vencimentoDe = vencimentoDe.trim();
  const vencimentoAte = searchParams.get("vencimentoAte");
  if (vencimentoAte?.trim()) filtros.vencimentoAte = vencimentoAte.trim();
  return filtros;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const dataBase = searchParams.get("dataBase")?.trim() || new Date().toISOString().slice(0, 10);
  const limiteRaw = Number(searchParams.get("limiteDias"));
  const limiteDias = Number.isFinite(limiteRaw) && limiteRaw >= 1 ? limiteRaw : 60;
  const cidade = searchParams.get("cidade")?.trim();

  const filtros = parseFiltros(searchParams);
  const cadastros = getCadastros();
  const condominiosNoFiltro = escopoCondominios(cadastros, session.userId).filter((item) => {
    const matchesCondominio = !filtros.condominioId || item.id === filtros.condominioId;
    const matchesCidade = !cidade || cidade === "todas" || item.cidade.trim() === cidade;
    return matchesCondominio && matchesCidade;
  });
  const unidadesCarteira = cadastros.unidades.filter((item) =>
    condominiosNoFiltro.some((condominio) => condominio.id === item.condominioId),
  ).length;

  try {
    const indicadores = obterIndicadoresDebitos(session.userId, {
      dataBase,
      limiteDias,
      unidadesCarteira,
      filtros,
    });
    return Response.json({ indicadores, dataBase, limiteDias });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível calcular os indicadores." }, { status: 500 });
  }
}
