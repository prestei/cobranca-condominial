# Regras de negócio — Painel jurídico de cobrança condominial

## Objetivo

Criar um controle de pagamento e dívidas de proprietários de vários condomínios, onde o escritório de advocacia é responsável por gerenciar e tratar, de forma judicial ou extrajudicial, os proprietários inadimplentes.

Palitagem e painel de inadimplência são **um único sistema**. Compartilham condomínio, unidade, colaborador e o débito da unidade. O atendimento é o registro da cobrança daquela unidade. Não existe um cadastro separado de processo de cobrança.

---

## 1. Entendimento do negócio

### Qual problema esse sistema resolve?

Automatiza e organiza o processo do escritório de advocacia responsável pela cobrança extrajudicial/judicial de proprietários de imóveis inadimplentes de um grupo de **35 condomínios** atendidos pelo escritório. O objetivo principal é ter **controle e rastreabilidade** sobre todo o fluxo de cobrança, levantar dados de atendimentos e gerar relatórios completos com dados externos e internos.

### Acesso e sessão

- Cada colaborador entra com **código e senha** próprios (`/login`).
- A sessão é mantida em cookie HTTP-only assinado no servidor (7 dias); sem sessão válida, as telas internas redirecionam para o login.
- Após o login, o parâmetro `from` só é honrado se o cargo tiver permissão de **ver** naquele módulo; caso contrário o destino é o início (ou a primeira área liberada).
- Colaboradores, cargos e permissões são persistidos no **PostgreSQL** (`role` / `"user"`). Reinício ou deploy não pode apagar usuários: a fonte da verdade não é memória nem arquivo `.data`.
- Atendimentos, importações e auditoria registram o **ID do colaborador logado**, não um atendente escolhido na tela.

### Quem vai usar o sistema?

O sistema é voltado para colaboradores do escritório, divididos por permissões:

| Perfil | Descrição |
|--------|-----------|
| **Administrador** (usuário mestre — Milena, no momento atual) | Gestão do projeto e operação |
| **Advogados** | Visualização por grupo de condomínios |
| **Atendentes** | Responsáveis pela cobrança |

### Quem é o usuário principal?

- **Administrador:** gestão do projeto e operação; cadastros; acompanhamento da equipe; relatórios; exportações e correções.
- **Atendentes:** registrar tentativas de cobrança; acompanhamentos de retorno; consulta de atendimentos; importar inadimplência no escopo da carteira.
- **Advogados:** consultar relatórios e históricos dos condomínios sob sua responsabilidade.

### Qual é o objetivo principal do sistema?

Organizar e ter controle sobre todo o fluxo de cobrança que o escritório de advocacia realiza com inadimplentes de diversos condomínios (cobrança extrajudicial/judicial).

A ideia principal tem como objetivo identificar os seguintes pontos:

- Quem realizou a cobrança;
- Quando ela foi realizada;
- Qual condomínio e unidade foram envolvidas;
- Qual meio de cobrança foi utilizado;
- Se o condomínio retornou;
- Qual o motivo da pendência;
- Se foi solicitado um retorno;
- Quando o próximo contato deverá acontecer;
- Qual é o histórico de cobranças daquela unidade.

### O que acontece hoje sem o sistema?

Fluxo não organizado, anotações em papéis, planilhas grandes e sem conferência confiável. Falta de controle no atendimento. Além disso, não há gráficos e relatórios importantes para apresentação em assembleia.

### Qual resultado o cliente espera obter?

- Sistema acessível por **computador e celular**, em que cada atendente registra em poucos cliques cada tentativa de cobrança.
- Geração de **gráficos** para a administradora e para os advogados.
- Busca automática, na **Superlógica** e nos sistemas das demais administradoras, dos débitos em aberto de cada condomínio atendido. Com isso, o painel deve mostrar, **sem trabalho manual**, a situação atualizada da inadimplência.

---

## 2. Fluxo principal

### Qual é o fluxo completo do usuário, do início ao fim?

**Módulo:** Sistema de palitagem e acompanhamento das cobranças.

#### Admin

