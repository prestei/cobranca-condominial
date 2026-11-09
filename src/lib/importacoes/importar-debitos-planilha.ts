import { origensDebito, statusDebito } from "@/data/catalogo";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  aplicarNormalizacaoRegistro,
  normalizarCodigoIdentificacaoImportacao,
  normalizarDataImportacao,
  normalizarNomeImportacao,
  normalizarStatusDebitoImportacao,
  normalizarValorMonetarioImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
import type { ResultadoNormalizacao } from "@/lib/importacao-centro/normalizacao-resultado";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";

/** Formato extensível v1 — CSV (;) ou XML Spreadsheet (.xls exportado pelo sistema). */
export const FORMATO_IMPORTACAO_DEBITOS_V1 = "planilha-inadimplencia-v1";

export type MetadadosOrigemDebitoImportacao = {
  pagina?: number;
  linhaRelatorio?: number;
  responsavel?: string;
  interpretacaoSegura: boolean;
};

export type DebitoImportRow = {
  condominioId: number;
  unidadeId: number;
  referencia: string;
  descricao: string;
  dataVencimento: string;
  valor: string;
  valorOriginal: string;
  multa: string;
  juros: string;
  correcao: string;
  valorAtualizado: string;
  status: string;
  dataPagamento: string;
  valorPago: string;
  identificadorExterno: string;
  metaOrigem?: MetadadosOrigemDebitoImportacao;
};

export type ResultadoInterpretacaoDebitos = {
  linhas: ResultadoLinhaImportacaoDebito[];
  validos: DebitoImportRow[];
  formato: string;
  inconsistenciasArquivo?: import("@/lib/importacao-centro/motor-validacao/types").InconsistenciaValidacao[];
};

export type ResultadoLinhaImportacaoDebito = {
  linha: number;
  payload?: DebitoImportRow;
  erro?: string;
  camposNormalizados?: Record<string, ResultadoNormalizacao<string>>;
};

export type ResumoParseDebitos = {
  linhas: ResultadoLinhaImportacaoDebito[];
  validos: DebitoImportRow[];
};

type CampoPlanilha =
  | keyof DebitoImportRow
  | "condominioNome"
  | "condominioId"
  | "condominioIdentificador"
  | "responsavel"
  | "categoria"
  | "pagina"
  | "linhaRelatorio"
  | "interpretacaoSegura";

const mapaCabecalho: Record<string, CampoPlanilha> = {
  unidade: "unidadeId",
  identificacao: "unidadeId",
  identificação: "unidadeId",
  bloco: "bloco" as CampoPlanilha,
  condominio: "condominioNome",
  condomínio: "condominioNome",
  "condominio id": "condominioId",
  condominio_id: "condominioId",
  "identificador condominio": "condominioIdentificador",
  "identificador condomínio": "condominioIdentificador",
  "identificador externo condominio": "condominioIdentificador",
  referencia: "referencia",
  referência: "referencia",
  descricao: "descricao",
  descrição: "descricao",
  categoria: "categoria",
  "categoria do debito": "categoria",
  "categoria do débito": "categoria",
  responsavel: "responsavel",
  responsável: "responsavel",
  total: "valorAtualizado",
  pagina: "pagina",
  página: "pagina",
  "linha relatorio": "linhaRelatorio",
  "linha relatório": "linhaRelatorio",
  "interpretacao segura": "interpretacaoSegura",
  "interpretação segura": "interpretacaoSegura",
  vencimento: "dataVencimento",
  "data vencimento": "dataVencimento",
  valor: "valor",
  "valor original": "valorOriginal",
  multa: "multa",
  juros: "juros",
  correcao: "correcao",
  correção: "correcao",
  "valor atualizado": "valorAtualizado",
  status: "status",
  situacao: "status",
  situação: "status",
  "data pagamento": "dataPagamento",
  "valor pago": "valorPago",
  "identificador externo": "identificadorExterno",
  id_externo: "identificadorExterno",
};

