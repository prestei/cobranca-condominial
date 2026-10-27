import { getCadastros, type Usuario } from "@/data/catalogo";

function cargoAtendenteId() {
  return getCadastros().cargos.find((item) => item.nome === "Atendente")?.id ?? null;
}

export function usuarioEhAtendente(usuario: Usuario) {
  const cargoId = cargoAtendenteId();
  return cargoId !== null && usuario.cargoId === cargoId;
}

export function codigoReDoUsuario(usuario: Usuario): string | null {
  const re = usuario.codigoRe?.trim();
  return re || null;
}

export function listarAtendentesComRe() {
  const cargoId = cargoAtendenteId();
  if (cargoId === null) return [];
  return getCadastros()
    .usuarios.filter((item) => item.cargoId === cargoId && codigoReDoUsuario(item))
    .map((item) => ({ id: item.id, codigoRe: codigoReDoUsuario(item)! }))
    .sort((a, b) => a.codigoRe.localeCompare(b.codigoRe, "pt-BR"));
}

export function snapshotAtendentesComRe() {
  return listarAtendentesComRe()
    .map((item) => `${item.id}:${item.codigoRe}`)
    .join("|");
}
