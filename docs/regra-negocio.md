# Regras de negócio — Painel jurídico de cobrança condominial

## Objetivo

Criar um controle de pagamento e dívidas de proprietários de vários condomínios, onde o escritório de advocacia é responsável por gerenciar e tratar, de forma judicial ou extrajudicial, os proprietários inadimplentes.

Palitagem e painel de inadimplência são **um único sistema**. Compartilham condomínio, unidade, colaborador e o débito da unidade. O atendimento é o registro da cobrança daquela unidade. Não existe um cadastro separado de processo de cobrança.

---

## 1. Entendimento do negócio

### Qual problema esse sistema resolve?

Automatiza e organiza o processo do escritório de advocacia responsável pela cobrança extrajudicial/judicial de proprietários de imóveis inadimplentes de um grupo de **35 condomínios** atendidos pelo escritório. O objetivo principal é ter **controle e rastreabilidade** sobre todo o fluxo de cobrança, levantar dados de atendimentos e gerar relatórios completos com dados externos e internos.

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
- Cargos e permissões
- Controle de acesso

### Condomínios e unidades

- Cadastro de condomínios
- Responsável jurídico
- Cadastro de unidades
- Proprietários e responsáveis financeiros
- Histórico da unidade

### Inadimplência

- Importação de dados
- Integração com administradoras
- Validação dos dados
- Controle dos débitos
- Identificação de inadimplentes
- Regra de entrada na cobrança
- Atualização dos valores

### Palitagem

- Lista de unidades com débito vencido
- Registro do atendimento pelo colaborador logado
- Histórico de contatos da unidade
- WhatsApp, telefone e e-mail
- Agendamento de retorno
- Situação da unidade: em cobrança, em acordo, notificada, ajuizada ou quitada

### Negociação e pagamentos

- Propostas de negociação
- Entrada e parcelamento
- Registro de acordos
- Controle de parcelas
- Registro de pagamentos
- Controle de acordos quebrados
- Atualização do saldo devedor

### Jurídico e gestão

- Encaminhamento para advogado
- Análise para cobrança judicial
- Documentos da cobrança
- Relatórios gerenciais
- Relatórios por condomínio
- Relatórios por atendente/advogado
- Histórico completo das ações
- Auditoria das alterações

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
