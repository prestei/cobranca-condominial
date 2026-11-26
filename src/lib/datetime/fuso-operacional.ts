/** Fuso horário operacional do escritório (Bahia, UTC−3). */
export const FUSO_OPERACIONAL = "America/Bahia";

type PartesDataHora = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function partesEmFuso(instant: Date, withTime: boolean, timeZone = FUSO_OPERACIONAL): PartesDataHora {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
      : {}),
  });
  const parts = formatter.formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

/** Instantâneo UTC → `YYYY-MM-DDTHH:mm` no fuso operacional (sem sufixo de fuso). */
export function instantParaIsoDataHoraOperacional(value: Date, precision: "min" | "sec" = "min"): string {
  const p = partesEmFuso(value, true);
  if (precision === "min") {
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

/** Instantâneo UTC → `YYYY-MM-DD` (dia civil no fuso operacional). */
export function instantParaIsoDataOperacional(value: Date, timeZone = FUSO_OPERACIONAL): string {
  const p = partesEmFuso(value, false, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function agoraIsoOperacional(): string {
  return instantParaIsoDataHoraOperacional(new Date(), "min");
}

export function hojeIsoOperacional(): string {
  return instantParaIsoDataOperacional(new Date());
}

const ISO_COM_FUSO = /[zZ]$|[+-]\d{2}:\d{2}$/;

/**
 * Exibe `dd/mm/aaaa` ou `dd/mm/aaaa HH:mm`.
 * Strings com `Z`/offset são convertidas do UTC; demais tratadas como já no fuso operacional.
 */
export function formatarDataOperacional(value: string): string {
  if (!value) return "—";
  const trimmed = value.trim();
  const [datePart, timePart] = trimmed.split("T");

  if (timePart && ISO_COM_FUSO.test(trimmed)) {
    const instant = Date.parse(trimmed);
    if (!Number.isNaN(instant)) {
      const convertido = instantParaIsoDataHoraOperacional(new Date(instant), "min");
      return formatarDataOperacional(convertido);
    }
  }

  const [year, month, day] = (datePart ?? "").split("-");
  if (!year || !month || !day) return value;
  const data = `${day}/${month}/${year}`;
  if (!timePart) return data;
  return `${data} ${timePart.slice(0, 5)}`;
}

/** Interpreta ISO operacional sem fuso como horário na Bahia (UTC−3). */
export function isoOperacionalParaInstant(iso: string): Date {
  const trimmed = iso.trim();
  if (!trimmed) return new Date(NaN);
  if (ISO_COM_FUSO.test(trimmed)) return new Date(trimmed);
  const semMs = trimmed.replace(/\.\d{3}$/, "");
  return new Date(`${semMs}-03:00`);
}

/** Partes de data/hora de um ISO (UTC ou operacional) no fuso operacional. */
export function dataHoraPartesOperacional(iso: string, timeZone = FUSO_OPERACIONAL) {
  const instant = ISO_COM_FUSO.test(iso.trim()) ? Date.parse(iso) : isoOperacionalParaInstant(iso).getTime();
  if (Number.isNaN(instant)) return null;
  const p = partesEmFuso(new Date(instant), true, timeZone);
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
  };
}