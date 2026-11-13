import {
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileUp,
  Handshake,
  LayoutDashboard,
  Scale,
  ScrollText,
  Shield,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

export type PassoGuia = {
  titulo: string;
  descricao: string;
};

export type GuiaManual = {
  id: string;
  titulo: string;
  resumo: string;
  href: string;
  icon: LucideIcon;
  modulo: ModuloPermissao;
  palavrasChave: string[];
  perfis?: Array<"administradora" | "atendente" | "advogado">;
  objetivo: string;
  /** Regras de negócio em linguagem simples — foco do manual. */
  regras: string[];
  /** Passos curtos e opcionais; só o essencial para começar a trabalhar na tela. */
  passos?: PassoGuia[];
  dicas?: string[];
};

export const GUIAS_MANUAL: GuiaManual[] = [
  {
    id: "inicio",
    titulo: "Início",
    resumo: "O que vale saber sobre os números e atalhos da página inicial.",
    href: "/",
    icon: LayoutDashboard,
    modulo: "dashboard",
    palavrasChave: ["dashboard", "painel", "início", "home", "resumo"],
    objetivo:
      "Ver um resumo do dia ou da carteira antes de ir para atendimentos, débitos ou relatórios — não é onde se registra contato.",
    regras: [
      "Cada perfil vê um recorte diferente: administradora a carteira ampla, atendente o foco do dia, advogado os condomínios sob sua responsabilidade.",
      "Os números no topo refletem só o que seu cargo pode consultar; se algo não aparecer no menu, normalmente é falta de permissão.",
      "Card com link leva para outra tela já com o filtro adequado — o valor do card não muda só porque você filtrou outra lista.",
      "O painel não substitui a fila de atendimentos nem a lista de débitos: é orientação, não operação.",
      "Notificações no sino são complemento: retornos e unidades novas na sua carteira.",
    ],
    passos: [
      {
        titulo: "Confira os números do topo",
        descricao: "Se algo chamar atenção, abra a tela indicada pelo card ou pelo menu lateral.",
      },
      {
        titulo: "Atendente: priorize agenda e retornos",
        descricao: "Antes de puxar caso novo, veja compromissos do dia e alertas no sino.",
      },
    ],
    dicas: ["Número zerado pode ser carteira vazia ou módulo que seu cargo não enxerga — confira com a administradora."],
  },
  {
    id: "atendimentos",
    titulo: "Atendimentos",
    resumo: "Regras da fila de cobrança, do registro de contato e da distribuição de unidades.",
    href: "/atendimentos",
    icon: ClipboardList,
    modulo: "atendimentos",
    palavrasChave: ["fila", "contato", "palitagem", "retorno", "distribuição", "cobrança"],
    objetivo:
      "Registrar cada tentativa de cobrança da unidade e acompanhar retornos — o histórico da unidade nasce aqui.",
    regras: [
      "Cada contato registrado vira um registro novo; o sistema não apaga nem sobrescreve tentativas anteriores.",
      "Quem está logado é sempre o autor do registro — não é permitido registrar em nome de outro colega.",
      "Só entra na fila unidade em cobrança, em acordo, notificada ou ajuizada; quitada, inativa ou prescrita ficam de fora.",
      "O valor em aberto exibido vem dos débitos cadastrados daquela unidade.",
      "A unidade fica na carteira de um atendente (código RE); redistribuir muda o responsável atual, mas não altera quem registrou contatos antigos.",
      "Distribuir várias unidades de uma vez: se uma falhar, nenhuma daquele lote é atribuída.",
      "Data de retorno combinada com o devedor deve ser concluída após o contato — senão a agenda e os indicadores ficam desatualizados.",
      "Proposta de negociação e encaminhamento jurídico são ações da unidade; negócio de acordo e pagamento ficam em Negociações.",
    ],
    passos: [
      {
        titulo: "Escolha a unidade na fila",
        descricao: "Use os filtros de período, sem retorno ou atrasados para focar no que é urgente.",
      },
      {
        titulo: "Registre o contato",
        descricao: "Informe canal, se houve resposta, motivo e próximo passo. Cada envio gera histórico na linha do tempo.",
      },
    ],
    dicas: [
      "Administradora enxerga a carteira da equipe e pode distribuir unidades; atendente vê só a própria carteira.",
    ],
  },
  {
    id: "agenda",
    titulo: "Minha agenda",
    resumo: "Como retornos e contatos aparecem no calendário do atendente.",
    href: "/minha-agenda",
    icon: CalendarClock,
    modulo: "atendimentos",
    palavrasChave: ["calendário", "retorno", "compromisso", "mês"],
    perfis: ["atendente"],
    objetivo: "Organizar o mês: o que já foi feito e o que ainda depende de retorno ao devedor.",
    regras: [
      "Mostra contatos que você registrou e retornos que ainda estão pendentes ou já foram concluídos.",
      "Compromisso agendado em outra tela aparece aqui e também na fila de atendimentos na data combinada.",
      "Retorno vencido precisa ser tratado na fila — a agenda só avisa, não encerra sozinha.",
      "Datas seguem o fuso de São Paulo, alinhado às notificações do sistema.",
    ],
    passos: [
      { titulo: "Navegue pelo mês", descricao: "Dias com movimento ficam destacados; clique no dia para ver a lista." },
      {
        titulo: "Abra a unidade pelo compromisso",
        descricao: "O atalho leva à fila com a unidade selecionada para registrar o contato.",
      },
    ],
    dicas: ["Combine com o filtro Atrasados em Atendimentos para não perder retorno vencido."],
  },
  {
    id: "inadimplencia",
    titulo: "Inadimplência",
    resumo: "Como débitos entram, como os valores são tratados e quando a unidade sai da cobrança.",
    href: "/debitos",
    icon: Wallet,
    modulo: "debitos",
    palavrasChave: ["débito", "valor", "vencido", "importar", "quitação"],
    objetivo: "Consultar o que a unidade deve, de onde veio o valor e quando atualizar por planilha ou correção.",
    regras: [
      "Os valores mostrados são os que estão gravados — o sistema não calcula juros, multa ou correção por conta própria.",
      "Cada condomínio tem um prazo de acompanhamento da inadimplência (padrão 60 dias); isso orienta alertas, não muda o vencimento do boleto.",
      "Atualizar a carteira pelo arquivo da administradora (importação) é o caminho preferido; correção manual fica registrada para auditoria.",
      "Débito é a base do atendimento de cobrança: o que aparece aqui alimenta a fila e os relatórios.",
      "Confirmar quitação da unidade tira ela da fila ativa, mas mantém histórico de débitos e contatos.",
      "Cadastrar débito à mão só quando o escritório autoriza; quem pode criar ou editar depende do cargo.",
    ],
    passos: [
      { titulo: "Confira totais e filtros", descricao: "Por condomínio agrupa em blocos; visão geral é uma lista única com busca." },
      { titulo: "Atualize por importação", descricao: "Use Importar quando chegar planilha da administradora; revise a prévia antes de aprovar." },
    ],
    dicas: ["Mesma regra de valores vale para relatórios de carteira — números devem bater com esta tela."],
  },
  {
    id: "negociacoes",
    titulo: "Negociações",
    resumo: "Proposta, acordo, parcelas e pagamentos — o que conta como dinheiro recebido.",
    href: "/negociacoes",
    icon: Handshake,
    modulo: "negociacoes",
    palavrasChave: ["proposta", "acordo", "parcela", "desconto", "pagamento"],
    objetivo: "Registrar proposta com o devedor, confirmar acordo e acompanhar se as parcelas estão sendo pagas.",
    regras: [
      "Proposta aceita pelo escritório não significa que o dinheiro já entrou — só registra o combinado.",
      "Proposta ligada à unidade e aos débitos dela; estados possíveis: em análise, aceita, recusada ou cancelada.",
      "Advogado responsável do condomínio pode ter limite de desconto e de número de parcelas; administradora pode ultrapassar esses limites.",
      "Só depois de aceita entram parcelas previstas e registros de pagamento.",
      "Pagamento informado é anotação; só pagamento confirmado conta para quitar parcela e reduzir saldo do acordo.",
      "Parcela vencida sem pagamento confirmado gera alerta de possível descumprimento — ainda não é regra automática de ‘acordo quebrado’.",
      "Saldo do acordo não baixa automaticamente o débito na tela de inadimplência; são controles paralelos até o escritório definir política única.",
      "Correção em parcela ou pagamento fica registrada em auditoria.",
    ],
    passos: [
      {
        titulo: "Crie a proposta na unidade ou aqui",
        descricao: "Informe valores, desconto e parcelas; aguarde análise ou confirme se for sua alçada.",
      },
      {
        titulo: "Acompanhe o acordo aceito",
        descricao: "Cadastre parcelas e, conforme o devedor paga, registre como informado ou confirmado.",
      },
    ],
    dicas: ["Também é possível abrir proposta pelo painel da unidade em Atendimentos."],
  },
  {
    id: "juridico",
    titulo: "Jurídico",
    resumo: "Encaminhamento para análise jurídica — sem automação de tribunal.",
    href: "/juridico",
    icon: Scale,
    modulo: "juridico",
    palavrasChave: ["encaminhamento", "advogado", "processo", "documento"],
    perfis: ["administradora", "advogado"],
    objetivo: "Acompanhar casos que saíram da cobrança extrajudicial para o jurídico do escritório.",
    regras: [
      "O sistema não envia petição nem protocolo a tribunal — só organiza andamento interno.",
      "Encaminhamento nasce na unidade em cobrança; o advogado sugerido vem do cadastro do condomínio.",
      "Advogado só enxerga condomínios em que está vinculado no cadastro.",
      "Atendente de cobrança não acessa este módulo; encaminhar é papel da gestão ou fluxo autorizado.",
      "Mudanças de status e observações ficam visíveis para quem tem permissão; eventos também aparecem no histórico da unidade.",
    ],
    passos: [
      { titulo: "Localize o encaminhamento", descricao: "Por advogado agrupa responsáveis; visão geral lista todos." },
      { titulo: "Atualize andamento", descricao: "Registre situação e documentos conforme a equipe jurídica combinar." },
    ],
    dicas: ["Sem vínculo no condomínio, o advogado não vê dados daquele empreendimento em nenhuma tela."],
  },
  {
    id: "condominios",
    titulo: "Condomínios",
    resumo: "Cadastro da carteira que amarra unidades, débitos, cobrança e jurídico.",
    href: "/condominios",
    icon: Building2,
    modulo: "condominios",
    palavrasChave: ["cadastro", "empreendimento", "administradora", "prazo"],
    perfis: ["administradora", "advogado"],
    objetivo: "Manter dados corretos de cada empreendimento atendido pelo escritório.",
    regras: [
      "Todo débito, unidade e atendimento pertence a um condomínio cadastrado.",
      "Prazo de acompanhamento da inadimplência é configurado por condomínio (padrão 60 dias) e vale para alertas na carteira.",
      "Advogados vinculados definem quem enxerga o condomínio no perfil jurídico.",
      "Inativar condomínio preserva histórico; não apaga cobranças nem débitos passados.",
      "Não é permitido excluir condomínio que ainda tenha unidades ou histórico de cobrança.",
      "Identificador único evita duplicar o mesmo empreendimento em importações.",
    ],
    passos: [
      { titulo: "Localize ou cadastre", descricao: "Busque por nome ou cidade; cadastro e edição abrem no painel lateral." },
      { titulo: "Confira advogados e prazo", descricao: "Ajustes aqui impactam jurídico e alertas de inadimplência." },
    ],
    dicas: ["Importação em massa de condomínios exige permissão no módulo Importações."],
  },
  {
    id: "unidades",
    titulo: "Unidades",
    resumo: "Situação de cobrança, responsáveis e vínculo com débitos.",
    href: "/unidades",
    icon: DoorOpen,
    modulo: "unidades",
    palavrasChave: ["apartamento", "responsável", "cobrança", "prescrita", "quitada"],
    perfis: ["administradora", "advogado"],
    objetivo: "Saber se a unidade está na fila, quem é o contato principal e qual o saldo em aberto.",
    regras: [
      "Situação da unidade define se ela entra na fila de atendimentos (em cobrança, acordo, etc.) ou fica fora (quitada, sem cobrança, prescrita).",
      "Unidade nova começa sem cobrança até importação de débito ou mudança manual autorizada.",
      "Responsável principal é o contato usado nos atalhos de WhatsApp e e-mail na operação.",
      "Prescrita sai da fila ativa, mas débitos e histórico continuam consultáveis.",
      "Dados sensíveis do responsável podem aparecer mascarados para quem só consulta.",
      "Em dia na coluna de débito significa sem pendência registrada — não apaga histórico.",
    ],
    passos: [
      { titulo: "Abra o detalhe da unidade", descricao: "Veja responsáveis, débitos e atalhos para contato ou negociação." },
      { titulo: "Ajuste situação com critério", descricao: "Mudar para quitada ou prescrita tira da fila; confirme com a administradora se tiver dúvida." },
    ],
    dicas: ["Histórico completo da unidade também aparece em Atendimentos na linha do tempo."],
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    resumo: "Extração para reunião e conferência — mesmas regras das telas do dia a dia.",
    href: "/relatorios",
    icon: FileBarChart,
    modulo: "relatorios",
    palavrasChave: ["exportar", "produtividade", "carteira", "período"],
    perfis: ["administradora", "advogado"],
    objetivo: "Medir produtividade, retornos e carteira em um período e gerar arquivo para arquivo ou assembleia.",
    regras: [
      "Números seguem a mesma lógica das telas operacionais — não há ‘segundo cálculo’ escondido.",
      "Filtros respeitam o escopo do cargo: advogado vê condomínios dele; atendente costuma não ter este módulo.",
      "Exportar planilha ou PDF pode exigir permissão específica no cargo.",
      "Valores de inadimplência no relatório de carteira obedecem aos débitos gravados, como na tela de Inadimplência.",
      "Administradora pode comparar atendentes por código RE; demais perfis veem só recortes permitidos.",
    ],
    passos: [
      { titulo: "Escolha o relatório", descricao: "Produtividade, retornos, efetividade ou carteira — cada um responde uma pergunta diferente." },
      { titulo: "Defina período e filtros", descricao: "Depois exporte se precisar compartilhar fora do sistema." },
    ],
  },
  {
    id: "importacoes",
    titulo: "Importações",
    resumo: "Planilha da administradora só vira dado real depois da aprovação.",
    href: "/importacoes",
    icon: FileUp,
    modulo: "importacoes",
    palavrasChave: ["planilha", "prévia", "aprovar", "upload"],
    objetivo: "Atualizar débitos e cadastros em lote com revisão antes de gravar.",
    regras: [
      "Nada entra definitivo no sistema até alguém aprovar a prévia — erros devem ser corrigidos antes.",
      "Cada tipo (débitos, condomínios, unidades, responsáveis) tem colunas obrigatórias; linha inválida não entra.",
      "Débitos aprovados podem colocar a unidade em cobrança automaticamente, conforme regras do escritório.",
      "Fica registrado quem enviou e quem aprovou, para consulta em auditoria.",
      "Com distribuição automática ativa, unidades novas podem ganhar atendente (RE) sem passo manual.",
      "Excluir histórico de importação é restrito — em dúvida, converse com a administradora.",
    ],
    passos: [
      { titulo: "Envie e revise a prévia", descricao: "Leia os erros linha a linha antes de aprovar." },
      { titulo: "Aprove só quando estiver certo", descricao: "Em lotes grandes, não feche o navegador até terminar." },
    ],
    dicas: ["Atalho Importar nas telas de Inadimplência e cadastros abre o fluxo certo."],
  },
  {
    id: "colaboradores",
    titulo: "Colaboradores",
    resumo: "Quem acessa o sistema, com qual cargo e qual código na fila.",
    href: "/usuarios",
    icon: UserRound,
    modulo: "usuarios",
    palavrasChave: ["usuário", "login", "senha", "re", "ativo"],
    perfis: ["administradora"],
    objetivo: "Gerir contas da equipe e o código RE usado na fila e nos relatórios.",
    regras: [
      "Cada pessoa entra com código e senha próprios — contas não devem ser compartilhadas.",
      "Inativar colaborador bloqueia login na hora.",
      "Cargo define o que a pessoa vê e pode fazer; mudança de cargo exige novo login para valer no navegador.",
      "Código RE identifica o atendente na fila e nos relatórios, no formato combinado pelo escritório.",
      "Advogado pode ter condomínios vinculados no cadastro — isso limita o que ele enxerga.",
      "Atendimento registrado na sessão fica sempre ligado ao colaborador logado.",
    ],
    passos: [
      { titulo: "Cadastre ou edite no painel", descricao: "Defina cargo, contatos e vínculos de advogado quando couber." },
      { titulo: "Oriente o primeiro acesso", descricao: "Senha inicial é definida pela administradora; troca segue política interna." },
    ],
    dicas: ["Prefira ajustar cargo a criar usuário genérico compartilhado."],
  },
  {
    id: "cargos",
    titulo: "Cargos",
    resumo: "O que cada perfil pode ver, criar, editar e exportar.",
    href: "/cargos",
    icon: Shield,
    modulo: "cargos",
    palavrasChave: ["permissão", "perfil", "atendente", "advogado"],
    perfis: ["administradora"],
    objetivo: "Alinhar acesso ao sistema às funções do escritório sem depender de suporte técnico.",
    regras: [
      "Quem não pode ver um módulo não deve receber orientação para usá-lo — a matriz aqui é a referência.",
      "Ver é pré-requisito para criar, editar ou excluir naquele módulo.",
      "Liberar criar ou editar em Importações permite mudar a carteira inteira — conceda com critério.",
      "Perfis padrão (administradora, atendente, advogado) vêm com conjunto inicial; ajustes devem refletir o combinado com o cliente.",
      "Auditoria de leitura costuma ficar só com a gestão.",
    ],
    passos: [
      { titulo: "Escolha o cargo", descricao: "Veja quantas pessoas usam aquele perfil antes de mudar." },
      { titulo: "Salve e avise a equipe", descricao: "Quem já está logado pode precisar atualizar a página." },
    ],
    dicas: ["Texto de ajuda em cada linha da matriz resume o risco de marcar demais."],
  },
  {
    id: "auditoria",
    titulo: "Auditoria",
    resumo: "Rastreio de quem alterou cadastros sensíveis.",
    href: "/auditoria",
    icon: ScrollText,
    modulo: "auditoria",
    palavrasChave: ["alteração", "histórico", "quem", "quando"],
    perfis: ["administradora"],
    objetivo: "Investigar correção manual, importação ou mudança que precise explicação.",
    regras: [
      "Registra inclusão, alteração e exclusão feitas pelos colaboradores no sistema.",
      "Correção manual de débito deve sempre gerar registro aqui.",
      "Mostra autor da ação naquele momento — não aceita ‘em nome de’ na tela.",
      "Não substitui backup nem arquivo oficial de longo prazo; use exportações dos módulos quando precisar guardar histórico.",
      "Detalhe técnico existe para suporte; o resumo em linguagem clara vem primeiro.",
    ],
    passos: [
      { titulo: "Filtre por tipo ou período", descricao: "Reduza o volume até achar o evento que procura." },
      { titulo: "Abra o detalhe", descricao: "Confira valor anterior e novo quando for alteração financeira." },
    ],
    dicas: ["Ausência de evento após correção manual deve ser reportada à gestão."],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    resumo: "Alertas de retorno e de unidade na sua carteira.",
    href: "/notificacoes",
    icon: Bell,
    modulo: "dashboard",
    palavrasChave: ["sino", "alerta", "retorno", "distribuição"],
    objetivo: "Não perder retorno combinado nem ignorar unidade recém-atribuída.",
    regras: [
      "Só avisa dentro do sistema — e-mail e SMS externos ainda não fazem parte do fluxo padrão.",
      "Tipos principais: retorno na data, lembrete no dia e unidade atribuída ou redistribuída na sua carteira.",
      "O mesmo evento não deve gerar alerta duplicado.",
      "Ao abrir o alerta, o sistema leva ao contexto (fila ou unidade) se você ainda tiver permissão.",
      "Marcar como lida não substitui registrar o contato na fila.",
    ],
    passos: [
      { titulo: "Use o sino no topo", descricao: "Veja quantas não lidas há e abra a lista completa se precisar." },
      { titulo: "Clique no alerta urgente", descricao: "Priorize retorno do dia antes de marcar tudo como lido." },
    ],
  },
  {
    id: "conta",
    titulo: "Minha conta",
    resumo: "Identidade da sessão e limites do que você pode mudar sozinho.",
    href: "/conta",
    icon: UserRound,
    modulo: "dashboard",
    palavrasChave: ["sessão", "perfil", "senha", "cargo"],
    objetivo: "Confirmar com qual usuário você opera e onde pedir correção de acesso.",
    regras: [
      "Nome, e-mail, telefone e foto você atualiza aqui; cargo, permissões e código RE só a administradora altera em Colaboradores.",
      "Lista resumida de permissões vem do cargo — útil para entender tela que sumiu do menu.",
      "Sair encerra o acesso neste navegador; não deixe sessão aberta em computador compartilhado.",
      "Acesso errado ou dados desatualizados: fale com a administradora do escritório.",
      "Autoria de qualquer ação na operação segue o usuário logado nesta conta.",
    ],
    passos: [
      { titulo: "Confira cargo e RE", descricao: "Se não bater com sua função, peça ajuste antes de operar." },
      { titulo: "Atualize seus contatos", descricao: "Mantém a equipe alinhada para retorno e comunicação interna." },
    ],
    dicas: ["Link para Ajuda traz as regras por tela quando surgir dúvida de processo."],
  },
];

export function guiaPorId(id: string): GuiaManual | undefined {
  return GUIAS_MANUAL.find((item) => item.id === id);
}

export function guiasAjudaVisiveis(
  pode: (modulo: ModuloPermissao, acao: "ler") => boolean,
  perfil: "administradora" | "atendente" | "advogado",
): GuiaManual[] {
  return GUIAS_MANUAL.filter((item) => {
    if (!pode(item.modulo, "ler")) return false;
    if (item.perfis && !item.perfis.includes(perfil)) return false;
    return true;
  });
}
