import { spawnSync } from "node:child_process";
import path from "node:path";
import { inflateSync } from "node:zlib";

export type ResultadoExtracaoTextoPdf = {
  texto: string;
  metodo: "pdftotext" | "pdfjs" | "flate_layout";
  paginas?: number;
};

function desescaparTextoPdf(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

type ElementoTextoPdf = { x: number; y: number; text: string };

function extrairElementosDeStream(conteudo: string): ElementoTextoPdf[] {
  const elementos: ElementoTextoPdf[] = [];
  const reTj = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let x = 0;
  let y = 0;

  const tokens = conteudo.split(/[\s\r\n]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "Tm" && i >= 6) {
      x = Number(tokens[i - 2]);
      y = Number(tokens[i - 1]);
      continue;
    }
    if (token === "Td" && i >= 2) {
      x += Number(tokens[i - 2]);
      y += Number(tokens[i - 1]);
      continue;
    }
    if (token === "Tj" && i >= 1) {
      let raw = tokens[i - 1];
      if (raw.startsWith("(") && raw.endsWith(")")) {
        raw = raw.slice(1, -1);
      }
      const text = desescaparTextoPdf(raw).trim();
      if (text) elementos.push({ x, y, text });
      continue;
    }
    if (token === "TJ" && i >= 1) {
      const arr = tokens[i - 1];
      for (const m of arr.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
        const text = desescaparTextoPdf(m[1]).trim();
        if (text) elementos.push({ x, y, text });
      }
    }
  }

  if (elementos.length === 0) {
    for (const m of conteudo.matchAll(reTj)) {
      const text = desescaparTextoPdf(m[1]).trim();
      if (text) elementos.push({ x: 0, y: 0, text });
    }
  }

  return elementos;
}

function inflarStreamsPdf(buffer: Buffer): string[] {
  const latin = buffer.toString("latin1");
  const streams: string[] = [];
  let pos = 0;
  while (true) {
    const inicio = latin.indexOf("stream", pos);
    if (inicio < 0) break;
    const fim = latin.indexOf("endstream", inicio);
    if (fim < 0) break;
    let data = Buffer.from(latin.slice(inicio + 6, fim), "latin1");
    if (data[0] === 10) data = data.subarray(1);
    if (streams.length >= 200) break;
    try {
      streams.push(inflateSync(data, { maxOutputLength: 8 * 1024 * 1024 }).toString("latin1"));
    } catch {
      /* stream não-Flate, incompleto ou acima do limite */
    }
    pos = fim + 9;
  }
  return streams;
}

function montarLayoutPorCoordenadas(elementos: ElementoTextoPdf[]): string {
  if (elementos.length === 0) return "";
  const ordenados = [...elementos].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Array<{ y: number; partes: Array<{ x: number; text: string }> }> = [];
  const toleranciaY = 6;

  for (const item of ordenados) {
    const existente = linhas.find((linha) => Math.abs(linha.y - item.y) <= toleranciaY);
    if (existente) {
      existente.partes.push({ x: item.x, text: item.text });
      existente.y = (existente.y + item.y) / 2;
    } else {
      linhas.push({ y: item.y, partes: [{ x: item.x, text: item.text }] });
    }
  }

  linhas.sort((a, b) => b.y - a.y);
  return linhas
    .map((linha) => {
      const partes = linha.partes.sort((a, b) => a.x - b.x);
      return partes.map((p) => p.text).join("\t");
    })
    .join("\n");
}

function extrairTextoViaFlateLayout(buffer: Buffer): string {
  const streams = inflarStreamsPdf(buffer);
  const elementos = streams.flatMap((stream) => extrairElementosDeStream(stream));
  return montarLayoutPorCoordenadas(elementos);
}

function pdftotextPareceRelatorioInadimplencia(texto: string): boolean {
  const t = texto.trim();
  if (!t.includes("UNIDADES INADIMPLENTES")) return false;
  if (t.includes("Gestão Condominial") || t.includes("Condomínio21")) return true;
  if (/Gestão\s+e\s+Cobrança\s+Condominial/i.test(t)) return true;
  if (/Unidade:\s*[A-Z]{1,3}-\d{3,5}/i.test(t) && /Proj\.\s*Rec/i.test(t)) return true;
  return false;
}

