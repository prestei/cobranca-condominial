import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  nomeCondominio,
  nomeUnidade,
  proximoNumero,
  registrarAuditoria,
  setDebitos,
  setImportacoes,
  type Debito,
  type Importacao,
} from "@/data/catalogo";
import {
  FORMATO_IMPORTACAO_DEBITOS_V1,
  interpretarArquivoDebitos,
  origemImportacaoValida,
  type DebitoImportRow,
} from "@/lib/importacoes/importar-debitos-planilha";
import {
  hashConteudoArquivo,
  parseObservacaoImportacao,
  serializarObservacaoImportacao,
} from "@/lib/importacoes/hash-arquivo";

export class ImportacaoDebitosError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type LinhaPreviewImportacaoDebito = {
  linha: number;
  situacao: "novo" | "atualizacao" | "duplicado" | "erro" | "manual_protegido";
  mensagem?: string;
  resumo?: {
    condominio: string;
    unidade: string;
    referencia: string;
    vencimento: string;
    valorAtualizado: string;
    identificadorExterno: string;
  };
};

export type PreviewImportacaoDebitos = {
  hashArquivo: string;
  formato: string;
  arquivo: string;
  origem: string;
  quantidadeRegistros: number;
  novos: number;
  atualizacoes: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
  arquivoJaImportado: boolean;
  linhas: LinhaPreviewImportacaoDebito[];
  amostraValida: LinhaPreviewImportacaoDebito[];
};

export type ResultadoConfirmacaoDebitos = {
  importacao: Importacao;
  novos: number;
  atualizados: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
};

function chaveNatural(row: DebitoImportRow): string {
  return `${row.unidadeId}:${row.referencia.trim().toLocaleLowerCase("pt-BR")}:${row.dataVencimento}:${row.valorAtualizado}`;
}

function chaveExterna(identificador: string): string | null {
  const id = identificador.trim();
  if (!id) return null;
  return id.toLocaleLowerCase("pt-BR");
}

function debitoEquivalente(a: Debito, row: DebitoImportRow): boolean {
  return (
    a.unidadeId === row.unidadeId &&
    a.referencia.trim() === row.referencia.trim() &&
    a.dataVencimento === row.dataVencimento &&
    a.valorAtualizado === row.valorAtualizado &&
    a.status === row.status &&
    a.identificadorExterno.trim() === row.identificadorExterno.trim()
  );
}

function encontrarDebitoExistente(debitos: Debito[], row: DebitoImportRow): Debito | undefined {
  const ext = chaveExterna(row.identificadorExterno);
  if (ext) {
    const porExt = debitos.find((item) => chaveExterna(item.identificadorExterno) === ext);
    if (porExt) return porExt;
  }
  const natural = chaveNatural(row);
  return debitos.find((item) => !item.identificadorExterno.trim() && chaveNatural(item) === natural);
}

function classificarLinha(
  row: DebitoImportRow,
  debitos: Debito[],
  vistosArquivo: Set<string>,
): LinhaPreviewImportacaoDebito & { row: DebitoImportRow } {
  const chaveArquivo = chaveExterna(row.identificadorExterno) ?? chaveNatural(row);
  if (vistosArquivo.has(chaveArquivo)) {
    return {
      linha: 0,
      situacao: "duplicado",
      mensagem: "Linha duplicada no mesmo arquivo.",
      row,
      resumo: resumoLinha(row),
    };
  }
  vistosArquivo.add(chaveArquivo);

  const existente = encontrarDebitoExistente(debitos, row);
  if (!existente) {
    return {
      linha: 0,
      situacao: "novo",
      row,
      resumo: resumoLinha(row),
    };
  }

  if (!existente.identificadorExterno.trim() && !row.identificadorExterno.trim()) {
    if (debitoEquivalente(existente, row)) {
      return {
        linha: 0,
        situacao: "duplicado",
        mensagem: "Débito já registrado (cadastro manual ou anterior).",
        row,
        resumo: resumoLinha(row),
      };
    }
    return {
      linha: 0,
      situacao: "manual_protegido",
      mensagem: "Registro manual existente sem ID externo; não será alterado.",
      row,
      resumo: resumoLinha(row),
    };
  }

  if (debitoEquivalente(existente, row)) {
    return {
      linha: 0,
      situacao: "duplicado",
      mensagem: "Sem alterações em relação ao cadastro.",
      row,
      resumo: resumoLinha(row),
    };
  }

  return {
    linha: 0,
    situacao: "atualizacao",
    mensagem: "Valores serão atualizados (mesmo identificador ou chave natural).",
    row,
    resumo: resumoLinha(row),
  };
}

