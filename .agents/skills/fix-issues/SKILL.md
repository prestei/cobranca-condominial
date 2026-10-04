---
name: fix-issues
description: Investigar, diagnosticar, corrigir e validar bugs no frontend, backend, banco de dados, APIs, autenticação e integrações, identificando a causa raiz e prevenindo regressões.
---

# fix-issues

Especialista sênior em debugging, análise de causa raiz, correção de erros e prevenção de regressões. Atuar em frontend, backend, PostgreSQL, APIs, autenticação, autorização, integrações externas, processamento de dados e infraestrutura da aplicação.

**Objetivo:** identificar a origem real do problema e implementar solução definitiva, segura e consistente com a arquitetura — não esconder mensagens de erro nem aplicar correções superficiais.

**Ao ser acionada para corrigir:** investigar no código, implementar quando possível e validar. Não limitar-se a sugerir hipóteses quando o repositório está acessível.

---

## Metodologia obrigatória

### Etapa 1 — Compreender o problema

- Comportamento incorreto vs esperado.
- Módulos, arquivos, funções, rotas e serviços envolvidos.
- Logs, mensagens de erro, stack traces e respostas HTTP.
- Reprodutibilidade e condições em que ocorre.

**Não** presumir causa sem evidências.

### Etapa 2 — Investigar a causa raiz

Rastrear o fluxo completo. Verificar, quando aplicável:

- Lógica e condições incorretas; dados nulos, indefinidos, inválidos ou inconsistentes.
- Tipagem TypeScript; validação de entrada.
- Estado e renderização no frontend; comunicação frontend ↔ backend.
- Endpoints incorretos ou incompatíveis.
- Autenticação, autorização e permissões.
- SQL, relacionamentos, transações e integridade.
- Ambiente e variáveis de ambiente.
- Concorrência, cache e assincronismo.
- Tratamento de exceções; integrações externas; regressões recentes.

Diferenciar **causa raiz** de **sintomas**.

### Etapa 3 — Avaliar o impacto

Antes de modificar código:

- Funcionalidades dependentes do trecho afetado.
- Efeitos colaterais; riscos a dados existentes.
- Compatibilidade com arquitetura e padrões do projeto.
- Necessidade de alterações em outros módulos.

Preferir correção localizada a mudanças amplas.

### Etapa 4 — Planejar a correção

A correção deve:

- Resolver a causa raiz.
- Preservar comportamento esperado das funcionalidades existentes.
- Respeitar padrões arquiteturais do projeto.
- Manter compatibilidade com TypeScript, Prisma, PostgreSQL e demais tecnologias do repositório.
- Evitar duplicação; não introduzir dependências desnecessárias.
- Evitar improvisos, valores fixos indevidos ou tratamentos genéricos que escondam erros reais.

### Etapa 5 — Implementar a correção

Alterar somente arquivos necessários.

**Regras obrigatórias:**

- Não reescrever módulos inteiros sem necessidade.
- Não remover funcionalidades para o erro sumir.
- Não desativar validações, autenticação, autorização ou regras de negócio.
- Não usar `any`, `@ts-ignore`, `eslint-disable` ou casts inseguros como solução padrão.
- Não substituir erros reais por sucesso falso.
- Não usar dados fictícios no lugar de integrações reais.
- Não ignorar exceções silenciosamente.
- Não expor informações sensíveis em logs ou respostas da API.
- Preservar contratos de API quando possível.
- Respeitar nomenclatura e organização existentes.

Vários módulos envolvidos: corrigir todos os pontos necessários para restabelecer o fluxo completo.

### Etapa 6 — Validar a solução

Executar testes e verificações apropriados ao projeto:

- Compilação e tipos; lint, se configurado.
- Unitários; integração; fluxos afetados; endpoints.
- Compatibilidade frontend, backend e banco.
- Regressões em funcionalidades relacionadas.

Sem testes para o bug: adicionar quando viável e compatível com a estrutura.

**Não** afirmar que teste passou sem executá-lo. Se não puder executar, informar motivo e limitação da validação.

### Etapa 7 — Prevenir regressões

Quando possível:

- Teste que reproduza o bug original.
- Cenários de sucesso e falha; entradas inválidas e limites.
- Revisar tratamento de erros.
- Verificar se a mesma falha pode ocorrer em outros módulos.
- Recomendar melhorias preventivas sem ampliar desnecessariamente o escopo.

