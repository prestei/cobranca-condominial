import { spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";

export type ResultadoExtracaoTextoPdf = {
  texto: string;
  metodo: "pdftotext" | "flate_layout";
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

function extrairTextoViaPdftotext(buffer: Buffer): string | null {
  const resultado = spawnSync("pdftotext", ["-layout", "-", "-"], {
    input: buffer,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024,
  });
  if (resultado.status !== 0) return null;
  const texto = (resultado.stdout ?? "").trim();
  return texto.length > 0 ? texto : null;
}

export function extrairTextoLegivelPdf(buffer: Buffer): ResultadoExtracaoTextoPdf {
  const viaPdftotext = extrairTextoViaPdftotext(buffer);
  if (viaPdftotext) {
    const paginas = viaPdftotext.match(/Pág:\s*\d+\/\d+/g)?.length;
    return { texto: viaPdftotext, metodo: "pdftotext", paginas };
  }
  const layout = extrairTextoViaFlateLayout(buffer);
  return { texto: layout, metodo: "flate_layout" };
}