function extrairTextoViaPdftotext(buffer: Buffer): string | null {
  const resultado = spawnSync("pdftotext", ["-layout", "-", "-"], {
    input: buffer,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024,
  });
  if (resultado.status !== 0) return null;
  const texto = (resultado.stdout ?? "").trim();
  if (!texto || !pdftotextPareceRelatorioInadimplencia(texto)) return null;
  return texto;
}

type ParteTextoPdfJs = { x: number; y: number; str: string };

function montarLinhasPorCoordenadas(partes: ParteTextoPdfJs[], toleranciaY = 4): string[] {
  const linhasPartes: ParteTextoPdfJs[][] = [];
  for (const parte of partes) {
    const linha = linhasPartes.find((item) => Math.abs(item[0]!.y - parte.y) <= toleranciaY);
    if (linha) linha.push(parte);
    else linhasPartes.push([parte]);
  }
  const linhas: string[] = [];
  for (const linha of linhasPartes) {
    linha.sort((a, b) => a.x - b.x);
    const texto = linha
      .map((p) => p.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (texto) linhas.push(texto);
  }
  return linhas;
}

function extrairTextoViaPdfJsWorker(buffer: Buffer): { texto: string; paginas: number } | null {
  const script = path.join(process.cwd(), "scripts/extrair-texto-pdf-worker.mts");
  const resultado = spawnSync(process.execPath, ["--import", "tsx", script], {
    input: buffer,
    maxBuffer: 32 * 1024 * 1024,
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (resultado.status !== 0 || !resultado.stdout?.trim()) return null;
  try {
    const parsed = JSON.parse(resultado.stdout) as { texto?: string; paginas?: number } | null;
    if (!parsed?.texto?.trim()) return null;
    return { texto: parsed.texto, paginas: parsed.paginas ?? 1 };
  } catch {
    return null;
  }
}

async function extrairTextoViaPdfJsDireto(buffer: Buffer): Promise<{ texto: string; paginas: number } | null> {
  try {
    const { extrairTextoInadimplenciaPdfJsPuro } = await import(
      "@/lib/importacoes/inadimplencia/extrair-texto-pdf-interno"
    );
    return await extrairTextoInadimplenciaPdfJsPuro(buffer);
  } catch {
    return null;
  }
}

async function extrairTextoViaPdfJs(buffer: Buffer): Promise<{ texto: string; paginas: number } | null> {
  const direto = await extrairTextoViaPdfJsDireto(buffer);
  if (direto?.texto.includes("UNIDADES INADIMPLENTES")) return direto;
  const worker = extrairTextoViaPdfJsWorker(buffer);
  if (worker) return worker;
  return direto;
}

function textoRelatorioInadimplenciaReconhecivel(texto: string): boolean {
  return texto.trim().includes("UNIDADES INADIMPLENTES");
}

export async function extrairTextoLegivelPdf(buffer: Buffer): Promise<ResultadoExtracaoTextoPdf> {
  const candidatos: ResultadoExtracaoTextoPdf[] = [];

  const viaPdftotext = extrairTextoViaPdftotext(buffer);
  if (viaPdftotext) {
    const paginas = viaPdftotext.match(/Pág:\s*\d+\/\d+/g)?.length;
    candidatos.push({ texto: viaPdftotext, metodo: "pdftotext", paginas });
  }

  const viaPdfJs = await extrairTextoViaPdfJs(buffer);
  if (viaPdfJs) {
    candidatos.push({ texto: viaPdfJs.texto, metodo: "pdfjs", paginas: viaPdfJs.paginas });
  }

  const layout = extrairTextoViaFlateLayout(buffer);
  if (layout.trim()) {
    candidatos.push({ texto: layout, metodo: "flate_layout" });
  }

  const reconhecivel = candidatos.find((item) => textoRelatorioInadimplenciaReconhecivel(item.texto));
  if (reconhecivel) return reconhecivel;

  const porQualidade = candidatos.find((item) => item.metodo === "pdfjs")
    ?? candidatos.find((item) => item.metodo === "pdftotext")
    ?? candidatos[0];

  if (porQualidade) return porQualidade;

  return { texto: "", metodo: "flate_layout" };
}
