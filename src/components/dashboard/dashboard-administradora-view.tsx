"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  MessageCircle,
  Phone,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { GraficoColunas, GraficoMisto } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import type { DashboardAdministradora } from "@/lib/dashboard/service";
import {
  AlertaPrioridade,
  DashboardLayout,
  Grade,
  ListaValorCompacta,
  PainelGrafico,
  dinheiro,
  percentual,
  diaCurto,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";
import { formatarData } from "@/data/catalogo";

type Props = {
  dados: DashboardAdministradora;
  chaveGrafico: string;
  filtrosQuery?: string;
};

export function DashboardAdministradoraView({ dados, chaveGrafico }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;
  const mesAtual = dados.dataBase.slice(0, 7);
  const recuperacaoMes =
    dados.evolucaoMensal.find((linha) => linha.mes === mesAtual)?.recuperacaoFinanceira ?? 0;
  const atrasados = dados.retornos.resumo.atrasados;
  const vazioGrafico = (
    <EmptyState
      icon={<Icon icon={BarChart3} size="lg" />}
      title="Sem dados"
      description="Não há valores para exibir no período selecionado."
    />
  );

  const serieResumo = dados.operacao.serie.map((linha) => ({
    nome: diaCurto(linha.dia),
    barra: linha.quantidade,
    linha: linha.respostas,
    rotuloBarra: String(linha.quantidade),
    rotuloLinha: String(linha.respostas),
  }));

  return (
    <DashboardLayout>
      {atrasados > 0 ? (
        <AlertaPrioridade
          titulo="Retornos atrasados"
          acaoLabel="Abrir agenda"
          onAcao={() => router.push("/minha-agenda?secao=atrasado")}
        >
          Há {atrasados} retorno{atrasados === 1 ? "" : "s"} em atraso na equipe. Priorize o acompanhamento.
        </AlertaPrioridade>
      ) : null}

      <section aria-label="Indicadores principais">
        <CardMetricRow aria-label="KPIs da carteira" desktopCols={4}>
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={Wallet} size="md" className="text-primary-container" />}
            rotulo="Em aberto"
            valor={dinheiro(ind.totalAtualizado)}
            detalhe={`${ind.quantidadeEmAberto} débitos · ${ind.unidadesDevedoras} unidades`}
            onClick={() => router.push("/debitos")}
            ariaLabel={`Em aberto: ${dinheiro(ind.totalAtualizado)}. Ver débitos.`}
          />
          <CardMetric
            accent="critical"
            iconClassName="bg-error-container text-status-critical"
            icon={<Icon icon={Scale} size="md" className="text-status-critical" />}
            rotulo={`Acima de ${dados.limiteDias} dias`}
            valor={dinheiro(ind.acimaLimite)}
            detalhe={
              ind.totalAtualizado > 0
                ? `${percentual((ind.acimaLimite / ind.totalAtualizado) * 100)} do total`
                : undefined
            }
            onClick={() => router.push("/debitos")}
            ariaLabel={`Acima de ${dados.limiteDias} dias: ${dinheiro(ind.acimaLimite)}.`}
          />
          <CardMetric
            accent={atrasados > 0 ? "critical" : "brass"}
            iconClassName={
              atrasados > 0 ? "bg-error-container text-status-critical" : "bg-gold-subtle text-brass"
            }
            icon={
              <Icon
                icon={AlertTriangle}
                size="md"
                className={atrasados > 0 ? "text-status-critical" : "text-brass"}
              />
            }
            rotulo="Retornos atrasados"
            valor={atrasados}
            detalhe={`${dados.retornos.resumo.hoje} para hoje`}
            onClick={() => router.push("/minha-agenda?secao=atrasado")}
            ariaLabel={`Retornos atrasados: ${atrasados}.`}
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={ClipboardList} size="md" className="text-tertiary-container" />}
            rotulo="Na fila"
            valor={dados.fila.emCobranca}
            detalhe={
              dados.fila.semResponsavel > 0
                ? `${dados.fila.semResponsavel} sem RE`
                : `${dados.fila.retornosHoje} retorno hoje`
            }
            onClick={() => router.push("/atendimentos?aba=fila")}
            ariaLabel={`Na fila: ${dados.fila.emCobranca}.`}
          />
        </CardMetricRow>
      </section>

      <div className="grid grid-cols-1 gap-md min-[1100px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <PainelGrafico
          titulo="Operação do período"
          descricao={`${formatarData(dados.operacao.periodo.inicio)} a ${formatarData(dados.operacao.periodo.fim)} · contatos e respostas reais.`}
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
          descricao={`Este mês: ${dinheiro(recuperacaoMes)} confirmados.`}
        >
          <GraficoColunas
            chave={`${chaveGrafico}-evolucao`}
            vazio={vazioGrafico}
            itens={dados.evolucaoMensal.map((linha) => ({
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
        </PainelGrafico>
      </div>

      <section aria-label="Indicadores do período" className="flex flex-col gap-md">
        <h2 className="text-headline-sm text-on-surface">Indicadores do período</h2>
        <CardMetricRow aria-label="Operação e carteira" desktopCols={4}>
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={Phone} size="md" className="text-tertiary-container" />}
            rotulo="Contatos"
            valor={dados.operacao.contatos}
            detalhe={`${dados.operacao.unidadesContatadas} unidades`}
            onClick={() => router.push("/relatorios?relatorio=equipe")}
            ariaLabel={`Contatos: ${dados.operacao.contatos}.`}
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
                : "Sem contatos no período"
            }
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Users} size="md" />}
            rotulo="Unidades contatadas"
            valor={dados.operacao.unidadesContatadas}
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={Building2} size="md" className="text-primary-container" />}
            rotulo="Unidades inadimplentes"
            valor={percentual(ind.percentualUnidades)}
            detalhe={`${ind.unidadesDevedoras} unidades`}
            onClick={() => router.push("/debitos")}
            ariaLabel={`Unidades inadimplentes: ${percentual(ind.percentualUnidades)}.`}
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={Wallet} size="md" className="text-tertiary-container" />}
            rotulo={`Até ${dados.limiteDias} dias`}
            valor={dinheiro(ind.ateLimite)}
            detalhe="Faixa amigável"
            onClick={() => router.push("/debitos")}
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}
            rotulo="Retornos pendentes"
            valor={dados.operacao.retornosPendentes}
            detalhe={`${dados.retornos.resumo.proximos} próximos`}
            onClick={() => router.push("/minha-agenda")}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={ClipboardList} size="md" />}
            rotulo="Sem responsável"
            valor={dados.fila.semResponsavel}
            detalhe="Unidades na fila sem RE"
            onClick={() => router.push("/atendimentos?aba=fila")}
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={Wallet} size="md" className="text-primary-container" />}
            rotulo="Recuperado no mês"
            valor={dinheiro(recuperacaoMes)}
            detalhe="Pagamentos confirmados"
          />
        </CardMetricRow>
      </section>

      <Grade>
        <PainelGrafico titulo="Inadimplência por faixa" descricao="Valor atualizado em aberto na data-base.">
          <GraficoColunas
            chave={`${chaveGrafico}-faixas`}
            vazio={vazioGrafico}
            itens={dados.porFaixa.map((linha, indice) => ({
              nome: linha.nome,
              valor: linha.valor,
              rotulo: dinheiro(linha.valor),
              tom: indice === dados.porFaixa.length - 1 ? ("critical" as const) : ("navy" as const),
            }))}
          />
        </PainelGrafico>

        <PainelGrafico titulo="Maiores saldos" descricao="Condomínios com mais valor em aberto.">
          <ListaValorCompacta
            integrada
            limite={6}
            itens={dados.rankingCondominio.map((linha) => ({
              chave: String(linha.condominioId),
              nome: linha.nome,
              valor: dinheiro(linha.valor),
              secundario: `${linha.unidadesDevedoras}/${linha.unidadesTotal} unidades`,
            }))}
            vazio="Nenhum débito em aberto na carteira."
          />
          <div className="mt-md">
            <button
              type="button"
              className="text-body-sm font-semibold text-primary-container hover:underline"
              onClick={() => router.push("/relatorios?relatorio=carteira")}
            >
              Ver relatório completo
            </button>
          </div>
        </PainelGrafico>
      </Grade>

      <section aria-label="Agenda de retornos" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 className="text-headline-sm text-on-surface">Agenda de retornos</h2>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 gap-xs"
            onClick={() => router.push("/minha-agenda?secao=hoje")}
          >
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
            onClick={() => router.push("/minha-agenda?secao=atrasado")}
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}
            rotulo="Hoje"
            valor={dados.retornos.resumo.hoje}
            onClick={() => router.push("/minha-agenda?secao=hoje")}
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={CalendarClock} size="md" className="text-primary-container" />}
            rotulo="Próximos"
            valor={dados.retornos.resumo.proximos}
            onClick={() => router.push("/minha-agenda")}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Concluídos"
            valor={dados.retornos.resumo.concluidos}
          />
        </CardMetricRow>
        <div className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <DashboardRetornosTable integrada itens={dados.retornos.itens.slice(0, 8)} />
        </div>
      </section>
    </DashboardLayout>
  );
}
