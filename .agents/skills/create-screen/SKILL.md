---
name: create-screen
description: Cria telas e páginas com Tailwind e componentes globais do design system, alinhadas à proposta oficial e às regras de negócio. Use ao criar tela, página ou componente de interface.
---

# Criar tela

A tela nova segue o design system, a proposta do produto e as regras de negócio do projeto. Não inventar layout, token, componente, fluxo ou permissão paralelos.

## Antes de escrever (obrigatório, nesta ordem)

1. Ler **`docs/proposta-oficial.md`** — escopo, módulos, usuários, campos e comportamentos esperados.
2. Ler **`docs/regra-negocio.md`** — perfis, permissões, fluxos, validações e regras que a tela deve respeitar.
3. Ler `docs/design-system.md` e a página `/design-system`.
4. Ler tokens em `src/app/globals.css` (`@theme`) para classes Tailwind disponíveis.
5. Listar os componentes em `src/components/` que a tela vai usar.

Se faltar referência visual, regra de negócio ou documentação, parar e pedir o caminho. Não prosseguir com visual ou fluxo próprios.

## O que levar em consideração

Ao desenhar e implementar a tela, aplicar o que está nos documentos lidos:

- **Perfis e permissões** (Administrador, Atendente, Advogado): o que cada um vê, edita e exporta.
- **Fluxos e ações** da funcionalidade (registro, retorno, filtros, relatórios, etc.).
- **Campos obrigatórios, estados e mensagens** descritos na proposta e nas regras.
- **Escopo do módulo** (Projeto 1 — palitagem vs Projeto 2 — painel de inadimplência): não misturar comportamentos de outro módulo sem estar no escopo da tela.
- **Consistência** com o restante do sistema (nomenclatura de condomínio, unidade, cobrança, etc.).

Dúvida entre duas interpretações de negócio: parar e confirmar com o usuário antes de codar.

## Estilo: só Tailwind + componentes

- **Sempre Tailwind** — classes utilitárias e tokens do `@theme` (`bg-primary-container`, `text-body-md`, `rounded-md`, etc.).
- **Proibido** criar arquivo `.css` por página ou por componente; **proibido** `<style>` inline ou blocos CSS novos na tela.
- `globals.css` é só `@import "tailwindcss"` e `@theme`; não adicionar regras soltas para “arrumar” uma página.
- Proibido cor ou espaçamento literal quando existir token equivalente no `@theme`.
- Se faltar token essencial ao design system, adicionar em `@theme` em `globals.css` e documentar em `docs/design-system.md` — não fixar o valor só na página.

## Esqueleto

- Copiar a estrutura do modelo HTML: mesmo `app-layout`, sidebar, top bar, page header e área de conteúdo (quando existir no projeto).
- O que se repete vira componente global em `src/components/`.

## Componentes (obrigatório)

**Sempre montar a UI com os componentes globais existentes. Sempre.**

1. Antes de qualquer markup, verificar `src/components/` e `docs/design-system.md`.
2. Importar de `@/components/...` (`Button`, `Input`, `Textarea`, `Select`, `FormField`, `Badge`, `Tabs`, `Table`, `TableEmpty`, `EmptyState`, `CardMetric`, `Dialog`, etc.).
3. **Proibido** recriar botão, input, badge, abas, modal ou variantes locais com classes Tailwind equivalentes.
4. **Proibido** copiar markup de `/design-system` para a página sem passar pelo componente.
5. Se nenhum componente existente servir: **parar e perguntar ao usuário** antes de criar outro.
6. Ao criar componente novo (com aprovação): implementar em `src/components/` **somente com Tailwind** (sem arquivo `.css`), adicionar showcase em `src/design-system/`, atualizar `docs/design-system.md` se necessário.

Bloco usado em mais de uma tela vira componente global. Uso único permanece na tela, mas ainda usando os primitivos globais (`Button`, `Input`, etc.).

## Funções

Padrão: poucas funções, sem muitas funções auxiliares.

- Uma função por ação da tela (renderizar a lista, filtrar, abrir o modal, salvar).
- Formatação, condição e atualização do DOM ficam dentro dessa função.
- Extrair função só quando o mesmo trecho é chamado em mais de um ponto.
- Não criar auxiliar de uma linha, wrapper ou getter usado uma vez só.

## Conferir

- `docs/proposta-oficial.md` e `docs/regra-negocio.md` foram lidos e a tela reflete perfis, fluxos e campos relevantes.
- A página usa tokens do `@theme` via Tailwind; nenhum CSS novo fora de `@theme` em `globals.css`.
- Toda UI interativa passa por componentes de `src/components/`.
- Nenhum botão/input/badge/aba/modal foi recriado fora do design system.
- Não há função auxiliar de uso único.
- Se algo novo foi criado, documentação e `/design-system` foram atualizados.
