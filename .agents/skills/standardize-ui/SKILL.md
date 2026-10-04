---
name: standardize-ui
description: Padronizar visual, componentes, layout e comportamento entre telas
---

# standardize-ui

Especialista sênior em UI/UX, design systems, design tokens, componentização, consistência visual, responsividade, acessibilidade, microinterações, estados de interface, hierarquia visual, layouts e experiência do usuário.

**Objetivo:** fazer telas e módulos parecerem **parte do mesmo produto** — identidade consistente, profissional e moderna — sem aplicar um estilo novo de forma indiscriminada.

**Antes de modificar:** analisar o design existente, identificar padrões já usados e preservar a identidade visual do projeto.

**Neste repositório:** a fonte dos componentes é `src/components/` (usáveis em qualquer página). Tokens em `src/app/globals.css` (`@theme`) e a documentação em `docs/design-system.md`. A rota `/design-system` é o arquivo `src/pages/design-system.tsx`, que só lista esses componentes. Alinhar padronização a esses tokens e componentes globais; reutilizar orientações da skill `create-screen` ao criar ou ajustar telas. Se caminhos ou arquivos não existirem, confirmar no repositório antes de inventar padrões paralelos.

---

## Filosofia

> Consistência antes de ornamentação.

A interface deve parecer planejada e intencional. Não adicionar elementos só para «deixar bonito».

**Evitar:**

- Gradientes excessivos; sombras exageradas; bordas desnecessárias.
- Animações em excesso; efeitos aleatórios; glassmorphism indiscriminado.
- Ícones inconsistentes; cores sem função.
- Estilos de botão diferentes para a mesma ação.
- Espaçamentos ou formulários diferentes em situações equivalentes.
- Componentes visualmente semelhantes implementados de formas completamente diferentes.

**Transmitir:** profissionalismo, clareza, confiança, hierarquia, consistência, facilidade de uso.

Evitar aparência genérica ou excessivamente «gerada por IA».

---

## Processo obrigatório de análise (auditoria visual)

Antes de modificar, revisar:

- Layout geral; header; sidebar; navegação; breadcrumbs.
- Cards; botões; inputs; selects; checkboxes; radio; switches.
- Modais; drawers; dropdowns; tooltips.
- Tabelas; listagens; paginação; tabs; badges.
- Alertas; toasts; loading; empty; error; skeletons.
- Formulários; gráficos; filtros; menus; rodapé; responsividade.

Identificar duplicatas ou equivalentes visuais que deveriam compartilhar o mesmo componente base.

---

## Design tokens

Se o sistema de tokens estiver inconsistente, criar ou organizar — **adaptando** ao padrão já existente no projeto (ex.: variáveis em `styles.css` / `:root`), sem reescrever toda a escala sem necessidade.

### Cores (semânticas)

Primary, secondary, background, surface, surface elevated, border, text primary/secondary/muted, success, warning, error, info.

Não espalhar hex arbitrários nos componentes. Preferir tokens do projeto, por exemplo:

```css
var(--color-primary)
var(--color-background)
var(--color-surface)
var(--color-border)
var(--color-text-primary)
```

ou equivalentes já definidos (`var(--primary)`, etc.).

### Espaçamento

Escala de referência: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px — ajustar se o projeto já usar outra escala coerente.

### Border radius

Pequeno, médio, grande, pill. Evitar radius arbitrário por componente.

### Sombras

Níveis consistentes de elevação. Não sombrear todos os elementos.

### Tipografia

Família, tamanho, peso, line-height, letter-spacing.

Hierarquia: display, H1–H4, body, small, caption, label.

---

## Componentes

Consolidar padrões repetidos.

### Buttons

Variantes: primary, secondary, outline, ghost, destructive, link.

Estados: normal, hover, active, focus, disabled, loading. Não multiplicar estilos para ações equivalentes.

### Inputs

Label, placeholder, input, helper, error, disabled, focus, required. Formulários com comportamento visual semelhante.

### Cards

Padding, border, radius, header, content, footer, hover. Funções semelhantes → estrutura semelhante.

### Modais

Overlay, posicionamento, largura, header, conteúdo, footer, fechamento, responsividade.

### Tables

Header, linhas, hover, seleção, ações, paginação, empty, loading, responsividade.

---

## Layout

Padronizar: largura máxima, container, grid, colunas, gutters, margens, espaçamento vertical, alinhamentos.

Evitar desalinhamento sem motivo entre elementos equivalentes.

Estrutura de referência para páginas equivalentes:

```text
Page
 ├── Header
 ├── Page title
 ├── Description
 ├── Actions
 ├── Filters
 ├── Content
 └── Pagination
```

Telas com função semelhante devem seguir o mesmo esqueleto (ex.: `app-layout`, sidebar, top bar do modelo).

---

## Responsividade

Verificar: desktop, notebook, tablet, mobile.

Não apenas reduzir elementos. Adaptar grid, sidebar, navegação, tabelas, formulários, cards, modais, botões, espaçamentos e tipografia.

Mobile: legibilidade, touch targets, navegação simples, conteúdo prioritário, menor densidade.

---

## Estados de interface

### Loading

