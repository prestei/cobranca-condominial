import {
  classificarResultadoValidacao,
  mensagemPrincipalValidacao,
} from "@/lib/importacao-centro/motor-validacao/classificacao";
import type { InconsistenciaValidacao, RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

export function criarInconsistencia(
  params: InconsistenciaValidacao,
): InconsistenciaValidacao {
  return { ...params };
}

export function inconsistenciaDeErroParse(mensagem: string): InconsistenciaValidacao {
  return {
    categoria: "cadastral",
    severidade: "erro",
    codigo: "cadastral.parse_rejeitado",
    mensagem,
  };
}

export function finalizarRegistroValidado<TPayload>(
  modulo: string,
  linha: number,
  base: Omit<RegistroValidadoImportacao<TPayload>, "identificador" | "linha" | "resultado">,
  inconsistenciasExtras: InconsistenciaValidacao[] = [],
): RegistroValidadoImportacao<TPayload> {
  const inconsistencias = [...base.inconsistencias, ...inconsistenciasExtras];
  const regrasAplicadas = [...new Set([...base.regrasAplicadas, ...inconsistencias.map((item) => item.codigo)])];
  const resultado = classificarResultadoValidacao(inconsistencias);

  const pagina = typeof base.dadosNormalizados === "object" && base.dadosNormalizados !== null
    ? (base.dadosNormalizados as { metaOrigem?: { pagina?: number } }).metaOrigem?.pagina
    : undefined;

  return {
    identificador: `${modulo}:linha:${linha}`,
    linha,
    ...(pagina ? { pagina } : {}),
    dadosOriginais: base.dadosOriginais,
    dadosNormalizados: base.dadosNormalizados,
    inconsistencias,
    regrasAplicadas,
    resultado,
  };
}

export function registroValidadoParaLinhaParseada<TPayload>(
  registro: RegistroValidadoImportacao<TPayload>,
  payloadParse?: TPayload,
): { erro?: string; payload?: TPayload; validacao: RegistroValidadoImportacao<TPayload> } {
  const mensagem = mensagemPrincipalValidacao(registro.inconsistencias);
  if (registro.resultado === "erro") {
    return {
      erro: mensagem ?? "Registro inválido.",
      validacao: registro,
    };
  }

  return {
    payload: payloadParse ?? (registro.dadosNormalizados as TPayload | null) ?? undefined,
    validacao: registro,
  };
}
