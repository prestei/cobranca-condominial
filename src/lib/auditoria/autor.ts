import { getCadastros } from "@/data/catalogo";
import { codigoReDoUsuario, identificadorColaboradorPorId } from "@/lib/colaboradores/re";

export function rotuloAutorAuditoria(usuarioId: number | string): string {
  const numeric = Number(usuarioId);
  if (!usuarioId || Number.isNaN(numeric)) return "—";
  return identificadorColaboradorPorId(numeric);
}

export function usuarioCorrespondeFiltroAutor(
  usuarioId: string,
  filtro: { usuarioId?: number; reOuNome?: string },
): boolean {
  if (filtro.usuarioId !== undefined && Number(usuarioId) === filtro.usuarioId) return true;
  const busca = filtro.reOuNome?.trim().toLocaleLowerCase("pt-BR") ?? "";
  if (!busca) return true;

  const numeric = Number(usuarioId);
  if (Number.isFinite(numeric) && String(numeric).includes(busca)) return true;

  const usuario = getCadastros().usuarios.find((item) => item.id === numeric);
  if (!usuario) return false;

  const re = codigoReDoUsuario(usuario);
  const haystack = [usuario.nome, usuario.codigo, re ?? ""].join(" ").toLocaleLowerCase("pt-BR");
  return haystack.includes(busca);
}
