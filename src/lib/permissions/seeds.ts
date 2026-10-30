import type { PermissoesCargo } from "@/lib/permissions/modulos";
import { parsePermissoesJson, serializarPermissoes } from "@/lib/permissions/parse";

const admin: PermissoesCargo = {
  dashboard: { ler: true },
  atendimentos: { ler: true, criar: true, editar: true, excluir: true },
  debitos: { ler: true, criar: true, editar: true, excluir: true },
  juridico: { ler: true, criar: true, editar: true },
  condominios: { ler: true, criar: true, editar: true, excluir: true },
  unidades: { ler: true, criar: true, editar: true, excluir: true },
  relatorios: { ler: true, exportar: true },
  importacoes: { ler: true, criar: true, editar: true, excluir: true },
  usuarios: { ler: true, criar: true, editar: true, excluir: true },
  cargos: { ler: true, criar: true, editar: true, excluir: true },
  auditoria: { ler: true },
};

const atendente: PermissoesCargo = {
  dashboard: { ler: true },
  atendimentos: { ler: true, criar: true, editar: true },
  debitos: { ler: true },
};

const advogado: PermissoesCargo = {
  dashboard: { ler: true },
  condominios: { ler: true },
  unidades: { ler: true },
  debitos: { ler: true },
  juridico: { ler: true, editar: true },
  relatorios: { ler: true, exportar: true },
};

export const PERMISSAO_JSON_ADMIN = serializarPermissoes(admin);
export const PERMISSAO_JSON_ATENDENTE = serializarPermissoes(atendente);
export const PERMISSAO_JSON_ADVOGADO = serializarPermissoes(advogado);

/** Permissões de fábrica dos cargos seed (Administrador, Atendente, Advogado). */
export function permissoesPadraoPorNome(nome: string): PermissoesCargo | null {
  const chave = nome.trim().toLocaleLowerCase("pt-BR");
  if (chave === "administrador") return parsePermissoesJson(PERMISSAO_JSON_ADMIN);
  if (chave === "atendente") return parsePermissoesJson(PERMISSAO_JSON_ATENDENTE);
  if (chave === "advogado") return parsePermissoesJson(PERMISSAO_JSON_ADVOGADO);
  return null;
}
