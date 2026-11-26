"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Handshake,
  Home,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  GraficoBarras,
  GraficoLinhasMultiplas,
  GraficoRosca,
  Sparkline,
  type TomGrafico,
} from "@/components/charts";
import { Icon } from "@/components/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import type { ResumoPainelSituacao, SituacaoPainelId } from "@/lib/debitos/painel-situacao";
import type { ResumoPainelUnidade, UnidadePainelId } from "@/lib/debitos/painel-unidade";

const DETALHE_KPI: Record<SituacaoPainelId, string> = {
  em_aberto: "Dívidas pendentes",
  em_negociacao: "Acordos ativos",
  quitadas: "Dívidas pagas",
  prescritas: "Dívidas prescritas",
};

const TOM_FATIA: Record<SituacaoPainelId, TomGrafico> = {
  em_aberto: "critical",
  em_negociacao: "navy",
  quitadas: "settled",
  prescritas: "brass",
};

const ICON_KPI: Record<SituacaoPainelId, typeof AlertTriangle> = {
  em_aberto: AlertTriangle,
  em_negociacao: Handshake,
  quitadas: CheckCircle2,
  prescritas: Archive,
};

const FUNDO_KPI: Record<SituacaoPainelId, string> = {
  em_aberto: "border-error-container/30 bg-error-container/20",
  em_negociacao: "border-primary-container/25 bg-primary-fixed/30",
  quitadas: "border-status-settled/25 bg-status-settled/10",
  prescritas: "border-brass/25 bg-gold-subtle/40",
};

const ICON_FUNDO: Record<SituacaoPainelId, string> = {
  em_aberto: "bg-error-container text-status-critical",
  em_negociacao: "bg-primary-fixed/50 text-primary-container",
  quitadas: "bg-status-settled/15 text-status-settled",
  prescritas: "bg-gold-subtle text-brass",
};

const DETALHE_KPI_UNIDADE: Record<UnidadePainelId, string> = {
  em_aberto: "Unidades devedoras",
  em_negociacao: "Unidades em acordo",
  em_dia: "Unidades em dia",
  quitada: "Unidades quitadas",
};

const TOM_FATIA_UNIDADE: Record<UnidadePainelId, TomGrafico> = {
  em_aberto: "critical",
  em_negociacao: "navy",
  em_dia: "settled",
  quitada: "brass",
};

const ICON_KPI_UNIDADE: Record<UnidadePainelId, typeof AlertTriangle> = {
  em_aberto: AlertTriangle,
  em_negociacao: Handshake,
  em_dia: Home,
  quitada: CheckCircle2,
};

const FUNDO_KPI_UNIDADE: Record<UnidadePainelId, string> = {
  em_aberto: "border-error-container/30 bg-error-container/20",
  em_negociacao: "border-primary-container/25 bg-primary-fixed/30",
  em_dia: "border-status-settled/25 bg-status-settled/10",
  quitada: "border-brass/25 bg-gold-subtle/40",
};

const ICON_FUNDO_UNIDADE: Record<UnidadePainelId, string> = {
  em_aberto: "bg-error-container text-status-critical",
  em_negociacao: "bg-primary-fixed/50 text-primary-container",
  em_dia: "bg-status-settled/15 text-status-settled",
  quitada: "bg-gold-subtle text-brass",
};

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const COR_TENDENCIA_KPI: Record<TomGrafico, string> = {
  critical: "text-status-critical",
  navy: "text-primary-container",
  settled: "text-status-settled",
  brass: "text-brass",
  pending: "text-status-pending",
  mist: "text-on-surface-variant",
};

const GRADIENTE_SPARKLINE_KPI: Record<TomGrafico, string> = {
  critical: "from-transparent to-error-container/30",
  navy: "from-transparent to-primary-fixed/40",
  settled: "from-transparent to-status-settled/25",
  brass: "from-transparent to-gold-subtle",
  pending: "from-transparent to-surface-subtle",
  mist: "from-transparent to-surface-subtle",
};

