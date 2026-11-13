import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/** Quem pode receber alertas operacionais (in-app e push). */
export async function destinatarioPodeReceberNotificacaoOperacional(userId: number): Promise<boolean> {
  const cadastros = await loadCadastrosForScope();
  const perm = permissoesDoUsuarioId(userId, cadastros);
  if (temPermissao(perm, "atendimentos", "ler")) return true;
  return temPermissao(perm, "usuarios", "criar");
}
