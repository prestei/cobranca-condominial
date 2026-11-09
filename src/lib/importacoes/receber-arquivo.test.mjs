import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { deflateRawSync } from "node:zlib";
import {
  _limparTodosProcessosTemporariosParaTeste,
  obterProcessoArquivoTemporario,
} from "@/lib/importacoes/armazenamento-temporario";
import { LIMITES_ARQUIVO_IMPORTACAO } from "@/lib/importacoes/limites";
import { RecebimentoArquivoError, receberArquivoImportacao } from "@/lib/importacoes/receber-arquivo";

const CABECALHO_DEBITOS = "Unidade;Condomínio;Referência;Vencimento;Valor atualizado\n";
const LINHA_DEBITO = "101;Residencial;09/2026;2026-09-10;150,00\n";

const XML_PLANILHA = `<?xml version="1.0"?>
<Workbook>
<Worksheet><Table>
<Row><Cell><Data>Unidade</Data></Cell><Cell><Data>Condomínio</Data></Cell><Cell><Data>Referência</Data></Cell><Cell><Data>Vencimento</Data></Cell><Cell><Data>Valor atualizado</Data></Cell></Row>
<Row><Cell><Data>101</Data></Cell><Cell><Data>Residencial</Data></Cell><Cell><Data>09/2026</Data></Cell><Cell><Data>2026-09-10</Data></Cell><Cell><Data>150,00</Data></Cell></Row>
</Table></Worksheet>
</Workbook>`;

function zipArmazenado(entradas) {
  const partes = [];
  for (const { nome, dados } of entradas) {
    const nomeBuf = Buffer.from(nome, "utf8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(dados.length, 18);
    header.writeUInt32LE(dados.length, 22);
    header.writeUInt16LE(nomeBuf.length, 26);
    partes.push(header, nomeBuf, dados);
  }
  return Buffer.concat(partes);
}

function zipDeflateComDiretorio(entradas) {
  const locais = [];
  const centrais = [];
  let offset = 0;
  for (const { nome, dados } of entradas) {
    const nomeBuf = Buffer.from(nome, "utf8");
    const comprimido = deflateRawSync(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    const bloco = Buffer.concat([local, nomeBuf, comprimido]);
    locais.push(bloco);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrais.push(Buffer.concat([central, nomeBuf]));
    offset += bloco.length;
  }
  const cd = Buffer.concat(centrais);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locais, cd, eocd]);
}

function planilhaXlsxMinima(comDiretorio = false) {
  const sheet = Buffer.from(
    `<worksheet><sheetData><row r="1"><c t="inlineStr"><t>Unidade</t></c><c t="inlineStr"><t>Condomínio</t></c><c t="inlineStr"><t>Referência</t></c><c t="inlineStr"><t>Vencimento</t></c><c t="inlineStr"><t>Valor atualizado</t></c></row><row r="2"><c t="inlineStr"><t>101</t></c><c t="inlineStr"><t>Residencial</t></c><c t="inlineStr"><t>09/2026</t></c><c t="inlineStr"><t>2026-09-10</t></c><c t="inlineStr"><t>150,00</t></c></row></sheetData></worksheet>`,
    "utf8",
  );
  const entradas = [
    { nome: "[Content_Types].xml", dados: Buffer.from("<Types/>", "utf8") },
    { nome: "xl/worksheets/sheet1.xml", dados: sheet },
  ];
  return comDiretorio ? zipDeflateComDiretorio(entradas) : zipArmazenado(entradas);
}

async function rejeita(input, codigo) {
  await assert.rejects(
    () => receberArquivoImportacao(input),
    (err) => err instanceof RecebimentoArquivoError && err.codigo === codigo,
  );
}

describe("receber arquivo de importação", { concurrency: 1 }, () => {
test.afterEach(() => {
  _limparTodosProcessosTemporariosParaTeste();
});

test("rejeita extensão incompatível com o conteúdo", async () => {
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}${LINHA_DEBITO}`, "utf8");
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "dados.xlsx", buffer },
    "extensao_incompativel",
  );
});

test("rejeita arquivo vazio", async () => {
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "vazio.csv", buffer: Buffer.alloc(0) },
    "arquivo_vazio",
  );
});

test("rejeita CSV só com cabeçalho", async () => {
  await rejeita(
    {
      userId: 1,
      modulo: "debitos",
      nomeArquivo: "so-cabecalho.csv",
      buffer: Buffer.from(CABECALHO_DEBITOS, "utf8"),
    },
    "arquivo_vazio",
  );
});

test("rejeita formato não autorizado para o módulo", async () => {
  const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "utf8");
  await rejeita(
    { userId: 1, modulo: "condominios", nomeArquivo: "relatorio.pdf", buffer, mimeDeclarado: "application/pdf" },
    "formato_nao_autorizado",
  );
});

test("rejeita extensão não autorizada", async () => {
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "macro.xlsm", buffer: Buffer.from("PK\u0003\u0004fake") },
    "formato_nao_autorizado",
  );
});

test("rejeita executável disfarçado de planilha", async () => {
  const buffer = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.from("This program cannot be run\n", "utf8")]);
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "malware.csv", buffer, mimeDeclarado: "text/csv" },
    "formato_nao_autorizado",
  );
});

test("rejeita MIME incompatível com o conteúdo", async () => {
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}${LINHA_DEBITO}`, "utf8");
  await rejeita(
    {
      userId: 1,
      modulo: "debitos",
      nomeArquivo: "dados.csv",
      buffer,
      mimeDeclarado: "application/pdf",
    },
    "mime_invalido",
  );
});

