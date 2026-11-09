import { normalizarCodigoIdentificacaoImportacao, normalizarEmailImportacao } from "@/lib/importacao-centro/normalizacao-campos";
import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
import type { InconsistenciaValidacao, SeveridadeInconsistencia } from "@/lib/importacao-centro/motor-validacao/types";

const CODIGO_SO_MARCADOR = /^[\s\-_.#/\\]+$/;

export function inconsistenciaNomeAusente(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "cadastral",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.cadastral.nomeAusente,
    mensagem,
    campo,
  });
}

export function inconsistenciaCodigoInvalido(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "cadastral",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.cadastral.codigoInvalido,
    mensagem,
    campo,
  });
}

export function inconsistenciaEmailInvalido(
  campo: string,
  mensagem: string,
  severidade: SeveridadeInconsistencia = "erro",
): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "cadastral",
    severidade,
    codigo: CODIGOS_VALIDACAO.cadastral.emailInvalido,
    mensagem,
    campo,
  });
}

export function inconsistenciaDocumentoInvalido(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "cadastral",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.cadastral.documentoInvalido,
    mensagem,
    campo,
  });
}

export function inconsistenciaRegistroExistente(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "cadastral",
    severidade: "atencao",
    codigo: CODIGOS_VALIDACAO.cadastral.registroExistente,
    mensagem,
    campo,
  });
}

export function validarNomeInformado(nome: string | undefined, campo: string, rotulo: string): InconsistenciaValidacao[] {
  if (nome?.trim()) return [];
  return [inconsistenciaNomeAusente(campo, `${rotulo} é obrigatório.`)];
}

/** Código inválido somente quando informado e não puder ser usado como identificador. */
export function validarCodigoQuandoInformado(
  valor: string | undefined,
  campo: string,
  rotulo: string,
): InconsistenciaValidacao[] {
  const bruto = valor?.trim() ?? "";
  if (!bruto) return [];
  const normalizado = normalizarCodigoIdentificacaoImportacao(bruto);
  if (normalizado.erro || !normalizado.normalizado || CODIGO_SO_MARCADOR.test(normalizado.normalizado)) {
    return [inconsistenciaCodigoInvalido(campo, `${rotulo} inválido.`)];
  }
  return [];
}

export function validarEmailQuandoInformado(
  email: string | undefined,
  campo = "email",
  severidade: SeveridadeInconsistencia = "erro",
): InconsistenciaValidacao[] {
  const bruto = email?.trim() ?? "";
  if (!bruto) return [];
  const resultado = normalizarEmailImportacao(bruto);
  if (resultado.erro) {
    return [inconsistenciaEmailInvalido(campo, resultado.erro, severidade)];
  }
  return [];
}
