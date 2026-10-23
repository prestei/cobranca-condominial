import type { Usuario } from "@/lib/catalog";
import type { UsuarioPublico } from "@/lib/users/types";

export function usuarioPublico(usuario: Usuario): UsuarioPublico {
  const { senha: _senha, ...publico } = usuario;
  return publico;
}

export function usuariosPublicos(usuarios: Usuario[]): UsuarioPublico[] {
  return usuarios.map(usuarioPublico);
}
