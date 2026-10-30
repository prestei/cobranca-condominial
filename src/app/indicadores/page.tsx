"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Loader2,
  Phone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { GraficoBarras, GraficoColunas, GraficoLinha, GraficoRosca, tomPorIndice } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  ResponsiveTable,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableRow,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatarData } from "@/data/catalogo";
import { diaCurto, type IndicadoresKpi, type IndicadoresPainel } from "@/lib/indicadores/service";

function variacaoBadge(kpi: IndicadoresKpi) {
  const pct = kpi.variacao.percentual;
  if (pct == null || !Number.isFinite(pct)) return null;
  const invertido = kpi.id === "inadimplencia";
  const positivo = invertido ? pct < 0 : pct > 0;
  const neutro = Math.abs(pct) < 0.05;
  const texto = `${pct > 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  const variant = neutro ? "neutral" : positivo ? "success" : "error";
  const Icone = pct >= 0 ? TrendingUp : TrendingDown;
  return (
    <Badge variant={variant} className="gap-1 tabular-nums">
      <Icon icon={Icone} size="sm" aria-hidden />
      {texto}
    </Badge>
  );
}

function KpiCard({ kpi, icon }: { kpi: IndicadoresKpi; icon: ReactNode }) {
  return (
    <article className="flex h-full min-w-0 flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex items-start justify-between gap-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-primary-container">{icon}</span>
        {variacaoBadge(kpi)}
      </div>
      <p className="text-metric font-semibold tabular-nums text-on-surface">{kpi.valorFormatado}</p>
      <p className="text-body-sm text-on-surface-variant">{kpi.rotulo}</p>
    </article>
  );
}

function PainelGrafico({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}

function badgeFase(fase: string) {
  if (fase === "Em acordo") return <Badge variant="secondary">{fase}</Badge>;
  if (fase === "Em disputa") return <Badge variant="neutral">{fase}</Badge>;
  return <Badge variant="error">{fase}</Badge>;
}

function badgePrioridade(prioridade: string) {
  if (prioridade === "Alta") return <Badge variant="error">{prioridade}</Badge>;
  if (prioridade === "Média") return <Badge variant="secondary">{prioridade}</Badge>;
  return <Badge variant="neutral">{prioridade}</Badge>;
}

export default function IndicadoresPage() {
  const router = useRouter();
  const [painel, setPainel] = useState<IndicadoresPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch("/api/indicadores", { credentials: "same-origin" });
      const body = (await response.json()) as { painel?: IndicadoresPainel; error?: string };
      if (!response.ok) {
        setPainel(null);
        setErro(body.error ?? "Não foi possível carregar os indicadores.");
        return;
      }
      if (!body.painel) {
        setErro("Resposta inválida do servidor.");
        setPainel(null);
        return;
      }
      setPainel(body.painel);
    } catch {
      setErro("Falha de comunicação ao carregar os indicadores.");
      setPainel(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const chave = painel ? `ind|${painel.dataBase}|${painel.periodo.fim}` : "ind";
  const vazio = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados no recorte" description="Não há registros para exibir com os filtros atuais." />
  );

  const kpiIcones = useMemo(
    () => ({
      cobrancas: <Icon icon={ClipboardList} size="md" />,
      inadimplencia: <Icon icon={Wallet} size="md" className="text-brass" />,
      retornos: <Icon icon={CalendarClock} size="md" />,
      produtividade: <Icon icon={Phone} size="md" />,
    }),
    [],
  );

  const grupoLider = painel?.porGrupo[0];
  const taxaMediaEficiencia =
    painel && painel.eficienciaSemanal.length
      ? painel.eficienciaSemanal.reduce((acc, item) => acc + item.valor, 0) / painel.eficienciaSemanal.length
      : null;

  return (
    <WorkspaceShell>
      <PageHeader
        title="Relatórios e indicadores"
        description="Visão operacional dos indicadores de cobrança, inadimplência e produtividade por condomínio."
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Indicadores" },
        ]}
      />
      <PageContent className="flex flex-col gap-xl">
        {carregando ? (
          <EmptyState
            icon={<Icon icon={Loader2} size="lg" className="animate-spin" />}
            title="Carregando indicadores"
            description="Consultando dados no servidor…"
          />
        ) : null}

        {!carregando && erro ? (
          <Alert variant="error" title="Erro ao carregar">
            {erro}
            <div className="mt-md">
              <Button size="sm" variant="secondary" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
            </div>
          </Alert>
        ) : null}

        {!carregando && !erro && painel ? (
          <>
            <p className="text-body-sm text-on-surface-variant">
              Período operacional: {formatarData(painel.periodo.inicio)} a {formatarData(painel.periodo.fim)} · Inadimplência na data-base{" "}
              {formatarData(painel.dataBase)}
            </p>

            <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4">
              {painel.kpis.map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} icon={kpiIcones[kpi.id]} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-lg min-[961px]:grid-cols-2">
              <PainelGrafico titulo="Inadimplência por grupo de rubrica" nota="Composição do valor em aberto na data-base.">
                <GraficoRosca
                  chave={`${chave}-grupo`}
                  vazio={vazio}
                  centro={grupoLider && grupoLider.percentual != null ? `${grupoLider.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
                  legenda={grupoLider?.nome ?? "principal"}
                  fatias={painel.porGrupo.map((linha, indice) => ({
                    nome: linha.nome,
                    valor: linha.valor,
                    detalhe: linha.detalhe,
                    tom: tomPorIndice(indice),
                  }))}
                />
              </PainelGrafico>

              <PainelGrafico titulo="Cobranças por meio de contato" nota="Atendimentos registrados nos últimos 7 dias.">
                <GraficoBarras
                  chave={`${chave}-meio`}
                  vazio={vazio}
                  itens={painel.porMeio.map((linha, indice) => ({
                    nome: linha.nome,
                    valor: linha.valor,
                    detalhe: linha.detalhe,
                    tom: tomPorIndice(indice),
                  }))}
                />
              </PainelGrafico>

              <PainelGrafico
                titulo="Eficiência semanal"
                nota={
                  taxaMediaEficiencia != null
                    ? `Taxa média de resposta no período: ${taxaMediaEficiencia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%.`
                    : "Percentual de contatos com resposta do morador, por dia."
                }
              >
                <GraficoLinha
                  chave={`${chave}-eficiencia`}
                  vazio={vazio}
                  itens={painel.eficienciaSemanal.map((item) => ({
                    nome: diaCurto(item.dia),
                    valor: item.valor,
                    rotulo: item.rotulo,
                  }))}
                />
              </PainelGrafico>

              <PainelGrafico
                titulo="Tendência de produtividade"
                nota={
                  painel.mediaMovelProdutividade != null
                    ? `Média de ${painel.mediaMovelProdutividade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} atendimentos/dia nos últimos 7 dias. Valor recuperado no card superior usa pagamentos registrados no período.`
                    : "Volume diário de atendimentos registrados."
                }
              >
                <GraficoColunas
                  chave={`${chave}-prod`}
                  vazio={vazio}
                  itens={painel.produtividadeDiaria.map((item) => ({
                    nome: diaCurto(item.dia),
                    valor: item.valor,
                    rotulo: item.rotulo,
                    tom: "brass" as const,
                  }))}
                />
              </PainelGrafico>
            </div>

            <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
              <div className="flex flex-col gap-xs">
                <h2 className="text-headline-sm text-on-surface">Ranking por condomínio</h2>
                <p className="text-body-sm text-on-surface-variant">Condomínios com maior saldo em aberto no seu escopo de acesso.</p>
              </div>

              <ResponsiveTable showExport={false} desktop={
                  <Table showExport={false}>
                    <TableHeader>
                      <TableRow className="border-border-subtle/50 hover:bg-transparent">
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Título (R$)</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Cobranças ativas</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {painel.rankingCondominios.length === 0 ? (
                        <TableEmpty colSpan={6}>{vazio}</TableEmpty>
                      ) : (
                        painel.rankingCondominios.map((linha) => (
                          <TableRow key={linha.condominioId}>
                            <TableCell className="font-medium">{linha.nome}</TableCell>
                            <TableCell className="tabular-nums">{linha.valorFormatado}</TableCell>
                            <TableCell>{badgeFase(linha.fase)}</TableCell>
                            <TableCell className="tabular-nums">{linha.cobrancasAtivas}</TableCell>
                            <TableCell>{badgePrioridade(linha.prioridade)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/relatorios?relatorio=carteira&condominio=${linha.condominioId}`)}
                              >
                                Acompanhar
                                <Icon icon={ChevronRight} size="sm" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                }
                mobile={
                  painel.rankingCondominios.length === 0 ? (
                    <TableMobileEmpty>{vazio}</TableMobileEmpty>
                  ) : (
                    <TableMobileList>
                      {painel.rankingCondominios.map((linha) => (
                        <TableMobileCard key={linha.condominioId}>
                          <TableMobileCardHeader>
                            <TableMobileTitle>{linha.nome}</TableMobileTitle>
                            {badgePrioridade(linha.prioridade)}
                          </TableMobileCardHeader>
                          <TableMobileFields>
                            <TableMobileField label="Título (R$)">{linha.valorFormatado}</TableMobileField>
                            <TableMobileField label="Fase">{badgeFase(linha.fase)}</TableMobileField>
                            <TableMobileField label="Cobranças ativas">{String(linha.cobrancasAtivas)}</TableMobileField>
                          </TableMobileFields>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => router.push(`/relatorios?relatorio=carteira&condominio=${linha.condominioId}`)}
                          >
                            Acompanhar
                            <Icon icon={ChevronRight} size="sm" />
                          </Button>
                        </TableMobileCard>
                      ))}
                    </TableMobileList>
                  )
                }
              />
            </section>
          </>
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}
