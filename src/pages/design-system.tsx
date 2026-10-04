
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Building, FileBarChart, HelpCircle, Inbox, Plus, Settings, ShieldCheck, User } from "lucide-react";
import { Alert } from "@/components/alert";
import {
  AppShell,
  AppShellBrand,
  AppShellCarteiraBadge,
  AppShellMain,
  AppShellNav,
  AppShellNavLink,
  AppShellNavSection,
  AppShellSidebar,
  AppShellSidebarFooter,
} from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon, iconSizes, iconStrokeWidths, type IconSize } from "@/components/icon";
import {
  Checkbox,
  CheckboxField,
  FormField,
  Input,
  Radio,
  RadioField,
  Select,
  Switch,
  SwitchField,
  Textarea,
} from "@/components/input";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import {
  ResponsiveTable,
  Table,
  TableActionsButton,
  TableActionsCell,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableMobileToolbar,
  TableRow,
  TableSelectCell,
  type TableSortDirection,
} from "@/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { useToast } from "@/components/toast";

const colorGroups = [
  {
    name: "Marca",
    swatches: [
      { name: "Navy", token: "primary-container", chip: "bg-primary-container", ink: "text-on-primary" },
      { name: "Navy hover", token: "primary-hover", chip: "bg-primary-hover", ink: "text-on-primary" },
      { name: "Brass", token: "brass", chip: "bg-brass", ink: "text-primary-container" },
      { name: "Gold subtle", token: "gold-subtle", chip: "bg-gold-subtle", ink: "text-primary-container" },
    ],
  },
  {
    name: "Superfície",
    swatches: [
      { name: "Canvas", token: "surface-canvas", chip: "bg-surface-canvas", ink: "text-on-surface" },
      { name: "Card", token: "surface-card", chip: "bg-surface-card", ink: "text-on-surface" },
      { name: "Subtle", token: "surface-subtle", chip: "bg-surface-subtle", ink: "text-on-surface" },
      { name: "Borda", token: "border-subtle", chip: "bg-border-subtle", ink: "text-on-surface" },
      { name: "Borda forte", token: "border-strong", chip: "bg-border-strong", ink: "text-on-surface" },
      { name: "Texto", token: "on-surface", chip: "bg-on-surface", ink: "text-surface-card" },
      { name: "Texto secundário", token: "on-surface-variant", chip: "bg-on-surface-variant", ink: "text-surface-card" },
    ],
  },
  {
    name: "Status",
    swatches: [
      { name: "Quitado", token: "status-settled", chip: "bg-status-settled", ink: "text-on-primary" },
      { name: "Pendente", token: "status-pending", chip: "bg-status-pending", ink: "text-on-primary" },
      { name: "Crítico", token: "status-critical", chip: "bg-status-critical", ink: "text-on-primary" },
    ],
  },
] as const;

const typeScale = [
  { token: "headline-xl", className: "text-headline-xl", sample: "Cobrança condominial" },
  { token: "headline-lg", className: "text-headline-lg", sample: "Visão geral" },
  { token: "headline-sm", className: "text-headline-sm", sample: "Condomínios" },
  { token: "metric", className: "text-metric tabular-nums", sample: "1.247" },
  { token: "body-lg", className: "text-body-lg", sample: "Acompanhamento das cobranças e da inadimplência." },
  { token: "body-md", className: "text-body-md", sample: "Unidades acompanhadas na carteira ativa." },
  { token: "body-sm", className: "text-body-sm", sample: "condomínios na carteira" },
  { token: "label-lg", className: "text-label-lg", sample: "Salvar atendimento" },
  { token: "label-md", className: "text-label-md", sample: "Situação" },
  { token: "label-sm", className: "text-label-sm uppercase", sample: "Notificação" },
] as const;

const iconSizeSamples: { size: IconSize; usage: string }[] = [
  { size: "sm", usage: "Botões pequenos e ações inline" },
  { size: "md", usage: "Alertas, métricas e listas" },
  { size: "lg", usage: "Empty state e destaques" },
];

