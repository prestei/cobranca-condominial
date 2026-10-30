import { getCadastros, nomeCargo, type Usuario } from "@/data/catalogo";
import { codigoReValido, normalizarCodigoRe } from "@/lib/colaboradores/re-sequencia";

function cargoAtendenteId() {
  return getCadastros().cargos.find((item) => item.nome === "Atendente")?.id ?? null;
}

export function usuarioEhAtendente(usuario: Usuario) {
  const cargoId = cargoAtendenteId();
  return cargoId !== null && usuario.cargoId === cargoId;
}

export function usuarioEstaAtivo(usuario: Usuario) {
  return usuario.ativo !== false;
}

export function codigoReDoUsuario(usuario: Usuario): string | null {
  if (!usuarioEhAtendente(usuario)) return null;
  const re = usuario.codigoRe?.trim();
  if (!re || !codigoReValido(re)) return null;
  return normalizarCodigoRe(re);
}

export function identificadorColaboradorPorId(userId: number): string {
  const usuario = getCadastros().usuarios.find((item) => item.id === userId);
  if (!usuario) return "—";
  const re = codigoReDoUsuario(usuario);
  if (re) return re;
  const cargo = nomeCargo(usuario.cargoId);
  if (cargo === "Advogado") return usuario.nome.trim() || "Advogado";
  if (cargo === "Administrador") return usuario.nome.trim() || "Administradora";
  return usuario.nome.trim() || "—";
}

export function listarAtendentesComRe() {
  const cargoId = cargoAtendenteId();
  if (cargoId === null) return [];
  return getCadastros()
    .usuarios.filter(
      (item) => item.cargoId === cargoId && usuarioEstaAtivo(item) && codigoReDoUsuario(item),
    )
    .map((item) => ({ id: item.id, codigoRe: codigoReDoUsuario(item)! }))
    .sort((a, b) => a.codigoRe.localeCompare(b.codigoRe, "pt-BR"));
}

export function snapshotAtendentesComRe() {
  return listarAtendentesComRe()
    .map((item) => `${item.id}:${item.codigoRe}`)
    .join("|");
}
