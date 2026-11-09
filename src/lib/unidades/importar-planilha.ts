import {
  SITUACAO_COBRANCA_PADRAO,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  statusUnidade,
  tiposUnidade,
} from "@/data/catalogo";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  aplicarNormalizacaoRegistro,
  normalizarClassificacaoImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
import type { ResultadoNormalizacao } from "@/lib/importacao-centro/normalizacao-resultado";
import type { UnidadeInput } from "@/lib/unidades/service";

export type ResultadoLinhaImportacaoUnidade = {
  linha: number;
  payload?: UnidadeInput;
  erro?: string;
  camposNormalizados?: Record<string, ResultadoNormalizacao<string>>;
};

export type ResumoImportacaoUnidades = {
  linhas: ResultadoLinhaImportacaoUnidade[];
  importaveis: UnidadeInput[];
};

function normalizarCabecalho(valor: string) {
  return normalizarCabecalhoPlanilha(valor);
}

const mapaCabecalho: Record<string, keyof UnidadeInput | "condominioNome" | "condominioId"> = {
  unidade: "identificacao",
  identificacao: "identificacao",
  identificação: "identificacao",
  condominio: "condominioNome",
  condomínio: "condominioNome",
  "condominio id": "condominioId",
  condominio_id: "condominioId",
  bloco: "bloco",
  tipo: "tipo",
  cadastro: "status",
  status: "status",
  cobranca: "situacao",
  cobrança: "situacao",
  situacao: "situacao",
  situação: "situacao",
};

function resolverCondominioId(
  condominioIdRaw: string | undefined,
  condominioNomeRaw: string | undefined,
  condominios: Array<{ id: number; nome: string }>,
): number | null {
  if (condominioIdRaw?.trim()) {
    const id = Number(condominioIdRaw.trim());
    if (Number.isFinite(id) && condominios.some((item) => item.id === id)) return id;
  }
  const nome = condominioNomeRaw?.trim();
  if (!nome) return null;
  const alvo = normalizarCabecalho(nome);
  const encontrado = condominios.find((item) => normalizarCabecalho(item.nome) === alvo);
  return encontrado?.id ?? null;
}

function montarPayloadParcial(
  valores: Partial<Record<keyof UnidadeInput | "condominioNome" | "condominioId", string>>,
  condominios: Array<{ id: number; nome: string }>,
): {
  payload?: UnidadeInput;
  erro?: string;
  camposNormalizados: Record<string, ResultadoNormalizacao<string>>;
} {
  const camposNormalizados = aplicarNormalizacaoRegistro({
    identificacao: { tipo: "codigo", raw: valores.identificacao },
    bloco: { tipo: "codigo", raw: valores.bloco },
    condominioNome: { tipo: "nome", raw: valores.condominioNome },
    tipo: { tipo: "categoria", raw: valores.tipo },
    status: { tipo: "categoria", raw: valores.status },
    situacao: { tipo: "categoria", raw: valores.situacao },
  });

  const condominioId = resolverCondominioId(valores.condominioId, valores.condominioNome, condominios);
  if (!condominioId) {
    return { erro: "Condomínio inválido ou fora do escopo.", camposNormalizados };
  }

  const identificacao = camposNormalizados.identificacao.normalizado ?? "";
  if (!identificacao) {
    return { erro: "Informe a identificação da unidade.", camposNormalizados };
  }

  const tipoResultado = normalizarClassificacaoImportacao(valores.tipo, tiposUnidade, {
    obrigatorio: true,
    mensagemInvalida: "Tipo de unidade inválido.",
  });
  if (tipoResultado.erro || !tipoResultado.normalizado) {
    return {
      erro: tipoResultado.erro ?? "Tipo de unidade inválido.",
      camposNormalizados: { ...camposNormalizados, tipo: tipoResultado },
    };
  }

  const statusResultado = normalizarClassificacaoImportacao(valores.status, statusUnidade);
  if (statusResultado.erro) {
    return {
      erro: "Situação cadastral inválida (use Ativa ou Inativa).",
      camposNormalizados: { ...camposNormalizados, status: statusResultado },
    };
  }
  const statusRaw = statusResultado.normalizado ?? "Ativa";

  const situacaoInformada = camposNormalizados.situacao.vazio
    ? SITUACAO_COBRANCA_PADRAO
    : (camposNormalizados.situacao.normalizado ?? valores.situacao?.trim() ?? "");
  const situacao = situacaoCobrancaUnidade({ situacao: situacaoInformada || SITUACAO_COBRANCA_PADRAO });
  if (!situacoesUnidade.includes(situacao as (typeof situacoesUnidade)[number])) {
    return { erro: "Situação de cobrança inválida.", camposNormalizados };
  }

  const bloco = camposNormalizados.bloco.vazio ? "" : (camposNormalizados.bloco.normalizado ?? "");

  return {
    camposNormalizados: {
      ...camposNormalizados,
      tipo: tipoResultado,
      status: statusResultado,
    },
    payload: {
      condominioId,
      identificacao,
      bloco,
      tipo: tipoResultado.normalizado,
      status: statusRaw,
      situacao,
    },
  };
}

export function interpretarPlanilhaUnidades(
  matriz: string[][],
  condominiosEscopo: Array<{ id: number; nome: string }>,
): ResumoImportacaoUnidades {
  if (matriz.length === 0) {
    return { linhas: [{ linha: 1, erro: "Planilha vazia." }], importaveis: [] };
  }

  const cabecalho = matriz[0].map(normalizarCabecalho);
  const indices = cabecalho.map((coluna) => mapaCabecalho[coluna] ?? null);
  if (!indices.some((item) => item === "identificacao")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Unidade".' }],
      importaveis: [],
    };
  }
  if (!indices.some((item) => item === "condominioNome" || item === "condominioId")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Condomínio".' }],
      importaveis: [],
    };
  }

  const linhas: ResultadoLinhaImportacaoUnidade[] = [];
  const importaveis: UnidadeInput[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const row = matriz[i];
    const valores: Partial<Record<keyof UnidadeInput | "condominioNome" | "condominioId", string>> = {};
    for (let c = 0; c < indices.length; c += 1) {
      const campo = indices[c];
      if (!campo) continue;
      valores[campo] = row[c]?.trim() ?? "";
    }

    if (!valores.identificacao?.trim() && !valores.condominioNome?.trim() && !valores.condominioId?.trim()) {
      continue;
    }

    const numeroLinha = i + 1;
    const { payload, erro, camposNormalizados } = montarPayloadParcial(valores, condominiosEscopo);
    if (erro) {
      linhas.push({ linha: numeroLinha, erro, camposNormalizados });
      continue;
    }
    if (payload) {
      linhas.push({ linha: numeroLinha, payload, camposNormalizados });
      importaveis.push(payload);
    }
  }

  if (linhas.length === 0) {
    linhas.push({ linha: 2, erro: "Nenhuma linha de dados encontrada." });
  }

  return { linhas, importaveis };
}

export function interpretarArquivoUnidades(
  conteudo: string,
  condominiosEscopo: Array<{ id: number; nome: string }>,
): ResumoImportacaoUnidades {
  const matriz = lerMatrizPlanilha(conteudo);
  return interpretarPlanilhaUnidades(matriz, condominiosEscopo);
}
