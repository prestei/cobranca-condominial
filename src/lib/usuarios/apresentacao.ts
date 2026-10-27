import type { Usuario } from "@/data/catalogo";

/** Dados de colaborador expostos pela API (sem senha). */
export type UsuarioPublico = Omit<Usuario, "senha">;

export function usuarioParaResposta(usuario: Usuario): UsuarioPublico {
  const { senha: _senha, ...publico } = usuario;
  return publico;
}

/** Mescla resposta da API com senha local (não trafegada). */
export function usuarioPublicoParaCatalogo(publico: UsuarioPublico, senhaAnterior = ""): Usuario {
  return { ...publico, senha: senhaAnterior };
}
