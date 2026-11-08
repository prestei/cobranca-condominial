import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import type {
  OpcoesDecimal,
  OpcoesValorMonetario,
  ResultadoNormalizacao,
} from "@/lib/importacao-centro/normalizacao-resultado";

const MARCADORES_VAZIO = /^(?:—|-\s*|n\/a|null|nil|\.)$/i;

const EMAIL_BASICO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function originalDe(raw: string | undefined | null): string {
  return raw ?? "";
}

function celulaVazia(trimmed: string): boolean {
  return !trimmed || MARCADORES_VAZIO.test(trimmed);
}

export function normalizarCampoVazioImportacao(
  raw: string | undefined | null,
): ResultadoNormalizacao<null> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  const vazio = celulaVazia(trimmed);
  return { original, normalizado: null, vazio };
}

function resultadoVazioObrigatorio(
  original: string,
  mensagem: string,
): ResultadoNormalizacao<string> {
  return { original, normalizado: null, vazio: true, erro: mensagem };
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
  if (celulaVazia(trimmed)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, opcoes?.mensagemVazio ?? "Informe a data.");
    }
    return { original, normalizado: null, vazio: true };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    if (!dataValidaIso(y, m, d)) {
      return {
        original,
        normalizado: null,
        vazio: false,
        erro: opcoes?.mensagemInvalida ?? "Data inválida.",
      };
    }
    return { original, normalizado: trimmed, vazio: false };
  }

  const separador = trimmed.includes("/") ? "/" : trimmed.includes("-") ? "-" : null;
  if (!separador) {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: opcoes?.mensagemInvalida ?? "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
    };
  }

  const partes = trimmed.split(separador);
  if (partes.length !== 3) {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: opcoes?.mensagemInvalida ?? "Data inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
    };
  }

  const [p1, p2, p3] = partes.map((p) => p.trim());
  if (!/^\d+$/.test(p1) || !/^\d+$/.test(p2) || !/^\d+$/.test(p3)) {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: opcoes?.mensagemInvalida ?? "Data inválida.",
    };
  }

  let dia: number;
  let mes: number;
  let ano: number;

  if (p3.length === 4) {
    dia = Number(p1);
    mes = Number(p2);
    ano = Number(p3);
  } else if (p1.length === 4) {
    ano = Number(p1);
    mes = Number(p2);
    dia = Number(p3);
  } else {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: opcoes?.mensagemInvalida ?? "Data inválida.",
    };
  }

  if (!dataValidaIso(ano, mes, dia)) {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: opcoes?.mensagemInvalida ?? "Data inválida.",
    };
  }

  const ambiguo = p3.length === 4 && dia <= 12 && mes <= 12 && dia !== mes;

  const normalizado = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return { original, normalizado, vazio: false, ambiguo: ambiguo || undefined };
}

function parseNumeroLocale(texto: string): { numero?: number; erro?: string } {
  let normalizado = texto.replace(/\s/g, "").replace(/R\$/gi, "");
  if (!normalizado) {
    return { erro: "Valor inválido." };
  }
  if (normalizado.includes(",") && normalizado.includes(".")) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  } else if (normalizado.includes(",")) {
    normalizado = normalizado.replace(",", ".");
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    return { erro: "Valor numérico inválido." };
  }
  return { numero };
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
  if (celulaVazia(trimmed)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o valor.");
    }
    const padrao = opcoes?.valorSeVazio;
    if (padrao !== undefined && padrao !== null) {
      return { original, normalizado: padrao, vazio: true };
    }
    return { original, normalizado: null, vazio: true };
  }

  const { numero, erro } = parseNumeroLocale(trimmed);
  if (erro || numero === undefined) {
    return {
      original,
      normalizado: null,
      vazio: false,
      erro: "Valor monetário inválido.",
    };
  }
  return { original, normalizado: formatarCasasDecimais(numero, casas), vazio: false };
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
  if (celulaVazia(trimmed)) {
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
  const { numero, erro } = parseNumeroLocale(semMoeda);
  if (erro || numero === undefined) {
    return { original, normalizado: null, vazio: false, erro: "Número decimal inválido." };
  }
  return { original, normalizado: formatarCasasDecimais(numero, casas), vazio: false };
}

