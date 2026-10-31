"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { GraficoColunasAgrupadas, tomPorIndice } from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { type PeriodPreset, resolverPeriodo } from "@/components/period-input";
import {
  Leitura,
  RelatorioFiltros,
  RelatorioMetrica,
  RelatorioPainel,
  RelatorioSecaoTabela,
  VoltarRelatoriosHub,
} from "@/components/relatorios/relatorio-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableExport,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { escopoCondominios, hojeIso } from "@/data/catalogo";
import { listarAtendentesComRe } from "@/lib/colaboradores/re";
import { exportarPdf } from "@/lib/exportar";
import {
  SERIES_GRAFICO_PRODUTIVIDADE,
  valoresSeriesGraficoProdutividade,
  type PainelProdutividadePorRe,
} from "@/lib/relatorios/produtividade";
import type { RelatorioExportPayload } from "@/lib/relatorios/service";

const filtroInicial = {
  busca: "",
  preset: "7" as PeriodPreset,
  de: "",
  ate: "",
  advogado: "todos",
  condominio: "todos",
  codigoRe: "todos",
};

function ProdutividadePorRePage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const cadastros = useCadastros();
  const hoje = hojeIso();
  const podeFiltrarPorRe = pode("usuarios", "criar");
  const atendentesRe = listarAtendentesComRe();
  const condominiosEscopo = escopoCondominios(cadastros);

  const [filtro, setFiltro] = useState(filtroInicial);
  const [aplicado, setAplicado] = useState(filtroInicial);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erroPainel, setErroPainel] = useState<string | null>(null);
  const [painel, setPainel] = useState<PainelProdutividadePorRe | null>(null);

  const periodo = resolverPeriodo(aplicado, hoje);
  const chaveConsulta = `${periodo.inicio}|${periodo.fim}|${aplicado.advogado}|${aplicado.condominio}|${aplicado.codigoRe}`;

  const queryExportParams = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("tipo", "produtividade");
    if (periodo.inicio) qs.set("de", periodo.inicio);
    if (periodo.fim) qs.set("ate", periodo.fim);
    if (aplicado.advogado !== "todos") qs.set("advogado", aplicado.advogado);
    if (aplicado.condominio !== "todos") qs.set("condominio", aplicado.condominio);
    if (aplicado.codigoRe !== "todos") qs.set("codigoRe", aplicado.codigoRe);
    return qs;
  }, [aplicado.advogado, aplicado.condominio, aplicado.codigoRe, periodo.fim, periodo.inicio]);

  useEffect(() => {
    if (!podeFiltrarPorRe) {
      setPainel(null);
      setErroPainel(null);
      return;
    }
    if (!periodo.inicio || !periodo.fim) {
      setPainel(null);
      setErroPainel(null);
      return;
    }

    const qs = queryExportParams();
    let cancelado = false;
    setCarregando(true);
    setErroPainel(null);

    fetch(`/api/relatorios/produtividade?${qs.toString()}`, { credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json()) as { painel?: PainelProdutividadePorRe; error?: string };
        if (cancelado) return;
        if (!response.ok) {
          setPainel(null);
          setErroPainel(body.error ?? "Não foi possível consultar a produtividade.");
          return;
        }
        setPainel(body.painel ?? null);
      })
      .catch(() => {
        if (!cancelado) {
          setPainel(null);
          setErroPainel("Não foi possível comunicar com o servidor.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [chaveConsulta, podeFiltrarPorRe, periodo.inicio, periodo.fim, queryExportParams]);

  async function exportarViaApi(formato: "csv" | "xls") {
    const qs = queryExportParams();
    qs.set("formato", formato);
    try {
      const response = await fetch(`/api/relatorios/export?${qs.toString()}`, { credentials: "same-origin" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast({
          variant: "error",
          title: "Exportação não concluída",
          description: body.error ?? "Verifique os filtros e tente novamente.",
        });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const nome = match?.[1] ?? `produtividade.${formato === "csv" ? "csv" : "xls"}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: formato === "csv" ? "CSV baixado" : "Planilha baixada" });
    } catch {
      toast({
        variant: "error",
        title: "Falha na exportação",
        description: "Não foi possível comunicar com o servidor.",
      });
    }
  }

  async function imprimirPdf() {
    const qs = queryExportParams();
    qs.set("formato", "json");
    try {
      const response = await fetch(`/api/relatorios/export?${qs.toString()}`, { credentials: "same-origin" });
      const body = (await response.json()) as { payload?: RelatorioExportPayload; error?: string };
      if (!response.ok || !body.payload) {
        toast({
          variant: "error",
          title: "Exportação não concluída",
          description: body.error ?? "Verifique os filtros e tente novamente.",
        });
        return;
      }
      const meta = {
        titulo: "Informações da exportação",
        colunas: ["Detalhe"],
        linhas: [[`Gerado em: ${body.payload.meta.geradoEm}`], ...body.payload.meta.filtros.map((linha) => [linha])],
      };
      const secoes = [meta, ...body.payload.secoes.map((secao) => ({ titulo: secao.titulo, colunas: secao.colunas, linhas: secao.linhas }))];
      const abriu = exportarPdf(body.payload.titulo, "produtividade-por-re.html", secoes);
      if (!abriu) {
        toast({ variant: "info", title: "Relatório baixado", description: "Abra o arquivo e use imprimir para salvar em PDF." });
      }
    } catch {
      toast({
        variant: "error",
        title: "Falha na exportação",
        description: "Não foi possível comunicar com o servidor.",
      });
    }
  }

  async function aoExportar(formato: TableExportFormat) {
    if (formato === "pdf") {
      await imprimirPdf();
      return;
    }
    await exportarViaApi(formato === "csv" ? "csv" : "xls");
  }

  const camposFiltro = [
    {
      id: "periodo",
      label: "Período",
      type: "period" as const,
      value: { preset: filtro.preset, de: filtro.de, ate: filtro.ate },
      onChange: (periodoAtual: { preset: PeriodPreset; de: string; ate: string }) =>
        setFiltro((atual) => ({ ...atual, ...periodoAtual })),
    },
    {
      id: "condominio",
      label: "Condomínio",
      value: filtro.condominio,
      onChange: (condominio: string) => setFiltro((atual) => ({ ...atual, condominio })),
      options: [{ value: "todos", label: "Todos" }, ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome }))],
    },
    {
      id: "advogado",
      label: "Advogado",
      value: filtro.advogado,
      onChange: (advogado: string) => setFiltro((atual) => ({ ...atual, advogado })),
      options: [
        { value: "todos", label: "Todos" },
        ...[...new Set(condominiosEscopo.flatMap((item) => item.advogados))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((nome) => ({
          value: nome,
          label: nome,
        })),
      ],
    },
    {
      id: "codigoRe",
      label: "RE",
      value: filtro.codigoRe,
      onChange: (codigoRe: string) => setFiltro((atual) => ({ ...atual, codigoRe })),
      options: [{ value: "todos", label: "Todos" }, ...atendentesRe.map((item) => ({ value: item.codigoRe, label: item.codigoRe }))],
    },
  ];

  const vazio = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Nenhum registro no recorte" description="Ajuste o período ou os filtros." />
  );

  const linhasTabela = useMemo(
    () =>
      (painel?.linhas ?? []).map((linha) => [
        linha.codigoRe,
        String(linha.atendimentosRegistrados),
        String(linha.retornosConcluidos),
        String(linha.negociacoesRegistradas),
        String(linha.acoesRegistradas),
        String(linha.acordosConfirmados),
      ]),
    [painel],
  );

  const [colunaOrdenada, setColunaOrdenada] = useState<number | null>(null);
  const [direcao, setDirecao] = useState<TableSortDirection>("none");

  const linhasOrdenadas = useMemo(() => {
    if (colunaOrdenada === null || direcao === "none") return linhasTabela;
    return [...linhasTabela].sort((a, b) => {
      const va = a[colunaOrdenada] ?? "";
      const vb = b[colunaOrdenada] ?? "";
      const na = Number(va);
      const nb = Number(vb);
      const cmp = !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : va.localeCompare(vb, "pt-BR", { numeric: true });
      return direcao === "asc" ? cmp : -cmp;
    });
  }, [colunaOrdenada, direcao, linhasTabela]);

  const recorte = linhasOrdenadas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const seriesGrafico = SERIES_GRAFICO_PRODUTIVIDADE.map((item, indice) => ({
    nome: item.rotulo,
    tom: tomPorIndice(indice),
  }));

  const gruposGrafico = (painel?.linhas ?? [])
    .filter((linha) => valoresSeriesGraficoProdutividade(linha).some((valor) => valor > 0))
    .map((linha) => ({
      nome: linha.codigoRe,
      valores: valoresSeriesGraficoProdutividade(linha),
    }));

  let corpo: React.ReactNode;
  if (!podeFiltrarPorRe) {
    corpo = (
      <EmptyState
        icon={<Icon icon={Users} size="lg" />}
        title="Acesso restrito"
        description="O relatório de produtividade por RE é exclusivo da administradora."
      />
    );
  } else if (!periodo.inicio || !periodo.fim) {
    corpo = (
      <EmptyState
        icon={<Icon icon={BarChart3} size="lg" />}
        title="Informe o período"
        description="Selecione a data inicial e final e clique em Aplicar filtros."
      />
    );
  } else if (carregando && !painel) {
    corpo = <p className="text-body-md text-on-surface-variant">Carregando indicadores…</p>;
  } else if (erroPainel) {
    corpo = (
      <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Consulta indisponível" description={erroPainel} />
    );
  } else if (!painel) {
    corpo = (
      <EmptyState
        icon={<Icon icon={BarChart3} size="lg" />}
        title="Não foi possível carregar"
        description="Verifique o período e tente novamente."
      />
    );
  } else {
    const { totais, periodo: periodoPainel, definicoes } = painel;
    corpo = (
      <>
        <Leitura>
          Período consultado: {periodoPainel.rotulo}. Contagens por RE usam o autor de cada ação registrada; a carteira
          atual reflete a atribuição vigente hoje.
        </Leitura>
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-2 min-[1024px]:grid-cols-5" aria-label="Indicadores de produtividade">
          <RelatorioMetrica valor={String(totais.atendimentosRegistrados)} rotulo="atendimentos" destaque />
          <RelatorioMetrica valor={String(totais.retornosConcluidos)} rotulo="retornos concluídos" accent="tertiary" />
          <RelatorioMetrica valor={String(totais.negociacoesRegistradas)} rotulo="negociações" />
          <RelatorioMetrica valor={String(totais.acoesRegistradas)} rotulo="ações agendadas" accent="tertiary" />
          <RelatorioMetrica valor={String(totais.acordosConfirmados)} rotulo="acordos confirmados" accent="brass" detalhe="Confirmados no período" />
        </div>
        {gruposGrafico.length > 0 ? (
          <RelatorioPainel titulo="Comparativo por RE (5 indicadores)" nota="Sem ranking ou pontuação — apenas contagens objetivas no período.">
            <GraficoColunasAgrupadas chave={chaveConsulta} vazio={vazio} series={seriesGrafico} grupos={gruposGrafico} />
          </RelatorioPainel>
        ) : null}
        <RelatorioSecaoTabela titulo="Produtividade por pessoa (RE)" nota="Resumo por colaborador">
            <Table showExport={false} aria-label="Produtividade por RE">
              <TableHeader>
                <TableRow className="border-border-subtle/50 hover:bg-transparent">
                  {["RE", "Atendimentos", "Retornos", "Negociações", "Ações", "Acordos"].map((coluna, indice) => (
                    <TableHead
                      key={coluna}
                      sortable
                      sortDirection={colunaOrdenada === indice ? direcao : "none"}
                      onSort={() => {
                        if (colunaOrdenada !== indice) {
                          setColunaOrdenada(indice);
                          setDirecao("asc");
                          setPagina(1);
                          return;
                        }
                        if (direcao === "asc") {
                          setDirecao("desc");
                          setPagina(1);
                          return;
                        }
                        setColunaOrdenada(null);
                        setDirecao("none");
                        setPagina(1);
                      }}
                    >
                      {coluna}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasOrdenadas.length === 0 ? (
                  <TableEmpty colSpan={6}>{vazio}</TableEmpty>
                ) : (
                  recorte.map((linha, indice) => (
                    <TableRow key={`${linha.join("-")}-${indice}`}>
                      {linha.map((celula, coluna) => (
                        <TableCell key={`${coluna}-${celula}`} className={coluna === 0 ? "font-medium" : "tabular-nums"}>
                          {celula}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {linhasOrdenadas.length > PAGE_SIZE ? (
              <Pagination page={pagina} total={linhasOrdenadas.length} onPageChange={setPagina} />
            ) : null}
        </RelatorioSecaoTabela>
        <RelatorioPainel titulo="Definição dos indicadores">
          <ul className="list-disc space-y-xs pl-md text-body-sm text-on-surface-variant">
            {definicoes.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </RelatorioPainel>
      </>
    );
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title="Produtividade por RE"
        description="Relatório de produtividade por pessoa (RE): atendimentos, retornos, negociações e ações no período selecionado."
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Relatórios", href: "/relatorios" },
          { label: "Produtividade por RE" },
        ]}
        actions={podeFiltrarPorRe && pode("relatorios", "exportar") ? <TableExport onExport={aoExportar} /> : undefined}
      />
      <PageContent>
        <div className="flex flex-col gap-lg">
          <VoltarRelatoriosHub />
          {podeFiltrarPorRe ? (
            <RelatorioFiltros>
              <FilterBar
              searchValue=""
              onSearchChange={() => undefined}
              searchPlaceholder="Busca não aplicável neste relatório"
              onApply={() => {
                setAplicado(filtro);
                setPagina(1);
              }}
              onClear={() => {
                setFiltro(filtroInicial);
                setAplicado(filtroInicial);
                setPagina(1);
              }}
              fields={camposFiltro}
            />
            </RelatorioFiltros>
          ) : null}
          <div className="flex flex-col gap-xl">{corpo}</div>
        </div>
      </PageContent>
    </WorkspaceShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProdutividadePorRePage />
    </Suspense>
  );
}
