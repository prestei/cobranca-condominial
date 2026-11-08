import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { normalizarValorMonetarioImportacao } from "@/lib/importacao-centro/normalizacao-campos";

export const CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS = new Set([
  "valorOriginal",
  "multa",
  "juros",
  "correcao",
  "valorAtualizado",
]);

export function campoCorrigivelPreviaDebitos(campo: string): boolean {
  return CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS.has(campo);
}

export function valorAtualCampoDebito(row: DebitoImportRow, campo: string): string {
  if (campo === "valorOriginal") return row.valorOriginal || row.valor;
  if (campo in row) return String((row as Record<string, string>)[campo] ?? "");
  return "";
}

export type ResultadoAplicarCorrecoesDebitos = {
  payload: DebitoImportRow;
  aplicadas: CorrecaoCampoPreviaAplicada[];
  erros: string[];
};

export type CorrecaoCampoPreviaAplicada = {
  campo: string;
  valorOriginal: string;
  valorCorrigido: string;
};

export function aplicarCorrecoesPayloadDebitos(
  payload: DebitoImportRow,
  correcoes: Record<string, string>,
): ResultadoAplicarCorrecoesDebitos {
  const erros: string[] = [];
  const aplicadas: CorrecaoCampoPreviaAplicada[] = [];
  const proximo: DebitoImportRow = { ...payload };

  for (const [campo, valorBruto] of Object.entries(correcoes)) {
    if (!campoCorrigivelPreviaDebitos(campo)) {
      erros.push(`O campo "${campo}" não pode ser corrigido neste módulo.`);
      continue;
    }

    const valorOriginal = valorAtualCampoDebito(proximo, campo);
    const normalizado = normalizarValorMonetarioImportacao(valorBruto, {
      obrigatorio: false,
      valorSeVazio: "0.00",
    });
    if (normalizado.erro || normalizado.normalizado === null) {
      erros.push(normalizado.erro ?? `Valor inválido para ${campo}.`);
      continue;
    }
    const valorCorrigido = normalizado.normalizado;
    if (valorCorrigido === valorOriginal) continue;

    if (campo === "valorOriginal") {
      proximo.valorOriginal = valorCorrigido;
    } else if (campo === "valorAtualizado") {
      proximo.valorAtualizado = valorCorrigido;
      proximo.valor = valorCorrigido;
    } else {
      (proximo as Record<string, string>)[campo] = valorCorrigido;
    }

    aplicadas.push({ campo, valorOriginal, valorCorrigido });
  }

  return { payload: proximo, aplicadas, erros };
}