const buttonRows = [
  {
    name: "Primary",
    detail: "Ação principal",
    variant: "primary" as const,
    samples: [
      { size: "sm" as const, label: "Pequeno" },
      { size: "md" as const, label: "Normal" },
      { size: "lg" as const, label: "Grande", icon: true },
    ],
  },
  {
    name: "Secondary",
    detail: "Ação de destaque",
    variant: "secondary" as const,
    samples: [
      { size: "sm" as const, label: "Boleto" },
      { size: "md" as const, label: "Emitir termo" },
      { size: "lg" as const, label: "Gerar boleto" },
    ],
  },
  {
    name: "Outline",
    detail: "Ação neutra",
    variant: "outline" as const,
    samples: [
      { size: "sm" as const, label: "Filtro" },
      { size: "md" as const, label: "Exportar" },
      { size: "lg" as const, label: "Cancelar" },
    ],
  },
  {
    name: "Ghost",
    detail: "Ação discreta",
    variant: "ghost" as const,
    samples: [
      { size: "sm" as const, label: "Ver todas" },
      { size: "md" as const, label: "Ver histórico" },
      { size: "lg" as const, label: "Limpar filtros" },
    ],
  },
] as const;

const badgeSamples = [
  { variant: "primary" as const, label: "Novo" },
  { variant: "secondary" as const, label: "Destaque" },
  { variant: "success" as const, label: "Concluído" },
  { variant: "error" as const, label: "Urgente" },
] as const;

const alertSamples = [
  {
    variant: "info" as const,
    title: "Sincronização agendada",
    body: "Os dados do condomínio serão atualizados automaticamente às 22h.",
  },
  {
    variant: "success" as const,
    title: "Cobrança registrada",
    body: "O pagamento foi confirmado e a unidade saiu da fila de pendências.",
  },
  {
    variant: "warning" as const,
    title: "Prazo próximo",
    body: "Há boletos que vencem nos próximos três dias úteis.",
  },
  {
    variant: "error" as const,
    title: "Falha na integração",
    body: "Não foi possível enviar os dados para o Superlógica. Tente novamente.",
  },
] as const;

type Situation = "Ativo" | "Pendente";

type CondominiumRow = {
  name: string;
  units: number;
  situation: Situation;
};

const initialRows: CondominiumRow[] = [
  { name: "Residencial Aurora", units: 84, situation: "Ativo" },
  { name: "Ed. Central Park", units: 120, situation: "Ativo" },
  { name: "Condomínio Horizonte", units: 64, situation: "Pendente" },
];

const situationBadge = {
  Ativo: "success" as const,
  Pendente: "secondary" as const,
};

type SortKey = "name" | "units" | "situation";

function nextDirection(current: TableSortDirection): TableSortDirection {
  if (current === "none") return "asc";
  if (current === "asc") return "desc";
  return "none";
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-headline-sm text-on-surface">
      {children}
    </h2>
  );
}

function Showcase({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-md ${className ?? ""}`} aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {children}
    </section>
  );
}

function ShowcaseWide({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-lg" aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {children}
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card ${className ?? ""}`}
    >
      {children}
    </article>
  );
}

