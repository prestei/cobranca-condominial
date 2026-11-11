/** Marca cadastros criados só na prévia de inadimplência (antes da confirmação). */
export const OBSERVACAO_CONDOMINIO_PROVISIONADO =
  "Cadastro criado automaticamente na importação de inadimplência.";

export const OBSERVACAO_RESPONSAVEL_PROVISIONADO =
  "Cadastro criado automaticamente na importação de inadimplência (sem CPF/CNPJ no arquivo).";

export const OBSERVACAO_VINCULO_PROVISIONADO =
  "Vínculo criado automaticamente na importação de inadimplência.";

/** Seed/demo (`seed-base-teste.ts`, homologação) — nunca entra na reversão de prévia. */
export function cadastroDemonstracaoProtegido(item: {
  identificadorExterno?: string;
  observacao?: string;
}): boolean {
  const idExt = (item.identificadorExterno ?? "").trim().toLocaleUpperCase("pt-BR");
  if (idExt.startsWith("TEST-") || idExt.startsWith("GESTAO-")) return true;
  const obs = (item.observacao ?? "").trim();
  if (obs.includes("Base de demonstração") || obs.includes("Base homologação")) return true;
  return false;
}

export function condominioProvisionadoNaPrevia(item: { identificadorExterno: string; observacao: string }): boolean {
  if (cadastroDemonstracaoProtegido(item)) return false;
  const idExt = item.identificadorExterno.trim().toLocaleUpperCase("pt-BR");
  if (idExt.startsWith("IMPORT-")) return true;
  return item.observacao.trim() === OBSERVACAO_CONDOMINIO_PROVISIONADO;
}

export function responsavelProvisionadoNaPrevia(item: { cpfCnpj: string; observacoes: string }): boolean {
  if (cadastroDemonstracaoProtegido({ identificadorExterno: item.cpfCnpj, observacao: item.observacoes })) {
    return false;
  }
  const doc = item.cpfCnpj.trim().toLocaleUpperCase("pt-BR");
  if (doc.startsWith("IMPORT-")) return true;
  return item.observacoes.trim() === OBSERVACAO_RESPONSAVEL_PROVISIONADO;
}
