# Design system

Tokens em `src/app/globals.css` (`@theme`). Tipografia: **Open Sans** em todo o projeto (`font-sans` no `body`; sem fonte com serifa). Componentes globais em `src/components/` — importar de `@/components/...` e usar em qualquer página. A rota `/design-system` é o arquivo `src/pages/design-system.tsx`, que só lista esses componentes.

## Componentes

Importar sempre de `@/components/...`. Não recriar markup ou estilos locais equivalentes.

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Button` | `button.tsx` | Ações. Variantes: `primary`, `secondary`, `outline`, `ghost`, `critical` (`status-critical`). Tamanhos: `sm`, `md`, `lg`. |
| `Input`, `Textarea`, `Select` | `input.tsx` | Campos de formulário compactos, sem ícone interno. O `Select` abre com o campo Buscar. Prop `invalid` para erro. |
| `PeriodInput` | `period-input.tsx` | Um campo de período: atalhos (hoje, ontem, 7 dias, 30 dias, este mês, todos) e intervalo personalizado no mesmo controle. |
| `Checkbox`, `Radio`, `Switch` | `input.tsx` | Controles de seleção com estilo primário. |
| `CheckboxField`, `RadioField`, `SwitchField` | `input.tsx` | Label ao lado do controle (e descrição opcional). |
| `FormField` | `input.tsx` | Label, obrigatório (`required`) e mensagem de erro. |
| `FilterBar` | `filter-bar.tsx` | Barra de filtros de listagem: busca, selects, data, período, Limpar e Filtrar. Campos sem ícone interno. |
| `Badge` | `badge.tsx` | Etiquetas. Variantes: `primary`, `secondary`, `success`, `error`. |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | Navegação por abas (client component). |
| `CardMetric` | `card-metric.tsx` | Cartão de métrica com ícone. |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`, … | `table.tsx` | Listagens tabulares com scroll horizontal no container. |
| `Pagination` | `pagination.tsx` | Paginação de listagem. Padrão: 20 registros por página. |
| `EmptyState` | `empty-state.tsx` | Sem dados: título, descrição, ícone e ação opcionais. |
| `Icon` | `icon.tsx` | Ícones Lucide com tamanhos `sm`, `md`, `lg` e traço padronizado. |
| `Alert` | `alert.tsx` | Feedback inline. Variantes: `info`, `success`, `warning`, `error` (ícone Lucide por variante). |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, … | `dialog.tsx` | Modal controlado (`open`, `onOpenChange`). Elemento nativo `<dialog>`. |
| `ConfirmDialog` | `confirm-dialog.tsx` | Confirmação com título, descrição, cancelar e confirmar. Usa `Dialog`. |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetBody`, `SheetFooter`, `SheetClose`, … | `sheet.tsx` | Painel lateral para cadastro (`open`, `onOpenChange`). `<dialog>` ancorado à direita, largura máx. 32rem. Use `SheetForm`, `SheetHeaderLead`, `SheetHeaderIcon`, `SheetPanel`, `SheetToggleRow`, `SheetHelpText` e `SheetFooterForm` como padrão de formulário. | 
| `FormSteps` | `form-steps.tsx` | Indicador das etapas de um formulário grande dentro do `Sheet`. |
| `ToastProvider`, `useToast` | `toast.tsx` | Notificações temporárias; envolver a app com `ToastProvider` (ver `app/providers.tsx`). |
| `AppShell`, `AppShellSidebar`, `AppShellNavLink`, … | `app-shell.tsx` | Modelo clássico: sidebar navy, top bar, drawer mobile (961px). |
| `WorkspaceShell` | `workspace-shell.tsx` | Casca das telas internas: `AppShell` com cobrança, carteira, análise e operação. Relatórios fica em Análise. |
| `PageHeader`, `PageContent` | `page-header.tsx` | Título, breadcrumb, descrição, ações e container da página. |

## Botões

- Texto em sentença (só a primeira letra maiúscula), peso semibold.
- Primário: gradiente navy; hover dourado.
- Secundário: gradiente dourado; hover navy.
- Desabilitado: opacidade reduzida e escala de cinza.

Ícones opcionais como filhos (ex.: `Icon` ou `lucide-react` com os mesmos tamanhos de `icon.tsx`), alinhados com `gap-sm`.

## Inputs

- Altura `h-input` (`--spacing-input`, menor que botões).
- Sem ícone embutido. Padding esquerda: `spacing-md` menos 5px. Padding direita: `spacing-md`.
- Repouso: borda `border-strong`.
- Foco: borda `brass` e anel suave.
- Erro: borda e label `status-critical`; a mensagem fica a `spacing-xs` abaixo do campo, via `FormField` com `error`.

### Texto e lista

`Input`, `Textarea` e `Select` usam `FormField` com label acima do campo. O `Select` mostra a opção escolhida e um `ChevronDown` a `spacing-md` da borda direita, com o mesmo padding do `Input`. Ao abrir, o primeiro item é o campo **Buscar**: o texto digitado filtra a lista. Campos curtos e relacionados ficam na mesma linha (`grid grid-cols-2 gap-md`); nome, descrição e observação continuam em largura total.

`PeriodInput` ocupa o lugar de um único campo. O valor fechado mostra o atalho ou o intervalo. Ao abrir, a lista traz Hoje, Ontem, Últimos 7 dias, Últimos 30 dias, Este mês, Mês anterior e Todos; em seguida, De e Até formam o período personalizado.

```tsx
<FormField label="Período" htmlFor="periodo">
  <PeriodInput
    id="periodo"
    value={periodo}
    onChange={setPeriodo}
  />
