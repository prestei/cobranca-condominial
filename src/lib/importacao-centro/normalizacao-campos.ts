import { normalizarCabecalhoPlanilha, textoVazio } from "@/lib/importacao-centro/normalizacao";
import type {
  OpcoesDecimal,
  OpcoesValorMonetario,
  ResultadoNormalizacao,
  SpecCampoNormalizacao,
  TipoCampoNormalizacao,
} from "@/lib/importacao-centro/normalizacao-resultado";

const EMAIL_BASICO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function originalDe(raw: string | undefined | null): string {
  return raw ?? "";
}

export function normalizarCampoVazioImportacao(
  raw: string | undefined | null,
): ResultadoNormalizacao<null> {
  const original = originalDe(raw);
  const vazio = textoVazio(original);
  return { original, normalizado: null, vazio };
}

function resultadoVazioObrigatorio(
  original: string,
  mensagem: string,
): ResultadoNormalizacao<string> {
  return { original, normalizado: null, vazio: true, erro: mensagem };
}

function resultadoRejeitado(
  original: string,
  mensagem: string,
  extras?: { ambiguo?: boolean },
): ResultadoNormalizacao<string> {
  return {
    original,
    normalizado: null,
    vazio: false,
    erro: mensagem,
    ambiguo: extras?.ambiguo || undefined,
  };
}

function dataValidaIso(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return dia <= ultimoDia;
}

/**
 * Datas → `AAAA-MM-DD` (aceita ISO e `DD/MM/AAAA` ou `DD-MM-AAAA`).
 */
export function normalizarDataImportacao(
  raw: string | undefined | null,
  opcoes?: { obrigatorio?: boolean; mensagemVazio?: string; mensagemInvalida?: string },
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, opcoes?.mensagemVazio ?? "Informe a data.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const dataTexto = trimmed
    .replace(/[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i, "")
    .trim();
  const tinhaHora = dataTexto !== trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataTexto)) {
    const [y, m, d] = dataTexto.split("-").map(Number);
    if (!dataValidaIso(y, m, d)) {
      return resultadoRejeitado(original, opcoes?.mensagemInvalida ?? "Data inválida.");
    }
    return { original, normalizado: dataTexto, vazio: false, ambiguo: tinhaHora || undefined };
  }

  const separador = dataTexto.includes("/") ? "/" : dataTexto.includes("-") ? "-" : null;
  if (!separador) {
    return resultadoRejeitado(
      original,
      opcoes?.mensagemInvalida ?? "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
    );
  }

  const partes = dataTexto.split(separador);
  if (partes.length !== 3) {
    return resultadoRejeitado(
      original,
      opcoes?.mensagemInvalida ?? "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
    );
  }

  const [p1, p2, p3] = partes.map((p) => p.trim());
  if (!/^\d+$/.test(p1) || !/^\d+$/.test(p2) || !/^\d+$/.test(p3)) {
    return resultadoRejeitado(original, opcoes?.mensagemInvalida ?? "Data inválida.");
  }

  let dia: number;
  let mes: number;
  let ano: number;
  let anoDoisDigitos = false;

  if (p3.length === 4) {
    dia = Number(p1);
    mes = Number(p2);
    ano = Number(p3);
  } else if (p3.length === 2 && p1.length <= 2) {
    dia = Number(p1);
    mes = Number(p2);
    ano = 2000 + Number(p3);
    anoDoisDigitos = true;
  } else if (p1.length === 4) {
    ano = Number(p1);
    mes = Number(p2);
    dia = Number(p3);
  } else {
    return resultadoRejeitado(original, opcoes?.mensagemInvalida ?? "Data inválida.");
  }

  if (!dataValidaIso(ano, mes, dia)) {
    return resultadoRejeitado(original, opcoes?.mensagemInvalida ?? "Data inválida.");
  }

  const ambiguoDiaMes = p3.length === 4 && dia <= 12 && mes <= 12 && dia !== mes;
  const ambiguo = ambiguoDiaMes || anoDoisDigitos || tinhaHora;

  const normalizado = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return { original, normalizado, vazio: false, ambiguo: ambiguo || undefined };
}

function agrupamentoMilharValido(grupos: string[]): boolean {
  if (grupos.length < 2) return false;
  if (!grupos[0] || grupos[0].length > 3) return false;
  return grupos.slice(1).every((grupo) => grupo.length === 3);
}