function KpiPainelCard<T extends string>({
  id,
  titulo,
  valor,
  detalhe,
  variacaoPercentual,
  serie,
  chave,
  fundo,
  iconFundo,
  Icone,
  tom,
}: {
  id: T;
  titulo: string;
  valor: number;
  detalhe: string;
  variacaoPercentual: number | null;
  serie: number[];
  chave: string;
  fundo: string;
  iconFundo: string;
  Icone: typeof AlertTriangle;
  tom: TomGrafico;
}) {
  const subiu = (variacaoPercentual ?? 0) >= 0;
  const corTendencia = subiu ? COR_TENDENCIA_KPI[tom] : "text-status-settled";
  return (
    <article
      className={`grid min-h-[7.25rem] min-w-0 grid-cols-1 gap-sm rounded-xl border p-md shadow-card min-[480px]:grid-cols-[minmax(0,1fr)_minmax(5.5rem,38%)] min-[480px]:gap-md ${fundo}`}
    >
      <div className="flex min-w-0 flex-col gap-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconFundo}`}>
            <Icon icon={Icone} size="sm" />
          </div>
          <p className="min-w-0 text-label-md text-on-surface">{titulo}</p>
        </div>
        <div className="flex flex-col gap-xs">
          <p className="text-metric tabular-nums text-on-surface">{valor}</p>
          <p className="text-body-sm text-on-surface-variant">{detalhe}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-end gap-xs">
        {variacaoPercentual != null ? (
          <span className={`inline-flex shrink-0 items-center gap-0.5 text-body-sm tabular-nums ${corTendencia}`}>
            <Icon icon={subiu ? TrendingUp : TrendingDown} size="sm" />
            {percentual(Math.abs(variacaoPercentual))}
          </span>
        ) : (
          <span className="inline-block min-h-[1.25rem]" aria-hidden="true" />
        )}
        <div
          className={`relative flex min-h-[3.25rem] w-full flex-1 items-end justify-end overflow-hidden rounded-lg bg-gradient-to-b ${GRADIENTE_SPARKLINE_KPI[tom]}`}
        >
          <Sparkline valores={serie} tom={tom} chave={`${chave}-${id}`} className="relative z-[1] h-11 w-full px-xs" />
        </div>
      </div>
    </article>
  );
}

type VisaoGraficoPainel = "situacao" | "unidades" | "faixas";

type Props = {
  chaveGraficos: string;
  vazioGrafico: ReactNode;
  resumo: ResumoPainelSituacao;
  visaoGrafico: VisaoGraficoPainel;
  onVisaoGraficoChange: (visao: VisaoGraficoPainel) => void;
  unidades: {
    resumo: ResumoPainelUnidade;
    subtitulo: string;
  };
  faixas: {
    subtitulo: string;
    itens: Array<{ nome: string; valor: number; detalhe: string; tom: "brass" | "critical" }>;
  };
};

export type { VisaoGraficoPainel };