- Login → resumo geral com métricas e KPIs importantes
- Gerenciar os condomínios
- Gerenciar colaboradores
- Acompanhar cobranças
- Acompanhar produtividade de atendentes
- Acesso à auditoria do sistema

**Resumo:** Tudo — cadastros de condomínios, atendentes e motivos; relatórios de toda a equipe; exportações; corrigir registros (com histórico da alteração).

#### Atendente

- Login → resumo geral com métricas e KPIs importantes; alerta de atendimento
- Registrar/gerenciar seus atendimentos
- Importar inadimplência (upload, prévia, correção e aprovação): carteira vigente **e** cadastros auxiliares provisionados pelo arquivo (condomínio/unidade novos); sem excluir histórico de importação

**Resumo:** Registrar atendimentos; ver atendimentos do dia e agenda de retornos; marcar retorno como feito; importar inadimplência (carteira + provisionamento).

#### Advogado

- Login → resumo geral com métricas e KPIs importantes
- Consultar relatórios e histórico dos condomínios sob sua responsabilidade

---

## 3. Funcionalidades

### Dashboard

- Rota `/` carrega `GET /api/dashboard` (`dashboard.ler`); layout e métricas variam por perfil (administradora, atendente, advogado), sempre com escopo validado no servidor.
- **Administradora:** carteira completa — inadimplência (totais deduplicados, faixas, condomínios, advogados responsáveis), resumo da fila de cobranças, operação dos últimos 7 dias, retornos pendentes (identificação por RE na tabela).
- **Atendente:** home com resumo do dia (pendentes, fila, contatos de hoje, taxa de resposta), próximos retornos com atalho **Atender**, ações rápidas (**Agendar atendimento**, ver agenda, abrir fila); **Minha agenda** (`/minha-agenda`) com visual de agenda do histórico de palitagens dia a dia (somente autoria do login) e CTA **Agendar** por dia vazio; fila da carteira (atribuição vigente).
- **Advogado:** menu lateral dedicado (rotina: início, jurídico, negociações, notificações; carteira; relatórios); início com saudação, alertas de propostas em análise, parcelas vencidas e encaminhamentos; condomínios vinculados, indicadores de débitos no escopo, ranking por condomínio, resumo de encaminhamentos e negociações no escopo; em `/juridico`, lista plana dos próprios encaminhamentos (sem visão “por advogados” da gestão).
- Valores monetários formatados em pt-BR; estados de carregamento, erro e ausência de dados; sem metas ou pontuações inventadas.
- **Busca global e exportação da carteira (T35):** busca textual na home (`GET /api/dashboard/busca`) com resultados por categoria (RE, condomínio, unidade, cobrança, atendimento), respeitando escopo e permissões; exportação CSV/XLS no servidor (`GET /api/dashboard/export`) das listagens autorizadas (fila ou atendimentos) com os **mesmos filtros** do dashboard, colunas conforme perfil (valores monetários só com `debitos.ler`), data/hora de geração, limite de volume e registro em auditoria — sem dados de carteira de outros colaboradores fora do escopo.

### Colaboradores e permissões

- Cadastro de colaboradores em `/usuarios` (somente perfil com `usuarios.criar` / `usuarios.editar`, em geral Administradora).
- **Código RE:** todo colaborador recebe identificador sequencial `RE-10000`, `RE-10001`, … gerado **no servidor** na criação; imutável; único no cadastro; inativos mantêm o RE reservado (não reutilizado). O RE é o login de acesso (`codigo` = `codigoRe` na geração) e o identificador operacional. Telas operacionais (fila, retornos, distribuição, relatórios por RE) usam o RE dos atendentes na carteira; demais perfis também exibem o próprio RE no cadastro e na conta.
- Ativação/desativação: inativo não autentica; reativação restaura o mesmo RE.
- Advogados: vínculo aos condomínios via lista `advogados` no cadastro do condomínio (nome do colaborador), editável no sheet do colaborador.
- Cargos e permissões configuráveis pelo administrador: para cada módulo do sistema, o cargo define se pode **ver**, **criar**, **editar**, **excluir** e, em relatórios, **exportar** (matriz em `/cargos`, persistida em `role.permissao_json`). Referência dos três cargos de fábrica: [matriz-permissoes-por-cargo.md](modulos/matriz-permissoes-por-cargo.md).
- Controle de acesso: menu e rotas respeitam permissão de **ver**; botões de mutação respeitam criar/editar/excluir/exportar. Sem permissão de ver → página `/acesso-negado`.

