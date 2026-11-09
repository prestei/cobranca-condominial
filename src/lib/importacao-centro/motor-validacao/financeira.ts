import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";

export type ValoresFinanceirosImportacao = {
  valor?: string;
  valorOriginal?: string;
  multa?: string;
  juros?: string;
  correcao?: string;
  valorAtualizado?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  valorPago?: string;
  referencia?: string;
};

export function valorNumericoFinanceiro(valor: string | undefined): number | null {
  if (valor == null || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : Number.NaN;
}

function inconsistencia(
  codigo: string,
  mensagem: string,
  campo: string,
  severidade: "erro" | "atencao",
): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "financeira",
    severidade,
    codigo,
    mensagem,
    campo,
  });
}

function dataIsoValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

export function validarValoresFinanceiros(row: ValoresFinanceirosImportacao): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const camposValor = ["valor", "valorOriginal", "multa", "juros", "correcao", "valorAtualizado", "valorPago"] as const;

  for (const campo of camposValor) {
    const n = valorNumericoFinanceiro(row[campo]);
    if (n !== null && Number.isNaN(n)) {
      itens.push(
        inconsistencia(CODIGOS_VALIDACAO.financeira.valorInvalido, `Valor inválido no campo ${campo}.`, campo, "erro"),
      );
    }
  }

  const atualizado = valorNumericoFinanceiro(row.valorAtualizado);
  const principal = valorNumericoFinanceiro(row.valorOriginal) ?? valorNumericoFinanceiro(row.valor);
  if ((atualizado === null || Number.isNaN(atualizado)) && (principal === null || Number.isNaN(principal))) {
    itens.push(
      inconsistencia(
        CODIGOS_VALIDACAO.financeira.valorInvalido,
        "Informe um valor principal ou valor atualizado numérico.",
        "valorAtualizado",
        "erro",
      ),
    );
  }

  const negativos: Array<{ campo: keyof ValoresFinanceirosImportacao; rotulo: string }> = [
    { campo: "valorAtualizado", rotulo: "Valor atualizado" },
    { campo: "valorOriginal", rotulo: "Valor original" },
    { campo: "valor", rotulo: "Valor" },
    { campo: "multa", rotulo: "Multa" },
    { campo: "juros", rotulo: "Juros" },
    { campo: "correcao", rotulo: "Correção" },
  ];
  for (const item of negativos) {
    const n = valorNumericoFinanceiro(row[item.campo]);
    if (n !== null && !Number.isNaN(n) && n < 0) {
      itens.push(
        inconsistencia(
          CODIGOS_VALIDACAO.financeira.valorNegativo,
          `${item.rotulo} não pode ser negativo.`,
          String(item.campo),
          "erro",
        ),
      );
    }
  }

  if (atualizado !== null && !Number.isNaN(atualizado) && atualizado > 0) {
    const soma =
      (valorNumericoFinanceiro(row.valorOriginal) ?? valorNumericoFinanceiro(row.valor) ?? 0) +
      (valorNumericoFinanceiro(row.multa) ?? 0) +
      (valorNumericoFinanceiro(row.juros) ?? 0) +
      (valorNumericoFinanceiro(row.correcao) ?? 0);
    if (soma > 0 && Math.abs(soma - atualizado) > 0.02) {
      itens.push(
        inconsistencia(
          CODIGOS_VALIDACAO.financeira.somaDivergente,
          "Soma de componentes difere do valor atualizado; confira antes de importar.",
          "valorAtualizado",
          "atencao",
        ),
      );
    }
  }

  const vencimento = row.dataVencimento?.trim() ?? "";
  if (!vencimento || !dataIsoValida(vencimento)) {
    itens.push(
      inconsistencia(
        CODIGOS_VALIDACAO.financeira.vencimentoInvalido,
        "Data de vencimento inválida ou ausente.",
        "dataVencimento",
        "erro",
      ),
    );
  }

  const pagamento = row.dataPagamento?.trim() ?? "";
  const valorPago = valorNumericoFinanceiro(row.valorPago);
  if (pagamento && !dataIsoValida(pagamento)) {
    itens.push(
      inconsistencia(
        CODIGOS_VALIDACAO.financeira.referenciaInconsistente,
        "Data de pagamento em formato incompatível com a referência financeira.",
        "dataPagamento",
        "atencao",
      ),
    );
  }
  if (pagamento && (valorPago === null || Number.isNaN(valorPago))) {
    itens.push(
      inconsistencia(
        CODIGOS_VALIDACAO.financeira.referenciaInconsistente,
        "Há data de pagamento sem valor pago correspondente.",
        "valorPago",
        "atencao",
      ),
    );
  }

  return itens;
}

export function inconsistenciaRegistroFinanceiroDuplicado(mensagem: string): InconsistenciaValidacao {
  return inconsistencia(
    CODIGOS_VALIDACAO.financeira.registroDuplicado,
    mensagem,
    "referencia",
    "atencao",
  );
}
