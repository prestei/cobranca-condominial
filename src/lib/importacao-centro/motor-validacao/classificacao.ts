import type { InconsistenciaValidacao, ResultadoValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

export function classificarResultadoValidacao(
  inconsistencias: InconsistenciaValidacao[],
): ResultadoValidacaoImportacao {
  if (inconsistencias.some((item) => item.severidade === "erro")) {
    return "erro";
  }
  if (inconsistencias.some((item) => item.severidade === "atencao")) {
    return "atencao";
  }
  return "valido";
}

export function mensagemPrincipalValidacao(inconsistencias: InconsistenciaValidacao[]): string | undefined {
  const erros = inconsistencias.filter((item) => item.severidade === "erro");
  if (erros.length > 0) {
    return erros.map((item) => item.mensagem).join(" ");
  }
  const atencoes = inconsistencias.filter((item) => item.severidade === "atencao");
  if (atencoes.length > 0) {
    return atencoes.map((item) => item.mensagem).join(" ");
  }
  return undefined;
}
