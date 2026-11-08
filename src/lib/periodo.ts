export const periodPresets = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7", label: "Últimos 7 dias" },
  { id: "30", label: "Últimos 30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "anterior", label: "Mês anterior" },
  { id: "todos", label: "Todos" },
] as const;

export type PeriodPreset = (typeof periodPresets)[number]["id"] | "personalizado";

export type PeriodValue = {
  preset: PeriodPreset;
  de: string;
  ate: string;
};

function isoData(data: Date) {
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

export function rotuloPeriodo(value: PeriodValue) {
  const preset = periodPresets.find((item) => item.id === value.preset);
  if (preset) return preset.label;
  const de = value.de ? value.de.split("-").reverse().join("/") : "";
  const ate = value.ate ? value.ate.split("-").reverse().join("/") : "";
  if (de && ate) return `${de} – ${ate}`;
  if (de) return `De ${de}`;
  if (ate) return `Até ${ate}`;
  return "Período personalizado";
}

export function resolverPeriodo(value: PeriodValue, hoje: string) {
  if (value.preset === "hoje") return { inicio: hoje, fim: hoje };
  if (value.preset === "ontem") {
    const data = new Date(`${hoje}T00:00:00`);
    data.setDate(data.getDate() - 1);
    const dia = isoData(data);
    return { inicio: dia, fim: dia };
  }
  if (value.preset === "7" || value.preset === "30") {
    const data = new Date(`${hoje}T00:00:00`);
    data.setDate(data.getDate() - (value.preset === "7" ? 6 : 29));
    return { inicio: isoData(data), fim: hoje };
  }
  if (value.preset === "mes") return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
  if (value.preset === "anterior") {
    const data = new Date(`${hoje.slice(0, 7)}-01T00:00:00`);
    data.setDate(0);
    const fim = isoData(data);
    return { inicio: `${fim.slice(0, 7)}-01`, fim };
  }
  if (value.preset === "todos") return { inicio: "", fim: "" };
  const inicio = value.de?.trim() ?? "";
  const fim = value.ate?.trim() ?? "";
  return { inicio, fim };
}
