import {
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileUp,
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

export type ElementoTelaGuia = {
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
  passos: PassoGuia[];
  elementos: ElementoTelaGuia[];
  dicas: string[];
};

export const GUIAS_MANUAL: GuiaManual[] = [
  {
    id: "inicio",
    titulo: "Início",
    resumo: "Painel inicial com visão da carteira, pendências e atalhos conforme o seu perfil.",
    href: "/",
    icon: LayoutDashboard,
    modulo: "dashboard",
    palavrasChave: ["dashboard", "painel", "kpi", "métrica", "início", "home"],
    objetivo:
      "Dar uma visão rápida do dia: o que está na fila, quanto está em aberto e para onde ir em seguida — sem substituir as telas operacionais.",
    passos: [
      {
        titulo: "Abra o Início pelo menu lateral",
        descricao:
          "O conteúdo muda automaticamente: administradora vê carteira ampla; atendente vê o comando do dia; advogado vê condomínios e resumo jurídico no escopo.",
      },
      {
        titulo: "Leia os indicadores no topo",
        descricao:
          "Cada card resume um recorte (pendências, fila, inadimplência ou retornos). Clique quando o card tiver link — você será levado à tela correspondente com filtros coerentes.",
      },
      {
        titulo: "Use os atalhos e listas do painel",
        descricao:
          "No perfil atendente, a home traz próximos compromissos e ações rápidas (agenda, fila, registrar contato). Detalhes completos ficam em Atendimentos e Inadimplência.",
      },
    ],
    elementos: [
      { titulo: "Cards de métricas", descricao: "Números persistidos no servidor, filtrados pelo seu escopo e permissões." },
      { titulo: "Gráficos e tabelas", descricao: "No perfil administradora/advogado; atendente concentra gráficos em outras rotas." },
      { titulo: "Sino de notificações", descricao: "No topo da página — complementa o painel com alertas de retorno e distribuição." },
    ],
    dicas: [
      "Se um número parecer zerado, confira se seu cargo tem permissão de leitura no módulo relacionado.",
      "Atendentes: priorize a agenda e o sino antes de iniciar contatos novos na fila.",
    ],
  },
  {
    id: "atendimentos",
    titulo: "Atendimentos",
    resumo: "Fila da carteira, registro de contatos (palitagem), retornos e linha do tempo da unidade.",
    href: "/atendimentos",
    icon: ClipboardList,
    modulo: "atendimentos",
    palavrasChave: ["fila", "contato", "palitagem", "retorno", "whatsapp", "distribuição"],
    objetivo:
      "Concentrar a operação de cobrança: escolher a unidade na fila, entender o histórico e registrar cada tentativa de contato.",
    passos: [
      {
        titulo: "Filtre a fila",
        descricao:
          "Use Período (hoje, intervalo personalizado), Sem retorno e Atrasados para focar no que importa agora. A URL pode guardar atalhos como ?retorno=hoje.",
      },
      {
        titulo: "Selecione uma unidade",
        descricao:
          "O painel à direita (ou tela cheia no celular) mostra cabeçalho com contatos, linha do tempo de eventos e botões de ação no rodapé.",
      },
      {
        titulo: "Registre o contato",
        descricao:
          "Registrar contato abre o formulário de palitagem: canais, se houve resposta, motivo, observações e próxima ação. Cada envio gera um novo registro — nada é sobrescrito.",
      },
      {
        titulo: "Conclua retornos em aberto",
        descricao:
          "Quando houver data de retorno pendente, use Concluir retorno após o contato efetivo. Isso mantém a agenda e os indicadores alinhados.",
      },
    ],
    elementos: [
      { titulo: "KPIs resumidos", descricao: "Totais da carteira no topo, independentes dos filtros da tabela." },
      { titulo: "Fila master–detail", descricao: "Lista à esquerda; detalhe e linha do tempo à direita." },
      { titulo: "Atalhos WhatsApp e e-mail", descricao: "Abrem o canal externo e podem pré-preencher o registro de contato." },
      { titulo: "Distribuição (administradora)", descricao: "Atribui ou redistribui RE às unidades; gera notificação ao atendente." },
    ],
    dicas: [
      "Atendente usa a fila master–detail com painel do caso; administradora vê abas Por condomínio, Por atendente e Geral com a carteira da equipe.",
      "Negociação, jurídico e histórico completo ficam no menu de ações da linha ou do painel do caso.",
    ],
  },
  {
    id: "agenda",
    titulo: "Minha agenda",
    resumo: "Calendário mensal com contatos realizados e retornos agendados para o atendente.",
    href: "/minha-agenda",
    icon: CalendarClock,
    modulo: "atendimentos",
    palavrasChave: ["calendário", "retorno", "compromisso", "histórico", "mês"],
    perfis: ["atendente"],
    objetivo: "Organizar o mês: ver o que já foi feito e o que ainda precisa de retorno, dia a dia.",
    passos: [
      {
        titulo: "Navegue entre os meses",
        descricao: "Setas no cabeçalho do calendário alteram o período exibido sem perder o contexto da carteira.",
      },
      {
        titulo: "Identifique os dias com movimento",
        descricao: "Dias com contatos ou retornos ganham destaque; clique no dia para ver o detalhe abaixo ou ao lado.",
      },
      {
        titulo: "Abra a unidade a partir do compromisso",
        descricao: "Links levam à fila de atendimentos ou ao registro de contato com a unidade já selecionada.",
      },
    ],
    elementos: [
      { titulo: "Grade mensal", descricao: "Visão macro da produtividade e dos retornos futuros." },
      { titulo: "Lista do dia", descricao: "Eventos agrupados por data com horário e tipo (contato, retorno)." },
      { titulo: "Agendar atendimento", descricao: "Disponível em outras telas; o compromisso aparece aqui e na fila." },
    ],
    dicas: [
      "Combine a agenda com o chip Atrasados em Atendimentos para não perder retornos vencidos.",
      "Compromissos usam o fuso America/Sao_Paulo, alinhado às notificações do sistema.",
    ],
  },
  {
    id: "inadimplencia",
    titulo: "Inadimplência",
    resumo: "KPIs, gráficos e listagem de débitos por condomínio ou visão geral da carteira.",
    href: "/debitos",
    icon: Wallet,
    modulo: "debitos",
    palavrasChave: ["débito", "valor", "vencido", "gráfico", "quitação", "importar"],
    objetivo: "Consultar valores em aberto, entender faixas de atraso e acionar cadastro, correção ou importação.",
    passos: [
      {
        titulo: "Confira os indicadores",
        descricao:
          "Totais e gráficos respeitam deduplicação por identificador externo e a data-base escolhida nos filtros.",
      },
      {
        titulo: "Escolha a aba Por condomínio ou Geral",
        descricao:
          "Por condomínio agrupa painéis recolhíveis com prazo de acompanhamento; Geral mostra tabela plana com paginação.",
      },
      {
        titulo: "Filtre e abra o detalhe",
        descricao: "Busca, condomínio, situação e vencimento estreitam a lista. Sheets servem para cadastrar ou corrigir débitos manuais.",
      },
      {
        titulo: "Importe ou confirme quitação",
        descricao:
          "Importar abre o assistente de inadimplência. Confirmar quitação atualiza a situação da unidade quando não há mais débitos em aberto.",
      },
    ],
    elementos: [
      { titulo: "Rosca e barras", descricao: "Distribuição de unidades e valores por faixa de dias de atraso." },
      { titulo: "Fonte dos valores", descricao: "Origem (importação) ou correção manual — sem recálculo automático de encargos." },
      { titulo: "Nova inadimplência", descricao: "Cadastro pontual quando a administradora autoriza criação manual." },
    ],
    dicas: [
      "Correções manuais geram registro em auditoria; prefira importação quando houver arquivo da administradora.",
      "Atendentes consultam dentro do escopo; criação e edição dependem do cargo.",
    ],
  },
  {
    id: "juridico",
    titulo: "Jurídico",
    resumo: "Encaminhamentos para análise jurídica, status e documentos — sem ajuizamento automático.",
    href: "/juridico",
    icon: Scale,
    modulo: "juridico",
    palavrasChave: ["encaminhamento", "advogado", "processo", "documento", "ajuizamento"],
    perfis: ["administradora", "advogado"],
    objetivo: "Acompanhar casos encaminhados pela cobrança e registrar evolução jurídica no escopo do condomínio.",
    passos: [
      {
        titulo: "Consulte Por advogados ou Geral",
        descricao: "A aba padrão agrupa painéis por advogado responsável; Geral lista todos os encaminhamentos.",
      },
      {
        titulo: "Encaminhe a partir da fila",
        descricao: "Na unidade em cobrança, use Encaminhar p/ jurídico. O advogado sugerido vem do cadastro do condomínio.",
      },
      {
        titulo: "Atualize status e observações",
        descricao: "No sheet do encaminhamento, registre andamento, documentos e notas visíveis à equipe autorizada.",
      },
    ],
    elementos: [
      { titulo: "Status do encaminhamento", descricao: "Fluxo controlado — o sistema não envia petições a tribunais." },
      { titulo: "Documentos", descricao: "Metadados e anexos conforme permissão juridico.ler / editar." },
      { titulo: "Linha do tempo da unidade", descricao: "Eventos jurídicos também aparecem no histórico da unidade." },
    ],
    dicas: [
      "Advogados só enxergam condomínios em que estão listados no cadastro.",
      "Atendentes não acessam o módulo; o encaminhamento parte da administradora ou do fluxo autorizado.",
    ],
  },
  {
    id: "condominios",
    titulo: "Condomínios",
    resumo: "Cadastro da carteira, endereço, administradora, advogados e métricas por empreendimento.",
    href: "/condominios",
    icon: Building2,
    modulo: "condominios",
    palavrasChave: ["cadastro", "empreendimento", "administradora", "importar", "exportar"],
    perfis: ["administradora", "advogado"],
    objetivo: "Manter a base de condomínios usada por unidades, débitos, atendimentos e relatórios.",
    passos: [
      {
        titulo: "Busque e filtre a listagem",
        descricao: "Nome, status e cidade ajudam a localizar o empreendimento. Métricas resumem unidades e inadimplência.",
      },
      {
        titulo: "Cadastre ou edite no painel lateral",
        descricao: "O formulário em etapas cobre dados, endereço e observações. Inativar preserva histórico.",
      },
      {
        titulo: "Acesse unidades do condomínio",
        descricao: "Atalhos na linha abrem Unidades já filtradas, novo cadastro ou consulta do detalhe da unidade.",
      },
    ],
    elementos: [
      { titulo: "Prazo de inadimplência", descricao: "Dias de acompanhamento configuráveis por condomínio (padrão 60)." },
      { titulo: "Advogados vinculados", descricao: "Define escopo jurídico e visão do perfil advogado." },
      { titulo: "Importar / exportar", descricao: "Planilha padronizada; importação exige permissão em Importações." },
    ],
    dicas: [
      "Identificador externo único evita duplicidade com integrações e importações.",
      "Exclusão só é permitida sem unidades nem histórico de cobrança.",
    ],
  },
  {
    id: "unidades",
    titulo: "Unidades",
    resumo: "Cadastro de unidades, responsáveis financeiros, situação de cobrança e vínculo com débitos.",
    href: "/unidades",
    icon: DoorOpen,
    modulo: "unidades",
    palavrasChave: ["apartamento", "responsável", "cobrança", "prescrita", "quitada"],
    perfis: ["administradora", "advogado"],
    objetivo: "Identificar cada unidade na carteira e sua situação operacional (fila, quitada, prescrita, etc.).",
    passos: [
      {
        titulo: "Navegue por condomínio ou lista geral",
        descricao: "Painéis recolhíveis por condomínio mostram prazo de inadimplência no subtítulo do bloco.",
      },
      {
        titulo: "Abra o detalhe da unidade",
        descricao: "Consulta traz responsáveis, débitos, atendimentos e atalhos para registrar contato ou ver débitos.",
      },
      {
        titulo: "Ajuste situação e responsáveis",
        descricao: "Edição em sheet; dados sensíveis de responsáveis são mascarados para perfis sem permissão de edição.",
      },
    ],
    elementos: [
      { titulo: "Situação de cobrança", descricao: "Define se a unidade entra na fila (Em cobrança, acordo, etc.) ou fica fora." },
      { titulo: "Responsável principal", descricao: "Contato usado nos atalhos de WhatsApp e e-mail na operação." },
      { titulo: "Coluna Débito", descricao: "Valores em aberto ou Em dia quando quitada — sem apagar histórico." },
    ],
    dicas: [
      "Unidade prescrita sai da fila ativa, mas mantém débitos consultáveis.",
      "Nova unidade inicia em Sem cobrança até importação ou ação que promova à fila.",
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    resumo: "Hub de produtividade, retornos, efetividade e carteira com filtros e exportação.",
    href: "/relatorios",
    icon: FileBarChart,
    modulo: "relatorios",
    palavrasChave: ["exportar", "csv", "pdf", "produtividade", "carteira"],
    perfis: ["administradora", "advogado"],
    objetivo: "Analisar a operação em períodos definidos e extrair arquivos para arquivo ou reunião.",
    passos: [
      {
        titulo: "Escolha o relatório no hub",
        descricao: "Cada cartão abre um recorte (produtividade, retornos, efetividade ou carteira/inadimplência).",
      },
      {
        titulo: "Ajuste filtros e período",
        descricao: "Condomínio, colaborador (quando permitido), datas e situação refletem o escopo do seu cargo.",
      },
      {
        titulo: "Exporte quando necessário",
        descricao: "CSV, XLS ou PDF conforme o relatório; exportação exige permissão relatorios.exportar.",
      },
    ],
    elementos: [
      { titulo: "Tabelas e totais", descricao: "Agregações sobre dados persistidos — mesmas regras das telas operacionais." },
      { titulo: "Filtro por RE", descricao: "Administradora pode comparar atendentes; demais perfis veem recortes próprios." },
    ],
    dicas: [
      "URLs com ?relatorio= mantêm atalhos de relatórios específicos.",
      "Valores monetários seguem a mesma deduplicação da tela de Inadimplência.",
    ],
  },
  {
    id: "importacoes",
    titulo: "Importações",
    resumo: "Envio de planilhas, prévia, correção e confirmação antes de gravar débitos e cadastros.",
    href: "/importacoes",
    icon: FileUp,
    modulo: "importacoes",
    palavrasChave: ["planilha", "prévia", "aprovar", "administradora", "upload"],
    objetivo: "Atualizar a carteira a partir de arquivos das administradoras com validação e rastreio de quem importou.",
    passos: [
      {
        titulo: "Escolha o tipo de importação",
        descricao: "Débitos, condomínios, unidades ou responsáveis — cada fluxo tem colunas e regras próprias.",
      },
      {
        titulo: "Envie o arquivo e revise a prévia",
        descricao: "Linhas inválidas aparecem com motivo. Corrija na conferência quando tiver permissão de edição.",
      },
      {
        titulo: "Aprove para gravar",
        descricao: "Somente após aprovação os dados entram no catálogo. Débitos podem promover unidades à fila de cobrança.",
      },
      {
        titulo: "Consulte o histórico",
        descricao: "Cada importação registra usuário, data e resultado para auditoria posterior.",
      },
    ],
    elementos: [
      { titulo: "Wizard em etapas", descricao: "Arquivo → conferência → resultado, com contadores de sucesso e proteção manual." },
      { titulo: "Atalho nas listagens", descricao: "Botão Importar em Inadimplência, Condomínios e Unidades abre o módulo correto." },
      { titulo: "Distribuição automática", descricao: "Após confirmar inadimplência, pode atribuir RE conforme configuração da carteira." },
    ],
    dicas: [
      "Atendentes com criar/editar em Importações podem operar o fluxo; exclusão do histórico é restrita.",
      "Não feche o navegador durante a aprovação de lotes grandes.",
    ],
  },
  {
    id: "colaboradores",
    titulo: "Colaboradores",
    resumo: "Quem acessa o sistema, código de login, RE e vínculo de advogados a condomínios.",
    href: "/usuarios",
    icon: UserRound,
    modulo: "usuarios",
    palavrasChave: ["usuário", "login", "senha", "re", "ativo"],
    perfis: ["administradora"],
    objetivo: "Gerir contas, cargos e identificação operacional (RE) usada na fila e nos relatórios.",
    passos: [
      {
        titulo: "Liste e filtre colaboradores",
        descricao: "Situação ativa/inativa, cargo e busca por nome ou código.",
      },
      {
        titulo: "Cadastre ou edite no sheet",
        descricao: "Define cargo (permissões), contatos e, para advogados, condomínios vinculados. O RE é gerado pelo sistema.",
      },
      {
        titulo: "Oriente o primeiro acesso",
        descricao: "Login usa código e senha definida pela administradora; autoria de atendimentos vem sempre da sessão logada.",
      },
    ],
    elementos: [
      { titulo: "Código RE", descricao: "Formato RE-##### para todos os colaboradores; usado na fila em vez do nome pessoal." },
      { titulo: "Situação", descricao: "Inativo bloqueia login imediatamente." },
    ],
    dicas: [
      "Não compartilhe senhas; use cargos para limitar módulos em vez de contas genéricas.",
      "Alterações de cargo exigem novo login para recarregar permissões no cliente.",
    ],
  },
  {
    id: "cargos",
    titulo: "Cargos",
    resumo: "Perfis e matriz de permissões (ver, criar, editar, excluir, exportar) por módulo.",
    href: "/cargos",
    icon: Shield,
    modulo: "cargos",
    palavrasChave: ["permissão", "perfil", "matriz", "administrador", "atendente"],
    perfis: ["administradora"],
    objetivo: "Controlar o que cada perfil pode fazer sem alterar código — alinhado às regras de negócio do escritório.",
    passos: [
      {
        titulo: "Selecione um cargo",
        descricao: "Lista mostra quantos colaboradores usam cada perfil.",
      },
      {
        titulo: "Marque permissões por módulo",
        descricao: "Ver é pré-requisito implícito para ações de escrita; exportar aparece onde o módulo permite.",
      },
      {
        titulo: "Salve e comunique a equipe",
        descricao: "Usuários já logados podem precisar atualizar a página para refletir mudanças.",
      },
    ],
    elementos: [
      { titulo: "Descrição do módulo", descricao: "Texto de ajuda em cada linha da matriz para evitar excesso de privilégio." },
      { titulo: "Seeds padrão", descricao: "Administradora, Atendente e Advogado vêm com conjuntos iniciais documentados." },
    ],
    dicas: [
      "Conceda importações com critério: criar/editar permite alterar a carteira em massa.",
      "Auditoria de leitura costuma ficar só com a administradora.",
    ],
  },
  {
    id: "auditoria",
    titulo: "Auditoria",
    resumo: "Histórico de alterações: quem mudou o quê, quando e valores anterior/novo.",
    href: "/auditoria",
    icon: ScrollText,
    modulo: "auditoria",
    palavrasChave: ["log", "alteração", "histórico", "compliance"],
    perfis: ["administradora"],
    objetivo: "Investigar correções manuais, importações e ações sensíveis com linguagem clara e detalhe técnico opcional.",
    passos: [
      {
        titulo: "Filtre por entidade ou período",
        descricao: "Reduza o volume para débitos, unidades, atendimentos, importações, etc.",
      },
      {
        titulo: "Abra o detalhe no painel",
        descricao: "Ícone de visualização mostra resumo legível; Ver detalhes técnicos exibe JSON para suporte.",
      },
    ],
    elementos: [
      { titulo: "Ação", descricao: "Inclusão, alteração ou exclusão registrada automaticamente pelos serviços." },
      { titulo: "Autor", descricao: "Colaborador da sessão no momento da operação." },
    ],
    dicas: [
      "Correção manual de débito sempre deve gerar evento aqui — ausência indica falha a reportar.",
      "Não é backup: use exportações dos módulos para arquivo histórico de longo prazo.",
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    resumo: "Alertas de retorno, lembretes do dia e cobranças atribuídos à sua carteira.",
    href: "/notificacoes",
    icon: Bell,
    modulo: "dashboard",
    palavrasChave: ["sino", "alerta", "lida", "retorno", "distribuição"],
    objetivo: "Evitar perder retornos e saber quando novas unidades entraram na sua carteira — apenas dentro do sistema.",
    passos: [
      {
        titulo: "Confira o sino no topo",
        descricao: "Badge com quantidade de não lidas; prévia dos últimos itens sem sair da tela atual.",
      },
      {
        titulo: "Abra a lista completa",
        descricao: "Menu Notificações ou página dedicada com histórico e marcação de lidas.",
      },
      {
        titulo: "Clique para ir ao contexto",
        descricao: "Cada alerta valida escopo e leva à fila ou unidade relacionada, marcando como lida.",
      },
    ],
    elementos: [
      { titulo: "Tipos de evento", descricao: "Retorno agendado, lembrete no dia e cobrança atribuída/redistribuída." },
      { titulo: "Idempotência", descricao: "O mesmo evento não duplica alertas." },
    ],
    dicas: [
      "Canais externos (e-mail, SMS) permanecem desligados até configuração futura.",
      "Marque todas como lidas apenas após revisar retornos urgentes.",
    ],
  },
  {
    id: "conta",
    titulo: "Minha conta",
    resumo: "Dados da sessão, cargo e orientações de segurança do seu acesso.",
    href: "/conta",
    icon: UserRound,
    modulo: "dashboard",
    palavrasChave: ["sessão", "perfil", "senha", "cargo"],
    objetivo: "Confirmar com qual identidade você está operando e onde pedir ajuda em caso de divergência.",
    passos: [
      {
        titulo: "Revise nome, cargo e RE",
        descricao: "Devem coincidir com o colaborador cadastrado pela administradora.",
      },
      {
        titulo: "Confira permissões resumidas",
        descricao: "Lista derivada do cargo — útil para entender telas ausentes no menu.",
      },
      {
        titulo: "Reporte inconsistências",
        descricao: "Acesso errado ou dados desatualizados vão para a administradora, não para suporte externo.",
      },
    ],
    elementos: [
      { titulo: "Sessão ativa", descricao: "Cookie seguro; sair encerra o acesso neste navegador." },
      { titulo: "Link para Ajuda", descricao: "Retorna ao manual e atalhos do sistema." },
    ],
    dicas: [
      "Troca de senha e políticas de bloqueio seguem o fluxo definido pelo escritório.",
      "Nunca compartilhe o dispositivo logado com outro atendente.",
    ],
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
