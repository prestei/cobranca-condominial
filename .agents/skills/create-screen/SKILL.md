---
name: create-screen
description: Cria telas e páginas a partir do design system e do modelo inicial em HTML, com cores e tamanhos sempre via variáveis CSS, componentes globais reutilizáveis e poucas funções. Use ao criar tela, página, protótipo HTML ou componente de interface.
---

# Criar tela

A tela nova segue o design system e o modelo inicial em HTML do projeto. Não inventar layout, token, componente ou estilo paralelo.

## Antes de escrever

1. Ler `docs/design-system.md` e a página `/design-site`.
2. Ler tokens em `src/app/globals.css` (`@theme`).
3. Listar os componentes em `src/components/` que a tela vai usar.

Se faltar referência visual ou documentação, parar e pedir o caminho. Não prosseguir com visual próprio.

## Esqueleto

- Copiar a estrutura do modelo HTML: mesmo `app-layout`, sidebar, top bar, page header e área de conteúdo (quando existir no projeto).
- **Sempre** usar tokens do `@theme` (`bg-primary-container`, `text-body-md`, `rounded-md`, etc.). Proibido cor ou espaçamento literal quando existir token equivalente.
- Se faltar token, adicionar em `globals.css` e documentar em `docs/design-system.md` — não fixar o valor só na página.
- CSS exclusivo da tela: mínimo; o que se repete vira componente global.

## Componentes (obrigatório)

**Sempre usar os componentes globais existentes. Sempre.**

1. Antes de qualquer UI, verificar `src/components/` e `docs/design-system.md`.
2. Importar de `@/components/...` (`Button`, `Input`, `Textarea`, `Select`, `FormField`, `Badge`, `Tabs`, `Table`, `TableEmpty`, `EmptyState`, `CardMetric`, etc.).
3. **Proibido** recriar botão, input, badge, abas ou variantes locais com classes Tailwind equivalentes.
4. **Proibido** copiar markup de `/design-site` para a página sem passar pelo componente.
5. Se nenhum componente existente servir: **parar e perguntar ao usuário** antes de criar outro.
6. Ao criar componente novo (com aprovação): implementar em `src/components/`, adicionar seção em `/design-site`, atualizar `docs/design-system.md` e `docs/README.md` se necessário.

Bloco usado em mais de uma tela vira componente global. Uso único permanece na tela, mas ainda usando os primitivos globais (Button, Input, etc.).

## Funções

Padrão: poucas funções, sem muitas funções auxiliares.

- Uma função por ação da tela (renderizar a lista, filtrar, abrir o modal, salvar).
- Formatação, condição e atualização do DOM ficam dentro dessa função.
- Extrair função só quando o mesmo trecho é chamado em mais de um ponto.
- Não criar auxiliar de uma linha, wrapper ou getter usado uma vez só.

## Conferir

- A página usa tokens do `@theme`.
- Toda UI interativa passa por componentes de `src/components/`.
- Nenhum botão/input/badge/aba foi recriado fora do design system.
- Não há função auxiliar de uso único.
- Se algo novo foi criado, documentação e `/design-site` foram atualizados.
