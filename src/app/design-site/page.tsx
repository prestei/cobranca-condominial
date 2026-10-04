import type { ReactNode } from "react";
import { Building, Inbox, Plus, ShieldCheck, User } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CondominiumsTableDemo, CondominiumsTableEmptyDemo } from "@/app/design-site/condominiums-table-demo";
import { EmptyState } from "@/components/empty-state";
import { Icon, iconSizes, iconStrokeWidths, type IconSize } from "@/components/icon";
import { FormField, Input, Select, Textarea } from "@/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";

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

const iconSizeSamples: { size: IconSize; usage: string }[] = [
  { size: "sm", usage: "Botões pequenos e ações inline" },
  { size: "md", usage: "Alertas, métricas e listas" },
  { size: "lg", usage: "Empty state e destaques" },
];

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

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-headline-sm text-on-surface">
      {children}
    </h2>
  );
}

export default function DesignSitePage() {
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

        <section className="flex flex-col gap-lg" aria-labelledby="cores">
          <SectionTitle id="cores">Cores</SectionTitle>
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
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="tipografia">
          <SectionTitle id="tipografia">Tipografia</SectionTitle>
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
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="icones">
          <SectionTitle id="icones">Ícones</SectionTitle>
          <article className="flex flex-col gap-lg rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
            <p className="text-body-sm text-on-surface-variant">
              Biblioteca padrão:{" "}
              <code className="text-body-sm text-on-surface">lucide-react</code>. Use o componente{" "}
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
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="botoes">
          <SectionTitle id="botoes">Botões</SectionTitle>
          <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-2">
            {buttonRows.map((row) => (
              <article
                key={row.variant}
                className="flex flex-col gap-lg rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card"
              >
                <header>
                  <h3 className="text-label-lg text-on-surface">{row.name}</h3>
                  <p className="mt-xs text-body-sm text-on-surface-variant">{row.detail}</p>
                </header>
                <div className="flex flex-wrap items-start gap-lg">
                  {row.samples.map((sample) => (
                    <div key={sample.size} className="flex flex-col items-start gap-sm">
                      <p className="text-label-sm text-on-surface-variant uppercase">{sample.size}</p>
                      <Button variant={row.variant} size={sample.size}>
                        {"icon" in sample ? (
                          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                        ) : null}
                        {sample.label}
                      </Button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <article className="rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
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
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="formularios">
          <SectionTitle id="formularios">Formulários</SectionTitle>
          <article className="rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
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
                  <option value="" disabled>Selecione</option>
                  <option value="civil">Direito civil</option>
                  <option value="empresarial">Direito empresarial</option>
                </Select>
              </FormField>
              <FormField label="Mensagem" htmlFor="ds-message">
                <Textarea id="ds-message" name="message" placeholder="Escreva sua mensagem..." />
              </FormField>
              <FormField
                label="Estado de erro"
                htmlFor="ds-error"
                error="Este campo é obrigatório."
              >
                <Input id="ds-error" name="error" defaultValue="Dado inválido" invalid />
              </FormField>
            </form>
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="navegacao">
          <SectionTitle id="navegacao">Navegação (tabs)</SectionTitle>
          <article className="rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
            <Tabs defaultValue="areas">
              <TabsList>
                <TabsTrigger value="areas">Áreas de atuação</TabsTrigger>
                <TabsTrigger value="sobre">Quem somos</TabsTrigger>
                <TabsTrigger value="equipe">Nossa equipe</TabsTrigger>
              </TabsList>
              <div className="mt-lg">
                <TabsContent value="areas">
                  Conteúdo da aba selecionada com espaçamento adequado.
                </TabsContent>
                <TabsContent value="sobre">História e valores do escritório.</TabsContent>
                <TabsContent value="equipe">Advogados e especialidades.</TabsContent>
              </div>
            </Tabs>
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="badges">
          <SectionTitle id="badges">Badges</SectionTitle>
          <article className="rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
            <div className="flex flex-wrap gap-md">
              {badgeSamples.map((sample) => (
                <Badge key={sample.variant} variant={sample.variant}>
                  {sample.label}
                </Badge>
              ))}
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="alertas">
          <SectionTitle id="alertas">Alertas</SectionTitle>
          <article className="flex flex-col gap-md rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
            <p className="text-body-sm text-on-surface-variant">
              Mensagens de feedback com ícone da{" "}
              <code className="text-body-sm text-on-surface">lucide-react</code> mapeado por variante.
            </p>
            {alertSamples.map((sample) => (
              <Alert key={sample.variant} variant={sample.variant} title={sample.title}>
                {sample.body}
              </Alert>
            ))}
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="tabela">
          <SectionTitle id="tabela">Tabela</SectionTitle>
          <article className="flex flex-col gap-lg">
            <CondominiumsTableDemo />
            <CondominiumsTableEmptyDemo />
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="vazio">
          <SectionTitle id="vazio">Estado vazio</SectionTitle>
          <article className="rounded-lg border border-border-subtle bg-surface-card shadow-card">
            <EmptyState
              icon={<Building className="size-6" strokeWidth={1.75} />}
              title="Carteira vazia"
              description="Quando não há dados na tela, use EmptyState sozinho ou dentro de TableEmpty."
              action={<Button variant="outline" size="sm">Ver documentação</Button>}
            />
          </article>
        </section>

        <section className="flex flex-col gap-md" aria-labelledby="cartoes">
          <SectionTitle id="cartoes">Cartão de métrica</SectionTitle>
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
        </section>
      </div>
    </main>
  );
}
