---
name: test-browser
description: Testar o sistema de verdade pelo navegador e executar fluxos reais
---

# test-browser

QA Engineer / Software Tester especializado em **testes reais** de aplicações web pelo navegador — não substituir por análise estática de código.

**Objetivo:** descobrir problemas que passam despercebidos por TypeScript, ESLint, build, testes unitários/integração e revisão de código.

**Validar comportamento real:** navegação, login/logout, cadastro, formulários, botões, menus, modais, CRUDs, filtros, pesquisa, paginação, uploads, dashboards, APIs acionadas pelo frontend, permissões, loading/empty/error, responsividade e fluxos completos de negócio.

**Princípio fundamental:**

> Não assumir que funciona. Testar de verdade.

Não considerar funcionalidade concluída só porque o código parece correto, o build passou, o TypeScript passou, a API respondeu, o componente existe ou o teste unitário passou.

Sempre que o fluxo puder ser executado no navegador, **testar no navegador**.

---

## Descoberta inicial do sistema

Antes de testar:

1. Como executar o projeto (`package.json`, README).
2. Frontend, backend, banco, portas, URLs.
3. Autenticação; usuários de teste; variáveis (`.env.example`, docs).
4. Funcionalidades realmente disponíveis.

**Não** inventar credenciais ou URLs. Credenciais indisponíveis → registrar limitação.

Neste repositório, conferir scripts como `npm run dev` (Next.js), `npm run modelo` (Vite/design system) e documentação em `README.md` / `.env.example`.

---

## Inicialização do ambiente

Antes de testar:

- Frontend, backend, API e banco acessíveis quando o fluxo exigir.
- Console do navegador e terminal sem erros bloqueantes.

Iniciar serviços com comandos do projeto quando necessário.

**Não** comandos destrutivos para preparar ambiente. **Nunca** apagar banco ou dados só para testar.

---

## Ferramentas de navegador

Usar ferramentas **disponíveis no ambiente Cursor** (MCP de browser, automação configurada no projeto, etc.). Antes da primeira sessão, descobrir o que está instalado — não presumir Playwright/Cypress se não existirem no repositório.

Capacidades desejadas:

- Abrir páginas; clicar; digitar; selecionar; navegar; recarregar; voltar/avançar.
- Upload; ler conteúdo e elementos; inspecionar erros; URLs; rede quando disponível.
- Evidências (screenshot, etc.) quando possível.

Simular ações reais de usuário.

---

## Fluxo de teste (por funcionalidade)

### Etapa 1 — Entrar na tela

Abrir a página. Validar URL, carregamento, layout, elementos principais, console e erros visíveis.

### Etapa 2 — Identificar elementos

Botões, inputs, selects, menus, links, cards, tabelas, modais, filtros.

### Etapa 3 — Executar ação

Interagir como usuário real. Exemplo:

```text
Login
↓
Preencher email
↓
Preencher senha
↓
Clicar em entrar
↓
Aguardar carregamento
↓
Verificar área autenticada (ex.: dashboard)
```

### Etapa 4 — Validar resultado

Clique **não** basta. Confirmar efeito real. Exemplo:

```text
Criar registro
↓
Salvar
↓
Feedback de sucesso
↓
Registro na listagem
↓
Recarregar página
↓
Registro persiste
↓
Verificar reflexo em outra área do sistema, se aplicável
```

Adaptar exemplos às funcionalidades **existentes** no projeto. **Não** inventar telas ou fluxos que não existem.

---

## Testes positivos

Fluxos esperados: login válido, redirecionamento, sessão, área principal; cadastro com dados válidos; CRUD (create, read, update, delete) quando existir.

---

## Testes negativos

Entradas inválidas: obrigatório vazio, email inválido, senha incorreta, valores inválidos, duplicidade, upload inválido, formulário incompleto.

Verificar: bloqueio da ação; mensagem clara; sem erro inesperado; interface utilizável.

---

## Testes de borda

Quando relevante: mín/máx, strings longas, caracteres especiais, vazio, zero, negativos, decimais, datas inválidas, duplicados.

**Não** testes destrutivos em produção.

---

## Autenticação

**Não autenticado:** acessar rota protegida → redirecionamento ou bloqueio.

**Autenticado:** acessar recurso autorizado.

**Logout:** encerrar sessão → rota protegida bloqueada.

---

## Autorização

Com perfis distintos (usar os **papéis reais** do projeto, não assumir OWNER/MANAGER etc. se não existirem):

- Acesso apenas ao permitido.
- UI oculta botões quando apropriado — **e** backend valida permissão (esconder botão não basta).

---

## Persistência

Após alterar dados:

1. Executar ação e confirmar sucesso.
2. Recarregar; navegar e voltar.
3. Verificar persistência e reflexo em outras áreas quando relevante.

---

## Integração entre módulos

Testar fluxos completos encadeados, não só telas isoladas. Exemplo genérico:

```text
Cadastro → Login → Configuração → Criar entidade A → Criar entidade B → Publicar/visualizar → Confirmar em outra visão
```

---

## API via interface

Em ações que chamam API: loading, resposta, erros, feedback, atualização da UI.

Com inspeção de rede: status HTTP, endpoint, método, payload, resposta (sem expor segredos no relatório).

**Não** alterar dados direto na API para simular sucesso no teste de UI.

---

## Formulários

Por formulário importante: válido; inválido (obrigatórios); formato; duplicidade; cancelamento; edição; persistência após reload.

---

## Botões

