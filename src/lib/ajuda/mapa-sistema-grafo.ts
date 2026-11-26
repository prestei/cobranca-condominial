import type { ModuloPermissao } from "@/lib/permissions/modulos";
import type { IconeMapaProcesso } from "@/lib/ajuda/mapa-processo-etapas";

export type NoMapaSistema = {
  id: string;
  titulo: string;
  icone: IconeMapaProcesso;
  href?: string;
  modulo?: ModuloPermissao;
  hub?: boolean;
  /** Só texto — sem rota (ex.: integração externa). */
  informativo?: boolean;
};

export type BlocoMapaSistema = {
  id: string;
  ordem: number;
  titulo: string;
  subtitulo: string;
  /** Nós na ordem de leitura; setas entre eles. */
  nos: readonly NoMapaSistema[];
  /** Linha extra abaixo do fluxo principal do bloco (ex.: ramificações). */
  ramificacoes?: readonly NoMapaSistema[];
};

/** Faixa compacta no topo — não faz parte da linha do tempo numérica. */
export const MAPA_GOVERNANCA: readonly NoMapaSistema[] = [
  { id: "cargos", titulo: "Cargos", icone: "shield", href: "/cargos", modulo: "cargos" },
  { id: "usuarios", titulo: "Colaboradores", icone: "users", href: "/usuarios", modulo: "usuarios" },
  { id: "auditoria", titulo: "Auditoria", icone: "scroll", href: "/auditoria", modulo: "auditoria" },
] as const;

export const MAPA_BLOCOS_FLUXO: readonly BlocoMapaSistema[] = [
  {
    id: "cadastro",
    ordem: 1,
    titulo: "Cadastro",
    subtitulo: "Base compartilhada de condomínios e unidades",
    nos: [
      { id: "condominios", titulo: "Condomínios", icone: "building", href: "/condominios", modulo: "condominios" },
      { id: "unidades", titulo: "Unidades", icone: "door", href: "/unidades", modulo: "unidades" },
    ],
  },
  {
    id: "dados",
    ordem: 2,
    titulo: "Entrada de dados",
    subtitulo: "Importação, planilha ou lançamento manual",
    nos: [
      { id: "integracao", titulo: "Superlógica", icone: "cloud", informativo: true },
      { id: "importacoes", titulo: "Importações", icone: "fileUp", href: "/importacoes", modulo: "importacoes" },
      { id: "debitos", titulo: "Inadimplência", icone: "wallet", href: "/debitos", modulo: "debitos" },
    ],
  },
  {
    id: "operacao",
    ordem: 3,
    titulo: "Cobrança",
    subtitulo: "Carteira por RE, fila e retornos",
    nos: [
      { id: "distribuicao", titulo: "Distribuição", icone: "users", href: "/atendimentos", modulo: "atendimentos" },
      {
        id: "atendimentos",
        titulo: "Fila e palitagem",
        icone: "clipboard",
        href: "/atendimentos",
        modulo: "atendimentos",
        hub: true,
      },
      { id: "agenda", titulo: "Agenda", icone: "calendar", href: "/minha-agenda", modulo: "atendimentos" },
      { id: "notificacoes", titulo: "Alertas", icone: "bell", href: "/notificacoes", modulo: "dashboard" },
    ],
  },
  {
    id: "desfechos",
    ordem: 4,
    titulo: "A partir da fila",
    subtitulo: "Unidade permanece na fila; histórico preservado",
    nos: [],
    ramificacoes: [
      { id: "negociacoes", titulo: "Negociação", icone: "handshake", href: "/negociacoes", modulo: "negociacoes" },
      { id: "juridico", titulo: "Jurídico", icone: "scale", href: "/juridico", modulo: "juridico" },
      { id: "quitacao", titulo: "Quitação", icone: "checkCircle", href: "/debitos", modulo: "debitos" },
    ],
  },
  {
    id: "analise",
    ordem: 5,
    titulo: "Acompanhamento",
    subtitulo: "Indicadores e exportação",
    nos: [
      { id: "dashboard", titulo: "Início", icone: "layout", href: "/", modulo: "dashboard" },
      { id: "relatorios", titulo: "Relatórios", icone: "barChart", href: "/relatorios", modulo: "relatorios" },
    ],
  },
] as const;