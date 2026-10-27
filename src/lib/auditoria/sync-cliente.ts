import { setAuditoria, type Auditoria } from "@/data/catalogo";

/** Mescla registros do servidor com o catálogo local (fonte de verdade para consulta na tela). */
export function sincronizarAuditoriaDoServidor(registros: Auditoria[]) {
  const ids = new Set(registros.map((item) => item.id));
  setAuditoria((current) => {
    const legado = current.filter((item) => !ids.has(item.id));
    const mapa = new Map<number, Auditoria>();
    for (const item of legado) mapa.set(item.id, item);
    for (const item of registros) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  });
}
