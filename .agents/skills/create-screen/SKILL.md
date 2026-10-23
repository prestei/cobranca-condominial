---
name: create-screen
description: Cria telas e páginas com Tailwind e componentes globais do design system, alinhadas à proposta oficial e às regras de negócio. Cadastro e edição abrem em Sheet. Atualiza a documentação do módulo em docs/modulos/. Use ao criar tela, página ou componente de interface.
---

# Criar tela

A tela nova segue o design system, a proposta do produto e as regras de negócio do projeto. Não inventar layout, token, componente, fluxo ou permissão paralelos.

**Documentação:** seguir `.agents/skills/_shared/documentacao-modulo.md`. Ao criar ou alterar uma tela, atualizar `docs/modulos/<slug>.md` (rotas, campos, fluxos, **Conexões**, permissões), **`docs/mapa-do-projeto.md`** se mudar rota ou vínculo entre módulos, e `docs/regra-negocio.md` quando couber.

**Convenções de código:** `.agents/skills/_shared/code-conventions.md` — componentes, hooks, estado e handlers em **inglês**; labels, placeholders, toasts, títulos e `aria-label` em **português**.

## Antes de escrever (obrigatório, nesta ordem)

1. Ler **`docs/proposta-oficial.md`** — escopo, módulos, usuários, campos e comportamentos esperados.
2. Ler **`docs/regra-negocio.md`** — perfis, permissões, fluxos, validações e regras que a tela deve respeitar.
3. Ler **`docs/modulos/<slug>.md`** do módulo da tela (criar esboço se não existir — ver `docs/modulos/README.md`).
4. Ler `docs/design-system.md` e a página `/design-system`.
5. Ler tokens em `src/app/globals.css` (`@theme`) para classes Tailwind disponíveis.
6. Listar os componentes em `src/components/` que a tela vai usar.
7. Ler **`src/components/workspace-shell.tsx`** e a página de referência **`src/app/condominiums/page.tsx`** — padrão de rota e esqueleto.

Se faltar referência visual, regra de negócio ou documentação, parar e pedir o caminho. Não prosseguir com visual ou fluxo próprios.

## O que levar em consideração

Ao desenhar e implementar a tela, aplicar o que está nos documentos lidos:

- **Perfis e permissões** (Administrador, Atendente, Advogado): o que cada um vê, edita e exporta.
- **Fluxos e ações** da funcionalidade (registro, retorno, filtros, relatórios, etc.).
- **Campos obrigatórios, estados e mensagens** descritos na proposta e nas regras.
- **Um sistema só:** palitagem e inadimplência compartilham condomínio, unidade, colaborador e o débito da unidade. O atendimento registra a cobrança dessa unidade. Não criar um cadastro separado de processo de cobrança.
- **Consistência** com o restante do sistema (nomenclatura de condomínio, unidade, cobrança, etc.).

Dúvida entre duas interpretações de negócio: parar e confirmar com o usuário antes de codar.

## Estilo: só Tailwind + componentes

- **Sempre Tailwind** — classes utilitárias e tokens do `@theme` (`bg-primary-container`, `text-body-md`, `rounded-md`, etc.).
- **Proibido** criar arquivo `.css` por página ou por componente; **proibido** `<style>` inline ou blocos CSS novos na tela.
- `globals.css` é só `@import "tailwindcss"` e `@theme`; não adicionar regras soltas para “arrumar” uma página.
- Proibido cor ou espaçamento literal quando existir token equivalente no `@theme`.
- Se faltar token essencial ao design system, adicionar em `@theme` em `globals.css` e documentar em `docs/design-system.md` — não fixar o valor só na página.

## Layout da aplicação (obrigatório)

Telas internas do produto usam **`WorkspaceShell`** (`@/components/workspace-shell`), que já monta sidebar, marca e header global. **Não** duplicar `AppShell` ou menu na página.

### Onde criar a rota

| Tipo de tela | Caminho |
|--------------|---------|
| App autenticada (padrão) | `src/app/<rota>/page.tsx` |
| Grupo `(app)` (alternativo) | `src/app/(app)/<rota>/page.tsx` com layout `AppLayout` — só se o projeto já migrar a rota para esse grupo |

O grupo `(app)` **não** aparece na URL.

**Pastas e arquivos em `src/`:** inglês (`src/app/users/page.tsx`, `UserForm.tsx`). A URL espelha a pasta (`/users`, `/condominiums`).

### O que a página renderiza

```tsx
<WorkspaceShell>
  <PageHeader ... />
  <PageContent>{/* filtros, métricas, tabela */}</PageContent>
  {/* Sheet(s) da entidade, fora de PageContent se ocupar viewport */}
</WorkspaceShell>
```

- **`PageHeader`** — breadcrumb, título, descrição, ações.
- **`PageContent`** — métricas, tabelas, filtros inline, etc.
- **Overlays** (`Sheet`, confirmações) como filhos de `WorkspaceShell`, em geral fora de `PageContent`.

**Proibido:** montar sidebar/header de conta manualmente; criar `layout.tsx` por rota só para repetir o shell.

