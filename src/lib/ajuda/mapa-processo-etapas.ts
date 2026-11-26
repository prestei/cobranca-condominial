import type { ModuloPermissao } from "@/lib/permissions/modulos";

export type IconeMapaProcesso =
  | "building"
  | "fileUp"
  | "wallet"
  | "door"
  | "users"
  | "clipboard"
  | "calendar"
  | "layout"
  | "handshake"
  | "scale"
  | "checkCircle"
  | "barChart"
  | "shield"
  | "scroll"
  | "bell"
  | "cloud"
  | "headset";

export type EtapaFluxoPrincipal = {
  id: string;
  ordem: number;
  titulo: string;
  resumo: string;
  detalhe: string;
  icone: IconeMapaProcesso;
  href?: string;
  modulo?: ModuloPermissao;
};

export type RamificacaoProcesso = {
  id: string;
  titulo: string;
  resumo: string;
  icone: IconeMapaProcesso;
  href?: string;
  modulo?: ModuloPermissao;
};

/** Linha principal: da entrada de dados até acompanhamento contínuo. */
export const ETAPAS_FLUXO_PRINCIPAL: readonly EtapaFluxoPrincipal[] = [
  {
    id: "cadastro",
    ordem: 1,
    titulo: "Cadastro da carteira",
    resumo: "Condomínios, unidades e responsáveis",
    detalhe:
      "Base compartilhada por inadimplência e palitagem. Advogado responsável fica no condomínio; unidade nova nasce em Sem cobrança até entrar débito em aberto.",
    icone: "building",
    href: "/condominios",
    modulo: "condominios",
  },
  {
    id: "entrada",
    ordem: 2,
    titulo: "Entrada de dados",
    resumo: "Importação ou cadastro manual",
    detalhe:
      "Planilha/PDF passa por prévia, conferência e aprovação. Também é possível lançar débito manual em Inadimplência. Nada grava sem confirmar.",
    icone: "fileUp",
    href: "/importacoes",
    modulo: "importacoes",
  },
  {
    id: "debitos",
    ordem: 3,
    titulo: "Débitos persistidos",
    resumo: "Valores e situação financeira",
    detalhe:
      "Indicadores deduplicam pelo identificador externo. O sistema não inventa juros: usa o que veio da origem ou o que foi corrigido manualmente (com auditoria).",
    icone: "wallet",
    href: "/debitos",
    modulo: "debitos",
  },
  {
    id: "cobranca",
    ordem: 4,
    titulo: "Unidade em cobrança",
    resumo: "Entrada automática na fila",
    detalhe:
      "Ao confirmar importação ou salvar débito Pendente/Vencido, unidade em Sem cobrança ou Quitada vira Em cobrança (exceto unidade prescrita).",
    icone: "door",
    href: "/unidades",
    modulo: "unidades",
  },
  {
    id: "distribuicao",
    ordem: 5,
    titulo: "Carteira por RE",
    resumo: "Distribuição ao atendente",
    detalhe:
      "Administradora atribui ou aciona distribuição automática. Cada mudança gera novo vínculo vigente; palitagens antigas mantêm o autor original.",
    icone: "users",
    href: "/atendimentos",
    modulo: "atendimentos",
  },
  {
    id: "atendimento",
    ordem: 6,
    titulo: "Fila e palitagem",
    resumo: "Cada contato é um registro",
    detalhe:
      "Atendente registra tentativa na carteira vigente. WhatsApp, telefone e e-mail; resposta, motivo e próximo retorno. Um ticket por tentativa — sem apagar histórico.",
    icone: "clipboard",
    href: "/atendimentos",
    modulo: "atendimentos",
  },
  {
    id: "retornos",
    ordem: 7,
    titulo: "Retornos e agenda",
    resumo: "Compromissos e conclusão",
    detalhe:
      "Retornos aparecem na fila e em Minha agenda. Concluir retorno não apaga o agendamento original; notificações lembram prazos e carteira.",
    icone: "calendar",
    href: "/minha-agenda",
    modulo: "atendimentos",
  },
  {
    id: "acompanhamento",
    ordem: 8,
    titulo: "Painel e relatórios",
    resumo: "Métricas e exportação",
    detalhe:
      "Início, relatórios e busca respeitam perfil e escopo. Produtividade conta quem registrou a ação, não só quem está com a carteira hoje.",
    icone: "barChart",
    href: "/relatorios",
    modulo: "relatorios",
  },
] as const;

export const RAMIFICACOES_DURANTE_COBRANCA: readonly RamificacaoProcesso[] = [
  {
    id: "negociacao",
    titulo: "Negociação",
    resumo: "Proposta e acordo — não é pagamento recebido",
    icone: "handshake",
    href: "/negociacoes",
    modulo: "negociacoes",
  },
  {
    id: "juridico",
    titulo: "Jurídico",
    resumo: "Atendente solicita; administrador aprova o envio ao advogado",
    icone: "scale",
    href: "/juridico",
    modulo: "juridico",
  },
  {
    id: "quitacao",
    titulo: "Quitação",
    resumo: "Unidade sai da fila; histórico permanece",
    icone: "checkCircle",
    href: "/debitos",
    modulo: "debitos",
  },
] as const;

export const TEXTO_PRINCIPIO_SISTEMA =
  "Palitagem e inadimplência são um sistema só: condomínio, unidade, débito e colaborador são os mesmos dados do início ao fim.";