function parseMoeda(raw: string | undefined, obrigatorio: boolean): { valor?: string; erro?: string } {
  const resultado = normalizarValorMonetarioImportacao(raw, {
    obrigatorio,
    valorSeVazio: obrigatorio ? null : "0.00",
  });
  if (resultado.erro) return { erro: resultado.erro };
  if (resultado.normalizado === null) {
    return obrigatorio ? { erro: resultado.erro ?? "Informe o valor." } : { valor: "0.00" };
  }
  return { valor: resultado.normalizado };
}

function parseData(raw: string | undefined): { data?: string; erro?: string } {
  const resultado = normalizarDataImportacao(raw, {
    obrigatorio: true,
    mensagemVazio: "Informe a data de vencimento.",
    mensagemInvalida: "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
  });
  if (resultado.erro) return { erro: resultado.erro };
  if (!resultado.normalizado) return { erro: "Informe a data de vencimento." };
  return { data: resultado.normalizado };
}

export type ReferenciaCadastralMatrizDebito = {
  condominioNome?: string;
  condominioId?: string;
  condominioIdentificador?: string;
  unidade: string;
  bloco?: string;
  /** Nome do responsável financeiro extraído do relatório/planilha (quando houver). */
  responsavel?: string;
};

export function resolverCondominioIdImportacaoDebitos(
  valores: Partial<Record<CampoPlanilha, string>>,
  condominios: Array<{ id: number; nome: string; identificadorExterno: string }>,
): number | null {
  if (valores.condominioId?.trim()) {
    const id = Number(valores.condominioId.trim());
    if (Number.isFinite(id) && condominios.some((item) => item.id === id)) return id;
  }
  const idExt = valores.condominioIdentificador?.trim();
  if (idExt) {
    const alvo = idExt.toLocaleLowerCase("pt-BR");
    const porId = condominios.find(
      (item) => item.identificadorExterno.trim().toLocaleLowerCase("pt-BR") === alvo,
    );
    if (porId) return porId.id;
  }
  const nomeNorm = normalizarNomeImportacao(valores.condominioNome);
  const nome = nomeNorm.normalizado ?? "";
  if (nome) {
    const alvo = normalizarCabecalhoPlanilha(nome);
    const porNome = condominios.find((item) => normalizarCabecalhoPlanilha(item.nome) === alvo);
    if (porNome) return porNome.id;

    const candidatos = condominios.filter((item) => {
      const norm = normalizarCabecalhoPlanilha(item.nome);
      return norm === alvo || norm.includes(alvo) || alvo.includes(norm);
    });
    if (candidatos.length === 1) return candidatos[0].id;
  }
  return null;
}

export function resolverUnidadeIdImportacaoDebitos(
  condominioId: number,
  identificacaoRaw: string | undefined,
  blocoRaw: string | undefined,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
): { unidadeId?: number; erro?: string } {
  const identNorm = normalizarCodigoIdentificacaoImportacao(identificacaoRaw);
  const identificacao = identNorm.normalizado ?? "";
  if (!identificacao) return { erro: "Informe a unidade." };
  const bloco = blocoRaw?.trim().replace(/^—$/, "") ?? "";
  const candidatas = unidades.filter(
    (item) =>
      item.condominioId === condominioId &&
      item.identificacao.trim().toLocaleLowerCase("pt-BR") === identificacao.toLocaleLowerCase("pt-BR"),
  );
  if (candidatas.length === 0) {
    return { erro: "Unidade não encontrada no condomínio informado." };
  }
  let escolhida = candidatas[0];
  if (bloco) {
    const comBloco = candidatas.find(
      (item) => item.bloco.trim().toLocaleLowerCase("pt-BR") === bloco.toLocaleLowerCase("pt-BR"),
    );
    if (!comBloco) {
      return { erro: "Unidade/bloco não encontrado no condomínio." };
    }
    escolhida = comBloco;
  } else if (candidatas.length > 1) {
    return { erro: "Mais de uma unidade com a mesma identificação; informe o bloco." };
  }
  if (escolhida.status === "Inativa") {
    return { erro: "Unidade inativa; não é possível importar débito." };
  }
  return { unidadeId: escolhida.id };
}

