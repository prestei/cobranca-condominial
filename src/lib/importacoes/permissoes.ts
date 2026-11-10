import { escopoCondominios, getCadastros } from "@/data/catalogo";
import { linhaSeraGravada } from "@/lib/importacao-centro/pre-visualizacao";
import type { LinhaConferencia } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao } from "@/lib/permissions/modulos";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";
import type { SessionUser } from "@/lib/auth/types";

/** Ações do fluxo central de importação (Ticket 12), mapeadas às permissões do módulo `importacoes`. */
export type AcaoFluxoImportacao =
  | "consultarHistorico"
  | "iniciarImportacao"
  | "visualizarPrevia"
  | "corrigirRegistros"
  | "aprovarImportacao";

const PERMISSAO_POR_ACAO: Record<AcaoFluxoImportacao, AcaoPermissao> = {
  consultarHistorico: "ler",
  iniciarImportacao: "criar",
  visualizarPrevia: "criar",
  corrigirRegistros: "editar",
  aprovarImportacao: "editar",
};

/**
 * Fonte: PostgreSQL via `resolverPermissoesUsuario` (mesmo critério de `requirePermissao`).
 * Não usa só o catálogo em memória — evita 403 após alterar o cargo em outro worker/processo.
 */
export async function temPermissaoAcaoImportacao(
  userId: number,
  acao: AcaoFluxoImportacao,
): Promise<boolean> {
  const acaoPerm = PERMISSAO_POR_ACAO[acao];
  const permissoes = await resolverPermissoesUsuario(userId);
  return temPermissao(permissoes, "importacoes", acaoPerm);
}

export async function assertPermissaoAcaoImportacao(
  userId: number,
  acao: AcaoFluxoImportacao,
): Promise<void> {
  if (!(await temPermissaoAcaoImportacao(userId, acao))) {
    throw new ImportacaoCentroError("Sem permissão para esta operação de importação.", 403);
  }
}

export async function requirePermissaoAcaoImportacao(
  session: SessionUser,
  acao: AcaoFluxoImportacao,
): Promise<Response | null> {
  if (!(await temPermissaoAcaoImportacao(session.userId, acao))) {
    return Response.json({ error: "Sem permissão para esta operação." }, { status: 403 });
  }
  return null;
}

/** Condomínio criado pelo provisionamento da inadimplência (ainda pode estar fora da carteira). */
export function condominioProvisionadoNaImportacaoDebitos(condominio: {
  identificadorExterno: string;
  observacao: string;
}): boolean {
  const idExt = condominio.identificadorExterno.trim().toLocaleUpperCase("pt-BR");
  if (idExt.startsWith("IMPORT-")) return true;
  return condominio.observacao.includes("Cadastro criado automaticamente na importação");
}

/** Escopo operacional + cadastros auxiliares provisionados nesta/outras importações de inadimplência. */
export function condominioPermitidoNaGravacaoImportacaoDebitos(userId: number, condominioId: number): boolean {
  const cadastros = getCadastros();
  if (escopoCondominios(cadastros, userId).some((item) => item.id === condominioId)) {
    return true;
  }
  const condominio = cadastros.condominios.find((item) => item.id === condominioId);
  return Boolean(condominio && condominioProvisionadoNaImportacaoDebitos(condominio));
}

/** Impede aprovar gravação de débitos em condomínios fora do escopo do usuário. */
export function assertEscopoGravacaoImportacaoDebitos(
  userId: number,
  linhas: LinhaConferencia<DebitoImportRow>[],
  linhasIgnoradas?: number[],
): void {
  const ignoradas = new Set(linhasIgnoradas ?? []);
  for (const linha of linhas) {
    if (!linha.payload || !linhaSeraGravada(linha, ignoradas)) continue;
    const condominioId = linha.payload.condominioId;
    if (!condominioPermitidoNaGravacaoImportacaoDebitos(userId, condominioId)) {
      throw new ImportacaoCentroError(
        "Não é permitido aprovar importação com registros fora do seu escopo de condomínios.",
        403,
      );
    }
  }
}
