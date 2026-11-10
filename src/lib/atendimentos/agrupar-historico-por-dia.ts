import { formatarData, nomeCondominio, nomeUnidade, type Atendimento, type Cadastros } from "@/data/catalogo";

export type HistoricoAgendaItem = {
  id: string;
  tipo: "realizado" | "retorno";
  dataHora: string;
  hora: string;
  unidadeId: number;
  unidadeLabel: string;
  condominioNome: string;
  canal: string;
  status: string;
  respondeu: string;
  motivo: string;
  proximaAcao: string;
  dataProximaAcao: string;
};

export type HistoricoAgendaDia = {
  dia: string;
  rotuloLongo: string;
  diaNumero: string;
  diaSemanaCurto: string;
  mesAno: string;
  eHoje: boolean;
  itens: HistoricoAgendaItem[];
};

const DIAS_SEMANA = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."] as const;
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

function parseDia(diaIso: string) {
  const [y, m, d] = diaIso.split("-").map(Number);
  return { y, m, d, date: new Date(y, m - 1, d) };
}

function rotuloDiaLongo(diaIso: string) {
  const { y, m, d, date } = parseDia(diaIso);
  if (!y || !m || !d) return formatarData(diaIso);
  const semana = DIAS_SEMANA[date.getDay()] ?? "";
  return `${semana} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function diaNumero(diaIso: string) {
  return diaIso.slice(8, 10);
}

function diaSemanaCurto(diaIso: string) {
  const { date, y, m, d } = parseDia(diaIso);
  if (!y || !m || !d) return "";
  return DIAS_SEMANA[date.getDay()] ?? "";
}

function mesAnoRotulo(diaIso: string) {
  const { y, m } = parseDia(diaIso);
  if (!y || !m) return "";
  const nome = MESES[m - 1] ?? "";
  return `${nome} de ${y}`;
}

export function inicioFimDoMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimo = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
  return { inicio, fim, rotulo: `${MESES[mes - 1] ?? ""} de ${ano}` };
}

export function listarDiasDoPeriodo(inicioIso: string, fimIso: string): string[] {
  const dias: string[] = [];
  let atual = inicioIso;
  while (atual <= fimIso) {
    dias.push(atual);
    const { date } = parseDia(atual);
    date.setDate(date.getDate() + 1);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    atual = `${yy}-${mm}-${dd}`;
  }
  return dias;
}

function montarItem(
  item: Atendimento,
  cadastros: Pick<Cadastros, "unidades" | "condominios">,
  tipo: "realizado" | "retorno",
  dataRef: string,
): HistoricoAgendaItem {
  const unidadeId = Number(item.unidadeId);
  const unidade = cadastros.unidades.find((u) => u.id === unidadeId);
  const base = tipo === "retorno" ? dataRef : item.dataHora;
  return {
    id: tipo === "retorno" ? `${item.id}-retorno` : item.id,
    tipo,
    dataHora: item.dataHora,
    hora: base.includes("T") ? base.slice(11, 16) : tipo === "retorno" ? "Retorno" : "—",
    unidadeId,
    unidadeLabel: nomeUnidade(unidadeId),
    condominioNome: unidade ? nomeCondominio(unidade.condominioId) : "—",
    canal: item.canal || "—",
    status: item.status || "—",
    respondeu: item.respondeu || "—",
    motivo: item.motivo || "",
    proximaAcao: item.proximaAcao || "",
    dataProximaAcao: item.dataProximaAcao || "",
  };
}

/** Monta a agenda com **todos** os dias do período (vazios inclusos), estilo calendário. */
export function montarAgendaDoPeriodo(
  atendimentos: Atendimento[],
  cadastros: Pick<Cadastros, "unidades" | "condominios">,
  inicioIso: string,
  fimIso: string,
  hojeIso: string,
): HistoricoAgendaDia[] {
  const porDia = new Map<string, HistoricoAgendaItem[]>();
  for (const dia of listarDiasDoPeriodo(inicioIso, fimIso)) {
    porDia.set(dia, []);
  }

  for (const item of atendimentos) {
    const diaRealizado = item.dataHora?.slice(0, 10);
    if (diaRealizado && porDia.has(diaRealizado)) {
      porDia.get(diaRealizado)!.push(montarItem(item, cadastros, "realizado", item.dataHora));
    }

    const diaRetorno = item.dataProximaAcao?.slice(0, 10);
    const retornoPendente = Boolean(diaRetorno) && !item.retornoConcluidoEm;
    if (retornoPendente && diaRetorno && porDia.has(diaRetorno) && diaRetorno !== diaRealizado) {
      porDia.get(diaRetorno)!.push(montarItem(item, cadastros, "retorno", item.dataProximaAcao));
    }
  }

  return [...porDia.entries()].map(([dia, itens]) => ({
    dia,
    rotuloLongo: rotuloDiaLongo(dia),
    diaNumero: diaNumero(dia),
    diaSemanaCurto: diaSemanaCurto(dia),
    mesAno: mesAnoRotulo(dia),
    eHoje: dia === hojeIso,
    itens: [...itens].sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "retorno" ? -1 : 1;
      return a.dataHora.localeCompare(b.dataHora);
    }),
  }));
}

/** @deprecated Preferir `montarAgendaDoPeriodo` para agenda contínua. */
export function agruparHistoricoAtendimentosPorDia(
  atendimentos: Atendimento[],
  cadastros: Pick<Cadastros, "unidades" | "condominios">,
  hojeIso: string,
): HistoricoAgendaDia[] {
  if (atendimentos.length === 0) return [];
  const dias = atendimentos
    .map((item) => item.dataHora?.slice(0, 10))
    .filter(Boolean)
    .sort();
  const inicio = dias[0]!;
  const fim = dias[dias.length - 1]!;
  return montarAgendaDoPeriodo(atendimentos, cadastros, inicio, fim, hojeIso).filter(
    (dia) => dia.itens.length > 0,
  );
}
