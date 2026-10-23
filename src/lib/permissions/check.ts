import type { AcaoPermissao, ModuloPermissao, PermissoesCargo } from "@/lib/permissions/modulos";

export function temPermissao(permissoes: PermissoesCargo, modulo: ModuloPermissao, acao: AcaoPermissao): boolean {
  return permissoes[modulo]?.[acao] === true;
}

export function podeAcessarRota(permissoes: PermissoesCargo, modulo: ModuloPermissao): boolean {
  return temPermissao(permissoes, modulo, "ler");
}
