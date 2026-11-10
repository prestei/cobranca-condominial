import "server-only";

import type { Cadastros } from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import {
  codigoReDoUsuario,
  identificadorColaboradorPorId as identificadorColaboradorPorIdComCadastros,
  listarAtendentesComRe as listarAtendentesComReComCadastros,
  nomeColaboradorPorCodigoRe as nomeColaboradorPorCodigoReComCadastros,
  usuarioEhAtendente as usuarioEhAtendenteComCadastros,
} from "@/lib/colaboradores/re";

export { codigoReDoUsuario };

/** Atalhos no escopo do catálogo da requisição (somente servidor). */
export function listarAtendentesComRe(cadastros: Cadastros = getCadastros()) {
  return listarAtendentesComReComCadastros(cadastros);
}

export function snapshotAtendentesComRe(cadastros: Cadastros = getCadastros()) {
  return listarAtendentesComRe(cadastros)
    .map((item) => `${item.id}:${item.codigoRe}`)
    .join("|");
}

export function identificadorColaboradorPorId(userId: number, cadastros: Cadastros = getCadastros()) {
  return identificadorColaboradorPorIdComCadastros(userId, cadastros);
}

export function nomeColaboradorPorCodigoRe(codigoRe: string, cadastros: Cadastros = getCadastros()) {
  return nomeColaboradorPorCodigoReComCadastros(codigoRe, cadastros);
}

export function usuarioEhAtendente(usuario: Parameters<typeof usuarioEhAtendenteComCadastros>[0], cadastros?: Cadastros) {
  return usuarioEhAtendenteComCadastros(usuario, cadastros ?? getCadastros());
}
