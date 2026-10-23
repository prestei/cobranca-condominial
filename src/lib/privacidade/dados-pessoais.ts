import { temPermissao } from "@/lib/permissions/check";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import type { Responsavel } from "@/lib/catalog";

/** Contato e documento só para quem opera cobrança ou administra cadastros. */
export function podeVerDadosPessoaisResponsavel(perm: PermissoesCargo): boolean {
  return (
    temPermissao(perm, "unidades", "editar") ||
    temPermissao(perm, "atendimentos", "criar") ||
    temPermissao(perm, "usuarios", "ler")
  );
}

export function mascararCpfCnpj(valor: string): string {
  const digits = valor.replace(/\D/g, "");
  if (digits.length === 0) return "—";
  if (digits.length <= 4) return "••••";
  return `•••.•••.•••-${digits.slice(-2)}`;
}

export function mascararTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "");
  if (digits.length < 4) return valor ? "••••" : "—";
  return `••••-${digits.slice(-4)}`;
}

export function mascararEmail(valor: string): string {
  const trimmed = valor.trim();
  if (!trimmed) return "—";
  const [local, domain] = trimmed.split("@");
  if (!domain) return "•••@•••";
  const visivel = local.length <= 1 ? "•" : `${local[0]}•••`;
  return `${visivel}@${domain}`;
}

export type ResponsavelResposta = Pick<
  Responsavel,
  "id" | "nome" | "tipoPessoa" | "cpfCnpj" | "telefone" | "whatsapp" | "email" | "endereco" | "observacoes"
>;

export function responsavelParaResposta(item: Responsavel, perm: PermissoesCargo): ResponsavelResposta {
  if (podeVerDadosPessoaisResponsavel(perm)) {
    return { ...item };
  }
  return {
    id: item.id,
    nome: item.nome,
    tipoPessoa: item.tipoPessoa,
    cpfCnpj: mascararCpfCnpj(item.cpfCnpj),
    telefone: mascararTelefone(item.telefone),
    whatsapp: mascararTelefone(item.whatsapp),
    email: mascararEmail(item.email),
    endereco: item.endereco ? "Endereço restrito" : "",
    observacoes: item.observacoes ? "—" : "",
  };
}
