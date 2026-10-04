import type { ReactNode } from "react";
import { Building, Plus, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";

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
  { token: "headline-xl", className: "font-display text-headline-xl", sample: "Cobrança condominial" },
  { token: "headline-lg", className: "font-display text-headline-lg", sample: "Visão geral" },
  { token: "headline-sm", className: "font-display text-headline-sm", sample: "Condomínios" },
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
    variant: "primary",
    samples: [
      { size: "sm", label: "Todos" },
      { size: "md", label: "Salvar" },
      { size: "lg", label: "Novo condomínio", icon: true },
    ],
  },
  {
    name: "Secondary",
    detail: "Ação de cobrança",
    variant: "secondary",
    samples: [
      { size: "sm", label: "Boleto" },
      { size: "md", label: "Emitir termo" },
      { size: "lg", label: "Gerar boleto" },
    ],
  },
  {
    name: "Outline",
    detail: "Ação neutra",
    variant: "outline",
    samples: [
      { size: "sm", label: "Acima de 90 dias" },
      { size: "md", label: "Exportar" },
      { size: "lg", label: "Cancelar" },
    ],
  },
  {
    name: "Ghost",
    detail: "Ação discreta",
    variant: "ghost",
    samples: [
      { size: "sm", label: "Ver todas" },
      { size: "md", label: "Ver histórico" },
      { size: "lg", label: "Limpar filtros" },
    ],
  },
] as const;

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-headline-sm text-on-surface">
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
          <h1 className="mt-sm font-display text-headline-lg text-on-surface">Design system</h1>
          <p className="mt-sm max-w-3xl text-body-md text-on-surface-variant">
            Cores, tipografia e componentes globais das telas de cobrança.
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
