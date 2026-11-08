"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CheckCheck,
  ClipboardList,
  FilePlus,
  Loader2,
  RotateCcw,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { FilterBar } from "@/components/filter-bar";
import { GraficoColunas, GraficoLinha } from "@/components/charts";
import { diaCurto } from "@/components/dashboard/dashboard-shared";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { MetaPainelIndicadores } from "@/components/indicadores/meta-painel";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { resolverPeriodo, rotuloPeriodo, type PeriodPreset, type PeriodValue } from "@/components/period-input";
import { RelatorioMetricas, RelatorioPainel, type RelatorioMetricaItem } from "@/components/relatorios/relatorio-ui";
import {
  ResponsiveTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileField,
  TableMobileList,
  TableMobileTitle,
  TableRow,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatarData, hojeIso } from "@/data/catalogo";
import { usePermissao } from "@/hooks/use-permissao";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import {
  type IndicadorMinhaProdutividadeId,
  type PainelMinhaProdutividade,
  type RegistroMinhaProdutividade,
} from "@/lib/produtividade-individual/service";

const filtroInicial = {
  preset: "7" as PeriodPreset,
  de: "",
  ate: "",
};

const rotulosIndicador: Record<IndicadorMinhaProdutividadeId, string> = {
  atendimentos_realizados: "Atendimentos realizados",
  atendimentos_criados: "Criados no período",
  atendimentos_movimentados: "Movimentados",
  conclusoes_efetivas: "Conclusões efetivas",
  atendimentos_concluidos: "Atendimentos concluídos",
  atendimentos_pendentes: "Ainda pendentes",
  retornos_realizados: "Retornos realizados",
  atendimentos_reabertos: "Atendimentos reabertos",
};

