import { hojeIso } from "@/data/catalogo";

/** Rótulo compacto na fila (hoje = só hora; ontem; demais = data sem hora). */
export function formatarDataHoraLista(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const dataDia = iso.slice(0, 10);
  const hora = iso.includes("T") ? iso.slice(11, 16) : "";
  const hoje = hojeIso();

  if (dataDia === hoje) {
    return hora && hora !== "00:00" ? hora : "";
  }

  const [y, m, d] = dataDia.split("-");
  const [hy, hm, hd] = hoje.split("-");
  if (y && m && d && hy && hm && hd) {
    const alvo = new Date(Number(y), Number(m) - 1, Number(d));
    const ref = new Date(Number(hy), Number(hm) - 1, Number(hd));
    const diffDias = Math.round((alvo.getTime() - ref.getTime()) / 86_400_000);
    if (diffDias === -1) return "Ontem";
  }

  const [year, month, day] = dataDia.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}