### Condomínios e unidades

- Cadastro de condomínios (`/condominios`, `GET|POST /api/condominios`, `PATCH|DELETE /api/condominios/:id`): nome obrigatório, ao menos um advogado responsável, identificador externo único quando informado; inativação preserva unidades, débitos e atendimentos; exclusão só sem unidades nem histórico de cobrança. Escopo: advogado vê condomínios em que está vinculado; **atendente** vê apenas condomínios/unidades da **carteira vigente** (atribuição `collection_assignment` ativa); administradora vê a carteira completa. Mutações registradas em `audit_log`.
- **Prazo de inadimplência por condomínio (T02):** campo opcional `delinquencyTrackingDays` (`condominium.delinquency_tracking_days`) — inteiro ≥ 1; perfil com `condominios.editar` altera no cadastro. Sem valor configurado, o sistema usa **60 dias** (`LIMITE_AMIGAVEL_DIAS`). A contagem usa **dias de atraso** do débito (vencimento → data-base do painel); alterar o prazo **não** muda vencimento nem valores financeiros. Indicadores e painel `/debitos` comparam cada débito ao prazo do seu condomínio; estados de interface: dentro do prazo, próximo do limite (dia anterior ao término), prazo atingido e prazo ultrapassado. Lógica em `src/lib/inadimplencia/delinquency-tracking.ts`.
- **Alertas de prazo de inadimplência (T03):** rotina automática (job horário + gatilho ao listar notificações) identifica débitos **em aberto** de unidades na fila operacional e compara o atraso ao prazo do condomínio. Antecedências configuráveis pela administração (`GET/PATCH /api/notificacoes/alertas-prazo-inadimplencia`, chave `app_setting.alertas_prazo_inadimplencia`; padrão **15, 7 e 3** dias antes do término), mais alertas específicos de **prazo atingido** e **prazo ultrapassado**. Destinatário: atendente da carteira vigente; sem RE, encaminha à **administração** (perfil com `usuarios.criar`). Notificação in-app (T34) com condomínio, unidade, débito, prazo, data-base, dias transcorridos/restantes, status e responsável; idempotência por débito + marco + prazo vigente (`inadimplencia_prazo:…`); histórico em `internal_notification`. Não altera situação financeira da unidade.
- Responsável jurídico (advogados no cadastro do condomínio)
- Cadastro de unidades
- Proprietários e responsáveis financeiros
- Histórico da unidade

**Unidades (T06):** identificação única por condomínio (`identificacao` + condomínio); inativação preserva débitos, atendimentos e vínculos; exclusão só sem histórico. Responsável financeiro principal marcado no vínculo (`principal`). Situação de cobrança **Sem cobrança** é o padrão ao criar unidade (fora da fila de inadimplência; badge neutro na coluna Cobrança). **Em cobrança**, **Em acordo**, **Notificada** e **Ajuizada** entram na fila operacional. **Unidade prescrita** (código `PRESCRITA` em importações/planilhas) marca classificação jurídica manual: **fora da fila** de cobrança ativa; **débitos, parcelas e histórico financeiro não são alterados** nem cancelados automaticamente; a coluna Débito em `/unidades` mantém valores em aberto apenas para consulta. **Quitada** tira a unidade da fila: na listagem, coluna Débito exibe **Em dia** (verde) mesmo que existam débitos históricos consultáveis. A transição **Sem cobrança** ou **Quitada** → **Em cobrança** ocorre na **confirmação** da importação de inadimplência e ao **cadastrar ou editar** débito em situação **Pendente** ou **Vencido** (`promoverUnidadeParaCobrancaSeDebitoEmAberto`); unidade prescrita não muda. Demais gatilhos operacionais seguem em [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md). API `/api/unidades` valida permissão e escopo de condomínio no servidor. Dados pessoais de responsáveis mascarados para perfis sem necessidade operacional (ex.: advogado em consulta).

### Inadimplência