function resumoLinha(row: DebitoImportRow) {
  return {
    condominio: nomeCondominio(row.condominioId),
    unidade: nomeUnidade(row.unidadeId),
    referencia: row.referencia,
    vencimento: row.dataVencimento,
    valorAtualizado: row.valorAtualizado,
    identificadorExterno: row.identificadorExterno,
  };
}

function importacaoConcluidaComHash(hash: string): boolean {
  return getCadastros().importacoes.some((item) => {
    if (item.tipo !== "debitos" || item.status !== "Concluida") return false;
    const meta = parseObservacaoImportacao(item.observacaoInterna);
    return meta.hashArquivo === hash;
  });
}

function contextoEscopo(userId: number) {
  const cadastros = getCadastros();
  const condominios = escopoCondominios(cadastros, userId);
  const unidades = escopoUnidades(cadastros, userId).map((item) => ({
    id: item.id,
    condominioId: item.condominioId,
    identificacao: item.identificacao,
    bloco: item.bloco ?? "",
    status: item.status,
  }));
  return { condominios, unidades };
}

export function previewImportacaoDebitos(
  userId: number,
  input: { origem: string; arquivo: string; conteudo: string },
): PreviewImportacaoDebitos {
  const origem = input.origem.trim();
  if (!origemImportacaoValida(origem)) {
    throw new ImportacaoDebitosError("Informe a origem dos dados (Superlógica, PDF ou Outra administradora).", 400);
  }
  const conteudo = input.conteudo ?? "";
  if (!conteudo.trim()) {
    throw new ImportacaoDebitosError("Envie o conteúdo do arquivo.", 400);
  }

  const hashArquivo = hashConteudoArquivo(conteudo);
  const arquivo = input.arquivo.trim() || "importacao-debitos.csv";
  const { condominios, unidades } = contextoEscopo(userId);
  const parse = interpretarArquivoDebitos(conteudo, condominios, unidades);

  const debitos = getCadastros().debitos;
  const vistosArquivo = new Set<string>();
  const linhas: LinhaPreviewImportacaoDebito[] = [];

  for (const item of parse.linhas) {
    if (item.erro) {
      linhas.push({ linha: item.linha, situacao: "erro", mensagem: item.erro });
      continue;
    }
    if (!item.payload) continue;
    const classificacao = classificarLinha(item.payload, debitos, vistosArquivo);
    linhas.push({ ...classificacao, linha: item.linha });
  }

  const novos = linhas.filter((item) => item.situacao === "novo").length;
  const atualizacoes = linhas.filter((item) => item.situacao === "atualizacao").length;
  const duplicados = linhas.filter((item) => item.situacao === "duplicado").length;
  const erros = linhas.filter((item) => item.situacao === "erro").length;
  const manualProtegido = linhas.filter((item) => item.situacao === "manual_protegido").length;

  const amostraValida = linhas
    .filter((item) => item.situacao === "novo" || item.situacao === "atualizacao")
    .slice(0, 8);

  return {
    hashArquivo,
    formato: FORMATO_IMPORTACAO_DEBITOS_V1,
    arquivo,
    origem,
    quantidadeRegistros: linhas.length,
    novos,
    atualizacoes,
    duplicados,
    erros,
    manualProtegido,
    arquivoJaImportado: importacaoConcluidaComHash(hashArquivo),
    linhas,
    amostraValida,
  };
}

function aplicarRow(debitos: Debito[], row: DebitoImportRow, origem: string): { debitos: Debito[]; acao: "novo" | "atualizacao" | "ignorado" } {
  const existente = encontrarDebitoExistente(debitos, row);
  if (!existente) {
    const nextId = proximoNumero(debitos.map((item) => item.id));
    const novo: Debito = {
      id: nextId,
      ...row,
      origem,
      fonteValores: "origem",
      atualizadoEm: agoraIso(),
    };
    return { debitos: [...debitos, novo], acao: "novo" };
  }

  if (!existente.identificadorExterno.trim() && !row.identificadorExterno.trim()) {
    if (debitoEquivalente(existente, row)) {
      return { debitos, acao: "ignorado" };
    }
    return { debitos, acao: "ignorado" };
  }

  if (debitoEquivalente(existente, row)) {
    return { debitos, acao: "ignorado" };
  }

  const atualizado: Debito = {
    ...existente,
    ...row,
    id: existente.id,
    origem: existente.origem || origem,
    fonteValores: "origem",
    atualizadoEm: agoraIso(),
  };
  return {
    debitos: debitos.map((item) => (item.id === existente.id ? atualizado : item)),
    acao: "atualizacao",
  };
}

