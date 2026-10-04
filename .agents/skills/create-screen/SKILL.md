---
name: create-screen
description: Cria telas e páginas com Tailwind e componentes globais do design system, alinhadas à proposta oficial e às regras de negócio. Cadastro e edição abrem em Sheet. Use ao criar tela, página ou componente de interface.
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

Tela interna usa `AppShell` + `AppShellMain`. `PageHeader` fica fora de `PageContent`. O que se repete vira componente global em `src/components/`. Não copiar o markup de `/design-system` nem montar sidebar ou header à mão.

```tsx
<AppShell sidebar={sidebar} user={user} notificationCount={notificationCount}>
  <AppShellMain>
    <PageHeader
      title="Condomínios"
      description="Acompanhe unidades, situação e ações da carteira."
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Condomínios" }]}
      actions={
        <Button size="md">
          <Icon icon={Plus} size="sm" />
          Novo
        </Button>
      }
    />
    <PageContent>{/* FilterBar, métricas, tabela */}</PageContent>
  </AppShellMain>
</AppShell>
```

## Cabeçalho da página

- A ação principal do `PageHeader` se chama **Novo** e abre o `Sheet` de cadastro. Não acrescentar o nome da entidade no rótulo.
- Não colocar **Exportar** no cabeçalho.
- Uma ação principal. Outra ação só entra se a proposta ou a regra de negócio pedir.

## Listagem

Dentro de `PageContent`, nesta ordem: `FilterBar`, métricas (`CardMetric`) quando a tela tiver indicadores, tabela.

Usar `FilterBar`. Não remontar a barra com `Input`, `Select` e `Button` soltos.

- Busca e selects na primeira linha, mesma largura, sem rótulo visível e sem ícone dentro do campo. `label` de cada field é só o nome acessível.
- **Limpar** e **Filtrar** na linha de baixo, alinhados à direita, com Filtrar por último. Limpar é `outline` com `RotateCcw`; Filtrar é primário com `Search`.
- Fundo `surface-subtle` e borda `border-subtle` vêm do componente. Não substituir por hex nem por outro token.
- Não passar `applyLabel` nem `clearLabel`, a menos que a tela precise de outro texto.

## Criação e edição

Cadastro e edição **sempre** abrem no `Sheet`, o painel lateral à direita. Não usar página própria, `Dialog` nem modal para o formulário.

O mesmo sheet serve para criar e editar. **Novo** abre vazio; a ação da linha abre com os dados do registro. O título muda; os campos são os mesmos.

Montar com `Sheet`, `SheetContent`, `SheetForm`, `SheetHeader` (`SheetHeaderLead`, `SheetHeaderIcon`, `SheetTitle`, `SheetDescription`, `SheetClose`), `SheetBody` (`FormField`, `SheetPanel`, `SheetToggleRow`, `SheetHelpText`) e `SheetFooterForm` (Fechar + Salvar).

`Dialog` e `ConfirmDialog` ficam para confirmação, não para formulário de cadastro ou edição.

## Componentes (obrigatório)

**Sempre montar a UI com os componentes globais existentes. Sempre.**

1. Antes de qualquer markup, verificar `src/components/` e `docs/design-system.md`.
2. Importar de `@/components/...` (`AppShell`, `PageHeader`, `PageContent`, `FilterBar`, `Sheet`, `Button`, `Input`, `Textarea`, `Select`, `FormField`, `Badge`, `Tabs`, `Table`, `TableEmpty`, `EmptyState`, `CardMetric`, `Dialog`, `ConfirmDialog`, etc.).
3. **Proibido** recriar botão, input, badge, abas, modal ou variantes locais com classes Tailwind equivalentes.
4. **Proibido** copiar markup de `/design-system` para a página sem passar pelo componente.
5. Se nenhum componente existente servir: **parar e perguntar ao usuário** antes de criar outro.
6. Ao criar componente novo (com aprovação): implementar em `src/components/` **somente com Tailwind** (sem arquivo `.css`), incluir o exemplo em `src/pages/design-system.tsx` e atualizar `docs/design-system.md` se necessário.

Bloco usado em mais de uma tela vira componente global. Uso único permanece na tela, mas ainda usando os primitivos globais (`Button`, `Input`, etc.).

## Funções

Padrão: poucas funções, sem muitas funções auxiliares.

- Uma função por ação da tela (renderizar a lista, filtrar, abrir o sheet, salvar).
- Formatação, condição e atualização do DOM ficam dentro dessa função.
- Extrair função só quando o mesmo trecho é chamado em mais de um ponto.
- Não criar auxiliar de uma linha, wrapper ou getter usado uma vez só.

## Conferir

- `docs/proposta-oficial.md` e `docs/regra-negocio.md` foram lidos e a tela reflete perfis, fluxos e campos relevantes.
- A página usa tokens do `@theme` via Tailwind; nenhum CSS novo fora de `@theme` em `globals.css`.
- A tela interna usa `AppShell`, `PageHeader` e `PageContent`. A ação do cabeçalho é **Novo**, sem **Exportar**.
- Listagem usa `FilterBar` (campos sem ícone e sem rótulo; Limpar e depois Filtrar, alinhados à direita), depois métricas e tabela.
- Cadastro e edição abrem no mesmo `Sheet`. Formulário não vai para página nem para `Dialog`.
- Toda UI interativa passa por componentes de `src/components/`.
- Nenhum botão/input/badge/aba/modal/filtro foi recriado fora do design system.
- Não há função auxiliar de uso único.
- Se algo novo foi criado, documentação e `/design-system` foram atualizados.
