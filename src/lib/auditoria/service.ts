import { getCadastros, nomeUsuario, type Auditoria } from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class AuditoriaServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type AuditoriaFiltros = {
  entidade?: string;
  acao?: string;
  busca?: string;
};

function assertPodeConsultar(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "auditoria", "ler")) {
    throw new AuditoriaServiceError("Sem permissão para consultar a auditoria.", 403);
  }
}

function matchesBusca(registro: Auditoria, query: string) {
  const haystack = [
    registro.registroId,
    registro.camposAlterados,
    registro.dadosAnteriores,
    registro.dadosNovos,
    nomeUsuario(registro.usuarioId),
    registro.entidade,
    registro.acao,
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return haystack.includes(query);
}

export function listarAuditoria(userId: number, filtros: AuditoriaFiltros = {}): Auditoria[] {
  assertPodeConsultar(userId);

  const entidade = filtros.entidade?.trim();
  const acao = filtros.acao?.trim();
  const busca = filtros.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";

  return getCadastros()
    .auditoria.filter((item) => {
      if (entidade && entidade !== "todas" && item.entidade !== entidade) return false;
      if (acao && acao !== "todas" && item.acao !== acao) return false;
      if (busca.length > 0 && !matchesBusca(item, busca)) return false;
      return true;
    })
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}