function MinhaProdutividadePage() {
  const router = useRouter();
  const hoje = hojeIso();
  const { permissoes } = usePermissao();
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);
  const perfilAtendente = perfil === "atendente";

  const [periodoValor, setPeriodoValor] = useState<PeriodValue>(filtroInicial);
  const [aplicado, setAplicado] = useState<PeriodValue>(filtroInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [painel, setPainel] = useState<PainelMinhaProdutividade | null>(null);
  const [indicadorDetalhe, setIndicadorDetalhe] = useState<IndicadorMinhaProdutividadeId | null>(null);
  const [registros, setRegistros] = useState<RegistroMinhaProdutividade[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [pagina, setPagina] = useState(1);

  const periodo = resolverPeriodo(aplicado, hoje);
  const chaveConsulta = `${periodo.inicio}|${periodo.fim}`;

  const aplicarFiltro = useCallback(() => {
    setAplicado(periodoValor);
    setIndicadorDetalhe(null);
    setPagina(1);
  }, [periodoValor]);

  useEffect(() => {
    if (!perfilAtendente) {
      setPainel(null);
      setErro(null);
      return;
    }
    if (!periodo.inicio || !periodo.fim) {
      setPainel(null);
      setErro("Informe o período para consultar.");
      return;
    }

    let cancelado = false;
    const qs = new URLSearchParams({ de: periodo.inicio, ate: periodo.fim });
    setCarregando(true);
    setErro(null);

    fetch(`/api/minha-produtividade?${qs.toString()}`, { credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json()) as { painel?: PainelMinhaProdutividade; error?: string };
        if (cancelado) return;
        if (!response.ok) {
          setPainel(null);
          setErro(body.error ?? "Não foi possível consultar a produtividade.");
          return;
        }
        setPainel(body.painel ?? null);
      })
      .catch(() => {
        if (!cancelado) {
          setPainel(null);
          setErro("Não foi possível comunicar com o servidor.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [chaveConsulta, perfilAtendente, periodo.fim, periodo.inicio]);

  useEffect(() => {
    if (!indicadorDetalhe || !perfilAtendente || !periodo.inicio || !periodo.fim) {
      setRegistros([]);
      return;
    }
    let cancelado = false;
    const qs = new URLSearchParams({
      de: periodo.inicio,
      ate: periodo.fim,
      indicador: indicadorDetalhe,
    });
    setCarregandoDetalhe(true);
    fetch(`/api/minha-produtividade?${qs.toString()}`, { credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json()) as { registros?: RegistroMinhaProdutividade[]; error?: string };
        if (cancelado) return;
        if (!response.ok) {
          setRegistros([]);
          return;
        }
        setRegistros(body.registros ?? []);
        setPagina(1);
      })
      .catch(() => {
        if (!cancelado) setRegistros([]);
      })
      .finally(() => {
        if (!cancelado) setCarregandoDetalhe(false);
      });
    return () => {
      cancelado = true;
    };
  }, [indicadorDetalhe, perfilAtendente, periodo.fim, periodo.inicio]);

  const metricas: RelatorioMetricaItem[] = useMemo(() => {
    if (!painel) return [];
    const taxa =
      painel.taxaConclusao.percentual == null
        ? "—"
        : `${painel.taxaConclusao.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
    const drill = (id: IndicadorMinhaProdutividadeId) => ({
      onClick: () => abrirIndicador(id),
      selecionado: indicadorDetalhe === id,
    });
    return [
      {
        rotulo: "Atendimentos realizados",
        valor: String(painel.indicadores.atendimentos_realizados),
        icon: ClipboardList,
        detalhe: "Registrados por você no período.",
        ...drill("atendimentos_realizados"),
      },
      {
        rotulo: "Atendimentos concluídos",
        valor: String(painel.indicadores.atendimentos_concluidos),
        icon: CheckCircle2,
        detalhe: "Atendimentos distintos com conclusão efetiva.",
        ...drill("atendimentos_concluidos"),
      },
      {
        rotulo: "Ainda pendentes",
        valor: String(painel.indicadores.atendimentos_pendentes),
        icon: CalendarClock,
        accent: "tertiary",
        detalhe: "Dos realizados no período, ainda Pendente.",
        ...drill("atendimentos_pendentes"),
      },
      {
        rotulo: "Retornos realizados",
        valor: String(painel.indicadores.retornos_realizados),
        icon: RefreshCw,
        detalhe: "Retornos agendados concluídos por você.",
        ...drill("retornos_realizados"),
      },
      {
        rotulo: "Taxa de conclusão",
        valor: taxa,
        icon: TrendingUp,
        destaque: true,
        accent: "brass",
        detalhe: painel.taxaConclusao.formula,
      },
    ];
  }, [indicadorDetalhe, painel]);

  const metricasComplementares: RelatorioMetricaItem[] = useMemo(() => {
    if (!painel) return [];
    const drill = (id: IndicadorMinhaProdutividadeId) => ({
      onClick: () => abrirIndicador(id),
      selecionado: indicadorDetalhe === id,
    });
    return [
      {
        rotulo: rotulosIndicador.atendimentos_criados,
        valor: String(painel.indicadores.atendimentos_criados),
        icon: FilePlus,
        detalhe: "Novos registros criados por você.",
        ...drill("atendimentos_criados"),
      },
      {
        rotulo: rotulosIndicador.atendimentos_movimentados,
        valor: String(painel.indicadores.atendimentos_movimentados),
        icon: ArrowRightLeft,
        detalhe: "Alterações em atendimentos (auditoria UPDATE).",
        ...drill("atendimentos_movimentados"),
      },
      {
        rotulo: rotulosIndicador.conclusoes_efetivas,
        valor: String(painel.indicadores.conclusoes_efetivas),
        icon: CheckCheck,
        detalhe: "Fechamentos registrados no período.",
        ...drill("conclusoes_efetivas"),
      },
      {
        rotulo: rotulosIndicador.atendimentos_reabertos,
        valor: String(painel.indicadores.atendimentos_reabertos),
        icon: RotateCcw,
        detalhe: "Reaberturas feitas por você.",
        ...drill("atendimentos_reabertos"),
      },
    ];
  }, [indicadorDetalhe, painel]);

  const semRegistrosNoPeriodo = Boolean(
    painel &&
      painel.indicadores.atendimentos_realizados === 0 &&
      painel.indicadores.atendimentos_movimentados === 0 &&
      painel.indicadores.conclusoes_efetivas === 0 &&
      painel.indicadores.retornos_realizados === 0,
  );

  const registrosPagina = useMemo(() => {
    const inicio = (pagina - 1) * PAGE_SIZE;
    return registros.slice(inicio, inicio + PAGE_SIZE);
  }, [pagina, registros]);

  function abrirIndicador(id: IndicadorMinhaProdutividadeId) {
    setIndicadorDetalhe((atual) => (atual === id ? null : id));
  }

  if (!perfilAtendente) {
    return (
      <WorkspaceShell>
        <PageHeader
          title="Minha produtividade"
          description="Acompanhamento individual da sua operação de cobrança."
          breadcrumbs={[{ label: "Início", href: "/" }, { label: "Minha produtividade" }]}
        />
        <PageContent>
          <EmptyState
            title="Disponível para atendentes"
            description="O painel global de produtividade por RE permanece em Relatórios, exclusivo da administradora."
            icon={<Icon icon={BarChart3} size="lg" />}
            action={
              <Button variant="secondary" onClick={() => router.push("/")}>
                Voltar ao início
              </Button>
            }
          />
        </PageContent>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title="Minha produtividade"
        description="Indicadores da sua autoria no período selecionado. Os números consideram histórico de auditoria para conclusões, movimentações e reaberturas."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Minha produtividade" }]}
      />
      <PageContent className="flex flex-col gap-lg">
        <FilterBar
          hideSearch
          defaultMobile="grid"
          searchValue=""
          onSearchChange={() => undefined}
          onApply={aplicarFiltro}
          applyLabel="Atualizar"
          onClear={() => {
            setPeriodoValor(filtroInicial);
            setAplicado(filtroInicial);
            setIndicadorDetalhe(null);
            setPagina(1);
          }}
          fields={[
            {
              id: "periodo",
              label: "Período",
              type: "period" as const,
              value: periodoValor,
              onChange: setPeriodoValor,
            },
          ]}
        />

        {erro ? (
          <Alert variant="error" title="Consulta indisponível">
            {erro}
          </Alert>
        ) : null}

        {carregando && !painel ? (
          <EmptyState
            title="Carregando indicadores"
            description={`Período: ${rotuloPeriodo(aplicado)}.`}
            icon={<Icon icon={Loader2} size="lg" className="animate-spin" />}
          />
        ) : null}

        {painel ? (
          <>
            <MetaPainelIndicadores meta={painel.meta} />

            {semRegistrosNoPeriodo ? (
              <Alert variant="info" title="Nenhuma atividade no período">
                Não há atendimentos, movimentações ou conclusões atribuídas a você neste intervalo. Ajuste o período ou
                registre tentativas em Atendimentos para alimentar os indicadores.
                <span className="mt-sm block">
                  <Button size="sm" variant="secondary" onClick={() => router.push("/atendimentos")}>
                    Ir para Atendimentos
                  </Button>
                </span>
              </Alert>
            ) : null}

            <RelatorioMetricas itens={metricas} desktopCols={5} mobileCols={2} />
            <RelatorioMetricas itens={metricasComplementares} desktopCols={4} mobileCols={2} />

            {indicadorDetalhe && painel ? (
              <RelatorioPainel
                titulo={rotulosIndicador[indicadorDetalhe]}
                nota={`Período ${formatarData(painel.periodo.de)} a ${formatarData(painel.periodo.ate)} · ${registros.length} registro${registros.length === 1 ? "" : "s"}`}
              >
                {carregandoDetalhe ? (
                  <EmptyState
                    title="Carregando registros"
                    icon={<Icon icon={Loader2} size="md" className="animate-spin" />}
                  />
                ) : registros.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">Não há eventos deste indicador no período.</p>
                ) : (
                  <>
                    <ResponsiveTable
                      desktop={
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Condomínio</TableHead>
                              <TableHead>Unidade</TableHead>
                              <TableHead>Canal</TableHead>
                              <TableHead>Resumo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {registrosPagina.map((item) => (
                              <TableRow key={`${item.atendimentoId}-${item.dataReferencia}-${item.tipoEvento}`}>
                                <TableCell>{formatarData(item.dataReferencia)}</TableCell>
                                <TableCell>{item.condominio}</TableCell>
                                <TableCell>{item.unidade}</TableCell>
                                <TableCell>{item.canal}</TableCell>
                                <TableCell>{item.resumo}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      }
                      mobile={
                        <TableMobileList>
                          {registrosPagina.map((item) => (
                            <TableMobileCard key={`${item.atendimentoId}-${item.dataReferencia}-${item.tipoEvento}`}>
                              <TableMobileCardHeader>
                                <TableMobileTitle>{item.resumo}</TableMobileTitle>
                              </TableMobileCardHeader>
                              <TableMobileField label="Data">{formatarData(item.dataReferencia)}</TableMobileField>
                              <TableMobileField label="Condomínio">{item.condominio}</TableMobileField>
                              <TableMobileField label="Unidade">{item.unidade}</TableMobileField>
                              <TableMobileField label="Canal">{item.canal}</TableMobileField>
                            </TableMobileCard>
                          ))}
                        </TableMobileList>
                      }
                    />
                    {registros.length > PAGE_SIZE ? (
                      <Pagination page={pagina} total={registros.length} onPageChange={setPagina} />
                    ) : null}
                  </>
                )}
              </RelatorioPainel>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Selecione um indicador acima para abrir a listagem de registros do período.
              </p>
            )}

            <div className="grid grid-cols-1 gap-lg min-[1024px]:grid-cols-2">
              <RelatorioPainel
                titulo="Evolução dos atendimentos realizados"
                nota="Contagem diária de registros criados por você."
              >
                <GraficoLinha
                  chave={`minha-prod-realizados-${chaveConsulta}`}
                  vazio={<p className="text-body-sm text-on-surface-variant">Nenhum atendimento registrado por você neste intervalo.</p>}
                  itens={painel.graficos.atendimentosRealizados.map((item) => ({
                    nome: diaCurto(item.dia),
                    valor: item.valor,
                    rotulo: item.rotulo,
                  }))}
                />
              </RelatorioPainel>
              <RelatorioPainel
                titulo="Atendimentos concluídos por dia"
                nota="Conclusões efetivas atribuídas a você (status ou retorno)."
              >
                <GraficoColunas
                  chave={`minha-prod-concluidos-${chaveConsulta}`}
                  vazio={<p className="text-body-sm text-on-surface-variant">Nenhuma conclusão efetiva neste intervalo.</p>}
                  itens={painel.graficos.atendimentosConcluidos.map((item) => ({
                    nome: diaCurto(item.dia),
                    valor: item.valor,
                    rotulo: item.rotulo,
                  }))}
                />
              </RelatorioPainel>
            </div>

            <RelatorioPainel titulo="Definições" nota="Cada indicador segue as regras oficiais de autoria e auditoria (T29).">
              <ul className="list-disc space-y-xs pl-md text-body-sm text-on-surface-variant">
                {painel.definicoes.map((linha) => (
                  <li key={linha}>{linha}</li>
                ))}
              </ul>
            </RelatorioPainel>
          </>
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <MinhaProdutividadePage />
    </Suspense>
  );
}