function montarPayload(
  valores: Partial<Record<CampoPlanilha, string>>,
  unidadeTexto: string | undefined,
  blocoTexto: string | undefined,
  condominios: Array<{ id: number; nome: string; identificadorExterno: string }>,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
): {
  payload?: DebitoImportRow;
  erro?: string;
  interpretacaoInsegura?: boolean;
  camposNormalizados: Record<string, ResultadoNormalizacao<string>>;
} {
  const camposNormalizados = aplicarNormalizacaoRegistro({
    unidade: { tipo: "codigo", raw: unidadeTexto },
    bloco: { tipo: "codigo", raw: blocoTexto },
    condominioNome: { tipo: "nome", raw: valores.condominioNome },
    condominioIdentificador: { tipo: "codigo", raw: valores.condominioIdentificador },
    referencia: { tipo: "codigo", raw: valores.referencia },
    dataVencimento: { tipo: "data", raw: valores.dataVencimento, obrigatorio: true },
    valorAtualizado: { tipo: "monetario", raw: valores.valorAtualizado?.trim() || valores.valor, obrigatorio: true },
    valor: { tipo: "monetario", raw: valores.valor },
    valorOriginal: { tipo: "monetario", raw: valores.valorOriginal },
    multa: { tipo: "monetario", raw: valores.multa },
    juros: { tipo: "monetario", raw: valores.juros },
    correcao: { tipo: "monetario", raw: valores.correcao },
    valorPago: { tipo: "monetario", raw: valores.valorPago },
    dataPagamento: { tipo: "data", raw: valores.dataPagamento },
    identificadorExterno: { tipo: "codigo", raw: valores.identificadorExterno },
    categoria: { tipo: "categoria", raw: valores.categoria ?? valores.descricao },
    responsavel: { tipo: "nome", raw: valores.responsavel },
    status: { tipo: "categoria", raw: valores.status },
  });

  const condominioId = resolverCondominioIdImportacaoDebitos(valores, condominios);
  if (!condominioId) {
    return { erro: "Condomínio inválido ou fora do escopo.", camposNormalizados };
  }

  const { unidadeId, erro: erroUnidade } = resolverUnidadeIdImportacaoDebitos(
    condominioId,
    unidadeTexto,
    blocoTexto,
    unidades,
  );
  if (erroUnidade || !unidadeId) {
    return { erro: erroUnidade ?? "Unidade inválida.", camposNormalizados };
  }

  const referenciaNorm = normalizarCodigoIdentificacaoImportacao(valores.referencia);
  const referencia = referenciaNorm.normalizado ?? "";
  if (!referencia) {
    return { erro: "Informe a referência da cobrança.", camposNormalizados };
  }

  const { data: dataVencimento, erro: erroData } = parseData(valores.dataVencimento);
  if (erroData || !dataVencimento) {
    return { erro: erroData ?? "Vencimento inválido.", camposNormalizados };
  }

  const valorAtualizado = parseMoeda(valores.valorAtualizado?.trim() || valores.valor, true);
  if (valorAtualizado.erro) return { erro: valorAtualizado.erro, camposNormalizados };

  const valorPrincipal = parseMoeda(valores.valor, false);
  const valorOriginal = parseMoeda(valores.valorOriginal, false);
  const multa = parseMoeda(valores.multa, false);
  const juros = parseMoeda(valores.juros, false);
  const correcao = parseMoeda(valores.correcao, false);

  const statusResultado = normalizarStatusDebitoImportacao(valores.status, statusDebito, {
    padraoSeVazio: "Vencido",
  });
  if (statusResultado.erro || !statusResultado.normalizado) {
    return {
      erro: statusResultado.erro ?? `Status inválido (${statusDebito.join(", ")}).`,
      camposNormalizados: { ...camposNormalizados, status: statusResultado },
    };
  }
  const statusRaw = statusResultado.normalizado;

  const dataPagamentoRaw = valores.dataPagamento?.trim();
  let dataPagamento = "";
  if (dataPagamentoRaw) {
    const pg = parseData(dataPagamentoRaw);
    if (pg.erro) return { erro: pg.erro, camposNormalizados };
    dataPagamento = pg.data ?? "";
  }

  const valorPago = parseMoeda(valores.valorPago, false);

  const pagina = valores.pagina?.trim() ? Number(valores.pagina.trim()) : undefined;
  const linhaRelatorio = valores.linhaRelatorio?.trim() ? Number(valores.linhaRelatorio.trim()) : undefined;
  const responsavel = valores.responsavel?.trim() ?? "";
  const categoria = valores.categoria?.trim() ?? valores.descricao?.trim() ?? "";
  const interpretacaoRaw = (valores.interpretacaoSegura ?? "").trim().toLocaleLowerCase("pt-BR");
  const interpretacaoSegura =
    interpretacaoRaw === "" || interpretacaoRaw === "sim" || interpretacaoRaw === "true" || interpretacaoRaw === "1";

  return {
    payload: {
      condominioId,
      unidadeId,
      referencia,
      descricao: categoria,
      dataVencimento,
      valor: valorPrincipal.valor ?? valorAtualizado.valor ?? "0.00",
      valorOriginal: valorOriginal.valor ?? valorPrincipal.valor ?? valorAtualizado.valor ?? "0.00",
      multa: multa.valor ?? "0.00",
      juros: juros.valor ?? "0.00",
      correcao: correcao.valor ?? "0.00",
      valorAtualizado: valorAtualizado.valor ?? "0.00",
      status: statusRaw,
      dataPagamento,
      valorPago: valorPago.valor ?? "",
      identificadorExterno:
        normalizarCodigoIdentificacaoImportacao(valores.identificadorExterno).normalizado ?? "",
      metaOrigem: {
        pagina: Number.isFinite(pagina) ? pagina : undefined,
        linhaRelatorio: Number.isFinite(linhaRelatorio) ? linhaRelatorio : undefined,
        responsavel: responsavel || undefined,
        interpretacaoSegura,
      },
    },
    interpretacaoInsegura: !interpretacaoSegura,
    camposNormalizados: { ...camposNormalizados, status: statusResultado },
  };
}

