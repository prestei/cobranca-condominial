/** Mapa lógico — regras reais; layout alinhado ao protótipo visual. */

import type { IconeMapaProcesso } from "@/lib/ajuda/mapa-processo-etapas";

export type ModoMapaLogico =
  | "completo"
  | "inadimplencia"
  | "fila"
  | "atendimento"
  | "negociacao"
  | "juridico";

export const ABAS_MAPA_LOGICO: Array<{ id: ModoMapaLogico; rotulo: string }> = [
  { id: "completo", rotulo: "Fluxo completo" },
  { id: "inadimplencia", rotulo: "Inadimplência" },
  { id: "fila", rotulo: "Fila" },
  { id: "atendimento", rotulo: "Atendimento" },
  { id: "negociacao", rotulo: "Negociação" },
  { id: "juridico", rotulo: "Jurídico" },
];

export type PaletaPrototipo = "neutro" | "laranja" | "roxo" | "teal" | "verde" | "azul";

export type NoPrototipo = {
  id: string;
  titulo: string;
  descricao: string;
  icone: IconeMapaProcesso;
  paleta: PaletaPrototipo;
  foco: readonly ModoMapaLogico[];
};

export const NOS_PROTOTIPO: Record<string, NoPrototipo> = {
  cadastro: {
    id: "cadastro",
    titulo: "Cadastro da carteira",
    descricao: "Condomínios, unidades e responsáveis",
    icone: "building",
    paleta: "neutro",
    foco: ["completo", "inadimplencia"],
  },
  importacao: {
    id: "importacao",
    titulo: "Importação",
    descricao: "Arquivo → prévia, conferência e confirmação (ou lançamento manual)",
    icone: "fileUp",
    paleta: "laranja",
    foco: ["completo", "inadimplencia"],
  },
  unidade: {
    id: "unidade",
    titulo: "Cliente / Unidade",
    descricao: "Débitos confirmados vinculados à unidade",
    icone: "door",
    paleta: "neutro",
    foco: ["completo", "inadimplencia"],
  },
  inadimplencia: {
    id: "inadimplencia",
    titulo: "Inadimplência",
    descricao: "O sistema identifica débitos Pendente ou Vencido",
    icone: "wallet",
    paleta: "laranja",
    foco: ["completo", "inadimplencia"],
  },
  quitacao: {
    id: "quitacao",
    titulo: "Unidade quitada",
    descricao: "Quitada sai da fila; histórico permanece",
    icone: "checkCircle",
    paleta: "verde",
    foco: ["completo", "inadimplencia", "atendimento"],
  },
  fila: {
    id: "fila",
    titulo: "Adicionar na fila",
    descricao: "Unidade em cobrança na carteira do RE",
    icone: "clipboard",
    paleta: "roxo",
    foco: ["completo", "fila"],
  },
  atendimento: {
    id: "atendimento",
    titulo: "Atendimento",
    descricao: "Operador registra cada contato (palitagem)",
    icone: "headset",
    paleta: "teal",
    foco: ["completo", "atendimento", "fila"],
  },
  negociacao: {
    id: "negociacao",
    titulo: "Negociação",
    descricao: "Condições de pagamento e proposta de acordo",
    icone: "handshake",
    paleta: "laranja",
    foco: ["completo", "negociacao", "atendimento"],
  },
  acordo: {
    id: "acordo",
    titulo: "Acordo registrado",
    descricao: "Termos gravados e parcelas (permanece na fila)",
    icone: "checkCircle",
    paleta: "verde",
    foco: ["completo", "negociacao"],
  },
  juridico: {
    id: "juridico",
    titulo: "Encaminhar p/ jurídico",
    descricao: "Atendente solicita; gestão aprova; advogado acompanha",
    icone: "scale",
    paleta: "roxo",
    foco: ["completo", "juridico", "atendimento"],
  },
};

export const LEGENDA_MAPA = [
  { paleta: "verde" as const, rotulo: "Sucesso" },
  { paleta: "laranja" as const, rotulo: "Ação do operador" },
  { paleta: "roxo" as const, rotulo: "Processo especial" },
  { paleta: "azul" as const, rotulo: "Decisão" },
] as const;

export const PAINEL_REGRAS = [
  "Débito em aberto não é o mesmo que estar na fila: a fila exige situação operacional (Em cobrança, Em acordo, Notificada ou Ajuizada) e carteira do RE.",
  "Importação confirmada ou débito manual em aberto promove a unidade para Em cobrança (exceto prescrita).",
  "Quitação formal remove da fila; pagamento de parcela do acordo não baixa débito automaticamente.",
  "Acordo aceito grava termos; Em acordo continua na fila ativa.",
  "Encaminhar jurídico exige permissão criar (padrão: administradora).",
] as const;

export const PAINEL_EXEMPLO =
  "Unidade com três parcelas em aberto → importação confirma → entra na fila do RE → atendente negocia → administradora aceita proposta com termos → cadastram-se parcelas → pagamento Confirmado no acordo → quitação da unidade quando o escritório encerra a cobrança.";

export const PAINEL_EXCECOES = [
  "Prescrita ou Sem cobrança: fora da fila, com débitos só para consulta.",
  "Em acordo entra na fila (diferente de fluxos que excluem o cliente).",
  "Contestação e acordo quebrado: regras finas ainda em DECISOES_PENDENTES.",
];

export const DECISAO_QUITACAO = {
  titulo: "Quitação formal?",
  descricao: "Confirmar quitação na unidade",
};

export const DECISAO_ACORDO = {
  titulo: "Acordo aceito?",
  descricao: "Termos aprovados pela administração",
};