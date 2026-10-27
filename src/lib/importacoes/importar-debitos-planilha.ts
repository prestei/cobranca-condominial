import { origensDebito, statusDebito } from "@/data/catalogo";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";

/** Formato extensível v1 — CSV (;) ou XML Spreadsheet (.xls exportado pelo sistema). */
export const FORMATO_IMPORTACAO_DEBITOS_V1 = "planilha-inadimplencia-v1";

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
};

export type ResultadoLinhaImportacaoDebito = {
  linha: number;
  payload?: DebitoImportRow;
  erro?: string;
};

export type ResumoParseDebitos = {
  linhas: ResultadoLinhaImportacaoDebito[];
  validos: DebitoImportRow[];
};

function normalizarCabecalho(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

type CampoPlanilha =
  | keyof DebitoImportRow
  | "condominioNome"
  | "condominioId"
  | "condominioIdentificador";

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
  const texto = raw?.trim() ?? "";
  if (!texto) {
    return obrigatorio ? { erro: "Informe o valor." } : { valor: "0.00" };
  }
  let normalizado = texto.replace(/\s/g, "").replace(/R\$/gi, "");
  if (normalizado.includes(",") && normalizado.includes(".")) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  } else if (normalizado.includes(",")) {
    normalizado = normalizado.replace(",", ".");
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    return { erro: "Valor monetário inválido." };
  }
  return { valor: numero.toFixed(2) };
}

function parseData(raw: string | undefined): { data?: string; erro?: string } {
  const texto = raw?.trim() ?? "";
  if (!texto) return { erro: "Informe a data de vencimento." };
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return { data: texto };
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const dia = br[1].padStart(2, "0");
    const mes = br[2].padStart(2, "0");
    return { data: `${br[3]}-${mes}-${dia}` };
  }
  return { erro: "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA)." };
}

function resolverCondominioId(
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
  const nome = valores.condominioNome?.trim();
  if (nome) {
    const alvo = normalizarCabecalho(nome);
    const porNome = condominios.find((item) => normalizarCabecalho(item.nome) === alvo);
    if (porNome) return porNome.id;
  }
  return null;
}

function resolverUnidadeId(
  condominioId: number,
  identificacaoRaw: string | undefined,
  blocoRaw: string | undefined,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
): { unidadeId?: number; erro?: string } {
  const identificacao = identificacaoRaw?.trim() ?? "";
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
): { payload?: DebitoImportRow; erro?: string } {
  const condominioId = resolverCondominioId(valores, condominios);
  if (!condominioId) {
    return { erro: "Condomínio inválido ou fora do escopo." };
  }

  const { unidadeId, erro: erroUnidade } = resolverUnidadeId(condominioId, unidadeTexto, blocoTexto, unidades);
  if (erroUnidade || !unidadeId) {
    return { erro: erroUnidade ?? "Unidade inválida." };
  }

  const referencia = valores.referencia?.trim() ?? "";
  if (!referencia) {
    return { erro: "Informe a referência da cobrança." };
  }

  const { data: dataVencimento, erro: erroData } = parseData(valores.dataVencimento);
  if (erroData || !dataVencimento) {
    return { erro: erroData ?? "Vencimento inválido." };
  }

  const valorAtualizado = parseMoeda(valores.valorAtualizado?.trim() || valores.valor, true);
  if (valorAtualizado.erro) return { erro: valorAtualizado.erro };

  const valorPrincipal = parseMoeda(valores.valor, false);
  const valorOriginal = parseMoeda(valores.valorOriginal, false);
  const multa = parseMoeda(valores.multa, false);
  const juros = parseMoeda(valores.juros, false);
  const correcao = parseMoeda(valores.correcao, false);

  const statusRaw = valores.status?.trim() || "Vencido";
  if (!statusDebito.includes(statusRaw as (typeof statusDebito)[number])) {
    return { erro: `Status inválido (${statusDebito.join(", ")}).` };
  }

  const dataPagamentoRaw = valores.dataPagamento?.trim();
  let dataPagamento = "";
  if (dataPagamentoRaw) {
    const pg = parseData(dataPagamentoRaw);
    if (pg.erro) return { erro: pg.erro };
    dataPagamento = pg.data ?? "";
  }

  const valorPago = parseMoeda(valores.valorPago, false);

  return {
    payload: {
      condominioId,
      unidadeId,
      referencia,
      descricao: valores.descricao?.trim() ?? "",
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
      identificadorExterno: valores.identificadorExterno?.trim() ?? "",
    },
  };
}

export function interpretarPlanilhaDebitos(
  matriz: string[][],
  condominiosEscopo: Array<{ id: number; nome: string; identificadorExterno: string }>,
  unidadesEscopo: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
): ResumoParseDebitos {
  if (matriz.length === 0) {
    return { linhas: [{ linha: 1, erro: "Planilha vazia." }], validos: [] };
  }

  const cabecalho = matriz[0].map(normalizarCabecalho);
  const indices = cabecalho.map((coluna) => mapaCabecalho[coluna] ?? null);

  const temUnidade = indices.some((item) => item === "unidadeId") || cabecalho.some((item) => item === "unidade");
  if (!temUnidade) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Unidade".' }],
      validos: [],
    };
  }
  if (!indices.some((item) => item === "condominioNome" || item === "condominioId" || item === "condominioIdentificador")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua "Condomínio" ou identificador do condomínio.' }],
      validos: [],
    };
  }
  if (!indices.some((item) => item === "referencia")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Referência".' }],
      validos: [],
    };
  }
  if (!indices.some((item) => item === "dataVencimento")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Vencimento".' }],
      validos: [],
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
    const { payload, erro } = montarPayload(valores, unidadeTexto, blocoTexto, condominiosEscopo, unidadesEscopo);
    if (erro) {
      linhas.push({ linha: numeroLinha, erro });
      continue;
    }
    if (payload) {
      linhas.push({ linha: numeroLinha, payload });
      validos.push(payload);
    }
  }

  if (linhas.length === 0) {
    linhas.push({ linha: 2, erro: "Nenhuma linha de dados encontrada." });
  }

  return { linhas, validos };
}

export function interpretarArquivoDebitos(
  conteudo: string,
  condominiosEscopo: Array<{ id: number; nome: string; identificadorExterno: string }>,
  unidadesEscopo: Array<{ id: number; condominioId: number; identificacao: string; bloco: string; status: string }>,
): ResumoParseDebitos {
  const matriz = lerMatrizPlanilha(conteudo);
  return interpretarPlanilhaDebitos(matriz, condominiosEscopo, unidadesEscopo);
}

export function origemImportacaoValida(origem: string): boolean {
  const trimmed = origem.trim();
  return trimmed.length > 0 && origensDebito.includes(trimmed as (typeof origensDebito)[number]);
}
