/** Extração PDF só com pdfjs — usada no worker Node puro (fora do bundle Next). */
import path from "node:path";
import { pathToFileURL } from "node:url";

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

export async function extrairTextoInadimplenciaPdfJsPuro(
  buffer: Buffer,
): Promise<{ texto: string; paginas: number } | null> {
  // Caminho absoluto evita o bundler do Next resolver o subpath do pacote.
  const pdfModuleUrl = pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs"),
  ).href;
  const { getDocument } = (await import(pdfModuleUrl)) as {
    getDocument: (src: {
      data: Uint8Array;
      useSystemFonts?: boolean;
      isEvalSupported?: boolean;
    }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getTextContent: () => Promise<{
            items: Array<{ str?: string; transform: number[] }>;
          }>;
        }>;
      }>;
    };
  };
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const paginas: string[] = [];
  for (let numeroPagina = 1; numeroPagina <= doc.numPages; numeroPagina += 1) {
    const page = await doc.getPage(numeroPagina);
    const textContent = await page.getTextContent();
    const partes: ParteTextoPdfJs[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str) continue;
      partes.push({ x: item.transform[4], y: item.transform[5], str: item.str });
    }
    partes.sort((a, b) => b.y - a.y || a.x - b.x);
    paginas.push(montarLinhasPorCoordenadas(partes).join("\n"));
  }

  const texto = paginas.join("\n").trim();
  if (!texto) return null;
  return { texto, paginas: doc.numPages };
}
