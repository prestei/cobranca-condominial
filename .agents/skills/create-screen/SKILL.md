---
name: create-screen
description: Cria telas e páginas com Tailwind e componentes globais do design system, sempre sob src/app/(app) com AppLayout (PageHeader + PageContent), incluindo sheet de criação e edição, alinhadas à proposta oficial e às regras de negócio. Use ao criar tela, página ou componente de interface.
---

# Criar tela

A tela nova segue o design system, a proposta do produto e as regras de negócio do projeto. Não inventar layout, token, componente, fluxo ou permissão paralelos.

## Antes de escrever (obrigatório, nesta ordem)

1. Ler **`docs/proposta-oficial.md`** — escopo, módulos, usuários, campos e comportamentos esperados.
2. Ler **`docs/regra-negocio.md`** — perfis, permissões, fluxos, validações e regras que a tela deve respeitar.
3. Ler `docs/design-system.md` e a página `/design-system`.
4. Ler tokens em `src/app/globals.css` (`@theme`) para classes Tailwind disponíveis.
5. Listar os componentes em `src/components/` que a tela vai usar.
6. Ler **`src/components/layout/app-layout.tsx`** e a página de referência **`src/app/(app)/condominios/page.tsx`** — padrão obrigatório de rota e esqueleto.

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

## Layout da aplicação (obrigatório)

Telas internas do produto (carteira, cadastros, relatórios, palitagem, etc.) **sempre** usam o layout compartilhado. Não montar `AppShell`, sidebar ou header global na página.

### Onde criar a rota

| Tipo de tela | Caminho | Layout |
|--------------|---------|--------|
| App autenticada (padrão) | `src/app/(app)/<rota>/page.tsx` | Herda `src/app/(app)/layout.tsx` → `AppLayout` |
| Pública / marketing / catálogo | `src/app/<rota>/page.tsx` (fora de `(app)`) | Só `src/app/layout.tsx` (sem sidebar) |

O grupo `(app)` **não** aparece na URL: `(app)/condominios/page.tsx` → `/condominios`.

### O que a página renderiza

A `page.tsx` sob `(app)` contém **apenas** o conteúdo da tela:

1. **`PageHeader`** (`@/components/page-header`) — breadcrumb, título, descrição, ações.
2. **`PageContent`** — métricas, tabelas, filtros, formulários inline, etc.
3. **Overlays da tela** (ex.: `Sheet` de CRUD) como filhos do fragmento da página, **fora** de `PageContent` se ocuparem a viewport inteira.

**Proibido** na página:

- Importar e usar `AppShell`, `AppShellMain`, `AppShellSidebar` ou montar sidebar/header de conta manualmente.
- Duplicar menu lateral, marca “Lex Condominial” ou header com notificações/usuário.
- Criar `layout.tsx` por rota só para repetir o shell (usar o de `(app)`).

### Onde vive o shell

- **`src/components/layout/app-layout.tsx`** — `AppShell`, sidebar, header global, usuário mock, notificações.
- **`src/app/(app)/layout.tsx`** — envolve todas as rotas do grupo com `<AppLayout>`.

Novos itens de menu, badges da sidebar ou comportamento global do shell: alterar **`app-layout.tsx`**, não cada página.

### Contadores do menu (Carteira)

Quando a tela altera totais exibidos na sidebar (ex.: quantidade de condomínios ou unidades), usar **`useCarteiraNav()`** exportado de `@/components/layout/app-layout` e atualizar com `setCounts` (em geral `useEffect` quando os dados da página mudam). Não passar props ad hoc para sidebar na página.

### Referência

Copiar o esqueleto de **`src/app/(app)/condominios/page.tsx`**: `PageHeader` + `PageContent` + sheet da entidade. Detalhes visuais em `docs/design-system.md` (seção **Layout da aplicação**) e `/design-system`.

## Esqueleto (conteúdo da tela)

- Mesma hierarquia do design system: faixa de página (`PageHeader`) → área (`PageContent`) → blocos (métricas, tabela, etc.).
- O que se repete entre telas vira componente em `src/components/` (ex.: tabela ou sheet da entidade).
- Lógica e estado específicos da tela ficam na `page.tsx` ou em componentes co-localizados só se a tela for grande — o shell continua no layout.

## Sheet de criação e edição (obrigatório)

Quando a página lista ou gerencia entidades cadastráveis (CRUD, cadastros, registros editáveis), **sempre** entregar o fluxo completo na mesma entrega:

1. **Listagem / conteúdo principal** na área da página (tabela, cards, filtros, etc.).
2. **Sheet de criação** — aberto por ação explícita (ex.: botão “Novo”, “Adicionar”); formulário com os campos da proposta e das regras de negócio.
3. **Sheet de edição** — aberto a partir da linha/item (ex.: “Editar”); mesmos campos da criação, com valores preenchidos e título/descrição de edição.

Implementação:

- Usar **`Sheet`** e subcomponentes de `@/components/sheet` (`SheetContent`, `SheetForm`, `SheetHeader`, `SheetHeaderLead`, `SheetHeaderIcon`, `SheetHeaderText`, `SheetTitle`, `SheetDescription`, `SheetClose`, `SheetBody`, `SheetPanel`, `SheetToggleRow`, `SheetHelpText`, `SheetFooterForm`, etc.).
- Seguir o padrão documentado em `docs/design-system.md` (seção **Sheet**) e o exemplo em `src/design-system/sheet-demo.tsx`.
- **Proibido** usar `Dialog` ou página separada para criar/editar quando o padrão do projeto é sheet lateral — exceto se a proposta ou o usuário exigir outro padrão.
- Preferir **um componente de sheet reutilizável** por entidade (ex.: `CondominioFormSheet`) com modo `create` | `edit` e registro selecionado, em vez de duplicar markup; criar/editar podem ser dois arquivos só se a UX for muito diferente.
- Estados: `open`, `onOpenChange`, e ao salvar fechar o sheet + feedback (`useToast`) conforme o design system.
- Tela só de leitura/consulta (sem cadastro nem edição): não exige sheet; documentar na entrega que não há CRUD.

## Componentes (obrigatório)

**Sempre montar a UI com os componentes globais existentes. Sempre.**

1. Antes de qualquer markup, verificar `src/components/` e `docs/design-system.md`.
2. Importar de `@/components/...` (`Button`, `Input`, `Textarea`, `Select`, `FormField`, `Badge`, `Tabs`, `Table`, `TableEmpty`, `EmptyState`, `CardMetric`, `Sheet`, `Dialog`, etc.).
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
- Tela interna está em **`src/app/(app)/...`** e **não** repete `AppShell`/sidebar/header na página.
- `PageHeader` + `PageContent` usados conforme `condominios/page.tsx`.
- Contadores da sidebar atualizados com `useCarteiraNav()` quando aplicável.
- Páginas com cadastro/edição incluem sheet de **criação** e **edição** (ou um sheet com os dois modos), usando `@/components/sheet` e o padrão do design system.
- A página usa tokens do `@theme` via Tailwind; nenhum CSS novo fora de `@theme` em `globals.css`.
- Toda UI interativa passa por componentes de `src/components/`.
- Nenhum botão/input/badge/aba/modal foi recriado fora do design system.
- Não há função auxiliar de uso único.
- Se algo novo foi criado, documentação e `/design-system` foram atualizados.