export function InadimplenciaPainelGraficos({
  chaveGraficos,
  vazioGrafico,
  resumo,
  visaoGrafico,
  onVisaoGraficoChange,
  unidades,
  faixas,
}: Props) {
  const fatiasRosca = resumo.fatias
    .filter((fatia) => fatia.quantidade > 0)
    .map((fatia) => ({
      nome: fatia.nome,
      valor: fatia.quantidade,
      detalhe:
        fatia.percentual == null
          ? String(fatia.quantidade)
          : `${fatia.quantidade} · ${percentual(fatia.percentual)}`,
      tom: TOM_FATIA[fatia.id],
    }));

  const evolucaoTemDado = resumo.evolucao.some(
    (ponto) =>
      ponto.emAberto > 0 ||
      ponto.emNegociacao > 0 ||
      ponto.quitadas > 0 ||
      ponto.prescritas > 0,
  );

  return (
    <section
      className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg"
      aria-label="Gráficos de inadimplência"
    >
      <Tabs
        value={visaoGrafico}
        onValueChange={(value) => onVisaoGraficoChange(value as VisaoGraficoPainel)}
      >
        <TabsList className="w-full min-[768px]:w-auto">
          <TabsTrigger value="situacao">Por situação</TabsTrigger>
          <TabsTrigger value="unidades">Por unidade</TabsTrigger>
          <TabsTrigger value="faixas">Por faixa de atraso</TabsTrigger>
        </TabsList>

        <TabsContent value="situacao" className="flex flex-col gap-lg !bg-transparent !p-0 pt-md">
          <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2 min-[768px]:items-stretch min-[768px]:gap-0">
            <div className="flex min-w-0 flex-col gap-md min-[768px]:pr-lg">
              <div>
                <h3 className="text-label-lg text-on-surface">Resumo por situação</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {resumo.totalRegistros > 0
                    ? `${resumo.totalRegistros} registro(s) no recorte filtrado na data-base`
                    : "Sem registros no recorte filtrado"}
                </p>
              </div>
              {resumo.totalRegistros > 0 ? (
                <GraficoRosca
                  chave={`${chaveGraficos}-situacao`}
                  vazio={vazioGrafico}
                  centro={String(resumo.totalRegistros)}
                  legenda="registros"
                  fatias={fatiasRosca.length > 0 ? fatiasRosca : [{ nome: "—", valor: 1, detalhe: "0", tom: "mist" as const }]}
                />
              ) : (
                vazioGrafico
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-md border-t border-border-subtle pt-lg min-[768px]:border-l min-[768px]:border-t-0 min-[768px]:pl-lg min-[768px]:pt-0">
              <div>
                <h3 className="text-label-lg text-on-surface">Evolução da inadimplência</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Últimos 5 meses até a data-base · contagem de registros por situação
                </p>
              </div>
              {evolucaoTemDado ? (
                <GraficoLinhasMultiplas
                  chave={`${chaveGraficos}-evolucao-situacao`}
                  vazio={vazioGrafico}
                  categorias={resumo.evolucao.map((ponto) => ponto.mesRotulo)}
                  series={[
                    {
                      nome: "Em aberto",
                      valores: resumo.evolucao.map((ponto) => ponto.emAberto),
                      tom: "critical",
                      area: true,
                    },
                    {
                      nome: "Em negociação",
                      valores: resumo.evolucao.map((ponto) => ponto.emNegociacao),
                      tom: "navy",
                    },
                    {
                      nome: "Quitadas",
                      valores: resumo.evolucao.map((ponto) => ponto.quitadas),
                      tom: "settled",
                    },
                    {
                      nome: "Prescritas",
                      valores: resumo.evolucao.map((ponto) => ponto.prescritas),
                      tom: "brass",
                    },
                  ]}
                />
              ) : (
                vazioGrafico
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2 min-[1024px]:grid-cols-4">
            {resumo.kpis.map((kpi) => {
              const fatia = resumo.fatias.find((item) => item.id === kpi.id);
              return (
                <KpiPainelCard
                  key={kpi.id}
                  id={kpi.id}
                  titulo={fatia?.nome ?? kpi.id}
                  valor={kpi.valor}
                  detalhe={DETALHE_KPI[kpi.id]}
                  variacaoPercentual={kpi.variacaoPercentual}
                  serie={kpi.serie}
                  chave={chaveGraficos}
                  fundo={FUNDO_KPI[kpi.id]}
                  iconFundo={ICON_FUNDO[kpi.id]}
                  Icone={ICON_KPI[kpi.id]}
                  tom={TOM_FATIA[kpi.id]}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="unidades" className="flex flex-col gap-lg !bg-transparent !p-0 pt-md">
          <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2 min-[768px]:items-stretch min-[768px]:gap-0">
            <div className="flex min-w-0 flex-col gap-md min-[768px]:pr-lg">
              <div>
                <h3 className="text-label-lg text-on-surface">Resumo por unidade</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {unidades.resumo.totalUnidades > 0
                    ? `${unidades.resumo.totalUnidades} unidade(s) no recorte filtrado na data-base`
                    : "Sem unidades no recorte filtrado"}
                </p>
              </div>
              {unidades.resumo.totalUnidades > 0 ? (
                <GraficoRosca
                  chave={`${chaveGraficos}-unidades`}
                  vazio={vazioGrafico}
                  centro={String(unidades.resumo.totalUnidades)}
                  legenda="unidades"
                  fatias={
                    unidades.resumo.fatias.filter((fatia) => fatia.quantidade > 0).length > 0
                      ? unidades.resumo.fatias
                          .filter((fatia) => fatia.quantidade > 0)
                          .map((fatia) => ({
                            nome: fatia.nome,
                            valor: fatia.quantidade,
                            detalhe:
                              fatia.percentual == null
                                ? String(fatia.quantidade)
                                : `${fatia.quantidade} · ${percentual(fatia.percentual)}`,
                            tom: TOM_FATIA_UNIDADE[fatia.id],
                          }))
                      : [{ nome: "—", valor: 1, detalhe: "0", tom: "mist" as const }]
                  }
                />
              ) : (
                vazioGrafico
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-md border-t border-border-subtle pt-lg min-[768px]:border-l min-[768px]:border-t-0 min-[768px]:pl-lg min-[768px]:pt-0">
              <div>
                <h3 className="text-label-lg text-on-surface">Evolução da inadimplência por unidade</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">{unidades.subtitulo}</p>
              </div>
              {unidades.resumo.evolucao.some(
                (ponto) =>
                  ponto.emAberto > 0 ||
                  ponto.emNegociacao > 0 ||
                  ponto.emDia > 0 ||
                  ponto.quitada > 0,
              ) ? (
                <GraficoLinhasMultiplas
                  chave={`${chaveGraficos}-evolucao-unidades`}
                  vazio={vazioGrafico}
                  categorias={unidades.resumo.evolucao.map((ponto) => ponto.mesRotulo)}
                  series={[
                    {
                      nome: "Com débito vencido",
                      valores: unidades.resumo.evolucao.map(
                        (ponto) => ponto.emAberto + ponto.emNegociacao,
                      ),
                      tom: "critical",
                      area: true,
                    },
                    {
                      nome: "Sem débito vencido",
                      valores: unidades.resumo.evolucao.map((ponto) => ponto.emDia),
                      tom: "settled",
                    },
                    {
                      nome: "Quitada",
                      valores: unidades.resumo.evolucao.map((ponto) => ponto.quitada),
                      tom: "brass",
                    },
                  ]}
                />
              ) : (
                vazioGrafico
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2 min-[1024px]:grid-cols-4">
            {unidades.resumo.kpis.map((kpi) => {
              const fatia = unidades.resumo.fatias.find((item) => item.id === kpi.id);
              return (
                <KpiPainelCard
                  key={kpi.id}
                  id={kpi.id}
                  titulo={fatia?.nome ?? kpi.id}
                  valor={kpi.valor}
                  detalhe={DETALHE_KPI_UNIDADE[kpi.id]}
                  variacaoPercentual={kpi.variacaoPercentual}
                  serie={kpi.serie}
                  chave={`${chaveGraficos}-unidades`}
                  fundo={FUNDO_KPI_UNIDADE[kpi.id]}
                  iconFundo={ICON_FUNDO_UNIDADE[kpi.id]}
                  Icone={ICON_KPI_UNIDADE[kpi.id]}
                  tom={TOM_FATIA_UNIDADE[kpi.id]}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="faixas" className="!bg-transparent !p-0 pt-md">
          <div className="flex min-w-0 flex-col gap-md">
            <div>
              <h3 className="text-label-lg text-on-surface">Valor por faixa de atraso</h3>
              <p className="mt-xs text-body-sm text-on-surface-variant">{faixas.subtitulo}</p>
            </div>
            <GraficoBarras chave={`${chaveGraficos}-faixas`} vazio={vazioGrafico} itens={faixas.itens} />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}