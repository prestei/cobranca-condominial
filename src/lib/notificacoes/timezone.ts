import { FUSO_OPERACIONAL, dataHoraPartesOperacional } from "@/lib/datetime/fuso-operacional";

/** Fuso operacional para lembretes internos (T34). */
export const FUSO_NOTIFICACOES = FUSO_OPERACIONAL;

export function dataHoraPartesEmFuso(iso: string, timeZone = FUSO_NOTIFICACOES) {
  return dataHoraPartesOperacional(iso, timeZone);
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
