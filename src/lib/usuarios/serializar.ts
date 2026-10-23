import type { Usuario } from "@/data/catalogo";
import type { UsuarioPublico } from "@/lib/usuarios/types";

export function usuarioPublico(usuario: Usuario): UsuarioPublico {
  const { senha: _senha, ...publico } = usuario;
  return publico;
}

export function usuariosPublicos(usuarios: Usuario[]): UsuarioPublico[] {
  return usuarios.map(usuarioPublico);
}
