import type { AtribuicaoCobranca, Cadastros } from "@/data/catalogo";
import { escopoCondominios, escopoUnidades } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { findOpenAssignmentByUnit } from "@/lib/db/repositories/collection-repository";
import { findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import { findUnitById } from "@/lib/db/repositories/unit-repository";

let escopoCache: { at: number; data: Cadastros } | null = null;
const ESCOPO_TTL_MS = 2_000;

async function cadastrosEscopo(): Promise<Cadastros> {
  const now = Date.now();
  if (escopoCache && now - escopoCache.at < ESCOPO_TTL_MS) {
    return escopoCache.data;
  }
  const data = await loadCadastrosForScope();
  escopoCache = { at: now, data };
  return data;
}

export function invalidateServiceContextCache() {
  escopoCache = null;
}

export async function scopeCondominiumIds(userId: number): Promise<Set<number>> {
  const cadastros = await cadastrosEscopo();
  return new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
}

export async function scopeUnitIds(userId: number): Promise<Set<number>> {
  const cadastros = await cadastrosEscopo();
  return new Set(escopoUnidades(cadastros, userId).map((item) => item.id));
}

export async function scopedCondominiums(userId: number) {
  const cadastros = await cadastrosEscopo();
  return escopoCondominios(cadastros, userId);
}

export async function scopedUnits(userId: number) {
  const cadastros = await cadastrosEscopo();
  return escopoUnidades(cadastros, userId);
}

export async function openAssignmentForUnit(unitId: number): Promise<AtribuicaoCobranca | null> {
  return findOpenAssignmentByUnit(unitId);
}

export async function requireUnitInScope(userId: number, unidadeId: number, condominioId: number) {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) {
    throw new Error("UNIT_NOT_FOUND");
  }
  if (unidade.condominioId !== condominioId) {
    throw new Error("UNIT_CONDO_MISMATCH");
  }
  const idsUnidade = await scopeUnitIds(userId);
  if (!idsUnidade.has(unidadeId)) {
    throw new Error("UNIT_OUT_OF_SCOPE");
  }
  const idsCondominio = await scopeCondominiumIds(userId);
  if (!idsCondominio.has(condominioId)) {
    throw new Error("CONDO_OUT_OF_SCOPE");
  }
  return unidade;
}

export async function requireCondominiumInScope(userId: number, condominioId: number) {
  const condominio = await findCondominiumById(condominioId);
  if (!condominio) {
    throw new Error("CONDO_NOT_FOUND");
  }
  const ids = await scopeCondominiumIds(userId);
  if (!ids.has(condominioId)) {
    throw new Error("CONDO_OUT_OF_SCOPE");
  }
  return condominio;
}