function FilterBarSample({
  idPrefix = "ds-filter",
  showApplied = true,
}: {
  idPrefix?: string;
  showApplied?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [situation, setSituation] = useState("todos");
  const [activity, setActivity] = useState("todos");
  const [order, setOrder] = useState("recentes");
  const [applied, setApplied] = useState("");

  function handleClear() {
    setSearch("");
    setSituation("todos");
    setActivity("todos");
    setOrder("recentes");
    setApplied("");
  }

  function handleApply() {
    const query = search.trim() || "sem busca";
    setApplied(`${query} · situação ${situation} · ${activity} · ${order}`);
  }

  return (
    <div className="flex flex-col gap-md">
      <FilterBar
        searchId={`${idPrefix}-search`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar condomínio..."
        onApply={handleApply}
        onClear={handleClear}
        fields={[
          {
            id: `${idPrefix}-situation`,
            label: "Situação",
            value: situation,
            onChange: setSituation,
            options: [
              { value: "todos", label: "Todos" },
              { value: "ativo", label: "Ativo" },
              { value: "pendente", label: "Pendente" },
            ],
          },
          {
            id: `${idPrefix}-activity`,
            label: "Ativo / Inativo",
            value: activity,
            onChange: setActivity,
            options: [
              { value: "todos", label: "Todos" },
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ],
          },
          {
            id: `${idPrefix}-order`,
            label: "Ordenar por",
            value: order,
            onChange: setOrder,
            options: [
              { value: "recentes", label: "Mais recentes" },
              { value: "antigos", label: "Mais antigos" },
              { value: "nome", label: "Nome" },
            ],
          },
        ]}
      />
      {showApplied && applied ? (
        <p className="text-body-sm text-on-surface-variant">Filtros aplicados: {applied}</p>
      ) : null}
    </div>
  );
}

function FormControls() {
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [situation, setSituation] = useState<"ativo" | "pendente">("ativo");
  const [notifications, setNotifications] = useState(false);

  return (
    <div className="flex flex-col gap-lg border-t border-border-subtle pt-lg">
      <div>
        <h3 className="text-label-lg text-on-surface">Seleção</h3>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Checkbox, radio e switch com estilo primário navy e foco brass.
        </p>
      </div>

      <div className="flex flex-col gap-md">
        <CheckboxField label="Aceito receber comunicações sobre a carteira" htmlFor="ds-terms">
          <Checkbox
            id="ds-terms"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
          />
        </CheckboxField>

        <fieldset className="flex flex-col gap-sm">
          <legend className="text-label-lg text-primary-container">Situação do condomínio</legend>
          <RadioField label="Ativo na carteira" htmlFor="ds-situation-active">
            <Radio
              id="ds-situation-active"
              name="ds-situation"
              value="ativo"
              checked={situation === "ativo"}
              onChange={() => setSituation("ativo")}
            />
          </RadioField>
          <RadioField label="Pendente de regularização" htmlFor="ds-situation-pending">
            <Radio
              id="ds-situation-pending"
              name="ds-situation"
              value="pendente"
              checked={situation === "pendente"}
              onChange={() => setSituation("pendente")}
            />
          </RadioField>
        </fieldset>

        <SwitchField
          label="Notificações por e-mail"
          htmlFor="ds-notifications"
          description="Avisos de vencimento e alterações na integração."
        >
          <Switch
            id="ds-notifications"
            checked={notifications}
            onChange={(event) => setNotifications(event.target.checked)}
          />
        </SwitchField>

        <div className="flex flex-wrap items-center gap-lg rounded-lg border border-border-subtle bg-surface-subtle/50 p-md">
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Checkbox disabled checked aria-label="Checkbox desabilitado marcado" />
            Desabilitado
          </label>
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Radio disabled name="ds-disabled-radio" aria-label="Radio desabilitado" />
            Radio off
          </label>
          <label className="inline-flex items-center gap-sm text-body-sm text-on-surface-variant">
            <Switch disabled aria-label="Switch desabilitado" />
            Switch off
          </label>
        </div>
      </div>
    </div>
  );
}

function Overlays() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  function handleConfirm() {
    setDialogOpen(false);
    toast({
      variant: "success",
      title: "Condomínio removido",
      description: "O registro foi excluído da carteira.",
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-md">
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Abrir confirmação
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            toast({
              variant: "info",
              title: "Sincronização agendada",
              description: "Os dados serão atualizados às 22h.",
            })
          }
        >
          Toast informativo
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            toast({
              variant: "error",
              title: "Falha ao salvar",
              description: "Verifique a conexão e tente novamente.",
            })
          }
        >
          Toast de erro
        </Button>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Remover condomínio?"
        description="Esta ação remove o condomínio da carteira. Você pode cadastrá-lo novamente depois."
        onConfirm={handleConfirm}
      />
    </>
  );
}

function SheetSample() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSheetOpen(false);
    toast({
      variant: "success",
      title: "Integração salva",
      description: "As configurações do pixel foram atualizadas.",
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setSheetOpen(true)}>
        Abrir sheet de cadastro
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent aria-labelledby="sheet-demo-title" aria-describedby="sheet-demo-desc">
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon className="bg-primary-container text-on-primary">
                  <span className="text-headline-sm font-bold leading-none" aria-hidden="true">
                    f
                  </span>
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id="sheet-demo-title">Adicionar Pixel Facebook</SheetTitle>
                  <SheetDescription id="sheet-demo-desc">
                    Cadastre uma nova instância para a unidade selecionada.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>

            <SheetBody>
              <FormField label="ID do Pixel" htmlFor="sheet-demo-pixel-id" required>
                <Input
                  id="sheet-demo-pixel-id"
                  name="pixelId"
                  placeholder="123456789012345"
                  inputMode="numeric"
                  required
                />
              </FormField>

              <FormField label="Token do Pixel (API)" htmlFor="sheet-demo-token">
                <Input
                  id="sheet-demo-token"
                  name="token"
                  placeholder="Token de acesso da Conversions API"
                  autoComplete="off"
                />
              </FormField>
            </SheetBody>

            <SheetFooterForm onClose={() => setSheetOpen(false)} />
          </SheetForm>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  return (
    <Checkbox
      ref={ref}
      checked={checked}
      aria-label="Selecionar todos"
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

function CondominiumsTable({ viewport = "auto" }: { viewport?: "auto" | "desktop" | "mobile" }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<TableSortDirection>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    if (!sortKey || sortDirection === "none") {
      return initialRows;
    }

    const sorted = [...initialRows].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (sortKey === "units") {
        return a.units - b.units;
      }
      return a.situation.localeCompare(b.situation, "pt-BR");
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      const next = nextDirection(sortDirection);
      setSortDirection(next);
      if (next === "none") {
        setSortKey(null);
      }
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.name));
  const someSelected = rows.some((row) => selected.has(row.name)) && !allSelected;

  function toggleRow(name: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(rows.map((row) => row.name)));
      return;
    }
    setSelected(new Set());
  }

  const desktopTable = (
    <Table aria-label="Condomínios na carteira">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            selection
            selectionChecked={allSelected}
            selectionIndeterminate={someSelected}
            onSelectionChange={toggleAll}
          />
          <TableHead sortable sortDirection={directionFor("name")} onSort={() => handleSort("name")}>
            Condomínio
          </TableHead>
          <TableHead
            align="right"
            className="w-28"
            sortable
            sortDirection={directionFor("units")}
            onSort={() => handleSort("units")}
          >
            Unidades
          </TableHead>
          <TableHead
            className="w-36"
            sortable
            sortDirection={directionFor("situation")}
            onSort={() => handleSort("situation")}
          >
            Situação
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableSelectCell
              checked={selected.has(row.name)}
              label={`Selecionar ${row.name}`}
              onCheckedChange={(checked) => toggleRow(row.name, checked)}
            />
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell align="right" className="tabular-nums">
              {row.units}
            </TableCell>
            <TableCell>
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableCell>
            <TableActionsCell label={`Ações para ${row.name}`} />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const mobileTable = (
    <TableMobileList aria-label="Condomínios na carteira">
      <TableMobileToolbar>
        <SelectAllCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
        <span className="text-label-md text-primary-container">Selecionar todos</span>
      </TableMobileToolbar>
      {rows.map((row) => (
        <TableMobileCard key={row.name}>
          <TableMobileCardHeader>
            <Checkbox
              checked={selected.has(row.name)}
              aria-label={`Selecionar ${row.name}`}
              onChange={(event) => toggleRow(row.name, event.target.checked)}
            />
            <TableMobileTitle>{row.name}</TableMobileTitle>
            <TableActionsButton label={`Ações para ${row.name}`} />
          </TableMobileCardHeader>
          <TableMobileFields>
            <TableMobileField label="Unidades" valueClassName="tabular-nums">
              {row.units}
            </TableMobileField>
            <TableMobileField label="Situação">
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableMobileField>
          </TableMobileFields>
        </TableMobileCard>
      ))}
    </TableMobileList>
  );

  return <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />;
}