**Importação (T13 / épico / Ticket 02):** todas as abas (débitos, condomínios, unidades, responsáveis) usam o **pipeline central** em `src/lib/importacao-centro` — leitura, normalização, validação, duplicidades, conferência, aprovação, persistência e histórico. A aba só importa via adaptador registrado (`previewImportacaoPorModulo` / `confirmarImportacaoPorModulo`); regras específicas (incluindo `politicaAprovacao`) ficam no adaptador, não no orquestrador. A gravação de linhas só ocorre após aprovação. **Motor de validação (Ticket 05):** todo registro é classificado em `valido`, `atencao` ou `erro` por regras estruturais, cadastrais, relacionais, financeiras e de negócio; avisos não bloqueiam; erros impedem a linha; o motor não persiste cadastro. Fluxo em `/importacoes` com prévia obrigatória (`POST /api/importacoes/debitos/preview` e equivalentes por módulo) e confirmação (`…/confirmar`). **Permissões (Ticket 12):** mapeamento em `src/lib/importacoes/permissoes.ts` — consultar histórico (`ler`), iniciar envio e prévia (`criar`), corrigir na conferência e aprovar gravação (`editar`); validação no servidor e na UI; aprovação bloqueada para registros fora do escopo de condomínio do usuário. **Atendente** (`role.permissao_json` via migration `2026-11-12-atendente-permissao-importacoes.sql`): `importacoes.ler/criar/editar` — menu **Importações** e atalho **Importar** em Inadimplência/fila; exclusão de histórico só com `importacoes.excluir` (Administradora). Campos da planilha são **normalizados** antes das validações (Ticket 04 — `aplicarNormalizacaoRegistro` em `src/lib/importacao-centro/normalizacao-campos.ts`), com `original` e `normalizado` distintos; vazio, ambiguidade e falha de interpretação são sinalizados (`normalizacao.campo_ambiguo`, `normalizacao.interpretacao_rejeitada`) **sem inventar** valores ausentes nem mapear classificação desconhecida para um valor fictício. Mapeamento de condomínio/unidade por nome, ID ou identificador externo do condomínio + identificação da unidade (bloco quando necessário). **Na importação de inadimplência**, condomínio, unidade e responsável ausentes no cadastro são **criados automaticamente** na prévia (`provisionarCadastrosImportacaoDebitos`) para permitir vincular os débitos e o responsável financeiro da unidade; unidade nova fica em **Sem cobrança** até a confirmação, quando os débitos gravados promovem a unidade para **Em cobrança**; a operação é idempotente e **não sobrescreve** demais campos/vínculos já existentes (responsável sem CPF no PDF recebe documento provisório `IMPORT-…`); módulos dedicados de condomínios/unidades/responsáveis permanecem para planilha só de cadastro. Linhas inválidas não gravam; reimportação do mesmo arquivo (hash SHA-256) não duplica débitos; débitos manuais sem identificador externo não são sobrescritos; débitos ausentes do arquivo **não** são cancelados. Histórico em `import` com quantidades lidas, importadas, atualizadas e erros. Formato genérico `planilha-inadimplencia-v1` (CSV, XLS XML, XLSX). Recebimento em `POST /api/importacoes/arquivo`: valida extensão, MIME, assinatura, tamanho (15 MiB), quantidade máxima de linhas (50.000) e gera `processoId` UUID em armazenamento temporário antes da prévia. PDF aceito quando há texto extraível; layouts proprietários sem texto — pendente.

- Integração com administradoras (Superlógica e leitores futuros)
- **Gestão de débitos (T14):** listagem em `/debitos` via `GET /api/debitos` (escopo e permissão no servidor). Valores exibidos são os persistidos; indicadores na data-base somam `valor_atualizado` **sem duplicar** o mesmo `identificador_externo`. Campos `fonte_valores` (`origem` | `manual`) e `atualizado_em` distinguem importação de correção manual; alterações manuais geram `audit_log`. O sistema **não recalcula** juros, multa ou correção ausentes na origem. No cadastro manual, **data do pagamento** e **valor pago** são obrigatórios apenas com situação **Pago**; demais situações gravam esses campos vazios (validação na API).
- Controle dos débitos (manual + importado)
- Identificação de inadimplentes
- **Quitação:** `POST /api/debitos/unidade/{id}/confirmar-quitacao` marca a unidade como `Quitada` (fora da fila); atendimentos e débitos históricos permanecem.
- Regra de entrada na cobrança (pendente)
- Atualização dos valores (importação atualiza só com ID externo ou equivalência; demais casos em DECISOES_PENDENTES)

