import { formatarData, nomeCondominio, type Cadastros, type Condominio } from "@/data/catalogo";
import { registrarAuditoria } from "@/data/catalogo-store";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re-server";
import {
  DashboardFiltrosError,
  parseFiltrosDashboard,
  resolverUnidadesDashboard,
  rotulosFiltrosAtivos,
  validarFiltrosDashboardEscopo,
  type DashboardFiltrosNorm,
} from "@/lib/dashboard/filtros";
import { listarFilaCobranca, type FilaCobrancaItem } from "@/lib/fila/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import type { RelatorioExportPayload } from "@/lib/relatorios/service";

export class ExportarCarteiraError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const LIMITES_EXPORTACAO_CARTEIRA = {
  linhasMaximas: 5_000,
} as const;

export type ListagemExportacaoCarteira = "fila" | "atendimentos";

function labelUnidade(item: Pick<FilaCobrancaItem, "identificacao" | "bloco">) {
  return item.bloco ? `${item.identificacao} · ${item.bloco}` : item.identificacao;
}

async function filaFiltradaDashboard(
  userId: number,
  filtros: DashboardFiltrosNorm,
): Promise<FilaCobrancaItem[]> {
  const unidadesRecorte = await resolverUnidadesDashboard(userId, filtros);
  let lista = await listarFilaCobranca(userId, {
    condominioId: filtros.condominioId,
    situacao: filtros.situacao,
    busca: filtros.busca,
  });
  if (unidadesRecorte) {
    lista = lista.filter((item) => unidadesRecorte.has(item.unidadeId));
  }
  if (filtros.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  return lista;
}

async function atendimentosFiltradosDashboard(userId: number, filtros: DashboardFiltrosNorm, cadastros: Cadastros) {
  const unidadesRecorte = await resolverUnidadesDashboard(userId, filtros);
  const idsFila = new Set((await listarFilaCobranca(userId)).map((item) => item.unidadeId));
  const { inicio, fim } = filtros.periodoResolvido;
  const perm = permissoesDoUsuarioId(userId, cadastros);
  const geral = temPermissao(perm, "usuarios", "criar");

  return cadastros.atendimentos
    .filter((item) => {
      const unidadeId = Number(item.unidadeId);
      if (unidadesRecorte && !unidadesRecorte.has(unidadeId)) return false;
      if (!geral && !idsFila.has(unidadeId)) return false;
      const dia = item.dataHora.slice(0, 10);
      if (dia < inicio || dia > fim) return false;
      if (filtros.condominioId) {
        const unidade = cadastros.unidades.find((u) => u.id === unidadeId);
        if (!unidade || unidade.condominioId !== filtros.condominioId) return false;
      }
      if (filtros.unidadeId && unidadeId !== filtros.unidadeId) return false;
      if (filtros.busca?.trim()) {
        const termo = filtros.busca.trim().toLocaleLowerCase("pt-BR");
        const unidade = cadastros.unidades.find((u) => u.id === unidadeId);
        const condominio = unidade ? nomeCondominio(unidade.condominioId, cadastros) : "";
        const texto = `${item.assunto} ${item.descricao} ${condominio} ${unidade?.identificacao ?? ""}`.toLocaleLowerCase(
          "pt-BR",
        );
        if (!texto.includes(termo)) return false;
      }
      return true;
    })
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

function assertPodeExportar(userId: number, listagem: ListagemExportacaoCarteira, cadastros: Cadastros) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  if (!temPermissao(perm, "dashboard", "ler")) {
    throw new ExportarCarteiraError("Sem permissão para exportar do dashboard.", 403);
  }
  if (listagem === "fila" || listagem === "atendimentos") {
    if (!temPermissao(perm, "atendimentos", "ler")) {
      throw new ExportarCarteiraError("Sem permissão para exportar atendimentos/carteira.", 403);
    }
  }
}

function colunasFilaExport(userId: number, cadastros: Cadastros) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  const base = ["Condomínio", "Unidade", "Situação", "RE responsável", "Último atendimento", "Próximo retorno", "Retorno"];
  if (temPermissao(perm, "debitos", "ler")) {
    return ["Condomínio", "Unidade", "Inadimplência", "Dias atraso (máx.)", ...base.slice(2)];
  }
  return base;
}

function linhasFilaExport(userId: number, cadastros: Cadastros, itens: FilaCobrancaItem[]) {
  const perm = permissoesDoUsuarioId(userId, cadastros);
  const comDebitos = temPermissao(perm, "debitos", "ler");
  return itens.map((item) => {
    const base = [nomeCondominio(item.condominioId, cadastros), labelUnidade(item)];
    if (comDebitos) {
      base.push(item.valorInadimplencia ?? "—", item.diasAtrasoMax > 0 ? String(item.diasAtrasoMax) : "0");
    }
    base.push(
      item.situacao,
      item.codigoRe ?? "—",
      item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—",
      item.proximoRetorno ? formatarData(item.proximoRetorno) : "—",
      item.retornoSituacao || "—",
    );
    return base;
  });
}

