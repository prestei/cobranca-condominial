import { statusCondominio, type Condominio, type StatusCondominio } from "@/data/catalogo";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import {
  aplicarNormalizacaoRegistro,
  normalizarClassificacaoImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
import type { ResultadoNormalizacao } from "@/lib/importacao-centro/normalizacao-resultado";

export type CondominioImportPayload = Omit<Condominio, "id">;

export type ResultadoLinhaImportacaoCondominio = {
  linha: number;
  payload?: CondominioImportPayload;
  erro?: string;
  camposNormalizados?: Record<string, ResultadoNormalizacao<string>>;
};

export type ResumoImportacaoCondominios = {
  linhas: ResultadoLinhaImportacaoCondominio[];
  importaveis: CondominioImportPayload[];
};

type CampoPlanilha =
  | keyof CondominioImportPayload
  | "unidades"
  | "_ignore";

function normalizarCabecalho(valor: string) {
  return normalizarCabecalhoPlanilha(valor);
}

const mapaCabecalho: Record<string, CampoPlanilha> = {
  nome: "nome",
  identificador: "identificadorExterno",
  "identificador externo": "identificadorExterno",
  situacao: "status",
  situação: "status",
  status: "status",
  cidade: "cidade",
  estado: "estado",
  administradora: "administradora",
  advogados: "advogados",
  "advogado responsavel": "advogados",
  "advogado responsável": "advogados",
  unidades: "unidades",
  cep: "cep",
  logradouro: "logradouro",
  numero: "numero",
  número: "numero",
  complemento: "complemento",
  observacao: "observacao",
  observação: "observacao",
};

function parseAdvogados(texto: string, advogadosValidos: string[]): { advogados?: string[]; erro?: string } {
  const partes = texto
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (partes.length === 0) {
    return { erro: "Informe ao menos um advogado responsável." };
  }
  const validosSet = new Set(advogadosValidos);
  const invalidos = partes.filter((item) => !validosSet.has(item));
  if (invalidos.length > 0) {
    return { erro: `Advogado(s) inválido(s): ${invalidos.join(", ")}.` };
  }
  return { advogados: partes };
}

function montarPayload(
  valores: Partial<Record<CampoPlanilha, string>>,
  advogadosValidos: string[],
): {
  payload?: CondominioImportPayload;
  erro?: string;
  camposNormalizados: Record<string, ResultadoNormalizacao<string>>;
} {
  const camposNormalizados = aplicarNormalizacaoRegistro({
    nome: { tipo: "nome", raw: valores.nome },
    identificadorExterno: { tipo: "codigo", raw: valores.identificadorExterno },
    administradora: { tipo: "nome", raw: valores.administradora },
    cep: { tipo: "codigo", raw: valores.cep },
    logradouro: { tipo: "nome", raw: valores.logradouro },
    numero: { tipo: "codigo", raw: valores.numero },
    complemento: { tipo: "nome", raw: valores.complemento },
    cidade: { tipo: "nome", raw: valores.cidade },
    estado: { tipo: "codigo", raw: valores.estado },
    observacao: { tipo: "nome", raw: valores.observacao },
    status: { tipo: "categoria", raw: valores.status },
  });

  const nome = camposNormalizados.nome.normalizado ?? "";
  if (!nome) {
    return { erro: "Informe o nome do condomínio.", camposNormalizados };
  }

  const { advogados, erro: erroAdv } = parseAdvogados(valores.advogados?.trim() ?? "", advogadosValidos);
  if (erroAdv || !advogados) {
    return { erro: erroAdv ?? "Advogados inválidos.", camposNormalizados };
  }

  const statusResultado = normalizarClassificacaoImportacao(valores.status, statusCondominio, {
    mensagemInvalida: `Situação inválida (${statusCondominio.join(", ")}).`,
  });
  if (statusResultado.erro) {
    return { erro: statusResultado.erro, camposNormalizados: { ...camposNormalizados, status: statusResultado } };
  }
  const status = (statusResultado.normalizado ?? "Ativo") as StatusCondominio;

  return {
    camposNormalizados: { ...camposNormalizados, status: statusResultado },
    payload: {
      nome,
      identificadorExterno: camposNormalizados.identificadorExterno.normalizado ?? "",
      status,
      advogados,
      administradora: camposNormalizados.administradora.normalizado ?? "",
      cep: camposNormalizados.cep.normalizado ?? "",
      logradouro: camposNormalizados.logradouro.normalizado ?? "",
      numero: camposNormalizados.numero.normalizado ?? "",
      complemento: camposNormalizados.complemento.normalizado ?? "",
      cidade: camposNormalizados.cidade.normalizado ?? "",
      estado: camposNormalizados.estado.normalizado ?? "",
      observacao: camposNormalizados.observacao.normalizado ?? "",
      delinquencyTrackingDays: null,
    },
  };
}

export function interpretarPlanilhaCondominios(
  matriz: string[][],
  advogadosValidos: string[],
): ResumoImportacaoCondominios {
  if (matriz.length === 0) {
    return { linhas: [{ linha: 1, erro: "Planilha vazia." }], importaveis: [] };
  }

  const cabecalho = matriz[0].map(normalizarCabecalho);
  const indices = cabecalho.map((coluna) => mapaCabecalho[coluna] ?? null);
  if (!indices.some((item) => item === "nome")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Nome".' }],
      importaveis: [],
    };
  }
  if (!indices.some((item) => item === "advogados")) {
    return {
      linhas: [{ linha: 1, erro: 'Cabeçalho inválido: inclua a coluna "Advogados".' }],
      importaveis: [],
    };
  }

  const linhas: ResultadoLinhaImportacaoCondominio[] = [];
  const importaveis: CondominioImportPayload[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const row = matriz[i];
    const valores: Partial<Record<CampoPlanilha, string>> = {};
    for (let c = 0; c < indices.length; c += 1) {
      const campo = indices[c];
      if (!campo || campo === "unidades" || campo === "_ignore") continue;
      if (campo === "advogados") {
        valores.advogados = row[c]?.trim() ?? "";
        continue;
      }
      valores[campo] = row[c]?.trim() ?? "";
    }

    if (!valores.nome?.trim() && !valores.identificadorExterno?.trim()) {
      continue;
    }

    const numeroLinha = i + 1;
    const { payload, erro, camposNormalizados } = montarPayload(valores, advogadosValidos);
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

export function interpretarArquivoCondominios(conteudo: string, advogadosValidos: string[]): ResumoImportacaoCondominios {
  const matriz = lerMatrizPlanilha(conteudo);
  return interpretarPlanilhaCondominios(matriz, advogadosValidos);
}