</FormField>
```

No `FilterBar`, o mesmo controle entra como campo `type: "period"`.

### Checkbox, radio e switch

Checkbox, radio e switch usam apenas classes Tailwind em `input.tsx`. Marcado/ativo: fundo `primary-container`; checkbox exibe check branco.

Use `CheckboxField`, `RadioField` ou `SwitchField` para label clicável ao lado. Radio: agrupar com `<fieldset>` e o mesmo `name`.

```tsx
<CheckboxField label="Aceito os termos" htmlFor="terms">
  <Checkbox id="terms" />
</CheckboxField>

<fieldset>
  <legend className="text-label-lg text-primary-container">Situação</legend>
  <RadioField label="Ativo" htmlFor="situation-active">
    <Radio id="situation-active" name="situation" value="ativo" />
  </RadioField>
</fieldset>

<SwitchField label="Notificações" htmlFor="notify">
  <Switch id="notify" />
</SwitchField>
```

## Filtros

`FilterBar` compõe `Input`, `Select`, `PeriodInput` e `Button` sobre fundo `surface-subtle`, com borda `border-subtle`. Busca, selects, datas, números e período ficam na primeira linha, cada um com rótulo acima do campo (`FormField`). Campo com `type: "date"` renderiza data; `type: "number"` renderiza número; `type: "period"` renderiza o `PeriodInput`; os demais são selects. No desktop (a partir de 768px), cada campo ocupa 1/4 da linha e a altura do controle sobe para `h-control`. O rótulo da busca é `searchLabel` (padrão **Buscar**); o de cada campo é `label`. Limpar e Filtrar ficam na linha de baixo, alinhados à direita, com Filtrar por último. Filtrar envia o formulário; Limpar chama `onClear`.

```tsx
<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar condomínio..."
  onApply={handleApply}
  onClear={handleClear}
  fields={[
    {
      id: "situation",
      label: "Situação",
      value: situation,
      onChange: setSituation,
      options: [
        { value: "todos", label: "Todos" },
        { value: "ativo", label: "Ativo" },
      ],
    },
  ]}
/>
```

## Abas

```tsx
<Tabs defaultValue="a">
  <TabsList>
    <TabsTrigger value="a">Aba A</TabsTrigger>
    <TabsTrigger value="b">Aba B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">Conteúdo A</TabsContent>
  <TabsContent value="b">Conteúdo B</TabsContent>
</Tabs>
```

Modo controlado: `value` + `onValueChange`.

## Badges

Pill com `text-label-sm` e variantes de status/marca. Conteúdo curto (uma ou duas palavras).

## Tabela

Acima da tabela, alinhado à direita, o controle **Exportar** abre o menu de formato (CSV, XLS e PDF). Por enquanto o menu é só visual: escolher um formato fecha o painel e não gera arquivo. No celular, o mesmo controle fica acima dos cards.

Cabeçalho compacto (`py-sm`, `text-label-md`), fundo `surface-subtle`. Colunas de dados: `TableHead` com `sortable`, `sortDirection` (`asc` | `desc` | `none`) e `onSort`. Coluna de menu: `TableHead actions` + `TableActionsCell` (ícone de três pontos). O clique abre um menu com `actions` (`label`, `onSelect`, `icon` opcional, `destructive` opcional). No card mobile, o mesmo menu fica em `TableActionsButton`. Linhas com borda inferior bem suave (`border-border-subtle/30`).

```tsx
<Table aria-label="Condomínios">
  <TableHeader>
    <TableRow className="border-border-subtle/50 hover:bg-transparent">
      <TableHead sortable sortDirection={sortDir} onSort={toggleName}>Nome</TableHead>
      <TableHead align="right" sortable sortDirection={sortDirUnits} onSort={toggleUnits}>
        Unidades
      </TableHead>
      <TableHead actions />
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((row) => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell align="right" className="tabular-nums">{row.units}</TableCell>
        <TableActionsCell
          label={`Ações de ${row.name}`}
          actions={[
            { label: "Editar", icon: Pencil, onSelect: () => openEdit(row) },
            { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => askDelete(row) },
          ]}
        />
      </TableRow>
    ))}
  </TableBody>
