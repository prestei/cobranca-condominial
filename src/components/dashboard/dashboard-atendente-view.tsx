"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  MessageCircle,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { GraficoColunas, GraficoMisto } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import type { DashboardAtendente } from "@/lib/dashboard/service";
import type { IndicadorOperacionalAtendenteId } from "@/lib/dashboard/indicadores-operacionais-atendente";
import {
  AlertaPrioridade,
  DashboardLayout,
  PainelGrafico,
  dinheiro,
  percentual,
  diaCurto,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";
import { DashboardCentralPendencias } from "@/components/dashboard/dashboard-central-pendencias";
import { DashboardGraficosAtendente } from "@/components/dashboard/dashboard-graficos-atendente";
import { formatarData } from "@/data/catalogo";
import { queryNavegacaoAtendimentos, queryNavegacaoDebitos } from "@/lib/dashboard/filtros";

type Props = {
  dados: DashboardAtendente;
  chaveGrafico: string;
  filtrosQuery?: string;
};

const ORDEM_INDICADORES_OPERACIONAIS: IndicadorOperacionalAtendenteId[] = [
  "atencao",
  "pendentes",
  "aguardando_retorno",
  "resolvidos_periodo",
];

const ROTULOS_OPERACIONAIS: Record<
  IndicadorOperacionalAtendenteId,
  { rotulo: string; detalhe: string; icon: typeof ClipboardList; accent?: "critical" | "brass" }
> = {
  pendentes: {
    rotulo: "Pendentes",
    detalhe: "Exigem sua ação agora.",
    icon: ClipboardList,
    accent: "brass",
  },
  aguardando_retorno: {
    rotulo: "Aguardando retorno",
    detalhe: "Morador ou retorno agendado.",
    icon: Hourglass,
  },
  resolvidos_periodo: {
    rotulo: "Resolvidos",
    detalhe: "Concluídos no período.",
    icon: CheckCircle2,
  },
  atencao: {
    rotulo: "Atenção",
    detalhe: "Atrasos ou prioridade.",
    icon: AlertTriangle,
    accent: "critical",
  },
};

export function DashboardAtendenteView({ dados, chaveGrafico, filtrosQuery = "" }: Props) {
  const router = useRouter();
  const qsDebitos = queryNavegacaoDebitos(dados.filtrosAplicados);
  const qsAtendimentos = queryNavegacaoAtendimentos(dados.filtrosAplicados);
  const vazioGrafico = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados" description="Não há valores para exibir no momento." />
  );
  const ind = dados.indicadores;
  const operacional = dados.indicadoresOperacionais;
  const atrasados = dados.retornos.resumo.atrasados;
  const atencao = operacional.itens.find((item) => item.id === "atencao")?.total ?? 0;

  const itensOperacionais = useMemo(() => {
    const mapa = new Map(operacional.itens.map((item) => [item.id, item]));
    return ORDEM_INDICADORES_OPERACIONAIS.map((id) => mapa.get(id)).filter(
      (item): item is (typeof operacional.itens)[number] => Boolean(item),
    );
  }, [operacional.itens]);

  function abrirIndicador(id: IndicadorOperacionalAtendenteId) {
    const params = new URLSearchParams();
    const slug =
      id === "aguardando_retorno" ? "aguardando-retorno" : id === "resolvidos_periodo" ? "resolvidos" : id;
    params.set("operacional", slug);
    if (id === "resolvidos_periodo") {
      params.set("de", operacional.periodo.inicio);
      params.set("ate", operacional.periodo.fim);
    }
    const extra = qsAtendimentos ? `&${qsAtendimentos}` : "";
    router.push(`/atendimentos?${params}${extra}`);
  }

  function abrirAtendimentos(extra?: string) {
    const base = qsAtendimentos ? `/atendimentos?${qsAtendimentos}` : "/atendimentos";
    if (!extra) {
      router.push(base);
      return;
    }
    const sep = base.includes("?") ? "&" : "?";
    router.push(`${base}${sep}${extra}`);
  }

  function abrirDebitos() {
    router.push(qsDebitos ? `/debitos?${qsDebitos}` : "/debitos");
  }

  function abrirAgenda(secao?: string) {
    const params = new URLSearchParams();
    if (secao) params.set("secao", secao);
    const qs = params.toString();
    router.push(qs ? `/minha-agenda?${qs}` : "/minha-agenda");
  }

  const mesAtual = dados.dataBase.slice(0, 7);
  const serieResumo = dados.operacao.serie.map((linha) => ({
    nome: diaCurto(linha.dia),
    barra: linha.quantidade,
    linha: linha.respostas,
    rotuloBarra: String(linha.quantidade),
    rotuloLinha: String(linha.respostas),
  }));
  const evolucaoMensal = dados.graficos?.evolucaoMensal ?? [];
  const recuperacaoMes =
    evolucaoMensal.find((linha) => linha.mes === mesAtual)?.recuperacaoFinanceira ?? 0;

  return (
    <DashboardLayout>
      {atrasados > 0 || atencao > 0 ? (
        <AlertaPrioridade
          titulo={atrasados > 0 ? "Retornos atrasados" : "Atenção na carteira"}
          acaoLabel={atrasados > 0 ? "Abrir agenda" : "Ver pendências"}
          onAcao={() => (atrasados > 0 ? abrirAgenda("atrasado") : abrirIndicador("atencao"))}
        >
          {atrasados > 0
            ? `Você tem ${atrasados} retorno${atrasados === 1 ? "" : "s"} atrasado${atrasados === 1 ? "" : "s"}.`
            : null}
          {atrasados > 0 && atencao > 0 ? " " : null}
          {atencao > 0
            ? `${atencao} caso${atencao === 1 ? "" : "s"} pedem atenção prioritária.`
            : null}
        </AlertaPrioridade>
      ) : null}

      <section aria-label="Resumo da carteira">
        <CardMetricRow aria-label="KPIs da carteira" desktopCols={4}>
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={Wallet} size="md" className="text-primary-container" />}
            rotulo="Em aberto"
            valor={ind ? dinheiro(ind.totalAtualizado) : "—"}
            detalhe={ind ? `${ind.unidadesDevedoras} unidades` : "Sem permissão de débitos"}
            onClick={ind ? abrirDebitos : undefined}
            ariaLabel={ind ? `Em aberto: ${dinheiro(ind.totalAtualizado)}.` : undefined}
          />
          <CardMetric
            accent="critical"
            iconClassName="bg-error-container text-status-critical"
            icon={<Icon icon={AlertTriangle} size="md" className="text-status-critical" />}
            rotulo="Atenção"
            valor={atencao}
            detalhe="Prioridade na carteira"
            onClick={() => abrirIndicador("atencao")}
            ariaLabel={`Atenção: ${atencao}.`}
          />
          <CardMetric
            accent={atrasados > 0 ? "critical" : "brass"}
            iconClassName={
              atrasados > 0 ? "bg-error-container text-status-critical" : "bg-gold-subtle text-brass"
            }
            icon={
              <Icon
                icon={CalendarClock}
                size="md"
                className={atrasados > 0 ? "text-status-critical" : "text-brass"}
              />
            }
            rotulo="Retornos atrasados"
            valor={atrasados}
            detalhe={`${dados.retornos.resumo.hoje} para hoje`}
            onClick={() => abrirAgenda("atrasado")}
            ariaLabel={`Retornos atrasados: ${atrasados}.`}
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={ClipboardList} size="md" className="text-tertiary-container" />}
            rotulo="Em cobrança"
            valor={dados.fila.emCobranca}
            detalhe={`${dados.atendimentosHoje} atendimento${dados.atendimentosHoje === 1 ? "" : "s"} hoje`}
            onClick={() => abrirAtendimentos("aba=fila")}
            ariaLabel={`Em cobrança: ${dados.fila.emCobranca}.`}
          />
        </CardMetricRow>
      </section>

      <div className="grid grid-cols-1 gap-md min-[1100px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <PainelGrafico
          titulo="Operação do período"
          descricao={`${formatarData(dados.operacao.periodo.inicio)} a ${formatarData(dados.operacao.periodo.fim)}.`}
        >
          <GraficoMisto
            chave={`${chaveGrafico}-operacao`}
            vazio={vazioGrafico}
            barras={{ nome: "Contatos", tom: "settled" }}
            linha={{ nome: "Respostas", tom: "navy" }}
            itens={serieResumo}
          />
        </PainelGrafico>
        <PainelGrafico
          titulo="Recuperação mensal"
          descricao={
            dados.graficos
              ? `Este mês: ${dinheiro(recuperacaoMes)} confirmados.`
              : "Exige permissão de débitos."
          }
        >
          {dados.graficos ? (
            <>
              <GraficoColunas
                chave={`${chaveGrafico}-evolucao`}
                vazio={vazioGrafico}
                itens={evolucaoMensal.map((linha) => ({
                  nome: linha.mesRotulo,
                  valor: linha.recuperacaoFinanceira,
                  rotulo: dinheiro(linha.recuperacaoFinanceira),
                  tom: linha.mes === mesAtual ? ("navy" as const) : ("mist" as const),
                }))}
              />
              <p className="mt-sm flex flex-wrap gap-md text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-xs">
                  <span className="size-2.5 rounded-full bg-inverse-primary" />
                  Meses anteriores
                </span>
                <span className="inline-flex items-center gap-xs">
                  <span className="size-2.5 rounded-full bg-primary-container" />
                  Mês atual
                </span>
              </p>
            </>
          ) : (
            <EmptyState
              icon={<Icon icon={Wallet} size="lg" />}
              title="Recuperação indisponível"
              description="Sem permissão de débitos para exibir a evolução financeira."
            />
          )}
        </PainelGrafico>
      </div>

      <section aria-label="Indicadores operacionais" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <div className="flex flex-col gap-xs">
            <h2 className="text-headline-sm text-on-surface">Indicadores do período</h2>
            <p className="text-body-sm text-on-surface-variant">
              Carteira vigente · {formatarData(operacional.periodo.inicio)} a {formatarData(operacional.periodo.fim)}.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="shrink-0 gap-xs" onClick={() => abrirAtendimentos()}>
            Abrir fila
            <Icon icon={ClipboardList} size="sm" />
          </Button>
        </div>
        <CardMetricRow aria-label="Indicadores operacionais" desktopCols={4}>
          {itensOperacionais.map((linha) => {
            const meta = ROTULOS_OPERACIONAIS[linha.id];
            const destaque = linha.requerAtencaoVisual;
            const primario = linha.id === "atencao" || linha.id === "pendentes";
            return (
              <CardMetric
                key={linha.id}
                accent={destaque ? "critical" : meta.accent ?? (primario ? "brass" : undefined)}
                iconClassName={
                  destaque
                    ? "bg-error-container text-status-critical"
                    : meta.accent === "brass" || primario
                      ? "bg-gold-subtle text-brass"
                      : "bg-surface-subtle text-on-surface-variant"
                }
                icon={
                  <Icon
                    icon={meta.icon}
                    size="md"
                    className={
                      destaque
                        ? "text-status-critical"
                        : meta.accent === "brass" || primario
                          ? "text-brass"
                          : undefined
                    }
                  />
                }
                rotulo={meta.rotulo}
                valor={linha.total}
                detalhe={meta.detalhe}
                onClick={() => abrirIndicador(linha.id)}
                ariaLabel={`${meta.rotulo}: ${linha.total}. Abrir listagem.`}
              />
            );
          })}
        </CardMetricRow>
        <CardMetricRow aria-label="Produtividade do período" desktopCols={4}>
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Phone} size="md" />}
            rotulo="Contatos"
            valor={dados.operacao.contatos}
            detalhe="No período selecionado"
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={MessageCircle} size="md" className="text-brass" />}
            rotulo="Taxa de resposta"
            valor={percentual(dados.operacao.taxaResposta)}
            detalhe={
              dados.operacao.contatos > 0
                ? `${dados.operacao.responderam} de ${dados.operacao.contatos}`
                : "Sem contatos"
            }
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Users} size="md" />}
            rotulo="Unidades contatadas"
            valor={dados.operacao.unidadesContatadas}
          />
          {ind ? (
            <CardMetric
              accent="critical"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={Wallet} size="md" className="text-status-critical" />}
              rotulo={`Acima de ${dados.limiteDias} dias`}
              valor={dinheiro(ind.acimaLimite)}
              detalhe="Valor crítico"
              onClick={abrirDebitos}
            />
          ) : (
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Lembretes abertos"
              valor={dados.operacao.retornosPendentes}
              onClick={() => abrirAgenda()}
            />
          )}
        </CardMetricRow>
      </section>

      <section aria-label="Central de pendências">
        <DashboardCentralPendencias filtrosQuery={filtrosQuery} />
      </section>

      <section aria-label="Agenda de retornos" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-end justify-between gap-sm">
          <div className="flex flex-col gap-xs">
            <h2 className="text-headline-sm text-on-surface">Seus retornos</h2>
            <p className="text-body-sm text-on-surface-variant">Próximos passos na sua carteira.</p>
          </div>
          <Button size="sm" variant="ghost" className="shrink-0 gap-xs" onClick={() => abrirAgenda("hoje")}>
            Abrir agenda
            <Icon icon={CalendarClock} size="sm" />
          </Button>
        </div>
        <CardMetricRow aria-label="Resumo de retornos" desktopCols={4}>
          <CardMetric
            accent="critical"
            iconClassName="bg-error-container text-status-critical"
            icon={<Icon icon={CalendarClock} size="md" className="text-status-critical" />}
            rotulo="Atrasados"
            valor={dados.retornos.resumo.atrasados}
            onClick={() => abrirAgenda("atrasado")}
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}
            rotulo="Hoje"
            valor={dados.retornos.resumo.hoje}
            onClick={() => abrirAgenda("hoje")}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Próximos"
            valor={dados.retornos.resumo.proximos}
            onClick={() => abrirAgenda("semana")}
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={CalendarClock} size="md" className="text-primary-container" />}
            rotulo="Concluídos"
            valor={dados.retornos.resumo.concluidos}
          />
        </CardMetricRow>
        <div className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <DashboardRetornosTable itens={dados.retornos.itens} mostrarRe={false} />
        </div>
      </section>

      <section aria-label="Gráficos da carteira">
        {dados.graficos ? (
          <DashboardGraficosAtendente
            dados={dados.graficos}
            dataBase={dados.dataBase}
            chaveGrafico={chaveGrafico}
            filtrosAplicados={dados.filtrosAplicados}
          />
        ) : null}
      </section>
    </DashboardLayout>
  );
}