### Fila de cobranças (T08)

- Integrada à tela `/atendimentos`; atalho `/fila` redireciona para essa rota.
- Lista unidades em cobrança ativa via `GET /api/fila`.
- **Atendente:** layout operação **master–detail** (fila lateral + painel com linha do tempo, concluir retorno e registrar contato); somente unidades com atribuição vigente ao seu RE; chips **Período**, **Sem retorno** e **Atrasados**; atalhos **WhatsApp** / **E-mail** no painel do caso.
- **Administradora:** visão de gestão com KPIs, filtros e abas **Por condomínio** (padrão), **Por atendente** e **Geral**; painéis recolhíveis nas visões agrupadas; tabela plana e paginação no servidor na visão Geral; seleção em lote e distribuição por RE; coluna RE responsável nas tabelas.
- **Advogado:** sem `atendimentos.ler` — não acessa a fila operacional.
- Quitada / inativa cadastral não entra na fila; histórico permanece na aba Registros e em unidades.
- Regra de **quando** o débito entra em cobrança: pendente de aprovação (fora do T08).

### Distribuição de cobranças (T09)

- **Distribuição** integrada à fila em `/atendimentos`; atalho `/distribuicao` redireciona para `/atendimentos`.
- Apenas perfil com permissão de gestão de equipe (`usuarios.criar` no seed = Administradora) distribui ou redistribui.
- Atribuição manual por **RE** do atendente; interface operacional exibe RE, não nome pessoal.
- Cada mudança gera novo registro em `collection_assignment`; vigência anterior recebe `encerrado_em`, `anterior_atendente_id` e motivo quando informado.
- A cobrança passa a aparecer na carteira do novo RE e deixa de ser vigente para o anterior; **atendimentos (`service_ticket`) mantêm o autor original**.
- Distribuição em lote é **atômica**: se alguma unidade falhar na validação, nenhuma alteração é aplicada.
- Produtividade e relatórios históricos contam ações pelo autor do registro, não pelo responsável atual da carteira.
- Distribuição **automática** (Administradora): configuração em memória (`GET/PATCH /api/distribuicao/automatica`); ao **salvar** com opção ativa, o sistema executa `POST /api/distribuicao/automatica/executar` para atribuir cobranças sem RE. Regras: **carga equilibrada**, **por condomínio**, **por volume** e **rodízio** (detalhes em `descricaoEstrategiaDistribuicaoAutomatica` no serviço).
- **Novas inadimplências:** na **confirmação** da importação de débitos, unidades que entram em **Em cobrança** (ou recebem débitos novos/atualizados) e ainda estão **sem RE** são distribuídas automaticamente **se** a opção estiver ativada (`dispararDistribuicaoAutomaticaSeAtivada`). Se o autor da importação for **atendente com RE**, o lote é atribuído a ele (para a fila não ficar vazia na carteira de quem importou); caso contrário, usa a estratégia vigente.
- **Job a cada 5 minutos:** com a opção ativa, `agendarDistribuicaoAutomaticaPeriodica` (via `instrumentation`) verifica a fila e atribui RE às cobranças ainda sem responsável (`src/lib/distribuicao/job-periodico.ts`).

### Palitagem