</Table>
```

Lista vazia: uma linha com `TableEmpty` e `colSpan` igual ao número de colunas (incluindo ações).

### Smartphone (&lt; 768px)

Use `ResponsiveTable` com a tabela desktop e a variante mobile em cards. Breakpoint: `min-[768px]`.

```tsx
<ResponsiveTable
  desktop={<Table>...</Table>}
  mobile={
    <TableMobileList aria-label="Lista">
      <TableMobileToolbar>{/* selecionar todos */}</TableMobileToolbar>
      <TableMobileCard>
        <TableMobileCardHeader>
          <Checkbox />
          <TableMobileTitle>Nome</TableMobileTitle>
          <TableActionsButton
            label={`Ações de ${row.name}`}
            actions={[
              { label: "Editar", icon: Pencil, onSelect: () => openEdit(row) },
              { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => askDelete(row) },
            ]}
          />
        </TableMobileCardHeader>
        <TableMobileFields>
          <TableMobileField label="Unidades">84</TableMobileField>
        </TableMobileFields>
      </TableMobileCard>
    </TableMobileList>
  }
/>
```

Estado vazio mobile: `TableMobileEmpty` com `EmptyState`. Prop `viewport="mobile"` em `ResponsiveTable` força cards no preview do design site.

## Paginação

Toda listagem usa `Pagination` depois da tabela, com **20** registros por página. Não passar outro `pageSize`.

```tsx
<Pagination page={page} total={total} onPageChange={setPage} />
```

O texto mostra o intervalo visível (`1–20 de 35`). As setas, sem rótulo, ficam desabilitadas nas pontas. A página atual é o único item preenchido. Com lista vazia, a paginação não aparece.

## Estado vazio

```tsx
<TableEmpty colSpan={3}>
  <EmptyState
    title="Nenhum registro"
    description="Texto de apoio."
    icon={<Inbox className="size-6" />}
    action={<Button size="sm">Nova ação</Button>}
  />
</TableEmpty>
```

`EmptyState` também pode ficar fora da tabela (painel, página inteira).

## Confirmação

`ConfirmDialog` abre um modal com cancelar e confirmar. O pai controla `open` e decide o que fazer em `onConfirm` (fechar, toast, exclusão). Com `confirmVariant="critical"`, a confirmação fica à esquerda em `status-critical` e o cancelar à direita.

```tsx
const [open, setOpen] = useState(false);

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Remover condomínio?"
  description="Esta ação remove o condomínio da carteira."
  onConfirm={() => setOpen(false)}
