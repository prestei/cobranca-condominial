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
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { GraficoColunas, GraficoRosca } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import type { DashboardAtendente } from "@/lib/dashboard/service";
import type { IndicadorOperacionalAtendenteId } from "@/lib/dashboard/indicadores-operacionais-atendente";
import {
  DashboardLayout,
  Grade,
  Leitura,
  SecaoBloco,
  SubPainel,
  SubsecaoTitulo,
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
    rotulo: "Atendimentos pendentes",
    detalhe: "Pendências abertas que exigem sua ação.",
    icon: ClipboardList,
    accent: "brass",
  },
  aguardando_retorno: {
    rotulo: "Aguardando retorno",
    detalhe: "Aguardando resposta do morador ou retorno agendado.",
    icon: Hourglass,
  },
  resolvidos_periodo: {
    rotulo: "Resolvidos no período",
    detalhe: "Concluídos ou retornos finalizados nos últimos 7 dias.",
    icon: CheckCircle2,
  },
  atencao: {
    rotulo: "Atenção necessária",
    detalhe: "Atrasos ou pendências prioritárias na carteira.",
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

  const textoResumo =
    ind && ind.totalAtualizado > 0 ? (
      <>
        Sua carteira: {dinheiro(ind.totalAtualizado)} em aberto (base {formatarData(dados.dataBase)}). Hoje você registrou{" "}
        {dados.atendimentosHoje} atendimento{dados.atendimentosHoje === 1 ? "" : "s"}.
        {dados.retornos.resumo.atrasados > 0
          ? ` ${dados.retornos.resumo.atrasados} retorno${dados.retornos.resumo.atrasados === 1 ? "" : "s"} atrasado${dados.retornos.resumo.atrasados === 1 ? "" : "s"}.`
          : ""}
      </>
    ) : (
      <>
        Sem saldo em aberto na data-base {formatarData(dados.dataBase)}. Hoje você registrou{" "}
        {dados.atendimentosHoje} atendimento{dados.atendimentosHoje === 1 ? "" : "s"}.
        {dados.retornos.resumo.atrasados > 0
          ? ` Há ${dados.retornos.resumo.atrasados} retorno${dados.retornos.resumo.atrasados === 1 ? "" : "s"} atrasado${dados.retornos.resumo.atrasados === 1 ? "" : "s"}.`
          : ""}
      </>
    );

  return (
    <DashboardLayout>
      <section aria-label="Resumo da carteira">
        <Leitura>{textoResumo}</Leitura>
      </section>

      <section aria-label="Indicadores operacionais">
        <SecaoBloco
          selo="Operação"
          titulo="Indicadores principais"
          descricao={`Carteira vigente · período de resolvidos: ${formatarData(operacional.periodo.inicio)} a ${formatarData(operacional.periodo.fim)}.`}
          linkLabel="Abrir fila"
          onLink={() => abrirAtendimentos()}
        >
          <CardMetricRow aria-label="Indicadores operacionais do atendente" desktopCols={4}>
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
                  icon={<Icon icon={meta.icon} size="md" className={destaque ? "text-status-critical" : undefined} />}
                  rotulo={meta.rotulo}
                  valor={linha.total}
                  detalhe={meta.detalhe}
                  onClick={() => abrirIndicador(linha.id)}
                  ariaLabel={`${meta.rotulo}: ${linha.total}. Abrir listagem.`}
                />
              );
            })}
          </CardMetricRow>
        </SecaoBloco>
      </section>

      <section aria-label="Carteira e valores">
        <SecaoBloco
          selo="Carteira"
          titulo="Fila e inadimplência"
          descricao="Indicadores de apoio da sua carteira vigente."
          linkLabel="Ver débitos"
          onLink={abrirDebitos}
        >
          <div className="flex flex-col gap-xl">
            <div className="flex flex-col gap-md">
              <SubsecaoTitulo titulo="Minha fila" descricao="Cobranças atribuídas ao seu RE." />
              <CardMetricRow aria-label="Resumo da fila" desktopCols={3}>
                <CardMetric
                  iconClassName="bg-gold-subtle text-brass"
                  icon={<Icon icon={ClipboardList} size="md" className="text-brass" />}
                  rotulo="Em cobrança"
                  valor={dados.fila.emCobranca}
                  detalhe="Unidades na sua carteira."
                  onClick={() => abrirAtendimentos("aba=fila")}
                  ariaLabel={`Em cobrança: ${dados.fila.emCobranca}. Abrir fila.`}
                />
                <CardMetric
                  iconClassName="bg-surface-subtle text-on-surface-variant"
                  icon={<Icon icon={CalendarClock} size="md" />}
                  rotulo="Retornos hoje"
                  valor={dados.fila.retornosHoje}
                  detalhe="Na fila com retorno previsto para hoje."
                  onClick={() => abrirAgenda("hoje")}
                  ariaLabel={`Retornos hoje: ${dados.fila.retornosHoje}. Abrir agenda.`}
                />
                <CardMetric
                  iconClassName="bg-surface-subtle text-on-surface-variant"
                  icon={<Icon icon={Phone} size="md" />}
                  rotulo="Atendimentos hoje"
                  valor={dados.atendimentosHoje}
                  detalhe="Registros feitos por você hoje."
                  onClick={() => abrirAtendimentos()}
                  ariaLabel={`Atendimentos hoje: ${dados.atendimentosHoje}. Abrir atendimentos.`}
                />
              </CardMetricRow>
            </div>

            {ind ? (
              <div className="flex flex-col gap-md">
                <SubsecaoTitulo
                  titulo="Inadimplência na carteira"
                  descricao={`Totais na data-base ${formatarData(dados.dataBase)}.`}
                />
                <CardMetricRow aria-label="Valores em aberto" desktopCols={3}>
                  <CardMetric
                    iconClassName="bg-gold-subtle text-brass"
                    icon={<Icon icon={Wallet} size="md" className="text-brass" />}
                    rotulo="Total em aberto"
                    valor={dinheiro(ind.totalAtualizado)}
                    detalhe="Valores persistidos no sistema."
                    onClick={abrirDebitos}
                    ariaLabel={`Total em aberto: ${dinheiro(ind.totalAtualizado)}. Ver débitos.`}
                  />
                  <CardMetric
                    iconClassName="bg-surface-subtle text-on-surface-variant"
                    icon={<Icon icon={Wallet} size="md" />}
                    rotulo={`Até ${dados.limiteDias} dias`}
                    valor={dinheiro(ind.ateLimite)}
                    detalhe="Contas mais recentes."
                    onClick={abrirDebitos}
                    ariaLabel={`Até ${dados.limiteDias} dias: ${dinheiro(ind.ateLimite)}. Ver débitos.`}
                  />
                  <CardMetric
                    iconClassName="bg-surface-subtle text-on-surface-variant"
                    icon={<Icon icon={Wallet} size="md" />}
                    rotulo={`Acima de ${dados.limiteDias} dias`}
                    valor={dinheiro(ind.acimaLimite)}
                    detalhe="Contas mais antigas."
                    onClick={abrirDebitos}
                    ariaLabel={`Acima de ${dados.limiteDias} dias: ${dinheiro(ind.acimaLimite)}. Ver débitos.`}
                  />
                </CardMetricRow>
              </div>
            ) : (
              <EmptyState
                icon={<Icon icon={Wallet} size="lg" />}
                title="Indicadores financeiros indisponíveis"
                description="Não foi possível carregar os totais de inadimplência para o recorte atual."
              />
            )}
          </div>
        </SecaoBloco>
      </section>

      <section aria-label="Central de pendências">
        <DashboardCentralPendencias filtrosQuery={filtrosQuery} />
      </section>

      <section aria-label="Produtividade da semana">
        <SecaoBloco
          selo="Produtividade"
          titulo="Seus contatos"
          descricao={`De ${formatarData(dados.operacao.periodo.inicio)} a ${formatarData(dados.operacao.periodo.fim)}.`}
          linkLabel="Abrir atendimentos"
          onLink={() => abrirAtendimentos()}
        >
          <CardMetricRow aria-label="Contatos da semana" desktopCols={2}>
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Phone} size="md" />}
              rotulo="Contatos feitos"
              valor={dados.operacao.contatos}
              detalhe="Registrados por você no período."
            />
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={MessageCircle} size="md" className="text-brass" />}
              rotulo="Morador respondeu"
              valor={percentual(dados.operacao.taxaResposta)}
              detalhe={
                dados.operacao.contatos > 0
                  ? `${dados.operacao.responderam} de ${dados.operacao.contatos} contatos.`
                  : "Nenhum contato no período."
              }
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Users} size="md" />}
              rotulo="Unidades contatadas"
              valor={dados.operacao.unidadesContatadas}
              detalhe="Cada unidade conta uma vez."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Lembretes em aberto"
              valor={dados.operacao.retornosPendentes}
              detalhe="Atrasados, de hoje ou desta semana."
              onClick={() => abrirAgenda()}
              ariaLabel={`Lembretes em aberto: ${dados.operacao.retornosPendentes}. Abrir agenda.`}
            />
          </CardMetricRow>

          <Grade>
            <SubPainel titulo="Atendimentos por dia">
              <GraficoColunas
                chave={`${chaveGrafico}-serie`}
                vazio={vazioGrafico}
                itens={dados.operacao.serie.map((linha) => ({
                  nome: diaCurto(linha.dia),
                  valor: linha.quantidade,
                  rotulo: String(linha.quantidade),
                  tom: "settled" as const,
                }))}
              />
            </SubPainel>
            <SubPainel titulo="Respondeu ou não">
              <GraficoRosca
                chave={`${chaveGrafico}-resposta`}
                vazio={vazioGrafico}
                centro={percentual(dados.operacao.taxaResposta)}
                legenda="responderam"
                fatias={[
                  {
                    nome: "Sim",
                    valor: dados.operacao.responderam,
                    detalhe: String(dados.operacao.responderam),
                    tom: "settled",
                  },
                  {
                    nome: "Não",
                    valor: dados.operacao.contatos - dados.operacao.responderam,
                    detalhe: String(dados.operacao.contatos - dados.operacao.responderam),
                    tom: "mist",
                  },
                ]}
              />
            </SubPainel>
          </Grade>
        </SecaoBloco>
      </section>

      <section aria-label="Gráficos da carteira">
        {dados.graficos ? (
          <DashboardGraficosAtendente
            dados={dados.graficos}
            dataBase={dados.dataBase}
            chaveGrafico={chaveGrafico}
            filtrosAplicados={dados.filtrosAplicados}
          />
        ) : (
          <SecaoBloco
            selo="Análise"
            titulo="Gráficos da carteira"
            descricao="Distribuição de inadimplência e situação operacional."
            linkLabel="Abrir débitos"
            onLink={abrirDebitos}
          >
            <EmptyState
              icon={<Icon icon={BarChart3} size="lg" />}
              title="Gráficos indisponíveis"
              description="Os gráficos exigem permissão de leitura de débitos ou não há dados para o recorte selecionado."
            />
          </SecaoBloco>
        )}
      </section>

      <section aria-label="Agenda de retornos">
        <SecaoBloco
          selo="Agenda"
          titulo="Seus retornos"
          descricao="Próximos passos na sua carteira."
          linkLabel="Abrir agenda"
          onLink={() => abrirAgenda("hoje")}
        >
          <CardMetricRow aria-label="Resumo de retornos" desktopCols={4}>
            <CardMetric
              iconClassName="bg-error-container/40 text-status-critical"
              icon={<Icon icon={CalendarClock} size="md" className="text-status-critical" />}
              accent={dados.retornos.resumo.atrasados > 0 ? "critical" : undefined}
              rotulo="Atrasados"
              valor={dados.retornos.resumo.atrasados}
              onClick={() => abrirAgenda()}
              ariaLabel={`Retornos atrasados: ${dados.retornos.resumo.atrasados}. Abrir agenda.`}
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Hoje"
              valor={dados.retornos.resumo.hoje}
              onClick={() => abrirAgenda("hoje")}
              ariaLabel={`Retornos hoje: ${dados.retornos.resumo.hoje}. Abrir agenda.`}
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Próximos"
              valor={dados.retornos.resumo.proximos}
              onClick={() => abrirAgenda()}
              ariaLabel={`Próximos retornos: ${dados.retornos.resumo.proximos}. Abrir agenda.`}
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Concluídos"
              valor={dados.retornos.resumo.concluidos}
            />
          </CardMetricRow>
          <div className="mt-lg">
            <DashboardRetornosTable itens={dados.retornos.itens} mostrarRe={false} />
          </div>
        </SecaoBloco>
      </section>
    </DashboardLayout>
  );
}
