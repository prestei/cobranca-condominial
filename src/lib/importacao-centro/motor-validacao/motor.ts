import type { LinhaParseada } from "@/lib/importacao-centro/types";
import { inconsistenciasDeNormalizacao } from "@/lib/importacao-centro/inconsistencias-normalizacao";
import { chaveNaturalDebito } from "@/lib/importacao-centro/detecao-duplicidades";
import { classificarResultadoValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
import {
  REGRAS_CADASTRAIS_MOTOR,
  REGRAS_ESTRUTURAIS_MOTOR,
  REGRAS_FINANCEIRAS_MOTOR,
  REGRAS_NEGOCIO_MOTOR,
  REGRAS_RELACIONAIS_MOTOR,
  CODIGOS_VALIDACAO,
} from "@/lib/importacao-centro/motor-validacao/codigos";
import { extrairCabecalhoNormalizado } from "@/lib/importacao-centro/motor-validacao/estrutural";
import { inconsistenciaRegistroFinanceiroDuplicado } from "@/lib/importacao-centro/motor-validacao/financeira";
import { finalizarRegistroValidado, registroValidadoParaLinhaParseada } from "@/lib/importacao-centro/motor-validacao/registro";
import { obterValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/registry";
import type { InconsistenciaValidacao, RegistroValidadoImportacao, ValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import { criarValidadorGenericoImportacao } from "@/lib/importacao-centro/motor-validacao/validador-generico";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";

export type ResultadoMotorValidacaoImportacao<TPayload> = {
  linhas: LinhaParseada<TPayload>[];
  registros: RegistroValidadoImportacao<TPayload>[];
  inconsistenciasArquivo: InconsistenciaValidacao[];
};

function regrasBaseDoMotor(validador: ValidadorModuloImportacao, moduloRegistrado: boolean): string[] {
  if (!moduloRegistrado) {
    return [CODIGOS_VALIDACAO.motor.validarRegistro, CODIGOS_VALIDACAO.motor.validadorGenerico];
  }
  return [
    CODIGOS_VALIDACAO.motor.validarRegistro,
    ...REGRAS_ESTRUTURAIS_MOTOR,
    ...REGRAS_CADASTRAIS_MOTOR,
    ...REGRAS_RELACIONAIS_MOTOR,
    ...REGRAS_FINANCEIRAS_MOTOR,
    ...REGRAS_NEGOCIO_MOTOR,
    ...(validador.regrasDoModulo ?? []),
  ];
}

function chaveDuplicidadeFinanceira(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Partial<DebitoImportRow>;
  if (row.condominioId == null || row.unidadeId == null || !row.referencia || !row.dataVencimento) return null;
  return chaveNaturalDebito({
    condominioId: row.condominioId,
    unidadeId: row.unidadeId,
    referencia: row.referencia,
    dataVencimento: row.dataVencimento,
    valor: row.valor ?? "",
    descricao: row.descricao ?? "",
  });
}

/**
 * Motor central de validação (Ticket 05).
 * Não grava em tabelas de negócio — apenas enriquece linhas parseadas.
 * Nenhum registro segue sem `validacao`.
 */
export function aplicarMotorValidacaoImportacao<TPayload, TContexto>(
  parseadas: LinhaParseada<TPayload>[],
  params: {
    modulo: string;
    matriz: string[][];
    contexto: TContexto;
  },
): ResultadoMotorValidacaoImportacao<TPayload> {
  const registrado = obterValidadorModuloImportacao(params.modulo);
  const validador = registrado ?? criarValidadorGenericoImportacao(params.modulo);
  const cabecalho = extrairCabecalhoNormalizado(params.matriz);
  const regrasBase = regrasBaseDoMotor(validador, Boolean(registrado));

  const inconsistenciasArquivo: InconsistenciaValidacao[] = [];
  if (validador.validarEstruturaArquivo) {
    inconsistenciasArquivo.push(...validador.validarEstruturaArquivo(params.matriz));
  }

  const registros: RegistroValidadoImportacao<TPayload>[] = [];
  const linhas: LinhaParseada<TPayload>[] = [];

  const linhaPorNumero = new Map<number, string[]>();
  for (let i = 1; i < params.matriz.length; i += 1) {
    linhaPorNumero.set(i + 1, params.matriz[i] ?? []);
  }

  const chavesFinanceiras = new Map<string, number[]>();

  const aplicarLinha = (item: LinhaParseada<TPayload>) => {
    const parcial = validador.validarRegistro({
      linha: item.linha,
      linhaBruta: linhaPorNumero.get(item.linha) ?? [],
      cabecalho,
      payload: item.payload,
      erroParse: item.erro,
      contexto: params.contexto,
      camposNormalizados: item.camposNormalizados,
    });

    const inconsistenciasNorm = inconsistenciasDeNormalizacao(item.camposNormalizados);
    const registro = finalizarRegistroValidado(params.modulo, item.linha, {
      ...parcial,
      camposNormalizados: item.camposNormalizados ?? parcial.camposNormalizados,
      inconsistencias: [...inconsistenciasNorm, ...parcial.inconsistencias],
      regrasAplicadas: [
        ...regrasBase,
        ...parcial.regrasAplicadas,
        ...(inconsistenciasNorm.length > 0 ? ["normalizacao.antes_validacao"] : []),
      ],
    });
    registro.resultado = classificarResultadoValidacao(registro.inconsistencias);
    registros.push(registro);

    const chave = chaveDuplicidadeFinanceira(item.payload);
    if (chave) {
      const linhasChave = chavesFinanceiras.get(chave) ?? [];
      linhasChave.push(item.linha);
      chavesFinanceiras.set(chave, linhasChave);
    }

    const convertido = registroValidadoParaLinhaParseada(registro, item.payload);
    linhas.push({
      linha: item.linha,
      camposNormalizados: item.camposNormalizados,
      ...convertido,
    });
  };

  for (const item of parseadas) {
    aplicarLinha(item);
  }

  const linhasDuplicadas = new Set<number>();
  for (const numeros of chavesFinanceiras.values()) {
    if (numeros.length < 2) continue;
    for (const numero of numeros.slice(1)) linhasDuplicadas.add(numero);
  }

  if (linhasDuplicadas.size > 0) {
    for (let i = 0; i < registros.length; i += 1) {
      if (!linhasDuplicadas.has(registros[i].linha)) continue;
      registros[i].inconsistencias.push(
        inconsistenciaRegistroFinanceiroDuplicado(
          "Registro financeiro duplicado neste arquivo (mesma unidade, referência, vencimento e valor).",
        ),
      );
      registros[i].regrasAplicadas = [
        ...new Set([...registros[i].regrasAplicadas, CODIGOS_VALIDACAO.financeira.registroDuplicado]),
      ];
      registros[i].resultado = classificarResultadoValidacao(registros[i].inconsistencias);
      const convertido = registroValidadoParaLinhaParseada(registros[i], parseadas[i]?.payload);
      linhas[i] = {
        linha: registros[i].linha,
        camposNormalizados: linhas[i].camposNormalizados,
        ...convertido,
      };
    }
  }

  if (parseadas.length === 0) {
    const registro = finalizarRegistroValidado(params.modulo, 1, {
      dadosOriginais: {},
      dadosNormalizados: null,
      inconsistencias: inconsistenciasArquivo,
      regrasAplicadas: [...regrasBase, CODIGOS_VALIDACAO.motor.validarEstruturaArquivo],
    });
    if (registro.inconsistencias.length > 0) {
      registros.push(registro);
      linhas.push({
        linha: 1,
        erro: registro.resultado === "erro" ? registro.inconsistencias.map((item) => item.mensagem).join(" ") : undefined,
        validacao: registro,
      });
    }
  }

  return { linhas, registros, inconsistenciasArquivo };
}