function colunasAtendimentosExport() {
  return ["Data/hora", "RE autor", "Condomínio", "Unidade", "Canal", "Motivo", "Assunto", "Status", "Respondeu"];
}

function linhasAtendimentosExport(cadastros: Cadastros, itens: Awaited<ReturnType<typeof atendimentosFiltradosDashboard>>) {
  return itens.map((item) => {
    const unidade = cadastros.unidades.find((u) => u.id === Number(item.unidadeId));
    const condominio: Condominio | undefined = unidade
      ? cadastros.condominios.find((c) => c.id === unidade.condominioId)
      : undefined;
    const unidadeLabel = unidade
      ? unidade.bloco
        ? `${unidade.identificacao} · ${unidade.bloco}`
        : unidade.identificacao
      : String(item.unidadeId);
    return [
      formatarData(item.dataHora),
      identificadorColaboradorPorId(item.usuarioId, cadastros),
      condominio?.nome ?? "—",
      unidadeLabel,
      item.canal,
      item.motivo || "—",
      item.assunto || "—",
      item.status,
      item.respondeu,
    ];
  });
}

export function parseListagemExportacaoCarteira(raw: string | null): ListagemExportacaoCarteira {
  const valor = raw?.trim().toLowerCase();
  if (valor === "fila" || valor === "carteira") return "fila";
  if (valor === "atendimentos") return "atendimentos";
  throw new ExportarCarteiraError("Listagem de exportação inválida. Use fila ou atendimentos.", 400);
}

/** Monta exportação da carteira; catálogo vem do PostgreSQL (exceto auditoria em memória nos testes). */
export async function montarExportacaoCarteiraDashboard(
  userId: number,
  listagem: ListagemExportacaoCarteira,
  searchParams: URLSearchParams,
  meta?: { ip?: string; userAgent?: string },
  cadastros?: Cadastros,
): Promise<RelatorioExportPayload> {
  const base = cadastros ?? (await loadFullOperationalCadastros());
  assertPodeExportar(userId, listagem, base);
  let filtros: DashboardFiltrosNorm;
  try {
    filtros = parseFiltrosDashboard(searchParams);
    validarFiltrosDashboardEscopo(userId, filtros, base);
  } catch (error) {
    if (error instanceof DashboardFiltrosError) {
      throw new ExportarCarteiraError(error.message, error.status);
    }
    throw error;
  }

  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const metaFiltros = rotulosFiltrosAtivos(filtros, userId).map((item) => item.rotulo);

  if (listagem === "fila") {
    const itens = await filaFiltradaDashboard(userId, filtros);
    if (itens.length > LIMITES_EXPORTACAO_CARTEIRA.linhasMaximas) {
      throw new ExportarCarteiraError(
        `Exportação limitada a ${LIMITES_EXPORTACAO_CARTEIRA.linhasMaximas} linhas. Refine os filtros.`,
        413,
      );
    }
    const payload: RelatorioExportPayload = {
      titulo: "Carteira — fila de cobranças",
      nomeArquivo: "carteira-fila-dashboard",
      meta: { geradoEm, filtros: metaFiltros },
      secoes: [
        {
          titulo: "Fila de cobranças (filtros do dashboard)",
          colunas: colunasFilaExport(userId, base),
          linhas: linhasFilaExport(userId, base, itens),
        },
      ],
    };
    registrarAuditoria(
      {
        entidade: "dashboard_export",
        registroId: `fila:${geradoEm}`,
        acao: "EXPORT",
        dadosAnteriores: "",
        dadosNovos: JSON.stringify({ listagem: "fila", linhas: itens.length, filtros: metaFiltros }),
        camposAlterados: "exportacao",
      },
      userId,
      meta,
    );
    return payload;
  }

  const atendimentos = await atendimentosFiltradosDashboard(userId, filtros, base);
  if (atendimentos.length > LIMITES_EXPORTACAO_CARTEIRA.linhasMaximas) {
    throw new ExportarCarteiraError(
      `Exportação limitada a ${LIMITES_EXPORTACAO_CARTEIRA.linhasMaximas} linhas. Refine os filtros.`,
      413,
    );
  }
  const payload: RelatorioExportPayload = {
    titulo: "Carteira — atendimentos",
    nomeArquivo: "carteira-atendimentos-dashboard",
    meta: { geradoEm, filtros: metaFiltros },
    secoes: [
      {
        titulo: "Atendimentos (filtros do dashboard)",
        colunas: colunasAtendimentosExport(),
        linhas: linhasAtendimentosExport(base, atendimentos),
      },
    ],
  };
  registrarAuditoria(
    {
      entidade: "dashboard_export",
      registroId: `atendimentos:${geradoEm}`,
      acao: "EXPORT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({ listagem: "atendimentos", linhas: atendimentos.length, filtros: metaFiltros }),
      camposAlterados: "exportacao",
    },
    userId,
    meta,
  );
  return payload;
}
