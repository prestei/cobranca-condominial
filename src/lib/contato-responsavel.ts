import { Cadastros } from "@/data/catalogo";
import { digitosTelefone } from "@/lib/telefone";

export type ContatoResponsavelUnidade = {
  responsavelId: number | null;
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
};

export type CanalAtalhoContato = "WhatsApp" | "E-mail" | "Telefone";

/** Responsável principal da unidade (ou o primeiro vínculo). */
export function contatoResponsavelDaUnidade(
  cadastros: Pick<Cadastros, "vinculos" | "responsaveis">,
  unidadeId: number,
): ContatoResponsavelUnidade {
  const vinculos = cadastros.vinculos.filter((item) => item.unidadeId === unidadeId);
  const principal = vinculos.find((item) => item.principal) ?? vinculos[0];
  if (!principal) {
    return { responsavelId: null, nome: "", telefone: "", whatsapp: "", email: "" };
  }
  const responsavel = cadastros.responsaveis.find((item) => item.id === principal.responsavelId);
  return {
    responsavelId: principal.responsavelId,
    nome: responsavel?.nome?.trim() ?? "",
    telefone: responsavel?.telefone?.trim() ?? "",
    whatsapp: responsavel?.whatsapp?.trim() ?? "",
    email: responsavel?.email?.trim() ?? "",
  };
}

function digitosInternacionaisBr(valor: string) {
  const digitos = digitosTelefone(valor);
  if (digitos.length < 10) return "";
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

export function hrefWhatsApp(whatsappOuTelefone: string, mensagem?: string) {
  const internacional = digitosInternacionaisBr(whatsappOuTelefone);
  if (!internacional) return null;
  const base = `https://wa.me/${internacional}`;
  const texto = mensagem?.trim();
  if (!texto) return base;
  return `${base}?text=${encodeURIComponent(texto)}`;
}

export function hrefMailto(email: string, assunto?: string, corpo?: string) {
  const destino = email.trim();
  if (!destino.includes("@")) return null;
  const params = new URLSearchParams();
  if (assunto?.trim()) params.set("subject", assunto.trim());
  if (corpo?.trim()) params.set("body", corpo.trim());
  const qs = params.toString();
  return qs ? `mailto:${destino}?${qs}` : `mailto:${destino}`;
}

export function hrefTelefone(telefone: string) {
  const internacional = digitosInternacionaisBr(telefone);
  if (!internacional) return null;
  return `tel:+${internacional}`;
}

export function numeroWhatsAppPreferido(contato: ContatoResponsavelUnidade) {
  return contato.whatsapp || contato.telefone;
}

export function mensagemCobrancaWhatsApp(params: {
  nomeTitular: string;
  condominio: string;
  unidade: string;
}) {
  const saudacao = params.nomeTitular
    ? `Olá, ${params.nomeTitular.split(" ")[0]}!`
    : "Olá!";
  return `${saudacao} Sou da equipe de cobrança referente à unidade ${params.unidade} do ${params.condominio}. Podemos conversar sobre o débito em aberto?`;
}
