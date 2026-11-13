import type { AcaoPermissao, ModuloPermissao, PermissoesCargo } from "@/lib/permissions/modulos";

export function temPermissao(permissoes: PermissoesCargo, modulo: ModuloPermissao, acao: AcaoPermissao): boolean {
  return permissoes[modulo]?.[acao] === true;
}

/** Administradora (gestão de colaboradores) — vê e acessa todos os módulos do menu. */
export function ehAdministradora(permissoes: PermissoesCargo): boolean {
  return temPermissao(permissoes, "usuarios", "criar");
}

/** Mesma regra da API de propostas e da página `/negociacoes`. */
export function podeLerNegociacoes(permissoes: PermissoesCargo): boolean {
  return (
    temPermissao(permissoes, "negociacoes", "ler") ||
    temPermissao(permissoes, "atendimentos", "ler") ||
    ehAdministradora(permissoes)
  );
}

/** Item do menu lateral / entrada em ROTAS_MODULO. */
export function podeVerModuloNoMenu(
  permissoes: PermissoesCargo,
  modulo: ModuloPermissao,
  href?: string,
): boolean {
  if (ehAdministradora(permissoes)) return true;
  if (modulo === "negociacoes" || href === "/negociacoes") {
    return podeLerNegociacoes(permissoes);
  }
  return temPermissao(permissoes, modulo, "ler");
}

export function podeAcessarRota(permissoes: PermissoesCargo, modulo: ModuloPermissao): boolean {
  if (ehAdministradora(permissoes)) return true;
  if (modulo === "negociacoes") {
    return podeLerNegociacoes(permissoes);
  }
  return temPermissao(permissoes, modulo, "ler");
}
