"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ListOrdered,
  MessageCircle,
  Phone,
  Play,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { useAgendarAtendimento } from "@/context/agendar-atendimento-context";
import type { DashboardAtendente, DashboardRetornoLinha } from "@/lib/dashboard/service";
import { percentual, rotuloSituacaoRetorno } from "@/components/dashboard/dashboard-shared";
import { formatarData } from "@/data/catalogo";

type Props = {
  dados: DashboardAtendente;
  nomeUsuario: string;
};

function prioridadeRetorno(item: DashboardRetornoLinha) {
  if (item.situacaoAgenda === "atrasado") return 0;
  if (item.situacaoAgenda === "hoje") return 1;
  return 2;
}

function saudacaoHorario() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function primeiroNome(nome: string) {
  const parte = nome.trim().split(/\s+/)[0];
  return parte || "Atendente";
}

export function DashboardAtendenteView({ dados, nomeUsuario }: Props) {
  const router = useRouter();
  const { abrir: abrirAgendar } = useAgendarAtendimento();
  const pendentes = dados.indicadoresOperacionais.itens.find((item) => item.id === "pendentes")?.total ?? 0;
  const atencao = dados.indicadoresOperacionais.itens.find((item) => item.id === "atencao")?.total ?? 0;

  const proximosAtendimentos = useMemo(() => {
    return [...dados.retornos.itens]
      .sort((a, b) => {
        const prio = prioridadeRetorno(a) - prioridadeRetorno(b);
        if (prio !== 0) return prio;
        return a.dataPrevista.localeCompare(b.dataPrevista);
      })
      .slice(0, 6);
  }, [dados.retornos.itens]);

  function abrirAtendimentos(query?: string) {
    router.push(query ? `/atendimentos?${query}` : "/atendimentos");
  }

  function abrirAgenda(retorno?: "atrasado" | "hoje" | "semana") {
    if (retorno === "atrasado") {
      router.push("/atendimentos?retorno=atrasado");
      return;
    }
    router.push("/minha-agenda");
  }

  function atenderUnidade(unidadeId: number) {
    router.push(`/atendimentos?novo=1&unidade=${unidadeId}`);
  }

  return (
    <div className="flex flex-col gap-xl">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="min-w-0">
          <h1 className="text-headline-xl text-on-surface max-md:text-headline-xl-mobile">
            {saudacaoHorario()}, {primeiroNome(nomeUsuario)}!
          </h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Aqui está o resumo do seu atendimento hoje.
          </p>
        </div>
        <div className="inline-flex items-center gap-sm rounded-full border border-border-subtle bg-surface-card px-md py-sm shadow-card">
          <span className="size-2.5 rounded-full bg-status-settled" aria-hidden />
          <span className="text-label-lg text-on-surface">Você está online</span>
        </div>
      </header>

      {(dados.retornos.resumo.atrasados > 0 || atencao > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-md rounded-2xl border border-status-pending/30 bg-status-pending/10 px-md py-md">
          <p className="text-body-md text-on-surface">
            {dados.retornos.resumo.atrasados > 0
              ? `${dados.retornos.resumo.atrasados} retorno${dados.retornos.resumo.atrasados === 1 ? "" : "s"} atrasado${dados.retornos.resumo.atrasados === 1 ? "" : "s"}`
              : null}
            {dados.retornos.resumo.atrasados > 0 && atencao > 0 ? " · " : null}
            {atencao > 0 ? `${atencao} caso${atencao === 1 ? "" : "s"} em atenção` : null}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              dados.retornos.resumo.atrasados > 0 ? abrirAgenda("atrasado") : abrirAtendimentos("operacional=atencao")
            }
          >
            Resolver agora
          </Button>
        </div>
      )}

      <section aria-label="Indicadores do dia">
        <CardMetricRow aria-label="Indicadores do dia" desktopCols={4}>
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={ClipboardList} size="md" className="text-primary-container" />}
            rotulo="Pendentes"
            valor={pendentes}
            onClick={() => abrirAtendimentos("operacional=pendentes")}
            ariaLabel={`Pendentes: ${pendentes}.`}
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={ListOrdered} size="md" className="text-brass" />}
            rotulo="Na fila"
            valor={dados.fila.emCobranca}
            onClick={() => abrirAtendimentos()}
            ariaLabel={`Na fila: ${dados.fila.emCobranca}.`}
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-[color-mix(in_srgb,var(--color-status-settled)_14%,white)] text-status-settled"
            icon={<Icon icon={Phone} size="md" className="text-status-settled" />}
            rotulo="Atendimentos hoje"
            valor={dados.atendimentosHoje}
            onClick={() => abrirAtendimentos()}
            ariaLabel={`Atendimentos hoje: ${dados.atendimentosHoje}.`}
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={MessageCircle} size="md" className="text-tertiary-container" />}
            rotulo="Taxa de resposta"
            valor={percentual(dados.operacao.taxaResposta)}
            ariaLabel={`Taxa de resposta: ${percentual(dados.operacao.taxaResposta)}.`}
          />
        </CardMetricRow>
      </section>

      <div className="grid grid-cols-1 gap-md min-[1000px]:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.9fr)]">
        <section
          aria-label="Próximos atendimentos"
          className="flex flex-col gap-md rounded-2xl border border-border-subtle bg-surface-card p-lg shadow-card"
        >
          <div className="flex items-center justify-between gap-sm">
            <h2 className="text-headline-sm text-on-surface">Próximos atendimentos</h2>
            <Button size="sm" variant="ghost" className="gap-xs text-brass hover:text-brass" onClick={() => abrirAgenda("hoje")}>
              Ver todos
              <Icon icon={ArrowRight} size="sm" />
            </Button>
          </div>

          {proximosAtendimentos.length === 0 ? (
            <EmptyState
              icon={<Icon icon={CalendarClock} size="lg" />}
              title="Agenda em dia"
              description="Nenhum retorno pendente nos próximos dias."
            />
          ) : (
            <ul className="flex flex-col gap-sm">
              {proximosAtendimentos.map((item) => {
                const urgente = item.situacaoAgenda === "atrasado" || item.situacaoAgenda === "hoje";
                return (
                  <li
                    key={item.atendimentoId}
                    className={`flex flex-wrap items-center justify-between gap-md rounded-xl px-md py-md ${
                      urgente
                        ? "border border-brass/35 bg-gold-subtle"
                        : "border border-transparent bg-surface-subtle"
                    }`}
                  >
                    <div
                      className={`min-w-0 flex-1 border-l-4 pl-md ${
                        urgente ? "border-brass" : "border-transparent"
                      }`}
                    >
                      <p className="truncate text-body-lg font-semibold text-on-surface">{item.unidadeLabel}</p>
                      <p className="mt-xs text-body-sm text-on-surface-variant">
                        {rotuloSituacaoRetorno(item.situacaoAgenda)} · {formatarData(item.dataPrevista)}
                      </p>
                    </div>
                    {urgente ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-11 shrink-0 gap-xs px-md"
                        onClick={() => atenderUnidade(item.unidadeId)}
                      >
                        <Icon icon={Play} size="sm" aria-hidden />
                        Atender
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="surface"
                        className="min-h-11 shrink-0"
                        onClick={() => atenderUnidade(item.unidadeId)}
                      >
                        Em espera
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside
          aria-label="Ações rápidas"
          className="flex flex-col justify-between gap-lg rounded-2xl border border-brass/25 bg-gold-subtle p-lg shadow-card"
        >
          <div className="flex flex-col items-center gap-md text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-surface-card text-brass shadow-card">
              <Icon icon={MessageCircle} size="lg" aria-hidden />
            </span>
            <div>
              <h2 className="text-headline-sm text-on-surface">Ações rápidas</h2>
              <p className="mt-xs text-body-sm text-on-surface-variant">O essencial para cobrar agora.</p>
            </div>
          </div>
          <div className="flex flex-col gap-sm">
            <Button
              type="button"
              variant="surface"
              className="min-h-14 w-full justify-start gap-md rounded-xl px-md text-label-lg"
              onClick={() => abrirAgendar()}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-gold-subtle text-brass">
                <Icon icon={CalendarClock} size="md" aria-hidden />
              </span>
              Agendar atendimento
            </Button>
            <Button
              type="button"
              variant="surface"
              className="min-h-14 w-full justify-start gap-md rounded-xl px-md text-label-lg"
              onClick={() => abrirAgenda("hoje")}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-gold-subtle text-brass">
                <Icon icon={CalendarClock} size="md" aria-hidden />
              </span>
              Ver agenda
            </Button>
            <Button
              type="button"
              variant="surface"
              className="min-h-14 w-full justify-start gap-md rounded-xl px-md text-label-lg"
              onClick={() => abrirAtendimentos()}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-gold-subtle text-brass">
                <Icon icon={ClipboardList} size="md" aria-hidden />
              </span>
              Abrir fila
            </Button>
            {dados.indicadores ? (
              <Button
                type="button"
                variant="surface"
                className="min-h-14 w-full justify-start gap-md rounded-xl px-md text-label-lg"
                onClick={() => router.push("/debitos")}
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-gold-subtle text-brass">
                  <Icon icon={Wallet} size="md" aria-hidden />
                </span>
                Inadimplência
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