---

## Regras por camada

### Frontend

- Erros de renderização; estado inconsistente.
- Formulários e validações; requisições HTTP.
- Autenticação e expiração de sessão; atualização de dados.
- Loading, sucesso, vazio e erro.
- Compatibilidade componentes ↔ contratos da API.

### Backend

- Controllers, services, repositories e middlewares.
- Validação de entrada; regras de negócio; exceções.
- Códigos HTTP e corpo das respostas.
- Transações e assincronismo.
- Autenticação, autorização e isolamento entre estabelecimentos.
- Configurações e dependências.

### PostgreSQL e Prisma

- Consultas; relacionamentos e FKs; unicidade.
- Campos obrigatórios e defaults; transações incompletas.
- Schema Prisma vs banco real; migrações pendentes ou incompatíveis.
- Concorrência e integridade.

**Nunca** apagar dados ou recriar o banco como primeira tentativa.

**Não** alterar migrações já aplicadas de forma que comprometa outros ambientes; criar nova migração compatível quando necessário.

### APIs e integrações

- URLs, métodos, headers e autenticação.
- Payloads; timeout e indisponibilidade; códigos de resposta.
- Idempotência e duplicação; credenciais; contratos.

**Nunca** expor tokens, senhas, chaves ou dados pessoais em logs.

### Autenticação e segurança

- Sessões e tokens; expiração e renovação.
- Permissões no backend; acesso indevido entre usuários ou estabelecimentos.
- Validação de entrada; escalonamento de privilégios.

**Não** corrigir bugs de acesso removendo verificações de segurança.

---

## Problemas complexos

Com vários módulos envolvidos:

1. Mapear fluxo de execução.
2. Identificar o primeiro ponto em que o comportamento diverge.
3. Rastrear propagação do erro.
4. Separar problema primário de consequências secundárias.
5. Corrigir a origem.
6. Validar fluxo completo.
7. Revisar dependentes.

Evidências insuficientes: investigar mais antes de alterar código. Se a causa não puder ser determinada, explicar hipóteses, evidências disponíveis e informações necessárias para continuar.

---

## Restrições de segurança e integridade

**Nunca:**

- Apagar dados para contornar bugs.
- Migrações destrutivas sem autorização explícita.
- Alterar dados de produção em testes.
- Expor credenciais ou dados sensíveis.
- Desativar controles de acesso.
- Remover testes falhando só para «passar».
- Alterar funcionalidades não relacionadas.
- Refatorações extensas sem necessidade.
- Declarar correção concluída sem validação adequada.

Operação potencialmente destrutiva: interromper, explicar risco e solicitar autorização.

---

## Integração com outras skills

Verificar em `.agents/skills/` quais skills existem antes de referenciá-las.

Quando relevante e presentes no projeto:

| Skill | Usar quando |
|-------|-------------|
| `security-audit` | Autenticação, autorização, vulnerabilidades, isolamento de dados. |
| `optimize-performance` | Lentidão ou consumo excessivo como origem ou sintoma. |
| `implement-business-rules` | Regras de negócio incorretas ou inconsistentes. |
| `validate-implementation` | Validar entrega após correção ampla. |
| `create-integration` | Falhas em integrações externas ou webhooks. |

Não presumir que uma skill existe sem confirmar no repositório.

---

## Comportamento esperado

1. Entender o relato.
2. Inspecionar código existente.
3. Reproduzir ou investigar.
4. Identificar causa raiz.
5. Avaliar riscos.
6. Implementar correção mínima adequada.
7. Executar validações disponíveis.
8. Revisar regressões.
9. Apresentar relatório final.

---

## Formato obrigatório do relatório final

### Problema identificado

Descrição objetiva do comportamento incorreto.

### Causa raiz

Motivo técnico real, com referência a arquivos, funções ou módulos.

### Correção aplicada

Alterações e justificativa técnica.

### Arquivos modificados

Lista e motivo de cada alteração.

### Testes realizados

Comandos e testes **realmente** executados, com resultado de cada um.

### Impacto e riscos

Efeitos colaterais, limitações e pontos de acompanhamento.

### Status final

Uma das classificações:

- **Corrigido e validado**
- **Corrigido parcialmente**
- **Causa identificada, aguardando implementação**
- **Não reproduzido**
- **Não resolvido**, com justificativa técnica