- Lista de unidades com débito vencido
- Registro do atendimento pelo colaborador logado (`POST /api/atendimentos`): autor e data/hora gerados no servidor; autoria amarrada ao RE do login
- Cada tentativa é um novo registro em `service_ticket`; não sobrescreve tentativas anteriores
- Atendente só registra cobrança em unidade da sua carteira vigente; administradora registra no escopo geral
- Unidade deve pertencer ao condomínio selecionado no formulário
- Histórico de contatos da unidade (detalhe da unidade e aba Registros)
- **Linha do tempo consolidada (T12):** `GET /api/unidades/:id/historico` agrega tentativas (`service_ticket`), propostas de negociação (`negotiation_proposal`, T15), conclusão de retornos, atribuições/redistribuições (`collection_assignment`), pagamentos de débitos e correções auditadas (`audit_log` em atendimento/unidade/proposta). Ordem cronológica; cada evento indica atendente por **RE** ou perfil (Administradora/Advogado). Escopo por condomínio; atendente consulta só unidades da carteira vigente; advogado via `unidades.ler`. Eventos não são apagados por quitação, inativação ou redistribuição.
- Meios: WhatsApp, telefone, e-mail e demais canais do catálogo
- Resposta Sim/Não e motivo da pendência (catálogo) quando houve contato
- Agendamento de retorno (data e próxima ação)
- **Agendar atendimento:** sheet global (`AgendarAtendimentoProvider` em `Providers`) com `atendimentos.criar` — unidades, débitos, detalhe/histórico da unidade, `/minha-agenda`, home do atendente e central de pendências; na fila de cobranças o fluxo é registrar contato (palitagem), não o atalho de agendar; grava `service_ticket` com `data_proxima_acao` via `POST /api/atendimentos`
- Agenda de retornos (T11): chip **Período** na fila `/atendimentos` (atalhos e De/Até; `?retorno=hoje` abre em Hoje); API `GET /api/retornos` permanece para integrações; conclusão na fila via `POST /api/atendimentos/[id]/concluir-retorno` (preserva agendamento original; histórico permanece)
- **Notificações internas (T34):** central no sino do header e em `/notificacoes` — atribuição/transferência de carteira, atendimentos e movimentações, retornos (agendado, próximo, atrasado, lembrete do dia), alteração de situação da unidade e pendências da central T30. Destinatário: carteira vigente ou colaborador impactado; idempotência por evento; atualização automática no cliente (polling). Com Firebase configurado, **push web** replica os mesmos alertas para atendentes e administração (`atendimentos.ler` ou `usuarios.criar`); registro do dispositivo vale para qualquer perfil com `dashboard.ler` no workspace. Falhas in-app vão para `notification_failure` sem bloquear fluxos; falha de push só remove token inválido. WhatsApp, SMS e e-mail **desativados** até aprovação. Detalhes: [modulos/notificacoes.md](modulos/notificacoes.md)
- Atendente conclui retornos só da carteira vigente; administradora acompanha por RE
- Situação da unidade: em cobrança, em acordo, notificada, ajuizada ou quitada

### Negociação e pagamentos

- **Propostas de negociação (T15):** registro via `/api/propostas` e sheet **Proposta** (fila / histórico da unidade). Vincula unidade, autor, valor proposto, observações e débitos (`debitoIds`). Status: Em análise, Aceita, Recusada, Cancelada. Confirmar acordo (`Aceita`) exige `termosAprovados` textuais e grava origem (`acordo_confirmado_*`); **não** baixa débito nem registra pagamento. **Alçada:** limites por advogado (`lawyer_negotiation_rule`); advogado vê e aprova propostas dos condomínios de sua responsabilidade (`negociacoes.ler` / `negociacoes.editar`). Alterações auditadas (`negotiation_proposal`, `lawyer_negotiation_rule`).
- **Parcelas e pagamentos de acordo (T16):** após proposta **Aceita**, parcelas previstas em `/api/propostas/:id/parcelas` e pagamentos em `/api/propostas/:id/pagamentos`. Pagamento **Informado** ≠ recebimento confirmado; quitação de parcela e saldo do acordo usam apenas pagamentos **Confirmados** (regra de saldo de débitos e fonte de confirmação: decisão pendente). Potencial descumprimento = parcela vencida sem quitação confirmada — **não** rotular acordo como quebrado sem regra aprovada. Correções auditadas em `agreement_installment` e `agreement_payment`. Detalhes: [modulos/negociacoes.md](modulos/negociacoes.md).

### Jurídico e gestão

