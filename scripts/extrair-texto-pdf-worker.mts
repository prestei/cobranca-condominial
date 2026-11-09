import path from "node:path";
import { pathToFileURL } from "node:url";

async function lerBufferEntrada(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const buffer = await lerBufferEntrada();
if (!buffer.length) {
  process.stderr.write("entrada_vazia");
  process.exit(2);
}

const moduloUrl = pathToFileURL(
  path.join(process.cwd(), "src/lib/importacoes/inadimplencia/extrair-texto-pdf-interno.ts"),
).href;

const { extrairTextoInadimplenciaPdfJsPuro } = await import(moduloUrl);
const resultado = await extrairTextoInadimplenciaPdfJsPuro(buffer);
process.stdout.write(JSON.stringify(resultado));
