import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  FilaServiceError,
  listarFilaCobrancaPaginada,
  resumoFilaCobranca,
  type FilaCobrancaFiltros,
  type FilaOrdenacaoCampo,
} from "@/lib/fila/service";

const CAMPOS_ORDENACAO: FilaOrdenacaoCampo[] = [
  "condominio",
  "unidade",
  "inadimplencia",
  "situacao",
  "re",
  "ultimoAtendimento",
  "proximoRetorno",
];

const PAGE_SIZE_DEFAULT = 20;

function parseFiltros(searchParams: URLSearchParams): FilaCobrancaFiltros {
  const filtros: FilaCobrancaFiltros = {};
  const condominioId = Number(searchParams.get("condominioId"));
  if (Number.isFinite(condominioId) && condominioId > 0) filtros.condominioId = condominioId;
  const situacao = searchParams.get("situacao");
  if (situacao && situacao !== "todos") filtros.situacao = situacao;
  const atendente = searchParams.get("atendente");
  if (atendente && atendente !== "todos") {
    const id = Number(atendente);
    if (Number.isFinite(id)) filtros.atendenteId = id;
  }
  if (searchParams.get("semResponsavel") === "1") filtros.semResponsavel = true;
  const codigoRe = searchParams.get("codigoRe");
  if (codigoRe?.trim()) filtros.codigoRe = codigoRe.trim();
  const retorno = searchParams.get("retorno");
  if (retorno && retorno !== "todos") filtros.retorno = retorno as FilaCobrancaFiltros["retorno"];
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  const sort = searchParams.get("sort");
  if (sort && CAMPOS_ORDENACAO.includes(sort as FilaOrdenacaoCampo)) {
    filtros.sort = sort as FilaOrdenacaoCampo;
  }
  const order = searchParams.get("order");
  if (order === "asc" || order === "desc") filtros.order = order;
  return filtros;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT));

  try {
    const filtros = parseFiltros(searchParams);
    return Response.json({
      ...listarFilaCobrancaPaginada(session.userId, filtros, page, pageSize),
      /** KPIs da carteira — sempre no escopo do usuário, sem filtros da tabela. */
      resumo: resumoFilaCobranca(session.userId),
    });
  } catch (error) {
    if (error instanceof FilaServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar a fila de cobranças." }, { status: 500 });
  }
}
