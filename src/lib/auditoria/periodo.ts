export function parseDataFiltro(value: string | undefined): Date | null {
  const texto = value?.trim();
  if (!texto) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!match) return null;
  const [, ano, mes, dia] = match;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (Number.isNaN(data.getTime())) return null;
  return data;
}

export function inicioDiaIso(data: Date): string {
  const copy = new Date(data);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

export function fimDiaIso(data: Date): string {
  const copy = new Date(data);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
}

export function registroDentroDoPeriodo(dataHora: string, dataDe?: string, dataAte?: string): boolean {
  const inicio = parseDataFiltro(dataDe);
  const fim = parseDataFiltro(dataAte);
  if (!inicio && !fim) return true;
  const instante = dataHora.trim();
  if (!instante) return false;
  if (inicio && instante < inicioDiaIso(inicio)) return false;
  if (fim && instante > fimDiaIso(fim)) return false;
  return true;
}