function parseNumeroLocale(texto: string): { numero?: number; erro?: string; ambiguo?: boolean } {
  const bruto = texto.replace(/\s/g, "").replace(/R\$/gi, "");
  if (!bruto) {
    return { erro: "Valor inválido." };
  }
  if (/[eE]/.test(bruto) || !/^-?\d+(?:[.,]\d+)*$/.test(bruto)) {
    return { erro: "Valor numérico inválido." };
  }

  const negativo = bruto.startsWith("-");
  const corpo = negativo ? bruto.slice(1) : bruto;
  let ambiguo = false;
  let canonico: string;

  if (corpo.includes(",") && corpo.includes(".")) {
    const ultimoVirgula = corpo.lastIndexOf(",");
    const ultimoPonto = corpo.lastIndexOf(".");
    const decimalEhVirgula = ultimoVirgula > ultimoPonto;
    const decimalIdx = decimalEhVirgula ? ultimoVirgula : ultimoPonto;
    const inteiro = corpo.slice(0, decimalIdx);
    const fracao = corpo.slice(decimalIdx + 1);
    if (!fracao || /[.,]/.test(fracao)) {
      return { erro: "Valor numérico inválido." };
    }
    const milharSep = decimalEhVirgula ? "." : ",";
    const grupos = inteiro.split(milharSep);
    if (grupos.length > 1 && !agrupamentoMilharValido(grupos)) {
      return { erro: "Valor numérico inválido." };
    }
    canonico = `${grupos.join("")}.${fracao}`;
  } else if (corpo.includes(",")) {
    const partes = corpo.split(",");
    if (partes.length > 2) {
      if (!agrupamentoMilharValido(partes)) {
        return { erro: "Valor numérico inválido." };
      }
      canonico = partes.join("");
    } else if (partes.length === 2 && partes[1].length === 3 && partes[0].length > 0) {
      ambiguo = true;
      canonico = partes[0] + partes[1];
    } else {
      canonico = corpo.replace(",", ".");
    }
  } else if (corpo.includes(".")) {
    const partes = corpo.split(".");
    if (partes.length > 2) {
      if (!agrupamentoMilharValido(partes)) {
        return { erro: "Valor numérico inválido." };
      }
      canonico = partes.join("");
    } else if (partes.length === 2 && partes[1].length === 3 && partes[0].length > 0) {
      ambiguo = true;
      canonico = partes[0] + partes[1];
    } else {
      canonico = corpo;
    }
  } else {
    canonico = corpo;
  }

  const numero = Number(`${negativo ? "-" : ""}${canonico}`);
  if (!Number.isFinite(numero)) {
    return { erro: "Valor numérico inválido." };
  }
  return { numero, ambiguo: ambiguo || undefined };
}

function formatarCasasDecimais(numero: number, casas: number): string {
  return numero.toFixed(casas);
}

/**
 * Valores monetários pt-BR → string decimal com casas fixas (padrão 2).
 */
export function normalizarValorMonetarioImportacao(
  raw: string | undefined | null,
  opcoes?: OpcoesValorMonetario,
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const casas = opcoes?.casasDecimais ?? 2;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o valor.");
    }
    const padrao = opcoes?.valorSeVazio;
    if (padrao !== undefined && padrao !== null) {
      return { original, normalizado: padrao, vazio: true };
    }
    return { original, normalizado: null, vazio: true };
  }

  const { numero, erro, ambiguo } = parseNumeroLocale(trimmed);
  if (erro || numero === undefined) {
    return resultadoRejeitado(original, "Valor monetário inválido.");
  }
  return {
    original,
    normalizado: formatarCasasDecimais(numero, casas),
    vazio: false,
    ambiguo: ambiguo || undefined,
  };
}

/** Números decimais (sem símbolo de moeda) → string decimal. */
export function normalizarDecimalImportacao(
  raw: string | undefined | null,
  opcoes?: OpcoesDecimal,
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const casas = opcoes?.casasDecimais ?? 2;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o número.");
    }
    const padrao = opcoes?.valorSeVazio;
    if (padrao !== undefined && padrao !== null) {
      return { original, normalizado: padrao, vazio: true };
    }
    return { original, normalizado: null, vazio: true };
  }

  const semMoeda = trimmed.replace(/\s/g, "").replace(/R\$/gi, "");
  const { numero, erro, ambiguo } = parseNumeroLocale(semMoeda);
  if (erro || numero === undefined) {
    return resultadoRejeitado(original, "Número decimal inválido.");
  }
  return {
    original,
    normalizado: formatarCasasDecimais(numero, casas),
    vazio: false,
    ambiguo: ambiguo || undefined,
  };
}

/** Telefone → apenas dígitos (DDI opcional preservado nos dígitos). */
export function normalizarTelefoneImportacao(
  raw: string | undefined | null,
  opcoes?: { obrigatorio?: boolean },
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o telefone.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const digitos = trimmed.replace(/\D/g, "");
  if (!digitos) {
    return resultadoRejeitado(original, "Telefone inválido.");
  }
  const ambiguo = digitos.length < 10 || digitos.length > 13;
  if (digitos.length < 8) {
    return resultadoRejeitado(original, "Telefone inválido.");
  }
  return { original, normalizado: digitos, vazio: false, ambiguo: ambiguo || undefined };
}

export function normalizarEmailImportacao(
  raw: string | undefined | null,
  opcoes?: { obrigatorio?: boolean },
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o e-mail.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const normalizado = trimmed.toLocaleLowerCase("pt-BR");
  if (!EMAIL_BASICO.test(normalizado)) {
    return resultadoRejeitado(original, "E-mail inválido.");
  }
  return { original, normalizado, vazio: false };
}

