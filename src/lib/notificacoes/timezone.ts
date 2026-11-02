/** Fuso operacional para lembretes internos (T34). */
export const FUSO_NOTIFICACOES = "America/Sao_Paulo";

export function dataHoraPartesEmFuso(iso: string, timeZone = FUSO_NOTIFICACOES) {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(instant));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    data: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hora: `${pick("hour")}:${pick("minute")}`,
  };
}

export function hojeEmFuso(timeZone = FUSO_NOTIFICACOES) {
  const partes = dataHoraPartesEmFuso(new Date().toISOString(), timeZone);
  return partes?.data ?? "";
}

export function minutosDesdeMeiaNoite(hora: string) {
  const [h, m] = hora.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}