- **Encaminhamento jurídico (T17):** registro via módulo `juridico` (`POST /api/juridico/encaminhamentos`) com unidade, condomínio, autor, advogado vinculado ao condomínio, débitos opcionais e contexto. Acompanhamento em `/juridico` e sheet na fila/histórico; status provisórios em `statusEncaminhamentoJuridico`; transições e escopo validados em `src/lib/juridico/service.ts`. **Advogado** consulta e edita apenas condomínios do seu vínculo; documentos (metadados) exigem `juridico.ler`. Eventos na linha do tempo (T12). Alterações em `audit_log`. **Não** ajuíza ações nem envia documentos a tribunais automaticamente. Checklist documental, campos processuais e integrações: [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md).
- Análise para cobrança judicial (fluxo manual fora do sistema)
- Documentos da cobrança (metadados internos; upload/armazenamento oficial pendente)
- **Relatórios (T19):** hub `/relatorios` (produtividade por colaborador, retornos, efetividade, carteira). **Produtividade por colaborador** é o relatório operacional completo (volume, taxa de resposta, horários, comparativos e listas), com nomes de colaborador na UI/exportação. Filtros respeitam `escopoCondominios` e permissões; exportação via `GET /api/relatorios/export` exige `relatorios.exportar`. CSV UTF-8 com BOM; XLS via XML SpreadsheetML (padrão do projeto). Sem dados ilustrativos na UI. URLs legadas `?relatorio=equipe`, `?aba=cobranca` e `/relatorios/produtividade` redirecionam para `?relatorio=produtividade`.
- **Conferência de indicadores (T35):** catálogo e fórmulas em `docs/modulos/conferencia-indicadores.md` e `src/lib/indicadores/catalogo-oficial.ts`. Consulta de referência: `GET /api/indicadores/conferencia`. Separação RE autor / carteira atual / carteira na data; propostas canceladas ou recusadas fora de negociações; meta com data/hora de geração e filtros no dashboard, indicadores e produtividade. Taxa de resposta e eficiência apenas como referência operacional (não oficial).
- Relatórios por condomínio / advogado / RE (administradora)
- Histórico completo das ações
- Auditoria das alterações

### Auditoria (consulta)

- **Quem consulta:** perfil com permissão `auditoria.ler` (Administradora no seed padrão).
- **Como:** tela `/auditoria` e `GET /api/auditoria` (somente leitura).
- **Gravação:** automática via `registrarAuditoria` nos serviços de API após INSERT/UPDATE/DELETE; sanitização centralizada (sem senhas/tokens); não há exclusão de eventos pela interface.
- **Consulta:** filtros por período, colaborador/RE, entidade e tipo de ação em `GET /api/auditoria`; atendentes identificados por **RE** na coluna *Quem fez*.
- Detalhes por entidade e contrato: [modulos/auditoria.md](modulos/auditoria.md).

---

## 4. Dados

Pontos a definir e documentar:

- Quais são as principais entidades do sistema?
- Quais informações precisam ser armazenadas?
- Como essas informações se relacionam?
- Quem cria cada informação?
- Quem pode alterá-la?
- O que acontece quando ela é excluída?

---

## 6. Regras de negócio

Essa é uma das partes mais importantes. Pontos a detalhar:

- Quais regras o sistema precisa seguir?
- Existem cálculos automáticos?
- Existem limites?
- Existem condições do tipo “se X, então Y”?
- O que acontece quando uma condição não é atendida?
- Existem regras diferentes dependendo do usuário, status ou situação?

---

## 7. Integrações

Pontos a definir:

- O sistema conversa com outros sistemas?
- Quais APIs são utilizadas?
- Quais dados entram e saem?
- O que acontece se uma integração estiver indisponível?
- Existem pagamentos, WhatsApp, e-mail, marketplaces, bancos etc.?

**Integrações mencionadas no escopo:**

- Superlógica e sistemas das demais administradoras (débitos em aberto)
- Canais de cobrança: WhatsApp, telefone e e-mail

---

## 8. Exceções

Responder: **“O que acontece se o usuário fizer algo que não deveria?”**

Também considerar:

- E se faltar uma informação?
- E se houver dados duplicados?
- E se uma operação falhar?
- E se a API externa estiver fora do ar?
- E se o usuário fechar a página no meio do processo?
