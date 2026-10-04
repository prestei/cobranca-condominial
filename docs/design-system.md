# Design system

Tokens em `src/app/globals.css` (`@theme`). Tipografia: **Open Sans** em todo o projeto (`font-sans` no `body`; sem fonte com serifa). Componentes globais em `src/components/`. Catálogo visual em `/design-site`.

## Componentes

Importar sempre de `@/components/...`. Não recriar markup ou estilos locais equivalentes.

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Button` | `button.tsx` | Ações. Variantes: `primary`, `secondary`, `outline`, `ghost`. Tamanhos: `sm`, `md`, `lg`. |
| `Input`, `Textarea`, `Select` | `input.tsx` | Campos de formulário compactos, sem ícone interno. Prop `invalid` para erro. |
| `FormField` | `input.tsx` | Label, obrigatório (`required`) e mensagem de erro. |
| `Badge` | `badge.tsx` | Etiquetas. Variantes: `primary`, `secondary`, `success`, `error`. |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | Navegação por abas (client component). |
| `CardMetric` | `card-metric.tsx` | Cartão de métrica com ícone. |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`, … | `table.tsx` | Listagens tabulares com scroll horizontal no container. |
| `EmptyState` | `empty-state.tsx` | Sem dados: título, descrição, ícone e ação opcionais. |
| `Icon` | `icon.tsx` | Ícones Lucide com tamanhos `sm`, `md`, `lg` e traço padronizado. |
| `Alert` | `alert.tsx` | Feedback inline. Variantes: `info`, `success`, `warning`, `error` (ícone Lucide por variante). |

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

## Novos componentes

Só criar componente global após alinhamento com o time. Ao adicionar: implementar em `src/components/`, documentar neste arquivo e incluir exemplo em `/design-site`.
