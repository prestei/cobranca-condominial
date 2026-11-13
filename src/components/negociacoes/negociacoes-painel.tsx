"use client";

import { Handshake } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PropostaNegociacaoCard } from "@/components/negociacoes/proposta-negociacao-card";
import { PropostaNegociacaoExclusiva } from "@/components/negociacoes/proposta-negociacao-exclusiva";
import {
  statusPropostaNegociacao,
  type Cadastros,
  type Condominio,
  type PropostaNegociacao,
} from "@/data/catalogo";
import type { ResumoAcordo } from "@/lib/acordos/resumo";
import type { PerfilOperacional } from "@/lib/perfil-operacional";

type Metricas = {
  total: number;
  emAnalise: number;
  aceitas: number;
  parcelasVencidas: number;
  acordosComDescumprimento: number;
};

type Props = {
  cadastros: Cadastros;
  perfil: PerfilOperacional;
  metricas: Metricas;
  propostasPagina: PropostaNegociacao[];
  totalFiltradas: number;
  page: number;
  onPageChange: (page: number) => void;
  resumoPorProposta: Map<string, ResumoAcordo>;
  selecionadaId: string | null;
  onSelecionar: (id: string | null) => void;
  onRecarregar: () => void;
  erro?: string;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onAplicarFiltros: () => void;
  onLimparFiltros: () => void;
  status: string;
  onStatusChange: (value: string) => void;
  condominio: string;
  onCondominioChange: (value: string) => void;
  condominiosOpcoes: Condominio[];
  advogado: string;
  onAdvogadoChange: (value: string) => void;
  advogadosFiltro: string[];
};

function FaixaIndicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div
      className={[
        "flex min-w-[7.5rem] flex-1 flex-col gap-xs rounded-lg px-md py-sm",
        destaque ? "bg-error-container/15" : "bg-surface-subtle",
      ].join(" ")}
    >
      <span className="text-metric tabular-nums text-on-surface">{valor}</span>
      <span className="text-body-sm text-on-surface-variant">{rotulo}</span>
    </div>
  );
}

export function NegociacoesPainel({
  cadastros,
  perfil,
  metricas,
  propostasPagina,
  totalFiltradas,
  page,
  onPageChange,
  resumoPorProposta,
  selecionadaId,
  onSelecionar,
  onRecarregar,
  erro,
  searchDraft,
  onSearchDraftChange,
  onAplicarFiltros,
  onLimparFiltros,
  status,
  onStatusChange,
  condominio,
  onCondominioChange,
  condominiosOpcoes,
  advogado,
  onAdvogadoChange,
  advogadosFiltro,
}: Props) {
  const metricValor = (n: number) => String(n).padStart(2, "0");

  function selecionarChip(novoStatus: string) {
    onStatusChange(novoStatus);
    onPageChange(1);
  }

  if (selecionadaId) {
    return (
      <PropostaNegociacaoExclusiva
        propostaId={selecionadaId}
        cadastros={cadastros}
        onVoltar={() => onSelecionar(null)}
        onRecarregar={onRecarregar}
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <section className="overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-br from-primary-fixed/35 via-surface-card to-surface-card shadow-card">
        <div className="flex flex-col gap-md p-lg min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
          <div className="flex items-start gap-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">
              <Icon icon={Handshake} size="lg" />
            </div>
            <div>
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Centro de negociações</p>
              <h2 className="text-headline-sm text-on-surface">Propostas e acompanhamento de acordos</h2>
              <p className="mt-xs max-w-prose text-body-sm text-on-surface-variant">
                Valores sujeitos à alçada do advogado. Pagamentos confirmados atualizam o saldo do acordo — proposta não
                equivale a recebimento.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-sm">
            {statusPropostaNegociacao.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={status === item ? "primary" : "secondary"}
                onClick={() => selecionarChip(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={status === "todos" ? "primary" : "ghost"}
              onClick={() => selecionarChip("todos")}
            >
              Todas
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-sm border-t border-border-subtle bg-surface-card/80 px-lg py-md">
          <FaixaIndicador rotulo="Propostas na carteira" valor={metricValor(metricas.total)} />
          <FaixaIndicador rotulo="Em análise" valor={metricValor(metricas.emAnalise)} />
          <FaixaIndicador rotulo="Acordos ativos" valor={metricValor(metricas.aceitas)} />
          <FaixaIndicador rotulo="Parcelas vencidas" valor={metricValor(metricas.parcelasVencidas)} destaque />
          <FaixaIndicador
            rotulo="Risco de descumprimento"
            valor={metricValor(metricas.acordosComDescumprimento)}
            destaque
          />
        </div>
      </section>

      <FiltrosSection>
        <FilterBar
          searchLabel="Buscar unidade ou condomínio"
          searchPlaceholder="Unidade, condomínio ou advogado…"
          searchValue={searchDraft}
          onSearchChange={onSearchDraftChange}
          onApply={onAplicarFiltros}
          onClear={onLimparFiltros}
          fields={[
            {
              id: "condominio",
              label: "Condomínio",
              value: condominio,
              onChange: onCondominioChange,
              options: [
                { value: "todos", label: "Todos" },
                ...condominiosOpcoes.map((item) => ({ value: String(item.id), label: item.nome })),
              ],
            },
            {
              id: "advogado",
              label: "Advogado",
              value: advogado,
              onChange: onAdvogadoChange,
              options: [
                { value: "todos", label: "Todos" },
                ...(perfil === "advogado" ? [{ value: "minhas", label: "Minhas propostas" }] : []),
                ...advogadosFiltro.map((item) => ({ value: item, label: item })),
              ],
            },
          ]}
        />
      </FiltrosSection>

      {erro ? <p className="text-body-sm text-error">{erro}</p> : null}

      <section className="flex flex-col gap-md">
        <div className="grid gap-md min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
          {propostasPagina.length === 0 ? (
            <EmptyState
              icon={<Icon icon={Handshake} size="md" />}
              title="Nenhuma proposta"
              description="Ajuste os filtros ou registre uma nova tratativa."
            />
          ) : (
            propostasPagina.map((item) => (
              <PropostaNegociacaoCard
                key={item.id}
                proposta={item}
                cadastros={cadastros}
                resumo={resumoPorProposta.get(item.id)}
                selecionada={false}
                onClick={() => onSelecionar(item.id)}
              />
            ))
          )}
        </div>
        {totalFiltradas > PAGE_SIZE ? (
          <Pagination page={page} pageSize={PAGE_SIZE} total={totalFiltradas} onPageChange={onPageChange} />
        ) : null}
      </section>
    </div>
  );
}
