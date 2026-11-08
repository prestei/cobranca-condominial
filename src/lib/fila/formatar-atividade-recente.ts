import { hojeIso } from "@/data/catalogo";

/** Timestamp curto para «Atividade recente» (ex.: «Hoje, 10:24»). */
export function formatarMomentoAtividade(iso: string): string {
  if (!iso) return "—";
  const hoje = hojeIso();
  const dataPart = iso.slice(0, 10);
  const hora = iso.includes("T") ? iso.split("T")[1]?.slice(0, 5) : "";

  if (dataPart === hoje) {
    return hora ? `Hoje, ${hora}` : "Hoje";
  }

  const [y, m, d] = dataPart.split("-").map(Number);
  const [hy, hm, hd] = hoje.split("-").map(Number);
  if (y && m && d && hy && hm && hd) {
    const alvo = new Date(y, m - 1, d);
    const ref = new Date(hy, hm - 1, hd);
    const diff = Math.round((ref.getTime() - alvo.getTime()) / 86_400_000);
    if (diff === 1) return hora ? `Ontem, ${hora}` : "Ontem";
  }

  const [year, month, day] = dataPart.split("-");
  if (!year || !month || !day) return iso;
  return hora ? `${day}/${month}/${year} · ${hora}` : `${day}/${month}/${year}`;
}