Skeleton, spinner ou loading button. Evitar tela congelada.

### Empty

Mensagem clara; motivo; próximo passo; ação relevante quando possível.

### Error

Compreensível; evitar jargão técnico desnecessário; recuperação quando possível.

### Success

Toast, feedback inline ou estado visual após ações concluídas.

---

## Acessibilidade

Contraste; focus visível; teclado; labels; ARIA quando necessário; semântica HTML; touch targets; disabled; erros associados aos campos.

**Não** remover indicadores de foco por estética.

---

## Ícones

Uma biblioteca; tamanho, stroke e peso consistentes; alinhamento.

Não misturar bibliotecas sem necessidade. Evitar emojis como ícones profissionais (ex.: 🚀 Dashboard).

Usar a biblioteca já adotada no projeto (ex.: Font Awesome no modelo, se for o caso).

---

## Animações e microinterações

Com propósito: feedback, transição, hierarquia, orientação, confirmação.

Evitar: animação constante, movimento excessivo, delays desnecessários, atrapalhar produtividade.

Se o projeto usa GSAP, Motion.dev, Anime.js ou Three.js, respeitar o padrão existente. Não adicionar bibliotecas só por estética.

---

## Consistência comportamental

Padronizar fluxos, não só aparência.

Exemplos: confirmação antes de excluir; salvar → loading → sucesso → toast; fechamento de modais; cancelamento; erros; navegação; atualização de dados.

Comportamento equivalente entre telas para ações equivalentes.

---

## Arquitetura de componentes

Antes de criar, buscar `Button`, `Input`, `Select`, `Modal`, `Card`, `Table`, `Badge`, `Toast`, `Tabs`, `Dropdown` (ou classes globais do design system).

Evitar `CustomButton`, `NewButton`, `ModernButton`, etc., sem justificativa.

Componentes: reutilizáveis, componíveis, previsíveis, tipados, fáceis de manter. Sem abstração exagerada; não componentizar todo detalhe.

---

## Evitar duplicação visual

Consolidar quando a mesma ação usa botões de cores diferentes, cards com paddings aleatórios (16/20/24 px) ou modais com larguras (500/600/720 px) sem razão funcional.

---

## Preservação da identidade visual

Não substituir automaticamente a identidade do projeto.

1. Identificar identidade atual (`DESIGN.md`, tokens, telas modelo).
2. O que já funciona.
3. Inconsistências.
4. Preservar o que está bom.
5. Alterar só o necessário para consistência.

Identidade estabelecida = fonte principal.

---

## Performance

Padronização não deve degradar desempenho.

Evitar: componentes pesados, animações contínuas, imagens enormes, bibliotecas duplicadas, CSS/JS redundante para efeitos simples.

Preferir CSS quando resolve o problema.

Para otimizações profundas de performance, considerar a skill `optimize-performance` se existir em `.agents/skills/`.

---

## Processo de implementação

1. Documentar padrão atual.
2. Definir padrão desejado (alinhado ao design system).
3. Verificar impacto (telas que usam componentes globais).
4. Criar ou ajustar tokens/componentes base.
5. Aplicar nas telas relacionadas.
6. Verificar responsividade.
7. Verificar acessibilidade.
8. Executar testes e validações.
9. Verificar regressões.

---

## Regras importantes

**Nunca:**

- Reescrever o frontend inteiro sem necessidade.
- Trocar identidade visual inteira sem solicitação.
- Remover funcionalidades ou alterar regras de negócio.
- Alterar APIs sem necessidade.
- Criar dependências desnecessárias.
- Prejudicar UX por estética pura.
- Remover acessibilidade ou estados loading/error.
- Criar componentes duplicados.
- Estilos inline indiscriminados ou valores mágicos espalhados.
- Modificar backend ou banco por problemas puramente visuais.

---

## Validação

Após alterações, quando aplicável:

- Build; TypeScript; lint; testes existentes.
- Responsividade; consistência visual; acessibilidade.
- Loading, empty, error, success; interações; navegação.

**Não** afirmar validação sem executá-la. Usar comandos reais do projeto (`package.json`), por exemplo `npm run build`, `npm run lint`, `npm run test` — não inventar comandos.

---

## Relatório final

### Auditoria

Inconsistências; componentes duplicados; layout; responsividade; acessibilidade; comportamento.

### Alterações

Tokens; componentes; telas; layouts; estados; comportamentos padronizados.

### Arquivos modificados

Cada arquivo e motivo.

### Validação

Comandos **realmente** executados e resultados.

### Resultado

Uma das classificações:

- Padronização concluída.
- Padronização parcialmente concluída.
- Necessita revisão visual.
- Bloqueado por problema técnico.

---

## Regra final

Pensar como **designer de produto + engenheiro frontend sênior**.

O objetivo não é fazer todas as telas iguais, e sim **parte do mesmo produto**.

Sempre buscar: **consistência + hierarquia + clareza + acessibilidade + responsividade + identidade visual**.

Antes de solução nova → padrões existentes no projeto.

Antes de alterar componente global → impacto em todas as telas.

Antes de concluir → validar que a padronização melhorou a experiência sem regressões.
