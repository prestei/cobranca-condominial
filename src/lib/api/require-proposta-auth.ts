import { requirePermissao } from "@/lib/api/require-auth";
import type { SessionUser } from "@/lib/auth/types";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

/** Leitura de propostas: atendimentos ou negociações. */
export async function requirePropostaLer(session: SessionUser): Promise<Response | null> {
  const perm = await resolverPermissoesUsuario(session.userId);
  if (temPermissao(perm, "atendimentos", "ler") || temPermissao(perm, "negociacoes", "ler")) {
    return null;
  }
  return Response.json({ error: "Sem permissão para consultar propostas." }, { status: 403 });
}

export async function requirePropostaCriar(session: SessionUser): Promise<Response | null> {
  const perm = await resolverPermissoesUsuario(session.userId);
  if (temPermissao(perm, "atendimentos", "criar") || temPermissao(perm, "negociacoes", "criar")) {
    return null;
  }
  return Response.json({ error: "Sem permissão para registrar propostas." }, { status: 403 });
}

export async function requirePropostaEditar(session: SessionUser): Promise<Response | null> {
  const perm = await resolverPermissoesUsuario(session.userId);
  if (temPermissao(perm, "atendimentos", "editar") || temPermissao(perm, "negociacoes", "editar")) {
    return null;
  }
  return Response.json({ error: "Sem permissão para alterar propostas." }, { status: 403 });
}

/** Administradora (gestão de colaboradores). */
export async function requireAdministradora(session: SessionUser): Promise<Response | null> {
  return requirePermissao(session, "usuarios", "criar");
}
