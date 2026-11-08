import { validadorImportacaoCondominios } from "@/lib/importacao-centro/motor-validacao/modulos/condominios";
import { validadorImportacaoDebitos } from "@/lib/importacao-centro/motor-validacao/modulos/debitos";
import { validadorImportacaoUnidades } from "@/lib/importacao-centro/motor-validacao/modulos/unidades";
import { validadorImportacaoResponsaveis } from "@/lib/importacao-centro/motor-validacao/modulos/responsaveis";
import type { ValidadorModuloImportacao } from "@/lib/importacao-centro/motor-validacao/types";

const REGISTRO: Record<string, ValidadorModuloImportacao> = {
  debitos: validadorImportacaoDebitos,
  condominios: validadorImportacaoCondominios,
  unidades: validadorImportacaoUnidades,
  responsaveis: validadorImportacaoResponsaveis,
};

export function obterValidadorModuloImportacao(modulo: string): ValidadorModuloImportacao | undefined {
  return REGISTRO[modulo];
}

export function registrarValidadorModuloImportacao(validador: ValidadorModuloImportacao): void {
  REGISTRO[validador.modulo] = validador;
}