/** Referências de condomínio/unidade presentes no arquivo (sem validar débitos). */
export function extrairReferenciasCadastraisMatrizDebitos(matriz: string[][]): ReferenciaCadastralMatrizDebito[] {
  if (matriz.length < 2) return [];

  const cabecalho = matriz[0].map(normalizarCabecalhoPlanilha);
  const indices = cabecalho.map((coluna) => mapaCabecalho[coluna] ?? null);
  const temUnidade = indices.some((item) => item === "unidadeId") || cabecalho.some((item) => item === "unidade");
  const temCondominio = indices.some(
    (item) => item === "condominioNome" || item === "condominioId" || item === "condominioIdentificador",
  );
  if (!temUnidade || !temCondominio) return [];

  const vistos = new Set<string>();
  const resultado: ReferenciaCadastralMatrizDebito[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const row = matriz[i];
    const valores: Partial<Record<CampoPlanilha, string>> = {};
    let unidadeTexto = "";
    let blocoTexto: string | undefined;

    for (let c = 0; c < indices.length; c += 1) {
      const campo = indices[c];
      const celula = row[c]?.trim() ?? "";
      if (!campo) continue;
      if (campo === "unidadeId") {
        unidadeTexto = celula;
        continue;
      }
      if ((campo as string) === "bloco") {
        blocoTexto = celula;
        continue;
      }
      valores[campo] = celula;
    }

    if (!unidadeTexto.trim() && !valores.condominioNome?.trim() && !valores.condominioId?.trim()) {
      continue;
    }

    const unidadeNorm = normalizarCodigoIdentificacaoImportacao(unidadeTexto).normalizado ?? unidadeTexto.trim();
    if (!unidadeNorm) continue;

    const responsavelNome = valores.responsavel?.trim() ?? "";
    const chave = [
      valores.condominioId?.trim() ?? "",
      valores.condominioIdentificador?.trim() ?? "",
      valores.condominioNome?.trim() ?? "",
      unidadeNorm,
      blocoTexto?.trim() ?? "",
      responsavelNome,
    ].join("|");
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    resultado.push({
      condominioNome: valores.condominioNome,
      condominioId: valores.condominioId,
      condominioIdentificador: valores.condominioIdentificador,
      unidade: unidadeNorm,
      bloco: blocoTexto,
      responsavel: responsavelNome || undefined,
    });
  }

  return resultado;
}

