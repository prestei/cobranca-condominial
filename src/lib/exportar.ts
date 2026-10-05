function escaparXml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escaparHtml(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function baixar(nome: string, conteudo: Blob) {
  const url = URL.createObjectURL(conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportarExcel(nome: string, colunas: string[], linhas: string[][]) {
  const celula = (valor: string) => `<Cell><Data ss:Type="String">${escaparXml(valor)}</Data></Cell>`;
  const linha = (valores: string[]) => `<Row>${valores.map(celula).join("")}</Row>`;
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Relatorio"><Table>
${linha(colunas)}
${linhas.map(linha).join("\n")}
</Table></Worksheet>
</Workbook>`;
  baixar(nome.endsWith(".xls") ? nome : `${nome}.xls`, new Blob([xml], { type: "application/vnd.ms-excel" }));
}

export function exportarPdf(titulo: string, nome: string, secoes: Array<{ titulo: string; colunas: string[]; linhas: string[][] }>) {
  const blocos = secoes
    .map((secao) => {
      const cabecalho = secao.colunas.map((coluna) => `<th>${escaparHtml(coluna)}</th>`).join("");
      const corpo =
        secao.linhas.length === 0
          ? `<tr><td colspan="${secao.colunas.length}">Nenhum registro no período.</td></tr>`
          : secao.linhas
              .map((linha) => `<tr>${linha.map((valor) => `<td>${escaparHtml(valor)}</td>`).join("")}</tr>`)
              .join("");
      return `<h2>${escaparHtml(secao.titulo)}</h2><table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
body{font-family:sans-serif;color:#12213A;margin:24px}
h1{font-size:22px;margin:0 0 8px}
h2{font-size:16px;margin:24px 0 8px}
table{border-collapse:collapse;width:100%;margin-bottom:12px}
th,td{border:1px solid #D5DDE8;padding:6px 8px;text-align:left;font-size:12px}
th{background:#F4F1EA}
</style></head><body><h1>${escaparHtml(titulo)}</h1>${blocos}</body></html>`;
  const janela = window.open("", "_blank");
  if (janela) {
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    janela.print();
    return true;
  }
  baixar(nome.endsWith(".html") ? nome : `${nome}.html`, new Blob([html], { type: "text/html" }));
  return false;
}
