import { PlanilhaLimiteError } from "@/lib/planilha/ler-planilha";
import { lerEntradasZip, ZipMinimoError } from "@/lib/planilha/zip-minimo";

function escaparXml(valor: string) {
  return valor
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function lerSharedStrings(xml: string): string[] {
  const lista: string[] = [];
  const blocos = xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g);
  for (const bloco of blocos) {
    const partes = [...bloco[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => escaparXml(item[1]));
    lista.push(partes.join(""));
  }
  return lista;
}

function valorCelula(conteudo: string, tipo: string, shared: string[]): string {
  const texto = conteudo.trim();
  if (tipo === "s") {
    const indice = Number(texto);
    if (Number.isFinite(indice) && shared[indice] !== undefined) return shared[indice];
  }
  return escaparXml(texto);
}

/** Converte a primeira planilha de um .xlsx em matriz de strings (somente leitura). */
export function lerMatrizXlsx(buffer: Buffer, maxLinhasDados?: number): string[][] {
  let entradas;
  try {
    entradas = lerEntradasZip(buffer);
  } catch (error) {
    if (error instanceof ZipMinimoError) throw error;
    throw new ZipMinimoError("Arquivo Excel inválido ou corrompido.");
  }

  const temMacro = entradas.some(
    (item) => /vbaProject/i.test(item.nome) || item.nome.toLowerCase().includes("xl/macrosheets/"),
  );
  const tipos = entradas.find((item) => item.nome === "[Content_Types].xml")?.dados.toString("utf8") ?? "";
  if (temMacro || /macroEnabled/i.test(tipos)) {
    throw new ZipMinimoError("Planilha com macros ou conteúdo executável. Exporte para XLSX sem macros.");
  }

  const sharedXml = entradas.find((item) => item.nome === "xl/sharedStrings.xml")?.dados.toString("utf8") ?? "";
  const shared = sharedXml ? lerSharedStrings(sharedXml) : [];
  const sheet =
    entradas.find((item) => item.nome === "xl/worksheets/sheet1.xml")?.dados.toString("utf8") ??
    entradas.find((item) => /^xl\/worksheets\/sheet\d+\.xml$/.test(item.nome))?.dados.toString("utf8");

  const ehPacoteXlsx =
    entradas.some((item) => item.nome === "[Content_Types].xml" || item.nome.startsWith("xl/"));
  if (!ehPacoteXlsx) {
    throw new ZipMinimoError("O conteúdo não é uma planilha XLSX válida.");
  }

  if (!sheet) throw new ZipMinimoError("Planilha vazia ou sem aba legível.");

  const linhas: string[][] = [];
  const blocosLinha = sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const bloco of blocosLinha) {
    const celulas: string[] = [];
    const celulasXml = bloco[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g);
    for (const celula of celulasXml) {
      const attrs = celula[1];
      const tipo = /t="([^"]+)"/.exec(attrs)?.[1] ?? "";
      const valor = /<v[^>]*>([\s\S]*?)<\/v>/.exec(celula[2])?.[1] ?? "";
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(celula[2])?.[1];
      celulas.push(inline !== undefined ? escaparXml(inline) : valorCelula(valor, tipo, shared));
    }
    if (celulas.some((item) => item.trim())) {
      if (linhas.length > 0 && maxLinhasDados !== undefined && linhas.length - 1 >= maxLinhasDados) {
        throw new PlanilhaLimiteError("Limite de registros excedido.");
      }
      linhas.push(celulas);
    }
  }

  return linhas;
}