export function interpretarPlanilhaDebitos(
  matriz: string[][],
  condominiosEscopo: Array<{ id: number; nome: string; identificadorExterno: string }>,
  unidadesEscopo: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
  opcoes?: { formato?: string; inconsistenciasArquivo?: ResultadoInterpretacaoDebitos["inconsistenciasArquivo"] },
): ResultadoInterpretacaoDebitos {
  if (matriz.length === 0) {
    return {
      linhas: [{ linha: 1, erro: "Planilha vazia." }],
      validos: [],
      formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
    };
  }

  const cabecalho = matriz[0].map(normalizarCabecalhoPlanilha);
  const indices = cabecalho.map((coluna) => mapaCabecalho[coluna] ?? null);

  const temUnidade = indices.some((item) => item === "unidadeId") || cabecalho.some((item) => item === "unidade");
  if (!temUnidade) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Unidade".' }],
      validos: [],
      formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
    };
  }
  if (!indices.some((item) => item === "condominioNome" || item === "condominioId" || item === "condominioIdentificador")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua "Condomínio" ou identificador do condomínio.' }],
      validos: [],
      formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
    };
  }
  if (!indices.some((item) => item === "referencia")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Referência".' }],
      validos: [],
      formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
    };
  }
  if (!indices.some((item) => item === "dataVencimento")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Vencimento".' }],
      validos: [],
      formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
      inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
    };
  }

  const linhas: ResultadoLinhaImportacaoDebito[] = [];
  const validos: DebitoImportRow[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const row = matriz[i];
    const valores: Partial<Record<CampoPlanilha, string>> = {};
    let unidadeTexto: string | undefined;
    let blocoTexto: string | undefined;

    for (let c = 0; c < indices.length; c += 1) {
      const campo = indices[c];
      const celula = row[c]?.trim() ?? "";
      if (!campo) continue;
      if (campo === "unidadeId") {
        unidadeTexto = celula;
        continue;
      }
      if ((campo as string) === "bloco") {
        blocoTexto = celula;
        continue;
      }
      valores[campo] = celula;
    }

    const linhaVazia =
      !unidadeTexto?.trim() &&
      !valores.condominioNome?.trim() &&
      !valores.condominioId?.trim() &&
      !valores.referencia?.trim();
    if (linhaVazia) continue;

    const numeroLinha = i + 1;
    const { payload, erro, camposNormalizados } = montarPayload(
      valores,
      unidadeTexto,
      blocoTexto,
      condominiosEscopo,
      unidadesEscopo,
    );
    if (erro) {
      linhas.push({ linha: numeroLinha, erro, camposNormalizados });
      continue;
    }
    if (payload) {
      linhas.push({ linha: numeroLinha, payload, camposNormalizados });
      validos.push(payload);
    }
  }

  if (linhas.length === 0) {
    linhas.push({ linha: 2, erro: "Nenhuma linha de dados encontrada." });
  }

  return {
    linhas,
    validos,
    formato: opcoes?.formato ?? FORMATO_IMPORTACAO_DEBITOS_V1,
    inconsistenciasArquivo: opcoes?.inconsistenciasArquivo,
  };
}

/** Compatibilidade com chamadas legadas que esperavam apenas linhas/validos. */
export type ResumoParseDebitos = Pick<ResultadoInterpretacaoDebitos, "linhas" | "validos">;

export function interpretarArquivoDebitos(
  conteudo: string,
  condominiosEscopo: Array<{ id: number; nome: string; identificadorExterno: string }>,
  unidadesEscopo: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
  matrizPreCarregada?: string[][],
): ResultadoInterpretacaoDebitos {
  const matriz = matrizPreCarregada ?? lerMatrizPlanilha(conteudo);
  return interpretarPlanilhaDebitos(matriz, condominiosEscopo, unidadesEscopo);
}

export function origemImportacaoValida(origem: string): boolean {
  const trimmed = origem.trim();
  return trimmed.length > 0 && origensDebito.includes(trimmed as (typeof origensDebito)[number]);
}
