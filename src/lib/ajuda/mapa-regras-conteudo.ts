/** Textos das regras exibidas no mapa visual (ajuda). */

export const DESTAQUE_PRINCIPIO =
  "Inadimplência, fila e atendimento usam a mesma unidade e os mesmos débitos — são recortes diferentes, não cadastros separados.";

export const TRES_CONCEITOS = [
  {
    id: "inadimplencia",
    titulo: "Inadimplência",
    icone: "wallet" as const,
    resumo: "Tem débito Pendente ou Vencido.",
    onde: "Tela Inadimplência e indicadores.",
  },
  {
    id: "fila",
    titulo: "Fila",
    icone: "clipboard" as const,
    resumo: "Cobrança ativa na carteira do RE.",
    onde: "Atendimentos — unidade operável no dia a dia.",
  },
  {
    id: "atendimento",
    titulo: "Atendimento",
    icone: "users" as const,
    resumo: "Um registro por tentativa de contato.",
    onde: "Palitagem — histórico que não se apaga.",
  },
] as const;

export const SITUACOES_FILA = ["Em cobrança", "Em acordo", "Notificada", "Ajuizada"] as const;

export const SITUACOES_FORA_FILA = ["Sem cobrança", "Quitada", "Prescrita", "Inativa"] as const;

export const FLUXO_NEGOCIACAO = [
  { passo: "Nova proposta", efeito: "Em análise · não baixa débito" },
  { passo: "Acordo aceito", efeito: "Termos gravados · parcelas depois" },
  { passo: "Em acordo (opcional)", efeito: "Troca manual na unidade" },
] as const;

export const REGRA_NEGOCIACAO_FILA =
  "Continua na fila: mesmo em acordo, a unidade entra na fila operacional e o atendente pode registrar novos contatos.";

export const PERMISSOES_JURIDICO = [
  { perfil: "Administradora", encaminhar: true, acompanhar: true },
  { perfil: "Atendente", encaminhar: true, acompanhar: false },
  { perfil: "Advogado", encaminhar: false, acompanhar: true },
] as const;

export const NOTA_JURIDICO =
  "Atendente solicita encaminhamento; administradora aprova ou rejeita. Após aprovação, o advogado acompanha. Não remove da fila — palitagem, propostas e auditoria permanecem consultáveis.";