Rotas em `src/app/(app)/` que usam `AppLayout`: contadores do menu com **`useCarteiraNav()`** de `@/components/layout/app-layout` quando aplicável.

Referência visual: `docs/design-system.md` e `/design-system`.

## Cabeçalho da página

- A ação principal do `PageHeader` se chama **Novo** e abre o `Sheet` de cadastro. Não acrescentar o nome da entidade no rótulo.
- Não colocar **Exportar** no cabeçalho, salvo exigência da proposta ou regra de negócio.
- Uma ação principal. Outra ação só entra se a proposta ou a regra de negócio pedir.

## Listagem

Dentro de `PageContent`, nesta ordem: métricas (`CardMetricRow` / `CardMetric`) quando a tela tiver indicadores, `FilterBar`, tabela, `Pagination`.

Usar `FilterBar`. Não remontar a barra com `Input`, `Select` e `Button` soltos.

- Busca e selects na primeira linha, mesma largura, com rótulo visível acima do campo e sem ícone dentro do campo. O rótulo da busca é `searchLabel` (padrão **Buscar**); o de cada select é `label`.
- **Limpar** e **Filtrar** na linha de baixo, alinhados à direita, com Filtrar por último. Limpar é `outline` com `RotateCcw`; Filtrar é primário com `Search`.
- Fundo `surface-subtle` e borda `border-subtle` vêm do componente.
- Não passar `applyLabel` nem `clearLabel`, a menos que a tela precise de outro texto.

## Paginação

Toda listagem pagina. O padrão é **20** registros por página, com o componente `Pagination`.

- Fica depois da tabela.
- `pageSize` permanece 20. Não passar outro valor.
- **Filtrar** e **Limpar** voltam para a página 1.
- Métricas usam o conjunto filtrado inteiro, não só a página visível.
- Com lista vazia, a tabela mostra `EmptyState` e a paginação não aparece.

## Sheet de criação e edição (obrigatório)

Quando a página lista ou gerencia entidades cadastráveis (CRUD), entregar na mesma entrega:

1. Listagem / conteúdo principal.
2. **Sheet de criação** — botão **Novo**.
3. **Sheet de edição** — ação na linha; preferir **um sheet** com modo `create` | `edit`.

- Usar **`Sheet`** e subcomponentes de `@/components/sheet`.
- Seguir `docs/design-system.md` (seção **Sheet**) e exemplos em `/design-system`.
- **Proibido** `Dialog` ou página separada para criar/editar, exceto se a proposta ou o usuário exigir.
- Estados: `open`, `onOpenChange`, fechar ao salvar + `useToast`.
- Tela só leitura: não exige sheet; registrar em `docs/modulos/<slug>.md` que não há CRUD.

Cadastro e edição **sempre** no `Sheet` lateral à direita. Montar com `SheetForm`, `SheetHeader`, `SheetBody`, `SheetFooterForm` (Fechar + Salvar).

`Dialog` e `ConfirmDialog` ficam para confirmação, não para formulário de cadastro ou edição.

### Formulário grande: etapas

- Até 6 campos e um assunto: uma etapa.
- Mais de 6 campos ou mais de um bloco: **`FormSteps`** no mesmo `Sheet` — validar etapa antes de avançar; primeira etapa Fechar + Continuar; última Voltar + Salvar.

## Componentes (obrigatório)

**Sempre montar a UI com os componentes globais existentes.**

1. Verificar `src/components/` e `docs/design-system.md`.
2. Importar de `@/components/...` (`WorkspaceShell`, `PageHeader`, `PageContent`, `FilterBar`, `Pagination`, `Sheet`, `FormSteps`, `Button`, `Input`, etc.).
3. **Proibido** recriar botão, input, badge, abas, modal ou variantes locais.
4. Se nenhum componente servir: **parar e perguntar** antes de criar outro.
5. Componente novo (com aprovação): em `src/components/`, só Tailwind; exemplo em `src/pages/design-system.tsx`; atualizar `docs/design-system.md`.

## Funções

Padrão: poucas funções, sem auxiliares de uso único.

## Documentação na entrega (obrigatório)

Na mesma entrega do código:

1. Atualizar **`docs/modulos/<slug>.md`**: rotas, arquivos, campos, fluxos de sheet/filtro, permissões, estados de UI.
2. Atualizar **`docs/regra-negocio.md`** se a tela introduz ou altera regra de negócio.
3. Atualizar **`docs/modulos/README.md`** se for módulo novo.
4. Atualizar **`docs/mapa-do-projeto.md`** (linha do módulo na tabela e diagramas, se necessário).

## Conferir

- `docs/proposta-oficial.md`, `docs/regra-negocio.md` e **`docs/modulos/<slug>.md`** refletem a tela entregue.
- Tela usa `WorkspaceShell` + `PageHeader` + `PageContent` (ou padrão `(app)` documentado no módulo).
- Listagem: métricas, `FilterBar`, tabela, `Pagination` de 20.
- CRUD: mesmo `Sheet` para criar/editar; `FormSteps` quando formulário grande.
- Tokens via `@theme`; nenhum CSS novo fora de `globals.css`.
- Toda UI interativa passa por `src/components/`.
- Documentação do módulo e design system atualizados quando aplicável.
