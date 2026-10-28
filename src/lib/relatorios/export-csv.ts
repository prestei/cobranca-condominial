import type { RelatorioExportPayload, RelatorioExportSecao } from "@/lib/relatorios/service";

function escaparCsv(valor: string) {
  const texto = valor ?? "";
  if (/[;"\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function secaoCsv(secao: RelatorioExportSecao) {
  const cabecalho = secao.colunas.map(escaparCsv).join(";");
  const corpo = secao.linhas.map((linha) => linha.map(escaparCsv).join(";")).join("\n");
  return [secao.titulo, cabecalho, corpo].join("\n");
}

export function relatorioParaCsv(payload: RelatorioExportPayload): string {
  const meta = [
    `Gerado em: ${payload.meta.geradoEm}`,
    ...payload.meta.filtros.map((linha) => `Filtro: ${linha}`),
    "",
  ].join("\n");
  const corpo = payload.secoes.map(secaoCsv).join("\n\n");
  return `\uFEFF${meta}${corpo}`;
}

function escaparXml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function relatorioParaXls(payload: RelatorioExportPayload): string {
  const celula = (valor: string) => `<Cell><Data ss:Type="String">${escaparXml(valor)}</Data></Cell>`;
  const linha = (valores: string[]) => `<Row>${valores.map(celula).join("")}</Row>`;
  const metaLinhas = [[`Gerado em: ${payload.meta.geradoEm}`], ...payload.meta.filtros.map((f) => [`Filtro: ${f}`]), [""]];
  const blocos = payload.secoes.flatMap((secao) => [
    [secao.titulo],
    secao.colunas,
    ...secao.linhas,
    [""],
  ]);
  const todas = [...metaLinhas, ...blocos];
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Relatorio"><Table>
${todas.map((vals) => linha(vals)).join("\n")}
</Table></Worksheet>
</Workbook>`;
}