/** CPF (11) ou CNPJ (14) → apenas dígitos. */
export function normalizarCpfCnpjImportacao(
  raw: string | undefined | null,
  opcoes?: { obrigatorio?: boolean },
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe CPF ou CNPJ.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const digitos = trimmed.replace(/\D/g, "");
  if (!digitos) {
    return resultadoRejeitado(original, "CPF/CNPJ inválido.");
  }
  if (digitos.length === 11 || digitos.length === 14) {
    return { original, normalizado: digitos, vazio: false };
  }
  return resultadoRejeitado(original, "CPF/CNPJ com quantidade de dígitos inválida.", { ambiguo: true });
}

/** Nomes → trim e espaços internos colapsados; preserva caixa original. */
export function normalizarNomeImportacao(raw: string | undefined | null): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    return { original, normalizado: null, vazio: true };
  }
  const normalizado = trimmed.replace(/\s+/g, " ");
  return { original, normalizado, vazio: false };
}

/** Códigos de identificação → trim, sem espaços extras; preserva caixa. */
export function normalizarCodigoIdentificacaoImportacao(
  raw: string | undefined | null,
): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    return { original, normalizado: null, vazio: true };
  }
  const normalizado = trimmed.replace(/\s+/g, " ");
  return { original, normalizado, vazio: false };
}

/** Categorias → forma canônica para comparação (minúsculas, sem acento, espaço único). */
export function normalizarCategoriaImportacao(raw: string | undefined | null): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    return { original, normalizado: null, vazio: true };
  }
  const normalizado = normalizarCabecalhoPlanilha(trimmed);
  return { original, normalizado, vazio: false };
}

/**
 * Status / situação de débito: compara com valores permitidos.
 * Célula vazia só recebe default quando o adaptador passa `padraoSeVazio` explicitamente.
 */
export function normalizarStatusDebitoImportacao(
  raw: string | undefined | null,
  permitidos: readonly string[],
  opcoes?: { padraoSeVazio?: string },
): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (opcoes?.padraoSeVazio !== undefined) {
      return { original, normalizado: opcoes.padraoSeVazio, vazio: true };
    }
    return { original, normalizado: null, vazio: true };
  }
  const chaveEntrada = normalizarCabecalhoPlanilha(trimmed);
  for (const item of permitidos) {
    if (normalizarCabecalhoPlanilha(item) === chaveEntrada) {
      return { original, normalizado: item, vazio: false };
    }
  }
  return resultadoRejeitado(original, `Status inválido (${permitidos.join(", ")}).`);
}

/**
 * Categorias com lista permitida: casa/acento alinhados ao valor canônico.
 * Valor desconhecido não é substituído por outro da lista.
 */
export function normalizarClassificacaoImportacao(
  raw: string | undefined | null,
  permitidos: readonly string[],
  opcoes?: { obrigatorio?: boolean; mensagemInvalida?: string },
): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (textoVazio(original)) {
    if (opcoes?.obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe a classificação.");
    }
    return { original, normalizado: null, vazio: true };
  }
  const chaveEntrada = normalizarCabecalhoPlanilha(trimmed);
  for (const item of permitidos) {
    if (normalizarCabecalhoPlanilha(item) === chaveEntrada) {
      return { original, normalizado: item, vazio: false };
    }
  }
  return resultadoRejeitado(
    original,
    opcoes?.mensagemInvalida ?? `Classificação não reconhecida (${permitidos.join(", ")}).`,
  );
}

export function normalizarCampoTipadoImportacao(
  spec: SpecCampoNormalizacao,
): ResultadoNormalizacao<string> {
  switch (spec.tipo) {
    case "data":
      return normalizarDataImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "monetario":
      return normalizarValorMonetarioImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "decimal":
      return normalizarDecimalImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "telefone":
      return normalizarTelefoneImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "email":
      return normalizarEmailImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "cpfCnpj":
      return normalizarCpfCnpjImportacao(spec.raw, { obrigatorio: spec.obrigatorio });
    case "nome":
      return normalizarNomeImportacao(spec.raw);
    case "codigo":
      return normalizarCodigoIdentificacaoImportacao(spec.raw);
    case "categoria":
      return normalizarCategoriaImportacao(spec.raw);
    case "vazio":
      return { ...normalizarCampoVazioImportacao(spec.raw), normalizado: null };
    default: {
      const _nunca: never = spec.tipo;
      return { original: originalDe(spec.raw), normalizado: null, vazio: false, erro: `Tipo não suportado: ${_nunca}` };
    }
  }
}

/** Aplica o mapa de tipos sem inventar valores e sem descartar o original. */
export function aplicarNormalizacaoRegistro(
  specs: Record<string, SpecCampoNormalizacao>,
): Record<string, ResultadoNormalizacao<string>> {
  const saida: Record<string, ResultadoNormalizacao<string>> = {};
  for (const [campo, spec] of Object.entries(specs)) {
    saida[campo] = normalizarCampoTipadoImportacao(spec);
  }
  return saida;
}

export function mapaValoresNormalizados(
  campos: Record<string, ResultadoNormalizacao<string>>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [campo, resultado] of Object.entries(campos)) {
    saida[campo] = resultado.normalizado ?? "";
  }
  return saida;
}

export type { TipoCampoNormalizacao, SpecCampoNormalizacao };
