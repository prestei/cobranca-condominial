import { escopoCondominios, getCadastros } from "@/data/catalogo";
import { linhaSeraGravada } from "@/lib/importacao-centro/pre-visualizacao";
import type { LinhaConferencia } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
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

export function temPermissaoAcaoImportacao(userId: number, acao: AcaoFluxoImportacao): boolean {
  const acaoPerm = PERMISSAO_POR_ACAO[acao];
  return temPermissao(permissoesDoUsuarioId(userId), "importacoes", acaoPerm);
}

export function assertPermissaoAcaoImportacao(userId: number, acao: AcaoFluxoImportacao): void {
  if (!temPermissaoAcaoImportacao(userId, acao)) {
    throw new ImportacaoCentroError("Sem permissão para esta operação de importação.", 403);
  }
}

export function requirePermissaoAcaoImportacao(
  session: SessionUser,
  acao: AcaoFluxoImportacao,
): Response | null {
  if (!temPermissaoAcaoImportacao(session.userId, acao)) {
    return Response.json({ error: "Sem permissão para esta operação." }, { status: 403 });
  }
  return null;
}

/** Impede aprovar gravação de débitos em condomínios fora do escopo do usuário. */
export function assertEscopoGravacaoImportacaoDebitos(
  userId: number,
  linhas: LinhaConferencia<DebitoImportRow>[],
  linhasIgnoradas?: number[],
): void {
  const ignoradas = new Set(linhasIgnoradas ?? []);
  const permitidos = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  for (const linha of linhas) {
    if (!linha.payload || !linhaSeraGravada(linha, ignoradas)) continue;
    const condominioId = linha.payload.condominioId;
    if (!permitidos.has(condominioId)) {
      throw new ImportacaoCentroError(
        "Não é permitido aprovar importação com registros fora do seu escopo de condomínios.",
        403,
      );
    }
  }
}
