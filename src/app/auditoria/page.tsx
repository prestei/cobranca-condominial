"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Eye, Pencil, ScrollText, UserPlus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
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
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";
import type { UsuarioPublico } from "@/lib/usuarios/apresentacao";
import { acoesAuditoria, formatarData, type Auditoria } from "@/data/catalogo";
import type { PeriodValue } from "@/components/period-input";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import {
  badgeAcaoVariant,
  listaCamposAlterados,
  resumoLinha,
  rotuloAcao,
  rotuloTipoRegistro,
  textoAmigavelDados,
  textoTecnicoFormatado,
} from "@/lib/auditoria/apresentacao";
import { rotuloAutorAuditoria } from "@/lib/auditoria/autor";

type SortKey = "data" | "tipo" | "acao";

const periodoTodos: PeriodValue = { preset: "todos", de: "", ate: "" };

const colunasExportacao = ["Quando", "Quem fez", "Onde", "O que aconteceu", "Resumo"] as const;

function metricValor(valor: number) {
  return String(valor).padStart(2, "0");
}

function filtrosPadraoAplicados(
  appliedSearch: string,
  appliedEntidade: string,
  appliedAcao: string,
  appliedAutorId: string,
  appliedPeriodo: PeriodValue,
) {
  return (
    !appliedSearch.trim() &&
    appliedEntidade === "todas" &&
    appliedAcao === "todas" &&
    appliedAutorId === "todos" &&
    appliedPeriodo.preset === "todos" &&
    !appliedPeriodo.de.trim() &&
    !appliedPeriodo.ate.trim()
  );
}

function DetalheCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="whitespace-pre-wrap text-body-md text-on-surface">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export default function AuditoriaPage() {
  const sheetId = useId();
  const { toast } = useToast();
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const [registros, setRegistros] = useState<Auditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [search, setSearch] = useState("");
  const [entidade, setEntidade] = useState("todas");
  const [acao, setAcao] = useState("todas");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedEntidade, setAppliedEntidade] = useState("todas");
  const [appliedAcao, setAppliedAcao] = useState("todas");
  const [periodo, setPeriodo] = useState<PeriodValue>(periodoTodos);
  const [autorId, setAutorId] = useState("todos");
  const [appliedPeriodo, setAppliedPeriodo] = useState<PeriodValue>(periodoTodos);
  const [appliedAutorId, setAppliedAutorId] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [mostrarTecnicos, setMostrarTecnicos] = useState(false);

  const detalhe = detalheId === null ? null : (registros.find((item) => item.id === detalheId) ?? null);

  const recarregarAuditoria = useCallback(async () => {
    if (!sessao) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroCarregamento("");
    try {
      void fetch("/api/usuarios", { credentials: "same-origin" })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = (await response.json()) as { usuarios?: UsuarioPublico[] };
          if (payload.usuarios) void refetch()
        })
        .catch(() => undefined);

      const params = new URLSearchParams();
      if (appliedEntidade !== "todas") params.set("entidade", appliedEntidade);
      if (appliedAcao !== "todas") params.set("acao", appliedAcao);
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedPeriodo.de.trim()) params.set("dataDe", appliedPeriodo.de.trim());
      if (appliedPeriodo.ate.trim()) params.set("dataAte", appliedPeriodo.ate.trim());
      if (appliedAutorId !== "todos") params.set("usuarioId", appliedAutorId);
      const queryString = params.toString();
      const response = await fetch(`/api/auditoria${queryString ? `?${queryString}` : ""}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErroCarregamento(body?.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      const body = (await response.json()) as { auditoria?: Auditoria[] };
      const lista = body.auditoria ?? [];
      void refetch()
      setRegistros(lista);
    } catch {
      setErroCarregamento("Não foi possível carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }, [sessao, appliedEntidade, appliedAcao, appliedSearch, appliedPeriodo, appliedAutorId]);

  useEffect(() => {
    void recarregarAuditoria();
  }, [recarregarAuditoria]);

  const opcoesAutores = Array.from(
    new Map(
      cadastros.usuarios.map((usuario) => [
        usuario.id,
        { value: String(usuario.id), label: rotuloAutorAuditoria(usuario.id) },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const opcoesEntidades = Object.entries(rotuloTipoRegistro)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const visible = [...registros].sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left =
        sortKey === "tipo"
          ? (rotuloTipoRegistro[a.entidade] ?? a.entidade)
          : sortKey === "acao"
            ? rotuloAcao(a.acao)
            : a.dataHora;
      const right =
        sortKey === "tipo"
          ? (rotuloTipoRegistro[b.entidade] ?? b.entidade)
          : sortKey === "acao"
            ? rotuloAcao(b.acao)
            : b.dataHora;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const alteracoes = visible.filter((item) => item.acao === "UPDATE").length;
  const inclusoes = visible.filter((item) => item.acao === "INSERT").length;
  const remocoes = visible.filter((item) => item.acao === "DELETE").length;

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "data" ? "desc" : "asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("data");
    setSortDirection("desc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedEntidade(entidade);
    setAppliedAcao(acao);
    setAppliedPeriodo(periodo);
    setAppliedAutorId(autorId);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setEntidade("todas");
    setAcao("todas");
    setPeriodo(periodoTodos);
    setAutorId("todos");
    setAppliedSearch("");
    setAppliedEntidade("todas");
    setAppliedAcao("todas");
    setAppliedPeriodo(periodoTodos);
    setAppliedAutorId("todos");
    setPage(1);
  }

  function abrirDetalhe(id: number) {
    setMostrarTecnicos(false);
    setDetalheId(id);
  }

  function fecharDetalhe() {
    setDetalheId(null);
    setMostrarTecnicos(false);
  }

  function linhasExportacao() {
    return visible.map((item) => [
      formatarData(item.dataHora),
      rotuloAutorAuditoria(item.usuarioId),
      rotuloTipoRegistro[item.entidade] ?? "Outro cadastro",
      rotuloAcao(item.acao),
      resumoLinha(item),
    ]);
  }

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou aguarde novas movimentações no sistema.",
      });
      return;
    }
    const linhas = linhasExportacao();
    const colunas = [...colunasExportacao];
    const arquivoBase = `historico-alteracoes-${new Date..toISOString().slice(0, 10)}`;
    if (formato === "csv") {
      exportarCsv(`${arquivoBase}.csv`, colunas, linhas);
      toast({ variant: "success", title: "CSV baixado" });
      return;
    }
    if (formato === "xls") {
      exportarExcel(`${arquivoBase}.xls`, colunas, linhas);
      toast({ variant: "success", title: "Planilha baixada" });
      return;
    }
    const abriu = exportarPdf("Histórico de alterações", `${arquivoBase}.html`, [
      { titulo: "Listagem (filtros aplicados)", colunas, linhas },
    ]);
    if (abriu) {
      toast({ variant: "success", title: "PDF", description: "Use imprimir ou salvar como PDF no navegador." });
    } else {
      toast({
        variant: "info",
        title: "Relatório baixado",
        description: "Abra o arquivo HTML e use imprimir para salvar em PDF.",
      });
    }
  }

  const semFiltrosAplicados = filtrosPadraoAplicados(
    appliedSearch,
    appliedEntidade,
    appliedAcao,
    appliedAutorId,
    appliedPeriodo,
  );

  const emptyState = (
    <EmptyState
      icon={<Icon icon={ScrollText} size="lg" />}
      title={semFiltrosAplicados ? "Ainda não há movimentações" : "Nada encontrado com esses filtros"}
      description={
        semFiltrosAplicados
          ? "Quando alguém cadastrar, alterar ou remover informações no sistema, o registro aparece aqui."
          : "Tente outra palavra na busca ou mude o tipo de registro ou o que aconteceu."
      }
    />
  );

  const botaoVer = (item: Auditoria) => (
    <button
      type="button"
      aria-label={`Ver o que mudou em ${formatarData(item.dataHora)}`}
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      onClick={() => abrirDetalhe(item.id)}
    >
      <Icon icon={Eye} size="sm" />
    </button>
  );

  const desktopTable = (
    <Table aria-label="Histórico de alterações" showExport={false}>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Quando
          </TableHead>
          <TableHead>Quem fez</TableHead>
          <TableHead sortable sortDirection={directionFor("tipo")} onSort={() => handleSort("tipo")}>
            Onde
          </TableHead>
          <TableHead sortable sortDirection={directionFor("acao")} onSort={() => handleSort("acao")}>
            O que aconteceu
          </TableHead>
          <TableHead>Resumo</TableHead>
          <TableHead className="w-14">
            <span className="sr-only">Ver detalhes</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataHora)}</TableCell>
              <TableCell>{rotuloAutorAuditoria(item.usuarioId)}</TableCell>
              <TableCell>{rotuloTipoRegistro[item.entidade] ?? "Outro cadastro"}</TableCell>
              <TableCell>
                <Badge variant={badgeAcaoVariant(item.acao)}>{rotuloAcao(item.acao)}</Badge>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate" title={resumoLinha(item)}>{resumoLinha(item)}</TableCell>
              <TableCell align="center" className="w-14 px-sm">
                <div className="flex justify-center">{botaoVer(item)}</div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const mobileTable =
    visible.length === 0 ? (
      <TableMobileEmpty>{emptyState}</TableMobileEmpty>
    ) : (
      <TableMobileList aria-label="Histórico de alterações">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                aria-hidden="true"
              >
                <Icon icon={ScrollText} size="sm" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {rotuloTipoRegistro[item.entidade] ?? "Outro cadastro"}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs text-body-sm tabular-nums text-on-surface-variant">{formatarData(item.dataHora)}</p>
              </div>
              <span className="size-8 shrink-0" aria-hidden="true" />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0 flex-1">
                  <p className="text-label-sm uppercase text-on-surface-variant">Resumo</p>
                  <p className="text-body-md font-medium text-on-surface">{resumoLinha(item)}</p>
                  <p className="mt-xs text-body-sm text-on-surface-variant">{rotuloAutorAuditoria(item.usuarioId)}</p>
                </div>
                <Badge variant={badgeAcaoVariant(item.acao)} className="shrink-0">
                  {rotuloAcao(item.acao)}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 w-full"
                onClick={() => abrirDetalhe(item.id)}
              >
                <Icon icon={Eye} size="sm" aria-hidden />
                Ver o que mudou
              </Button>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={ScrollText}
        title="Histórico de alterações"
        description="Quem alterou o quê no sistema e quando."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        {erroCarregamento ? (
          <p className="mb-md text-body-sm text-error" role="alert">
            {erroCarregamento}
          </p>
        ) : null}
        {carregando && registros.length === 0 ? (
          <SkeletonListPage metrics={3} rows={8} cols={5} label="Carregando histórico" />
        ) : (
          <>
        <section aria-label="Resumo do histórico">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
            <KpiMobileCard
              rotulo="Registros na lista"
              valor={metricValor(visible.length)}
              icon={ScrollText}
              destaque
            />
            <KpiMobileCard rotulo="Alterações" valor={metricValor(alteracoes)} icon={Pencil} />
            <KpiMobileCard
              rotulo="Cadastros e remoções"
              valor={metricValor(inclusoes + remocoes)}
              icon={UserPlus}
            />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
            <CardMetric
              accent="primary"
              rotulo="Registros na lista"
              valor={metricValor(visible.length)}
              detalhe="Com os filtros aplicados"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={ScrollText} size="md" className="text-primary-container" />}
            />
            <CardMetric
              accent="tertiary"
              rotulo="Alterações"
              valor={metricValor(alteracoes)}
              detalhe="Atualizações registradas"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={Pencil} size="md" className="text-tertiary-container" />}
            />
            <CardMetric
              accent="brass"
              rotulo="Cadastros e remoções"
              valor={metricValor(inclusoes + remocoes)}
              detalhe="Inclusões e exclusões"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={UserPlus} size="md" className="text-brass" />}
            />
          </div>
        </section>

        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por RE, resumo ou palavra-chave"
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "periodo",
                label: "Período",
                type: "period",
                value: periodo,
                onChange: setPeriodo,
              },
              {
                id: "autor",
                label: "Quem fez",
                value: autorId,
                onChange: setAutorId,
                options: [{ value: "todos", label: "Todos" }, ...opcoesAutores],
              },
              {
                id: "entidade",
                label: "Tipo de registro",
                value: entidade,
                onChange: setEntidade,
                options: [{ value: "todas", label: "Todos" }, ...opcoesEntidades],
              },
              {
                id: "acao",
                label: "O que aconteceu",
                value: acao,
                onChange: setAcao,
                options: [
                  { value: "todas", label: "Tudo" },
                  ...acoesAuditoria.map((item) => ({ value: item, label: rotuloAcao(item) })),
                ],
              },
            ]}
          />
        </FiltrosSection>

        <section className="flex flex-col gap-md">
          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} onExport={aoExportar} />
        </section>
        {visible.length > 0 ? <Pagination page={currentPage} total={visible.length} onPageChange={setPage} /> : null}
          </>
        )}
      </PageContent>

      <Sheet open={detalhe !== null} onOpenChange={(open) => !open && fecharDetalhe()}>
        <SheetContent aria-labelledby={`${sheetId}-titulo`} aria-describedby={`${sheetId}-desc`}>
          {detalhe ? (
            <>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={ScrollText} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${sheetId}-titulo`}>{resumoLinha(detalhe)}</SheetTitle>
                    <SheetDescription id={`${sheetId}-desc`}>
                      {formatarData(detalhe.dataHora)} · feito por {rotuloAutorAuditoria(detalhe.usuarioId)}
                    </SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                <SheetPanel variant="tint">
                  <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                    <DetalheCampo label="Quando" value={formatarData(detalhe.dataHora)} />
                    <DetalheCampo label="Quem fez" value={rotuloAutorAuditoria(detalhe.usuarioId)} />
                    <DetalheCampo label="Onde" value={rotuloTipoRegistro[detalhe.entidade] ?? "Outro cadastro"} />
                    <DetalheCampo label="O que aconteceu" value={rotuloAcao(detalhe.acao)} />
                    <DetalheCampo label="Código do item" value={detalhe.registroId ? `#${detalhe.registroId}` : "—"} />
                    <DetalheCampo label="Dados que mudaram" value={listaCamposAlterados(detalhe)} />
                  </div>
                </SheetPanel>
                {detalhe.acao !== "INSERT" ? (
                  <SheetPanel>
                    <DetalheCampo label="Como estava antes" value={textoAmigavelDados(detalhe.dadosAnteriores)} />
                  </SheetPanel>
                ) : null}
                {detalhe.acao !== "DELETE" ? (
                  <SheetPanel>
                    <DetalheCampo
                      label={detalhe.acao === "INSERT" ? "O que foi cadastrado" : "Como ficou depois"}
                      value={textoAmigavelDados(detalhe.dadosNovos)}
                    />
                  </SheetPanel>
                ) : null}
                <SheetPanel className="flex flex-col gap-md">
                  <Button type="button" variant="outline" onClick={() => setMostrarTecnicos((atual) => !atual)}>
                    {mostrarTecnicos ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
                  </Button>
                  {mostrarTecnicos ? (
                    <div className="flex flex-col gap-md rounded-md border border-border-subtle bg-surface-subtle p-md">
                      <DetalheCampo label="Identificador interno do tipo" value={detalhe.entidade} />
                      <DetalheCampo label="Código da ação no sistema" value={detalhe.acao} />
                      <DetalheCampo label="Campos (texto original)" value={detalhe.camposAlterados || "—"} />
                      <div className="flex flex-col gap-xs">
                        <p className="text-label-md text-on-surface-variant">Antes (dados brutos)</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-surface-card p-sm text-body-sm text-on-surface">
                          {textoTecnicoFormatado(detalhe.dadosAnteriores)}
                        </pre>
                      </div>
                      <div className="flex flex-col gap-xs">
                        <p className="text-label-md text-on-surface-variant">Depois (dados brutos)</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-surface-card p-sm text-body-sm text-on-surface">
                          {textoTecnicoFormatado(detalhe.dadosNovos)}
                        </pre>
                      </div>
                      {detalhe.ip || detalhe.userAgent ? (
                        <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                          <DetalheCampo label="Endereço de rede (IP)" value={detalhe.ip || "—"} />
                          <DetalheCampo label="Navegador ou aplicativo" value={detalhe.userAgent || "—"} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </SheetPanel>
              </SheetBody>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={fecharDetalhe}>
                  Fechar
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </WorkspaceShell>
  );
}