/>
```

Rótulos padrão: `Cancelar` e `Confirmar`. Troque com `cancelLabel` e `confirmLabel`.

## Dialog

Controlado por `open` e `onOpenChange`. Fecha com Escape ou clique no backdrop.

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent aria-labelledby="title-id" aria-describedby="desc-id">
    <DialogHeader>
      <DialogTitle id="title-id">Título</DialogTitle>
      <DialogDescription id="desc-id">Texto de apoio.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button onClick={handleConfirm}>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Sheet (cadastro lateral)

Painel fixo à direita, altura total da viewport, backdrop escuro e fechamento com Escape ou clique fora (comportamento nativo do `<dialog>`). **Padrão de formulário:** `SheetForm` envolvendo cabeçalho com ícone (`SheetHeaderLead` + `SheetHeaderIcon`), corpo rolável com `FormField`, blocos em `SheetPanel`, switches em `SheetToggleRow`, textos de apoio em `SheetHelpText` e rodapé com `SheetFooterForm` (Fechar + Salvar).

```tsx
const [open, setOpen] = useState(false);

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent aria-labelledby="sheet-title" aria-describedby="sheet-desc">
    <SheetForm onSubmit={handleSave}>
      <SheetHeader>
        <SheetHeaderLead>
          <SheetHeaderIcon>{/* ícone da entidade */}</SheetHeaderIcon>
          <SheetHeaderText>
            <SheetTitle id="sheet-title">Título do cadastro</SheetTitle>
            <SheetDescription id="sheet-desc">Texto de apoio.</SheetDescription>
          </SheetHeaderText>
        </SheetHeaderLead>
        <SheetClose />
      </SheetHeader>
      <SheetBody>
        <SheetPanel variant="tint">{/* contexto, ex.: unidade */}</SheetPanel>
        <SheetPanel>
          <SheetToggleRow label="Ativar" htmlFor="active-id" description="Opcional.">
            <Switch id="active-id" />
          </SheetToggleRow>
        </SheetPanel>
        <FormField label="Nome" htmlFor="name" required>
          <Input id="name" name="name" required />
        </FormField>
        <SheetHelpText>Informação complementar ao campo.</SheetHelpText>
      </SheetBody>
      <SheetFooterForm onClose={() => setOpen(false)} />
    </SheetForm>
  </SheetContent>
</Sheet>
```

Rodapé customizado: use `SheetFooter` com `Button` manualmente em vez de `SheetFooterForm`.

Formulário grande (mais de 6 campos, ou mais de um bloco) divide o mesmo sheet em etapas. `FormSteps` fica no topo do `SheetBody` e só a etapa atual é renderizada. A etapa atual usa círculo `primary-container` com halo `primary-fixed` e rótulo semibold. A concluída mostra o check. A próxima fica com círculo vazado em `border-strong`. A primeira etapa usa Fechar e Continuar; as seguintes, Voltar (`onBack`) e Continuar; a última, Voltar e Salvar.

```tsx
const steps = ["Dados", "Endereço"] as const;
const [step, setStep] = useState(0);

<SheetBody>
  <FormSteps steps={steps} current={step} />
  {step === 0 ? /* campos da etapa */ : null}
  {step === 1 ? /* campos da etapa */ : null}
</SheetBody>
<SheetFooterForm
  onClose={() => setOpen(false)}
  onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
  saveLabel={step < steps.length - 1 ? "Continuar" : "Salvar"}
/>
```

Referência em `/design-system` → **Dialog, sheet e toast**.

## Toast

Incluir `Providers` (ou `ToastProvider`) no layout. Disparar de qualquer client component:

```tsx
const { toast } = useToast();

toast({
  variant: "success",
  title: "Salvo com sucesso",
  description: "Opcional.",
});
```

## Layout da aplicação

Modelo da aplicação: `app-layout` → sidebar → `app-main` (header global + conteúdo).

```text
app-layout
├── sidebar (264px, marca, menu, ajuda/config)
└── app-main
    ├── header (busca, notificações, conta)
    └── main
        ├── PageHeader (breadcrumb, título e ações)
        └── PageContent (FilterBar, métricas, tabela responsiva, etc.)
```

Compor telas internas com `AppShell` + `PageHeader` + `PageContent`. Passe `user` e `notificationCount` ao `AppShell` para o header. No smartphone (&lt; 961px), a sidebar abre em drawer.

```tsx
<AppShell
  sidebar={
    <AppShellSidebar>
      <AppShellBrand title="Cobrança" subtitle="Carteira ativa" />
      <AppShellNav>
        <AppShellNavSection title="Carteira">
          <AppShellNavLink href="/condominios" icon={Building} active>
            Condomínios
          </AppShellNavLink>
        </AppShellNavSection>
      </AppShellNav>
      <AppShellSidebarFooter>{/* usuário */}</AppShellSidebarFooter>
    </AppShellSidebar>
  }
  user={{ name: "Bruna Souza", initials: "BS", menuSubtitle: "Cobrança · Carteira ativa" }}
  notificationCount={2}
>
  <AppShellMain>
    <PageContent>
      <PageHeader
        title="Condomínios"
        description="Texto de apoio."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Condomínios" }]}
        actions={<Button>Novo</Button>}
      />
      {/* conteúdo */}
    </PageContent>
  </AppShellMain>
</AppShell>
```

Breakpoint do drawer mobile: **961px**. Catálogo de componentes em `/design-system`.

## Novos componentes

Só criar componente global após alinhamento com o time. Ao adicionar: implementar em `src/components/`, documentar neste arquivo e incluir o exemplo em `src/pages/design-system.tsx`.