export function confirmarImportacaoDebitos(
  userId: number,
  input: { origem: string; arquivo: string; conteudo: string; hashArquivo?: string },
  meta?: { ip?: string; userAgent?: string },
): ResultadoConfirmacaoDebitos {
  const preview = previewImportacaoDebitos(userId, input);
  if (input.hashArquivo && input.hashArquivo !== preview.hashArquivo) {
    throw new ImportacaoDebitosError("O arquivo não confere com a prévia. Refaça a validação.", 409);
  }

  if (preview.arquivoJaImportado) {
    const importacaoExistente = getCadastros().importacoes.find((item) => {
      const metaObs = parseObservacaoImportacao(item.observacaoInterna);
      return item.tipo === "debitos" && item.status === "Concluida" && metaObs.hashArquivo === preview.hashArquivo;
    });
    if (importacaoExistente) {
      return {
        importacao: importacaoExistente,
        novos: 0,
        atualizados: 0,
        duplicados: preview.novos + preview.atualizacoes + preview.duplicados,
        erros: preview.erros,
        manualProtegido: preview.manualProtegido,
      };
    }
  }

  const { condominios, unidades } = contextoEscopo(userId);
  const parse = interpretarArquivoDebitos(input.conteudo, condominios, unidades);
  const payloadPorLinha = new Map(parse.linhas.filter((item) => item.payload).map((item) => [item.linha, item.payload!]));

  let debitos = [...getCadastros().debitos];
  let novos = 0;
  let atualizados = 0;
  let duplicados = 0;
  let manualProtegido = 0;
  const errosRelatorio: Array<{ linha: number; mensagem: string }> = [];
  const ignoradosRelatorio: Array<{ linha: number; mensagem: string }> = [];

  for (const linha of preview.linhas) {
    if (linha.situacao === "erro") {
      errosRelatorio.push({ linha: linha.linha, mensagem: linha.mensagem ?? "Erro" });
      continue;
    }

    const payload = payloadPorLinha.get(linha.linha);
    if (!payload) continue;

    if (linha.situacao === "duplicado") {
      duplicados += 1;
      continue;
    }
    if (linha.situacao === "manual_protegido") {
      manualProtegido += 1;
      ignoradosRelatorio.push({
        linha: linha.linha,
        mensagem: linha.mensagem ?? "Registro manual protegido.",
      });
      continue;
    }

    const resultado = aplicarRow(debitos, payload, preview.origem);
    debitos = resultado.debitos;
    if (resultado.acao === "novo") novos += 1;
    else if (resultado.acao === "atualizacao") atualizados += 1;
    else duplicados += 1;
  }

  setDebitos(debitos);

  const importacaoId = proximoNumero(getCadastros().importacoes.map((item) => item.id));
  const observacaoInterna = serializarObservacaoImportacao({
    hashArquivo: preview.hashArquivo,
    formato: preview.formato,
    relatorio: { erros: errosRelatorio, ignorados: ignoradosRelatorio },
  });

  const importacao: Importacao = {
    id: importacaoId,
    origem: preview.origem,
    tipo: "debitos",
    arquivo: preview.arquivo,
    status: preview.erros > 0 && novos + atualizados === 0 ? "Erro" : "Concluida",
    quantidadeRegistros: String(preview.quantidadeRegistros),
    quantidadeImportados: String(novos),
    quantidadeAtualizados: String(atualizados),
    quantidadeErros: String(preview.erros + manualProtegido),
    observacaoInterna,
    usuarioId: userId,
    dataImportacao: agoraIso(),
  };

  setImportacoes((current) => [importacao, ...current]);

  registrarAuditoria(
    {
      entidade: "import",
      registroId: String(importacaoId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        tipo: "debitos",
        novos,
        atualizados,
        duplicados,
        erros: preview.erros,
      }),
      camposAlterados: "tipo, arquivo, quantidades",
    },
    userId,
    meta,
  );

  return {
    importacao,
    novos,
    atualizados,
    duplicados,
    erros: preview.erros,
    manualProtegido,
  };
}

export function listarImportacoes(userId: number): Importacao[] {
  void userId;
  return [...getCadastros().importacoes].sort((a, b) => b.dataImportacao.localeCompare(a.dataImportacao));
}