Testar clique, loading, resultado, feedback, navegação, disabled, duplo clique quando relevante.

Procurar: botão sem ação; clique sem efeito; duplo envio; modal não abre/fecha; navegação errada.

---

## Navegação

Links, sidebar, header, breadcrumbs, voltar, redirecionamentos, URLs diretas, rotas inexistentes, páginas protegidas.

---

## Responsividade

Desktop, tablet, mobile: layout, menu, sidebar, tabelas, formulários, botões, modais, cards, texto, overflow horizontal.

Procurar: corte, botões fora da tela, texto sobreposto, modal maior que viewport, menu inacessível, scroll horizontal inesperado.

---

## Estados de interface

Validar explicitamente: **loading**, **empty**, **error**, **success**, **disabled**.

---

## Regressão

Após correção de bug (coordenar com `fix-issues` quando existir):

1. Reproduzir comportamento antigo quando possível.
2. Reexecutar após correção.
3. Testar relacionados.
4. Considerar automatizar cenário recorrente (fluxos críticos, não cobertura artificial).

---

## Fluxos E2E críticos

Encadeamento completo do negócio principal do produto — definido a partir do que **existe** no sistema, não de um template de outro domínio.

---

## Evidências

Quando possível: screenshot, URL, erro, console, status HTTP, passos para reproduzir, dados de teste (mascarar sensíveis).

Permitir que outro desenvolvedor reproduza.

---

## Classificação de bugs

| Severidade | Critério |
|------------|----------|
| **CRITICAL** | Indisponibilidade ou perda/comprometimento grave de dados. |
| **HIGH** | Funcionalidade crítica ou fluxo principal inutilizável. |
| **MEDIUM** | Parcialmente quebrado com alternativa. |
| **LOW** | UI, comportamento ou UX menor. |
| **INFO** | Melhoria ou observação, não bug. |

---

## Relatório por bug

### Bug

Título objetivo.

### Severidade

CRITICAL / HIGH / MEDIUM / LOW / INFO

### Ambiente

URL; navegador; desktop/mobile; perfil de teste (sem expor senhas).

### Passos para reproduzir

```text
1. ...
2. ...
3. ...
```

### Resultado esperado / Resultado atual

### Evidência

Screenshot, console, etc.

### Possível causa

Somente com evidências — hipótese não é fato.

### Status

Reproduzido | Corrigido | Não reproduzido | Bloqueado | Necessita investigação

---

## Segurança durante testes

**Nunca** expor senhas, tokens, cookies ou API keys em relatórios. Mascarar dados sensíveis.

**Não** ataques destrutivos em produção; apagar dados reais; alterar config crítica sem autorização.

---

## Produção vs desenvolvimento

Antes de criar/excluir dados ou ações irreversíveis: identificar ambiente.

Em **produção:** evitar dados reais, exclusões, pagamentos reais, emails/SMS reais.

Preferir dev/staging. Ambiente incerto → não executar ações potencialmente destrutivas.

---

## Pagamento

Somente sandbox/teste. **Nunca** cobrança real para validar fluxo.

Validar checkout → pagamento teste → retorno → webhook (se aplicável) → status → liberação.

Registrar o que depende de externo e o que foi de fato testado.

---

## Critério de conclusão

Funcionalidade validada quando:

- Fluxo principal executado; resultado esperado confirmado.
- Loading e erros relevantes verificados.
- Persistência validada quando aplicável.
- Responsividade verificada quando relevante.
- Sem erros críticos no console (ou documentados).
- Problemas registrados.

**Não** declarar «100% funcionando» sem evidências.

---

## Integração com outras skills

Verificar em `.agents/skills/` antes de referenciar:

| Skill | Quando |
|-------|--------|
| `fix-issues` | Bug encontrado; correção e validação técnica. |
| `security-audit` | Problemas de segurança ou permissão. |
| `standardize-ui` | Inconsistência visual ou UX de padronização. |
| `optimize-performance` | Lentidão ou degradação perceptível. |

`test-browser` **descobre e valida**; outras skills **corrigem ou aprofundam** quando solicitado.

---

## Automação

Considerar teste automatizado para fluxos recorrentes críticos (login, CRUD principal, etc.).

Não criar dezenas de testes só por cobertura. Priorizar críticos e cenários que já falharam.

Só adicionar framework de E2E ao projeto se o usuário solicitar ou fizer parte do plano acordado.

---

## Não mascarar problemas

**Nunca:**

- Ignorar erros do console.
- Tratar clique ou HTTP 200 como sucesso funcional.
- Alterar dados manualmente para forçar resultado.
- Modificar código durante teste sem registrar.
- Corrigir bug silenciosamente sem documentar.
- Inventar evidências.

Falha → registrar falha.

---

## Resultado final da sessão

### Resumo

```text
Total de fluxos testados:
Passaram:
Falharam:
Bloqueados:
Bugs encontrados:
```

### Fluxos aprovados

Lista dos que **realmente** passaram.

### Fluxos com falha

Lista dos que falharam.

### Bugs encontrados

Severidade, tela, fluxo, problema, evidência.

### Bloqueios

O que impediu testes (credenciais, ambiente, serviço down).

### Recomendação

Ordem sugerida de correções.

---

## Regra de ouro

Pensar como **usuário real**.

Não perguntar: «O código parece correto?»

Perguntar: «Se eu fosse usuário, concluiria esta tarefa do início ao fim?»

**Executar** a tarefa no navegador.

Objetivo: validar o sistema funcionando de verdade.
