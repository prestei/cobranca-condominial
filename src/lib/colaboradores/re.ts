import { nomeCargo, type Cadastros, type Usuario } from "@/data/catalogo";
import { codigoReValido, normalizarCodigoRe } from "@/lib/colaboradores/re-sequencia";

export function cargoAtendenteId(cadastros: Pick<Cadastros, "cargos">) {
  return cadastros.cargos.find((item) => item.nome === "Atendente")?.id ?? null;
}

export function usuarioEhAtendente(usuario: Usuario, cadastros: Pick<Cadastros, "cargos">) {
  const cargoId = cargoAtendenteId(cadastros);
  return cargoId !== null && usuario.cargoId === cargoId;
}

export function usuarioEstaAtivo(usuario: Usuario) {
  return usuario.ativo !== false;
}

export function codigoReDoUsuario(usuario: Usuario): string | null {
  const re = usuario.codigoRe?.trim();
  if (!re || !codigoReValido(re)) return null;
  return normalizarCodigoRe(re);
}

export function identificadorColaboradorPorId(userId: number, cadastros: Cadastros): string {
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (!usuario) return "—";
  const re = codigoReDoUsuario(usuario);
  if (re) return re;
  const cargo = nomeCargo(usuario.cargoId, cadastros);
  if (cargo === "Advogado") return usuario.nome.trim() || "Advogado";
  if (cargo === "Administrador") return usuario.nome.trim() || "Administradora";
  return usuario.nome.trim() || "—";
}

export function nomeColaboradorPorCodigoRe(codigoRe: string, cadastros: Cadastros): string {
  const alvo = codigoRe.trim().toUpperCase();
  if (!alvo) return "—";
  const usuario = cadastros.usuarios.find((item) => codigoReDoUsuario(item)?.toUpperCase() === alvo);
  const nome = usuario?.nome?.trim();
  return nome || codigoRe.trim() || "—";
}

export function listarAtendentesComRe(cadastros: Cadastros) {
  const cargoId = cargoAtendenteId(cadastros);
  if (cargoId === null) return [];
  return cadastros.usuarios
    .filter((item) => item.cargoId === cargoId && usuarioEstaAtivo(item) && codigoReDoUsuario(item))
    .map((item) => {
      const codigoRe = codigoReDoUsuario(item)!;
      return {
        id: item.id,
        codigoRe,
        nome: item.nome.trim() || codigoRe,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.codigoRe.localeCompare(b.codigoRe, "pt-BR"));
}

export function snapshotAtendentesComRe(cadastros: Cadastros) {
  return listarAtendentesComRe(cadastros)
    .map((item) => `${item.id}:${item.codigoRe}`)
    .join("|");
}