test("rejeita arquivo acima do tamanho máximo antes da leitura de registros", async () => {
  const buffer = Buffer.alloc(LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes + 1, 0x41);
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "grande.csv", buffer },
    "arquivo_grande",
  );
});

test("rejeita quantidade de registros acima do limite", async () => {
  const linhas = Array.from({ length: LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos + 1 }, (_, i) => `${i};X;09/2026;2026-09-10;1\n`);
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}${linhas.join("")}`, "utf8");
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "muitos.csv", buffer },
    "muitos_registros",
  );
});

test("rejeita Excel binário / OLE (protegido ou .xls legado)", async () => {
  const buffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 1, 2, 3, 4, 5, 6, 7]);
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "planilha.xls", buffer },
    "arquivo_protegido",
  );
});

test("rejeita PDF protegido por senha", async () => {
  const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<</Encrypt 2 0 R>>\nendobj\n%%EOF\n", "utf8");
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "bloqueado.pdf", buffer, mimeDeclarado: "application/pdf" },
    "pdf_protegido",
  );
});

test("rejeita PDF corrompido", async () => {
  const buffer = Buffer.from("%PDF-1.4\n" + "x".repeat(200), "utf8");
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "quebrado.pdf", buffer, mimeDeclarado: "application/pdf" },
    "arquivo_corrompido",
  );
});

test("rejeita ZIP que não é planilha XLSX", async () => {
  const buffer = zipArmazenado([{ nome: "word/document.xml", dados: Buffer.from("<w:doc/>", "utf8") }]);
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "falso.xlsx", buffer },
    "formato_nao_autorizado",
  );
});

test("rejeita planilha XLSX com macros", async () => {
  const buffer = zipArmazenado([
    { nome: "[Content_Types].xml", dados: Buffer.from('<Types ContentType="macroEnabled"/>', "utf8") },
    { nome: "xl/vbaProject.bin", dados: Buffer.from("macro", "utf8") },
    { nome: "xl/worksheets/sheet1.xml", dados: Buffer.from("<worksheet><sheetData/></worksheet>", "utf8") },
  ]);
  await rejeita(
    { userId: 1, modulo: "debitos", nomeArquivo: "macro.xlsx", buffer },
    "arquivo_protegido",
  );
});

test("aceita CSV válido, gera processoId único e não persiste o arquivo fora do temporário", async () => {
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}${LINHA_DEBITO}`, "utf8");
  const primeiro = await receberArquivoImportacao({
    userId: 1,
    modulo: "debitos",
    nomeArquivo: "inadimplencia.csv",
    buffer,
    mimeDeclarado: "text/csv",
  });
  const segundo = await receberArquivoImportacao({
    userId: 1,
    modulo: "debitos",
    nomeArquivo: "inadimplencia.csv",
    buffer,
    mimeDeclarado: "text/csv",
  });
  assert.match(primeiro.processoId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(primeiro.processoId, segundo.processoId);
  assert.equal(primeiro.formato, "csv");
  assert.ok(primeiro.hashArquivo);
  assert.equal(primeiro.quantidadeRegistros, 1);
  const processo = obterProcessoArquivoTemporario(primeiro.processoId, 1);
  assert.ok(processo);
  assert.ok(processo.caminhoAbsoluto.startsWith(path.join(os.tmpdir(), "lc-importacoes")));
  assert.ok(!processo.caminhoAbsoluto.includes(`${path.sep}public${path.sep}`));
});

test("aceita XLSX mínimo válido", async () => {
  const buffer = planilhaXlsxMinima();
  const resultado = await receberArquivoImportacao({
    userId: 1,
    modulo: "unidades",
    nomeArquivo: "unidades.xlsx",
    buffer,
    mimeDeclarado: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  assert.equal(resultado.formato, "xlsx");
  assert.ok(resultado.processoId);
  assert.equal(resultado.quantidadeRegistros, 1);
});

test("aceita XLSX DEFLATE com diretório central", async () => {
  const buffer = planilhaXlsxMinima(true);
  const resultado = await receberArquivoImportacao({
    userId: 1,
    modulo: "condominios",
    nomeArquivo: "condominios.xlsx",
    buffer,
    mimeDeclarado: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  assert.equal(resultado.formato, "xlsx");
  assert.equal(resultado.quantidadeRegistros, 1);
});

test("aceita XML Spreadsheet com BOM", async () => {
  const buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(XML_PLANILHA, "utf8")]);
  const resultado = await receberArquivoImportacao({
    userId: 1,
    modulo: "responsaveis",
    nomeArquivo: "lista.xls",
    buffer,
    mimeDeclarado: "application/vnd.ms-excel",
  });
  assert.equal(resultado.formato, "xls-xml");
  assert.equal(resultado.quantidadeRegistros, 1);
});
});
