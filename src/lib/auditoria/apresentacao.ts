import type { Auditoria } from "@/data/catalogo";

export const rotuloTipoRegistro: Record<string, string> = {
  role: "Cargo",
  user: "Colaborador",
  condominium: "Condomínio",
  unit: "Unidade",
  responsible_party: "Responsável",
  unit_responsible_party: "Vínculo com responsável",
  debt: "Débito",
  service_ticket: "Atendimento",
  import: "Importação de planilha",
  negotiation_proposal: "Proposta de acordo",
  agreement_installment: "Parcela do acordo",
  agreement_payment: "Pagamento do acordo",
  collection_assignment: "Distribuição de unidades",
  audit_log: "Histórico",
};

const rotuloCampo: Record<string, string> = {
  status: "situação",
  valor: "valor",
  valor_atualizado: "valor atualizado",
  valor_original: "valor original",
  referencia: "referência",
  descricao: "descrição",
  data_vencimento: "vencimento",
  origem: "origem",
  fonte_valores: "origem dos valores",
  atendente_id: "atendente",
  anterior_atendente_id: "atendente anterior",
  motivo: "motivo",
  nome: "nome",
  email: "e-mail",
  telefone: "telefone",
  situacao: "situação da unidade",
  identificacao: "identificação",
};

export function rotuloAcao(acao: string) {
  if (acao === "INSERT") return "Cadastro novo";
  if (acao === "UPDATE") return "Alteração";
  if (acao === "DELETE") return "Exclusão";
  return acao;
}

export function badgeAcaoVariant(acao: string): "primary" | "secondary" | "error" {
  if (acao === "INSERT") return "primary";
  if (acao === "DELETE") return "error";
  return "secondary";
}

function humanizarCampo(campo: string) {
  const chave = campo.trim().toLowerCase();
  return rotuloCampo[chave] ?? chave.replaceAll("_", " ");
}

export function resumoLinha(item: Auditoria) {
  const onde = rotuloTipoRegistro[item.entidade] ?? "Cadastro";
  if (item.acao === "INSERT") return `Inclusão em ${onde}`;
  if (item.acao === "DELETE") return `Remoção em ${onde}`;
  const campos = item.camposAlterados
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  if (campos.length === 1) return `Mudou ${humanizarCampo(campos[0])} (${onde})`;
  if (campos.length > 1) return `Mudou ${campos.length} dados (${onde})`;
  return `Alteração em ${onde}`;
}

function formatarValorAmigavel(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "string") return valor.trim() || "—";
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";
    return valor.map((parte) => formatarValorAmigavel(parte)).join(", ");
  }
  if (typeof valor === "object") {
    const partes = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([chave, v]) => `${humanizarCampo(chave)}: ${formatarValorAmigavel(v)}`);
    return partes.length > 0 ? partes.join(" · ") : "—";
  }
  return String(valor);
}

export function textoAmigavelDados(raw: string) {
  const texto = raw.trim();
  if (!texto) return "Não havia informação registrada.";
  try {
    const parsed = JSON.parse(texto) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const linhas = Object.entries(parsed as Record<string, unknown>).map(
        ([chave, valor]) => `${humanizarCampo(chave)}: ${formatarValorAmigavel(valor)}`,
      );
      return linhas.length > 0 ? linhas.join("\n") : "Não havia informação registrada.";
    }
    return formatarValorAmigavel(parsed);
  } catch {
    return texto;
  }
}

export function textoTecnicoFormatado(raw: string) {
  const texto = raw.trim();
  if (!texto) return "—";
  try {
    return JSON.stringify(JSON.parse(texto), null, 2);
  } catch {
    return texto;
  }
}

export function listaCamposAlterados(item: Auditoria) {
  const campos = item.camposAlterados
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  if (campos.length === 0) return "—";
  return campos.map((campo) => humanizarCampo(campo)).join(", ");
}
