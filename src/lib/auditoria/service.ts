import { nomeUsuario, type Auditoria, type Cadastros } from "@/data/catalogo";
import { rotuloAutorAuditoria, usuarioCorrespondeFiltroAutor } from "@/lib/auditoria/autor";
import { registroDentroDoPeriodo } from "@/lib/auditoria/periodo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { listAuditLogs } from "@/lib/db/repositories/audit-repository";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

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
  dataDe?: string;
  dataAte?: string;
  usuarioId?: number;
  autor?: string;
};

async function assertPodeConsultar(userId: number) {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "auditoria", "ler")) {
    throw new AuditoriaServiceError("Sem permissão para consultar a auditoria.", 403);
  }
}

function matchesBusca(registro: Auditoria, query: string, cadastros: Cadastros) {
  const haystack = [
    registro.registroId,
    registro.camposAlterados,
    registro.dadosAnteriores,
    registro.dadosNovos,
    nomeUsuario(registro.usuarioId, cadastros),
    rotuloAutorAuditoria(registro.usuarioId, cadastros),
    registro.entidade,
    registro.acao,
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return haystack.includes(query);
}

export async function listarAuditoria(userId: number, filtros: AuditoriaFiltros = {}): Promise<Auditoria[]> {
  await assertPodeConsultar(userId);

  const entidade = filtros.entidade?.trim();
  const acao = filtros.acao?.trim();
  const busca = filtros.busca?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const dataDe = filtros.dataDe?.trim();
  const dataAte = filtros.dataAte?.trim();
  const usuarioId =
    filtros.usuarioId !== undefined && Number.isFinite(filtros.usuarioId) ? filtros.usuarioId : undefined;
  const autorBusca = filtros.autor?.trim();
  const cadastros = await loadFullOperationalCadastros();

  const lista = await listAuditLogs({
    entidade,
    acao,
    userId: usuarioId,
  });

  return lista
    .filter((item) => {
      if (!registroDentroDoPeriodo(item.dataHora, dataDe, dataAte)) return false;
      if (
        autorBusca &&
        !usuarioCorrespondeFiltroAutor(item.usuarioId, { reOuNome: autorBusca, usuarioId: undefined }, cadastros)
      ) {
        return false;
      }
      if (busca.length > 0 && !matchesBusca(item, busca, cadastros)) return false;
      return true;
    })
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}
