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
- **Atendentes:** registrar tentativas de cobrança; acompanhamentos de retorno; consulta de atendimentos.
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

**Resumo:** Registrar atendimentos; ver atendimentos do dia e agenda de retornos; marcar retorno como feito.

#### Advogado

- Login → resumo geral com métricas e KPIs importantes
- Consultar relatórios e histórico dos condomínios sob sua responsabilidade

---

## 3. Funcionalidades

### Dashboard

- Visão geral da inadimplência
- Unidades com débito vencido
- Valores em aberto
- Acordos e pagamentos
- Indicadores por condomínio
- Indicadores por responsável

### Colaboradores e permissões

- Cadastro de colaboradores
- Cargos e permissões configuráveis pelo administrador: para cada módulo do sistema, o cargo define se pode **ver**, **criar**, **editar**, **excluir** e, em relatórios, **exportar** (matriz em `/cargos`, persistida em `role.permissao_json`).
- Controle de acesso: menu e rotas respeitam permissão de **ver**; botões de mutação respeitam criar/editar/excluir/exportar. Sem permissão de ver → página `/acesso-negado`.

### Condomínios e unidades

- Cadastro de condomínios
- Responsável jurídico
- Cadastro de unidades
- Proprietários e responsáveis financeiros
- Histórico da unidade

**Unidades (T06):** identificação única por condomínio (`identificacao` + condomínio); inativação preserva débitos, atendimentos e vínculos; exclusão só sem histórico. Responsável financeiro principal marcado no vínculo (`principal`). Situação de cobrança **Sem cobrança** é o padrão ao criar unidade (fora da fila de inadimplência; badge neutro na coluna Cobrança). **Em cobrança**, **Em acordo**, **Notificada** e **Ajuizada** entram na fila operacional. **Quitada** tira a unidade da fila: na listagem, coluna Débito exibe **Em dia** (verde) mesmo que existam débitos históricos consultáveis. A transição automática Sem cobrança → Em cobrança ao importar débitos vencidos **permanece pendente** (ver [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md)). API `/api/unidades` valida permissão e escopo de condomínio no servidor. Dados pessoais de responsáveis mascarados para perfis sem necessidade operacional (ex.: advogado em consulta).

### Inadimplência

**Importação (T13):** fluxo em `/importacoes` com prévia obrigatória (`POST /api/importacoes/debitos/preview`) e confirmação (`…/confirmar`). Mapeamento de condomínio/unidade por nome, ID ou identificador externo do condomínio + identificação da unidade (bloco quando necessário). Linhas inválidas não gravam; reimportação do mesmo arquivo (hash SHA-256) não duplica débitos; débitos manuais sem identificador externo não são sobrescritos; débitos ausentes do arquivo **não** são cancelados. Histórico em `import` com quantidades lidas, importadas, atualizadas e erros. Formato genérico `planilha-inadimplencia-v1` (CSV/XLS); PDF e layouts por administradora — pendente.

- Integração com administradoras (Superlógica e leitores futuros)
- **Gestão de débitos (T14):** listagem em `/debitos` via `GET /api/debitos` (escopo e permissão no servidor). Valores exibidos são os persistidos; indicadores na data-base somam `valor_atualizado` **sem duplicar** o mesmo `identificador_externo`. Campos `fonte_valores` (`origem` | `manual`) e `atualizado_em` distinguem importação de correção manual; alterações manuais geram `audit_log`. O sistema **não recalcula** juros, multa ou correção ausentes na origem.
- Controle dos débitos (manual + importado)
- Identificação de inadimplentes
- **Quitação:** `POST /api/debitos/unidade/{id}/confirmar-quitacao` marca a unidade como `Quitada` (fora da fila); atendimentos e débitos históricos permanecem.
- Regra de entrada na cobrança (pendente)
- Atualização dos valores (importação atualiza só com ID externo ou equivalência; demais casos em DECISOES_PENDENTES)

### Fila de cobranças (T08)