/** Telefone → apenas dígitos (DDI opcional preservado nos dígitos). */
export function normalizarTelefoneImportacao(
  raw: string | undefined | null,
  opcoes?: { obrigatorio?: boolean },
): ResultadoNormalizacao<string> {
  const obrigatorio = opcoes?.obrigatorio ?? false;
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (celulaVazia(trimmed)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o telefone.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const digitos = trimmed.replace(/\D/g, "");
  if (!digitos) {
    return { original, normalizado: null, vazio: false, erro: "Telefone inválido." };
  }
  const ambiguo = digitos.length < 10 || digitos.length > 13;
  if (digitos.length < 8) {
    return { original, normalizado: null, vazio: false, erro: "Telefone inválido." };
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
  if (celulaVazia(trimmed)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe o e-mail.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const normalizado = trimmed.toLocaleLowerCase("pt-BR");
  if (!EMAIL_BASICO.test(normalizado)) {
    return { original, normalizado: null, vazio: false, erro: "E-mail inválido." };
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
  if (celulaVazia(trimmed)) {
    if (obrigatorio) {
      return resultadoVazioObrigatorio(original, "Informe CPF ou CNPJ.");
    }
    return { original, normalizado: null, vazio: true };
  }

  const digitos = trimmed.replace(/\D/g, "");
  if (!digitos) {
    return { original, normalizado: null, vazio: false, erro: "CPF/CNPJ inválido." };
  }
  if (digitos.length === 11 || digitos.length === 14) {
    return { original, normalizado: digitos, vazio: false };
  }
  return {
    original,
    normalizado: digitos,
    vazio: false,
    ambiguo: true,
    erro: "CPF/CNPJ com quantidade de dígitos inválida.",
  };
}

/** Nomes → trim e espaços internos colapsados; preserva caixa original. */
export function normalizarNomeImportacao(raw: string | undefined | null): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (celulaVazia(trimmed)) {
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
  if (celulaVazia(trimmed)) {
    return { original, normalizado: null, vazio: true };
  }
  const normalizado = trimmed.replace(/\s+/g, " ");
  return { original, normalizado, vazio: false };
}

/** Categorias → forma canônica para comparação (minúsculas, sem acento, espaço único). */
export function normalizarCategoriaImportacao(raw: string | undefined | null): ResultadoNormalizacao<string> {
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (celulaVazia(trimmed)) {
    return { original, normalizado: null, vazio: true };
  }
  const normalizado = normalizarCabecalhoPlanilha(trimmed);
  return { original, normalizado, vazio: false };
}

/**
 * Status / situação de débito: compara categoria normalizada com valores permitidos;
 * célula vazia pode usar `padraoSeVazio` sem inventar outro significado.
 */
export function normalizarStatusDebitoImportacao(
  raw: string | undefined | null,
  permitidos: readonly string[],
  opcoes?: { padraoSeVazio?: string },
): ResultadoNormalizacao<string> {
  const padrao = opcoes?.padraoSeVazio ?? "Vencido";
  const original = originalDe(raw);
  const trimmed = original.trim();
  if (celulaVazia(trimmed)) {
    return { original, normalizado: padrao, vazio: true };
  }
  const chaveEntrada = normalizarCabecalhoPlanilha(trimmed);
  for (const item of permitidos) {
    if (normalizarCabecalhoPlanilha(item) === chaveEntrada) {
      return { original, normalizado: item, vazio: false };
    }
  }
  return {
    original,
    normalizado: null,
    vazio: false,
    erro: `Status inválido (${permitidos.join(", ")}).`,
  };
}
