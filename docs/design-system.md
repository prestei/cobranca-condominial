# Design system

Tokens em `src/app/globals.css` (`@theme`). Tipografia: **Open Sans** em todo o projeto (`font-sans` no `body`; sem fonte com serifa). Componentes globais em `src/components/`. Catálogo visual em `/design-system` (implementação em `src/design-system/`).

## Componentes

Importar sempre de `@/components/...`. Não recriar markup ou estilos locais equivalentes.

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Button` | `button.tsx` | Ações. Variantes: `primary`, `secondary`, `outline`, `ghost`. Tamanhos: `sm`, `md`, `lg`. |
| `Input`, `Textarea`, `Select` | `input.tsx` | Campos de formulário compactos, sem ícone interno. Prop `invalid` para erro. |
| `Checkbox`, `Radio`, `Switch` | `input.tsx` | Controles de seleção com estilo primário. |
| `CheckboxField`, `RadioField`, `SwitchField` | `input.tsx` | Label ao lado do controle (e descrição opcional). |
| `FormField` | `input.tsx` | Label, obrigatório (`required`) e mensagem de erro. |
| `Badge` | `badge.tsx` | Etiquetas. Variantes: `primary`, `secondary`, `success`, `error`. |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | Navegação por abas (client component). |
| `CardMetric` | `card-metric.tsx` | Cartão de métrica com ícone. |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`, … | `table.tsx` | Listagens tabulares com scroll horizontal no container. |
| `EmptyState` | `empty-state.tsx` | Sem dados: título, descrição, ícone e ação opcionais. |
| `Icon` | `icon.tsx` | Ícones Lucide com tamanhos `sm`, `md`, `lg` e traço padronizado. |
| `Alert` | `alert.tsx` | Feedback inline. Variantes: `info`, `success`, `warning`, `error` (ícone Lucide por variante). |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, … | `dialog.tsx` | Modal controlado (`open`, `onOpenChange`). Elemento nativo `<dialog>`. |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetBody`, `SheetFooter`, `SheetClose`, … | `sheet.tsx` | Painel lateral para cadastro (`open`, `onOpenChange`). `<dialog>` ancorado à direita, largura máx. 32rem. Use `SheetForm`, `SheetHeaderLead`, `SheetHeaderIcon`, `SheetPanel`, `SheetToggleRow`, `SheetHelpText` e `SheetFooterForm` como padrão de formulário. |
| `ToastProvider`, `useToast` | `toast.tsx` | Notificações temporárias; envolver a app com `ToastProvider` (ver `app/providers.tsx`). |
| `AppShell`, `AppShellSidebar`, `AppShellNavLink`, … | `app-shell.tsx` | Modelo clássico: sidebar navy, top bar, drawer mobile (961px). |
| `PageHeader`, `PageContent` | `page-header.tsx` | Título, breadcrumb, descrição, ações e container da página. |

## Botões

- Texto em caixa alta (`uppercase`), peso semibold.
- Primário: gradiente navy; hover dourado.
- Secundário: gradiente dourado; hover navy.
- Desabilitado: opacidade reduzida e escala de cinza.

Ícones opcionais como filhos (ex.: `Icon` ou `lucide-react` com os mesmos tamanhos de `icon.tsx`), alinhados com `gap-sm`.

## Inputs

- Altura `h-input` (`--spacing-input`, menor que botões).
- Sem ícone embutido; padding horizontal uniforme.
- Foco: borda `brass` e anel suave.
- Erro: borda e label `status-critical`; usar `FormField` com `error`.

### Texto e lista

`Input`, `Textarea` e `Select` usam `FormField` com label acima do campo.

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

Cabeçalho compacto (`py-sm`, `text-label-md`), fundo `surface-subtle`. Colunas de dados: `TableHead` com `sortable`, `sortDirection` (`asc` | `desc` | `none`) e `onSort`. Coluna de menu: `TableHead actions` + `TableActionsCell` (ícone de três pontos). Linhas com borda inferior bem suave (`border-border-subtle/30`).

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
        <TableActionsCell />
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
          <TableActionsButton />
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

Modelo da aplicação: `app-layout` → sidebar recolhível → `app-main` (header global + conteúdo).

```text
app-layout
├── sidebar (264px / 84px, marca, carteira ativa, menu, ajuda/config, recolher)
└── app-main
    ├── header (busca, notificações, conta)
    └── main
        ├── PageHeader (breadcrumb, título e ações)
        └── PageContent (métricas, tabela responsiva, etc.)
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
        actions={<Button>Novo condomínio</Button>}
      />
      {/* conteúdo */}
    </PageContent>
  </AppShellMain>
</AppShell>
```

Breakpoint do drawer mobile: **961px**. Catálogo de componentes em `/design-system`.

## Novos componentes

Só criar componente global após alinhamento com o time. Ao adicionar: implementar em `src/components/`, documentar neste arquivo e incluir exemplo em `/design-system`.
