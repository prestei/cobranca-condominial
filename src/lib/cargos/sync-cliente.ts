import { setCargos, type Cargo } from "@/data/catalogo";

export function sincronizarCargosDoServidor(cargos: Cargo[]) {
  setCargos((current) => {
    const mapa = new Map<number, Cargo>();
    for (const item of current) mapa.set(item.id, item);
    for (const item of cargos) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });
}

export function aplicarCargoSalvo(cargo: Cargo) {
  setCargos((current) => {
    const existe = current.some((item) => item.id === cargo.id);
    if (existe) {
      return current.map((item) => (item.id === cargo.id ? cargo : item));
    }
    return [...current, cargo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });
}

export function aplicarCargoExcluido(cargoId: number) {
  setCargos((current) => current.filter((item) => item.id !== cargoId));
}
