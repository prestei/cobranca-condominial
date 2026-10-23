function escaparXml(valor: string) {
  return valor
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** CSV com separador ; (exportação pt-BR) ou XML Spreadsheet (.xls gerado pelo sistema). */
export function lerMatrizPlanilha(conteudo: string): string[][] {
  const texto = conteudo.replace(/^\uFEFF/, "");
  if (texto.trimStart().startsWith("<?xml") || texto.includes("<Workbook")) {
    return lerXmlSpreadsheet(texto);
  }
  return lerCsvSemicolon(texto);
}

function lerCsvSemicolon(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let entreAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (entreAspas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          celula += '"';
          i += 1;
        } else {
          entreAspas = false;
        }
      } else {
        celula += ch;
      }
      continue;
    }
    if (ch === '"') {
      entreAspas = true;
      continue;
    }
    if (ch === ";") {
      linha.push(celula);
      celula = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i += 1;
      linha.push(celula);
      celula = "";
      if (linha.some((item) => item.trim())) linhas.push(linha);
      linha = [];
      continue;
    }
    celula += ch;
  }

  linha.push(celula);
  if (linha.some((item) => item.trim())) linhas.push(linha);
  return linhas;
}

function lerXmlSpreadsheet(xml: string): string[][] {
  const linhas: string[][] = [];
  const blocosLinha = xml.matchAll(/<Row[^>]*>([\s\S]*?)<\/Row>/g);
  for (const bloco of blocosLinha) {
    const celulas: string[] = [];
    const dados = bloco[1].matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/g);
    for (const item of dados) {
      celulas.push(escaparXml(item[1].trim()));
    }
    if (celulas.length > 0) linhas.push(celulas);
  }
  return linhas;
}
