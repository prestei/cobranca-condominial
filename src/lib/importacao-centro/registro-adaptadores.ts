import { adaptadorImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { adaptadorImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis";
import { adaptadorImportacaoUnidades } from "@/lib/importacao-centro/adaptadores/unidades";
import type { AdaptadorImportacao } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";

export const MODULOS_IMPORTACAO_CENTRAL = ["condominios", "debitos", "responsaveis", "unidades"] as const;
export type ModuloImportacaoCentral = (typeof MODULOS_IMPORTACAO_CENTRAL)[number];

const REGISTRO = new Map<string, AdaptadorImportacao<unknown, unknown>>();

export function registrarAdaptadorImportacao<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
): void {
  REGISTRO.set(adapter.modulo, adapter as AdaptadorImportacao<unknown, unknown>);
}

export function obterAdaptadorImportacao(modulo: string): AdaptadorImportacao<unknown, unknown> {
  const adapter = REGISTRO.get(modulo);
  if (!adapter) {
    throw new ImportacaoCentroError(`Não há adaptador de importação registrado para o módulo "${modulo}".`, 400);
  }
  return adapter;
}

export function listarModulosAdaptadorImportacao(): string[] {
  return [...REGISTRO.keys()].sort();
}

registrarAdaptadorImportacao(adaptadorImportacaoDebitos);
registrarAdaptadorImportacao(adaptadorImportacaoCondominios);
registrarAdaptadorImportacao(adaptadorImportacaoUnidades);
registrarAdaptadorImportacao(adaptadorImportacaoResponsaveis);
