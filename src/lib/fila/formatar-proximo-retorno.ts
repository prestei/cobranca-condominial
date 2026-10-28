import { hojeIso, situacaoRetorno } from "@/data/catalogo";

/** Rótulo amigável para a coluna «Próximo retorno» (ex.: «Hoje, 15:00»). */
export function formatarProximoRetorno(dataIso: string | null | undefined): string {
  if (!dataIso?.trim()) return "—";
  const situacao = situacaoRetorno(dataIso);
  const [, timePart] = dataIso.split("T");
  const hora = timePart?.slice(0, 5);

  if (situacao === "hoje") {
    return hora && hora !== "00:00" ? `Hoje, ${hora}` : "Hoje";
  }
  if (situacao === "atrasado") {
    return hora && hora !== "00:00" ? `Atrasado · ${hora}` : "Atrasado";
  }

  const hoje = hojeIso();
  const [y, m, d] = dataIso.slice(0, 10).split("-");
  const [hy, hm, hd] = hoje.split("-");
  if (y && m && d && hy && hm && hd) {
    const alvo = new Date(Number(y), Number(m) - 1, Number(d));
    const ref = new Date(Number(hy), Number(hm) - 1, Number(hd));
    const diffDias = Math.round((alvo.getTime() - ref.getTime()) / 86_400_000);
    if (diffDias === 1) return hora && hora !== "00:00" ? `Amanhã, ${hora}` : "Amanhã";
    if (diffDias === -1) return hora && hora !== "00:00" ? `Ontem, ${hora}` : "Ontem";
  }

  const [year, month, day] = dataIso.slice(0, 10).split("-");
  if (!year || !month || !day) return dataIso;
  const data = `${day}/${month}/${year}`;
  return hora && hora !== "00:00" ? `${data} · ${hora}` : data;
}