function CondominiumsTableEmpty({ viewport = "auto" }: { viewport?: "auto" | "desktop" | "mobile" }) {
  const emptyState = (
    <EmptyState
      icon={<Inbox className="size-6" strokeWidth={1.75} />}
      title="Nenhum condomínio encontrado"
      description="Ajuste os filtros ou cadastre um novo condomínio na carteira."
      action={
        <Button size="sm">
          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
          Novo condomínio
        </Button>
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Exemplo sem registros">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead selection selectionChecked={false} selectionDisabled />
          <TableHead sortable sortDirection="none">
            Condomínio
          </TableHead>
          <TableHead align="right" className="w-28" sortable sortDirection="none">
            Unidades
          </TableHead>
          <TableHead className="w-36" sortable sortDirection="none">
            Situação
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty colSpan={5}>{emptyState}</TableEmpty>
      </TableBody>
    </Table>
  );

  const mobileTable = <TableMobileEmpty>{emptyState}</TableMobileEmpty>;

  return <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />;
}

function DemoSidebar() {
  return (
    <AppShellSidebar>
      <AppShellBrand title="Cobrança" />
      <AppShellCarteiraBadge />
      <AppShellNav>
        <AppShellNavSection title="Carteira">
          <AppShellNavLink href="/design-system" icon={Building} active count={3}>
            Condomínios
          </AppShellNavLink>
          <AppShellNavLink href="/design-system" icon={User} count={268}>
            Unidades
          </AppShellNavLink>
        </AppShellNavSection>
        <AppShellNavSection title="Análise">
          <AppShellNavLink href="/design-system" icon={FileBarChart}>
            Relatórios
          </AppShellNavLink>
          <AppShellNavLink href="/design-system" icon={ShieldCheck}>
            Indicadores
          </AppShellNavLink>
        </AppShellNavSection>
      </AppShellNav>
      <AppShellSidebarFooter>
        <AppShellNavLink href="/design-system" icon={HelpCircle}>
          Ajuda e suporte
        </AppShellNavLink>
        <AppShellNavLink href="/design-system" icon={Settings}>
          Configurações
        </AppShellNavLink>
      </AppShellSidebarFooter>
    </AppShellSidebar>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-surface-canvas px-margin py-margin-md min-[768px]:px-margin-md min-[1280px]:px-margin-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-xl">
        <header className="border-b border-border-subtle pb-lg">
          <p className="text-label-sm text-on-surface-variant uppercase">Lex Condominial</p>
          <h1 className="mt-sm text-headline-lg text-on-surface">Design system</h1>
          <p className="mt-sm max-w-3xl text-body-md text-on-surface-variant">
            Cores, tipografia e componentes globais reutilizáveis em todas as telas.
          </p>
        </header>

        <ShowcaseWide id="cores" title="Cores">
          {colorGroups.map((group) => (
            <div key={group.name} className="flex flex-col gap-sm">
              <h3 className="text-label-sm text-on-surface-variant uppercase">{group.name}</h3>
              <ul className="grid grid-cols-2 gap-md min-[961px]:grid-cols-4">
                {group.swatches.map((swatch) => (
                  <li
                    key={swatch.token}
                    className="overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card"
                  >
                    <div className={`px-md py-lg ${swatch.chip}`}>
                      <p className={`text-label-md ${swatch.ink}`}>{swatch.name}</p>
                    </div>
                    <p className="px-md py-sm text-body-sm text-on-surface-variant">{swatch.token}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </ShowcaseWide>

        <Showcase id="tipografia" title="Tipografia">
          <div className="max-w-3xl overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
            <ul>
              {typeScale.map((item) => (
                <li
                  key={item.token}
                  className="flex flex-col gap-xs border-b border-surface-subtle px-lg py-md last:border-b-0 min-[768px]:flex-row min-[768px]:items-baseline min-[768px]:justify-between min-[768px]:gap-md"
                >
                  <p className={`min-w-0 text-on-surface ${item.className}`}>{item.sample}</p>
                  <p className="shrink-0 text-label-sm text-on-surface-variant uppercase">{item.token}</p>
                </li>
              ))}
            </ul>
          </div>
        </Showcase>

        <Showcase id="layout" title="Layout da aplicação">
          <p className="text-body-sm text-on-surface-variant">
            Barra lateral recolhível (264px / 84px), badge de carteira, header com busca, notificações e conta, faixa
            de página com breadcrumb e ações, filtros, métricas e tabela. No smartphone, menu em drawer.
          </p>
          <div className="overflow-hidden rounded-lg border border-border-subtle shadow-card">
            <AppShell
              sidebar={<DemoSidebar />}
              user={{
                name: "Bruna Souza",
                initials: "BS",
                menuSubtitle: "Cobrança · Carteira ativa",
              }}
              notificationCount={2}
            >
              <AppShellMain>
                <PageHeader
                  title="Condomínios"
                  description="Acompanhe unidades, situação e ações da carteira."
                  breadcrumbs={[
                    { label: "Início", href: "/" },
                    { label: "Carteira", href: "/design-system" },
                    { label: "Condomínios" },
                  ]}
                  actions={
                    <Button size="md">
                      <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                      Novo
                    </Button>
                  }
                />
                <PageContent>
                  <FilterBarSample idPrefix="ds-layout-filter" showApplied={false} />
                  <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
                    <CardMetric
                      iconClassName="bg-surface-subtle text-on-surface-variant"
                      icon={<Icon icon={Building} size="md" />}
                    >
                      <p className="text-metric text-on-surface tabular-nums">03</p>
                      <p className="mt-sm text-body-sm text-on-surface-variant">na carteira</p>
                    </CardMetric>
                    <CardMetric
                      iconClassName="bg-surface-subtle text-on-surface-variant"
                      icon={<Icon icon={User} size="md" />}
                    >
                      <p className="text-metric text-on-surface tabular-nums">268</p>
                      <p className="mt-sm text-body-sm text-on-surface-variant">unidades</p>
                    </CardMetric>
                    <CardMetric
                      iconClassName="bg-gold-subtle text-brass"
                      icon={<Icon icon={ShieldCheck} size="md" className="text-brass" />}
                    >
                      <p className="text-metric text-on-surface tabular-nums">02</p>
                      <p className="mt-sm text-body-sm text-on-surface-variant">ativos</p>
                    </CardMetric>
                  </div>
                  <CondominiumsTable />
                </PageContent>
              </AppShellMain>
            </AppShell>
          </div>
        </Showcase>

        <Showcase id="icones" title="Ícones">
          <Panel className="flex flex-col gap-lg">
            <p className="text-body-sm text-on-surface-variant">
              Biblioteca padrão: <code className="text-body-sm text-on-surface">lucide-react</code>. Use o componente{" "}
              <code className="text-body-sm text-on-surface">Icon</code> para tamanho e traço consistentes.
            </p>
            <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
              {iconSizeSamples.map((sample) => (
                <div
                  key={sample.size}
                  className="flex flex-col items-start gap-md rounded-lg border border-border-subtle bg-surface-subtle/50 p-md"
                >
                  <Icon icon={Inbox} size={sample.size} className="text-primary-container" />
                  <div>
                    <p className="text-label-lg text-on-surface">{sample.size}</p>
                    <p className="mt-xs text-body-sm text-on-surface-variant">
                      {iconSizes[sample.size]} · stroke {iconStrokeWidths[sample.size]}
                    </p>
                    <p className="mt-sm text-body-sm text-on-surface-variant">{sample.usage}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-lg border-t border-border-subtle pt-lg">
              <Icon icon={Building} size="md" className="text-on-surface-variant" />
              <Icon icon={User} size="md" className="text-on-surface-variant" />
              <Icon icon={ShieldCheck} size="md" className="text-brass" />
              <Icon icon={Plus} size="sm" className="text-primary-container" />
            </div>
          </Panel>
        </Showcase>

        <Showcase id="botoes" title="Botões">
          <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-2">
            {buttonRows.map((row) => (
              <Panel key={row.variant}>
                <header>
                  <h3 className="text-label-lg text-on-surface">{row.name}</h3>
                  <p className="mt-xs text-body-sm text-on-surface-variant">{row.detail}</p>
                </header>
                <div className="mt-lg flex flex-wrap items-start gap-lg">
                  {row.samples.map((sample) => (
                    <div key={sample.size} className="flex flex-col items-start gap-sm">
                      <p className="text-label-sm text-on-surface-variant uppercase">{sample.size}</p>
                      <Button variant={row.variant} size={sample.size}>
                        {"icon" in sample ? <Plus className="size-4" strokeWidth={2} aria-hidden="true" /> : null}
                        {sample.label}
                      </Button>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
          <Panel>
            <h3 className="text-label-lg text-on-surface">Desabilitado</h3>
            <div className="mt-lg flex flex-wrap items-center gap-md">
              <Button disabled>Salvar</Button>
              <Button variant="secondary" disabled>
                Emitir termo
              </Button>
              <Button variant="outline" disabled>
                Exportar
              </Button>
              <Button variant="ghost" disabled>
                Ver todas
              </Button>
            </div>
          </Panel>
        </Showcase>

        <Showcase id="formularios" title="Formulários">
          <Panel>
            <form className="flex flex-col gap-lg">
              <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2">
                <FormField label="Nome completo" htmlFor="ds-name" required>
                  <Input id="ds-name" name="name" placeholder="Seu nome completo" />
                </FormField>
                <FormField label="E-mail" htmlFor="ds-email" required>
                  <Input id="ds-email" name="email" type="email" placeholder="seu@email.com" />
                </FormField>
              </div>
              <FormField label="Área de interesse" htmlFor="ds-subject">
                <Select id="ds-subject" name="subject" defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option value="civil">Direito civil</option>
                  <option value="empresarial">Direito empresarial</option>
                </Select>
              </FormField>
              <FormField label="Mensagem" htmlFor="ds-message">
                <Textarea id="ds-message" name="message" placeholder="Escreva sua mensagem..." />
              </FormField>
              <FormField label="Estado de erro" htmlFor="ds-error" error="Este campo é obrigatório.">
                <Input id="ds-error" name="error" defaultValue="Dado inválido" invalid />
              </FormField>
              <FormControls />
            </form>
          </Panel>
        </Showcase>

        <Showcase id="filtros" title="Filtros">
          <Panel>
            <p className="mb-lg text-body-sm text-on-surface-variant">
              Barra padrão de listagem: busca, selects e ações Limpar e Filtrar. Os campos ficam sem ícone.
            </p>
            <FilterBarSample />
          </Panel>
        </Showcase>

        <Showcase id="navegacao" title="Navegação (tabs)">
          <Panel>
            <Tabs defaultValue="areas">
              <TabsList>
                <TabsTrigger value="areas">Áreas de atuação</TabsTrigger>
                <TabsTrigger value="sobre">Quem somos</TabsTrigger>
                <TabsTrigger value="equipe">Nossa equipe</TabsTrigger>
              </TabsList>
              <div className="mt-lg">
                <TabsContent value="areas">Conteúdo da aba selecionada com espaçamento adequado.</TabsContent>
                <TabsContent value="sobre">História e valores do escritório.</TabsContent>
                <TabsContent value="equipe">Advogados e especialidades.</TabsContent>
              </div>
            </Tabs>
          </Panel>
        </Showcase>

        <Showcase id="badges" title="Badges">
          <Panel>
            <div className="flex flex-wrap gap-md">
              {badgeSamples.map((sample) => (
                <Badge key={sample.variant} variant={sample.variant}>
                  {sample.label}
                </Badge>
              ))}
            </div>
          </Panel>
        </Showcase>

        <Showcase id="alertas" title="Alertas">
          <Panel className="flex flex-col gap-md">
            <p className="text-body-sm text-on-surface-variant">
              Mensagens de feedback com ícone da <code className="text-body-sm text-on-surface">lucide-react</code>{" "}
              mapeado por variante.
            </p>
            {alertSamples.map((sample) => (
              <Alert key={sample.variant} variant={sample.variant} title={sample.title}>
                {sample.body}
              </Alert>
            ))}
          </Panel>
        </Showcase>

        <Showcase id="overlays" title="Dialog, sheet e toast">
          <Panel>
            <p className="mb-lg text-body-sm text-on-surface-variant">
              Confirmações com <code className="text-body-sm text-on-surface">ConfirmDialog</code>, cadastros laterais
              com <code className="text-body-sm text-on-surface">Sheet</code> e feedback global com{" "}
              <code className="text-body-sm text-on-surface">useToast</code> (provider no layout da app).
            </p>
            <Overlays />
          </Panel>
        </Showcase>

        <Showcase id="sheet" title="Sheet (cadastro lateral)">
          <Panel>
            <p className="mb-lg text-body-sm text-on-surface-variant">
              Formulários de cadastro em painel lateral fixo à direita, com rolagem no corpo e ações no rodapé.
            </p>
            <SheetSample />
          </Panel>
        </Showcase>

        <Showcase id="tabela" title="Tabela">
          <article className="flex flex-col gap-lg">
            <CondominiumsTable />
            <CondominiumsTableEmpty />
          </article>
          <Panel className="min-[768px]:hidden">
            <h3 className="text-label-lg text-on-surface">Modelo smartphone</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Abaixo de <span className="text-on-surface">768px</span>, a mesma listagem vira cards com checkbox,
              título, ações e campos label + valor.
            </p>
          </Panel>
          <div className="hidden flex-col gap-md min-[768px]:flex">
            <h3 className="text-label-lg text-on-surface">Preview smartphone (forçado)</h3>
            <p className="text-body-sm text-on-surface-variant">
              Simulação estreita para revisar o layout mobile no desktop.
            </p>
            <div className="mx-auto w-full max-w-[24rem] rounded-xl border border-border-strong bg-surface-canvas p-sm shadow-modal">
              <CondominiumsTable viewport="mobile" />
            </div>
          </div>
        </Showcase>

        <Showcase id="vazio" title="Estado vazio">
          <Panel className="p-0 shadow-card">
            <EmptyState
              icon={<Building className="size-6" strokeWidth={1.75} />}
              title="Carteira vazia"
              description="Quando não há dados na tela, use EmptyState sozinho ou dentro de TableEmpty."
              action={
                <Button variant="outline" size="sm">
                  Ver documentação
                </Button>
              }
            />
          </Panel>
        </Showcase>

        <Showcase id="cartoes" title="Cartão de métrica">
          <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-3" aria-label="Resumo da carteira">
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Building className="size-5" strokeWidth={1.75} />}
            >
              <p className="text-metric text-on-surface tabular-nums">03</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">condomínios na carteira</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<User className="size-5" strokeWidth={1.75} />}
            >
              <p className="text-metric text-on-surface tabular-nums">268</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">unidades acompanhadas</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<ShieldCheck className="size-5" strokeWidth={1.75} />}
            >
              <p className="text-metric text-on-surface tabular-nums">
                02
                <span className="font-semibold text-on-surface-variant"> / 03</span>
              </p>
              <span
                className="mt-xs block h-xs w-[calc(var(--spacing-xl)+var(--spacing-lg)+var(--spacing-sm))] overflow-hidden rounded-md bg-gold-subtle"
                aria-hidden="true"
              >
                <span className="block h-full w-2/3 bg-brass" />
              </span>
              <p className="mt-sm text-body-sm text-on-surface-variant">com situação ativa</p>
            </CardMetric>
          </div>
        </Showcase>
      </div>
    </main>
  );
}
