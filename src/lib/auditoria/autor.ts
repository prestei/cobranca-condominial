import type { Cadastros, Usuario } from "@/data/catalogo";
import { codigoReDoUsuario, identificadorColaboradorPorId } from "@/lib/colaboradores/re";

/** Rótulo de autor a partir de um snapshot de cadastros (UI ou servidor). */
export function rotuloAutorAuditoria(usuarioId: number | string, cadastros: Cadastros): string {
  const numeric = Number(usuarioId);
  if (!usuarioId || Number.isNaN(numeric)) return "—";
  return identificadorColaboradorPorId(numeric, cadastros);
}

export function usuarioCorrespondeFiltroAutor(
  usuarioId: string,
  filtro: { usuarioId?: number; reOuNome?: string },
  cadastros: Cadastros,
): boolean {
  if (filtro.usuarioId !== undefined && Number(usuarioId) === filtro.usuarioId) return true;
  const busca = filtro.reOuNome?.trim().toLocaleLowerCase("pt-BR") ?? "";
  if (!busca) return true;

  const numeric = Number(usuarioId);
  if (Number.isFinite(numeric) && String(numeric).includes(busca)) return true;

  const usuario = cadastros.usuarios.find((item: Usuario) => item.id === numeric);
  if (!usuario) return false;

  const re = codigoReDoUsuario(usuario);
  const haystack = [usuario.nome, usuario.codigo, re ?? ""].join(" ").toLocaleLowerCase("pt-BR");
  return haystack.includes(busca);
}