- Integrada à tela `/atendimentos`, aba **Fila de cobranças** (`?aba=fila`); atalho `/fila` redireciona para essa aba.
- Lista unidades em cobrança ativa via `GET /api/fila` (dados do cadastro persistido em memória no protótipo).
- **Administradora:** carteira geral no escopo; filtros por condomínio, situação, RE e retorno; paginação no servidor.
- **Atendente:** somente unidades com atribuição vigente ao seu RE (`collection_assignment` / seed).
- **Advogado:** sem `atendimentos.ler` — não acessa a fila operacional.
- Quitada / inativa cadastral não entra na fila; histórico permanece na aba Registros e em unidades.
- Regra de **quando** o débito entra em cobrança: pendente de aprovação (fora do T08).

### Distribuição de cobranças (T09)

- Aba **Distribuição** em `/atendimentos?aba=distribuicao`; atalho `/distribuicao` redireciona para essa aba.
- Apenas perfil com permissão de gestão de equipe (`usuarios.criar` no seed = Administradora) distribui ou redistribui.
- Atribuição manual por **RE** do atendente; interface operacional exibe RE, não nome pessoal.
- Cada mudança gera novo registro em `collection_assignment`; vigência anterior recebe `encerrado_em`, `anterior_atendente_id` e motivo quando informado.
- A cobrança passa a aparecer na carteira do novo RE e deixa de ser vigente para o anterior; **atendimentos (`service_ticket`) mantêm o autor original**.
- Distribuição em lote é **atômica**: se alguma unidade falhar na validação, nenhuma alteração é aplicada.
- Produtividade e relatórios históricos contam ações pelo autor do registro, não pelo responsável atual da carteira.
- Distribuição **automática** (rodízio, carga, etc.): não implementada — ver [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md).

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
- Agenda de retornos (T11): aba **Retornos** em `/atendimentos?aba=retornos`; listagem via `GET /api/retornos`; conclusão via `POST /api/atendimentos/[id]/concluir-retorno` (preserva agendamento original; histórico permanece)
- Atendente conclui retornos só da carteira vigente; administradora acompanha por RE
- Situação da unidade: em cobrança, em acordo, notificada, ajuizada ou quitada

### Negociação e pagamentos

- **Propostas de negociação (T15):** registro via `/api/propostas` e sheet **Proposta** (fila / histórico da unidade). Vincula unidade, autor, valor proposto, observações e débitos (`debitoIds`). Status: Em análise, Aceita, Recusada, Cancelada. Confirmar acordo (`Aceita`) exige `termosAprovados` textuais e grava origem (`acordo_confirmado_*`); **não** baixa débito nem registra pagamento. Alterações de status auditadas (`negotiation_proposal`). Entrada, quantidade de parcelas na proposta e aprovação formal ampliada: ver [DECISOES_PENDENTES.md](DECISOES_PENDENTES.md).
- **Parcelas e pagamentos de acordo (T16):** após proposta **Aceita**, parcelas previstas em `/api/propostas/:id/parcelas` e pagamentos em `/api/propostas/:id/pagamentos`. Pagamento **Informado** ≠ recebimento confirmado; quitação de parcela e saldo do acordo usam apenas pagamentos **Confirmados** (regra de saldo de débitos e fonte de confirmação: decisão pendente). Potencial descumprimento = parcela vencida sem quitação confirmada — **não** rotular acordo como quebrado sem regra aprovada. Correções auditadas em `agreement_installment` e `agreement_payment`. Detalhes: [modulos/negociacoes.md](modulos/negociacoes.md).

### Jurídico e gestão

- Encaminhamento para advogado
- Análise para cobrança judicial
- Documentos da cobrança
- Relatórios gerenciais
- Relatórios por condomínio
- Relatórios por atendente/advogado
- Histórico completo das ações
- Auditoria das alterações

### Auditoria (consulta)

- **Quem consulta:** perfil com permissão `auditoria.ler` (Administradora no seed padrão).
- **Como:** tela `/auditoria` e `GET /api/auditoria` (somente leitura).
- **Gravação:** automática via `registrarAuditoria` nos serviços de API após INSERT/UPDATE/DELETE; não há exclusão de eventos pela interface.
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
