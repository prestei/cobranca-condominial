import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validarArquivoJuridico } from "@/lib/juridico/document-file-limits";

describe("document-file-storage", () => {
  it("valida tamanho e extensão", () => {
    assert.equal(validarArquivoJuridico("contrato.pdf", 1024), null);
    assert.equal(validarArquivoJuridico("planilha.exe", 1024), "Tipo de arquivo não permitido. Use PDF, Office, imagem ou ZIP.");
    assert.equal(validarArquivoJuridico("vazio.pdf", 0), "Arquivo vazio.");
  });
});