"use client";

import { Briefcase, CalendarX2, CircleCheck, Clock, Handshake, TriangleAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PropostaNegociacaoCard } from "@/components/negociacoes/proposta-negociacao-card";
import { PropostaNegociacaoExclusiva } from "@/components/negociacoes/proposta-negociacao-exclusiva";
import {
  statusPropostaNegociacao,
  type Cadastros,
  type PropostaNegociacao,
} from "@/data/catalogo";
import type { ResumoAcordo } from "@/lib/acordos/resumo";

type Metricas = {
  total: number;
  emAnalise: number;
  aceitas: number;
  parcelasVencidas: number;
  acordosComDescumprimento: number;
};

type Props = {
  cadastros: Cadastros;
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
  status: string;
  onStatusChange: (value: string) => void;
};

function FaixaIndicador({
  rotulo,
  valor,
  destaque,
  icon,
  iconClassName,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div
      className={[
        "flex min-w-[7.5rem] flex-1 items-center gap-sm rounded-lg px-md py-sm",
        destaque ? "bg-error-container/15" : "bg-surface-subtle",
      ].join(" ")}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        aria-hidden
      >
        <Icon icon={icon} size="sm" />
      </div>
      <div className="flex min-w-0 flex-col gap-xs">
        <span className="text-metric tabular-nums text-on-surface">{valor}</span>
        <span className="text-body-sm leading-snug text-on-surface-variant">{rotulo}</span>
      </div>
    </div>
  );
}

export function NegociacoesPainel({
  cadastros,
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
  status,
  onStatusChange,
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
          <FaixaIndicador
            rotulo="Propostas na carteira"
            valor={metricValor(metricas.total)}
            icon={Briefcase}
            iconClassName="bg-primary-fixed/50 text-primary-container"
          />
          <FaixaIndicador
            rotulo="Em análise"
            valor={metricValor(metricas.emAnalise)}
            icon={Clock}
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
          />
          <FaixaIndicador
            rotulo="Acordos ativos"
            valor={metricValor(metricas.aceitas)}
            icon={CircleCheck}
            iconClassName="bg-badge-success-subtle text-badge-success-emphasis"
          />
          <FaixaIndicador
            rotulo="Parcelas vencidas"
            valor={metricValor(metricas.parcelasVencidas)}
            destaque
            icon={CalendarX2}
            iconClassName="bg-error-container/25 text-error"
          />
          <FaixaIndicador
            rotulo="Risco de descumprimento"
            valor={metricValor(metricas.acordosComDescumprimento)}
            destaque
            icon={TriangleAlert}
            iconClassName="bg-error-container/25 text-error"
          />
        </div>
      </section>

      {erro ? <p className="text-body-sm text-error">{erro}</p> : null}

      <section className="flex flex-col gap-md">
        <div className="grid gap-md min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
          {propostasPagina.length === 0 ? (
            <EmptyState
              icon={<Icon icon={Handshake} size="md" />}
              title="Nenhuma proposta"
              description="Altere o status no topo ou registre uma nova tratativa."
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
