"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, FileUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  ResponsiveTable,
  Table,
  TableActionsButton,
  TableActionsCell,
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
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  formatarData,
  nomeUsuario,
  tiposImportacao,
  type Importacao,
} from "@/data/catalogo";
import { moduloWizardValido, type ModuloWizardImportacao } from "@/lib/importacoes/config-wizard-importacao";
import { aplicarImportacaoExcluida, sincronizarImportacoesDoServidor } from "@/lib/importacoes/sync-cliente";
import { ImportacaoHistoricoDetalheSheet } from "@/components/importacao-historico/importacao-historico-detalhe-sheet";
import {
  ImportacaoWizardSheet,
  type ImportacaoWizardHandle,
} from "@/components/importacao-wizard/importacao-wizard-sheet";
import type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-auditoria";
import type { RetomadaImportacaoHistorico } from "@/lib/importacoes/historico-service";
import {
  SITUACOES_IMPORTACAO,
  badgeVariantSituacaoImportacao,
  normalizarSituacaoImportacao,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";

const rotuloTipo: Record<string, string> = {
  debitos: "Débitos",
  condominios: "Condomínios",
  responsaveis: "Responsáveis",
  unidades: "Unidades",
};
function rotuloStatusBadge(status: string) {
  return rotuloSituacaoImportacao(status);
}
function variantStatusBadge(status: string) {
  return badgeVariantSituacaoImportacao(status);
}
type SortKey = "data" | "arquivo" | "status";

export default function ImportacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { pode } = usePermissao();
  const podeIniciarImportacao = pode("importacoes", "criar");
  const wizardRef = useRef<ImportacaoWizardHandle>(null);
  const cadastros = useCadastros();
  const importacoes = cadastros.importacoes;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedTipo, setAppliedTipo] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Importacao | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheCarregando, setDetalheCarregando] = useState(false);
  const [detalheImportacao, setDetalheImportacao] = useState<ImportacaoConsulta | null>(null);
  const [retomadaDetalhe, setRetomadaDetalhe] = useState<RetomadaImportacaoHistorico | null>(null);
  const [retomandoDetalhe, setRetomandoDetalhe] = useState(false);

  const recarregarImportacoes = useCallback(async () => {
    try {
      const response = await fetch("/api/importacoes", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { importacoes?: Importacao[] };
      if (body.importacoes) sincronizarImportacoesDoServidor(body.importacoes);
    } catch {
      /* mantém catálogo local */
    }
  }, []);

  useEffect(() => {
    void recarregarImportacoes();
  }, [recarregarImportacoes]);

  useEffect(() => {
    if (!searchParams) return;
    const moduloParam = searchParams.get("modulo");
    const abrir = searchParams.get("abrir") === "1";
    if (moduloParam && moduloWizardValido(moduloParam) && abrir && pode("importacoes", "criar")) {
      wizardRef.current?.abrir(moduloParam);
      router.replace("/importacoes", { scroll: false });
    }
  }, [searchParams, pode, router]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = importacoes
    .filter((item) => {
      const matchesStatus =
        appliedStatus === "todos" || normalizarSituacaoImportacao(item.status) === normalizarSituacaoImportacao(appliedStatus);
      const matchesTipo = appliedTipo === "todos" || item.tipo === appliedTipo;
      const haystack = `${item.arquivo} ${item.origem} ${item.observacaoInterna}`.toLocaleLowerCase("pt-BR");
      return matchesStatus && matchesTipo && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "arquivo" ? a.arquivo : sortKey === "status" ? a.status : a.dataImportacao;
      const right = sortKey === "arquivo" ? b.arquivo : sortKey === "status" ? b.status : b.dataImportacao;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const concluidas = visible.filter((item) => {
    const s = normalizarSituacaoImportacao(item.status);
    return s === "Concluida" || s === "Concluida parcialmente" || s === "Aprovada";
  }).length;
  const comErro = visible.filter((item) => normalizarSituacaoImportacao(item.status) === "Falhou").length;
  const metricValor = (n: number) => String(n).padStart(2, "0");

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
    setAppliedStatus(status);
    setAppliedTipo(tipo);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setStatus("todos");
    setTipo("todos");
    setAppliedSearch("");
    setAppliedStatus("todos");
    setAppliedTipo("todos");
    setPage(1);
  }

  function openCreate(modulo: ModuloWizardImportacao = "debitos") {
    wizardRef.current?.abrir(modulo);
  }

  async function excluirImportacaoHistorico(id: number) {
    const response = await fetch(`/api/importacoes/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "Não foi possível excluir.");
    }
    aplicarImportacaoExcluida(id);
    if (detalheImportacao?.id === id) {
      setDetalheOpen(false);
      setDetalheImportacao(null);
      setRetomadaDetalhe(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await excluirImportacaoHistorico(deleteTarget.id);
      toast({ variant: "success", title: "Importação excluída" });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "error",
        title: "Não foi possível excluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function abrirDetalhe(item: Importacao) {
    setDetalheOpen(true);
    setDetalheCarregando(true);
    setDetalheImportacao(null);
    setRetomadaDetalhe(null);
    try {
      const response = await fetch(`/api/importacoes/${item.id}`, { credentials: "same-origin" });
      const body = (await response.json()) as {
        importacao?: ImportacaoConsulta;
        retomada?: RetomadaImportacaoHistorico;
        error?: string;
      };
      if (response.ok && body.importacao) {
        setDetalheImportacao(body.importacao);
        setRetomadaDetalhe(body.retomada ?? null);
      } else {
        toast({ variant: "error", title: "Detalhe indisponível", description: body.error ?? "Tente novamente." });
        setDetalheOpen(false);
      }
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível carregar o histórico." });
      setDetalheOpen(false);
    } finally {
      setDetalheCarregando(false);
    }
  }

  async function retomarImportacaoDoDetalhe() {
    if (!retomadaDetalhe?.disponivel || !moduloWizardValido(retomadaDetalhe.modulo)) return;
    setRetomandoDetalhe(true);
    setDetalheOpen(false);
    try {
      await wizardRef.current?.retomar(retomadaDetalhe);
    } finally {
      setRetomandoDetalhe(false);
    }
  }

  function solicitarExclusaoDetalhe() {
    if (!detalheImportacao) return;
    setDetalheOpen(false);
    setDeleteTarget({
      id: detalheImportacao.id,
      origem: detalheImportacao.origem,
      tipo: detalheImportacao.tipo,
      arquivo: detalheImportacao.arquivo,
      status: detalheImportacao.status,
      quantidadeRegistros: detalheImportacao.quantidadeRegistros,
      quantidadeImportados: detalheImportacao.quantidadeImportados,
      quantidadeAtualizados: detalheImportacao.quantidadeAtualizados,
      quantidadeErros: detalheImportacao.quantidadeErros,
      observacaoInterna: detalheImportacao.observacaoInterna,
      usuarioId: detalheImportacao.usuarioId,
      dataImportacao: detalheImportacao.dataImportacao,
      processoId: detalheImportacao.processoId,
      quantidadeIgnorados: detalheImportacao.quantidadeIgnorados,
      iniciadoEm: detalheImportacao.iniciadoEm,
      usuarioAprovacaoId: detalheImportacao.usuarioAprovacaoId ?? undefined,
      aprovadoEm: detalheImportacao.aprovadoEm ?? undefined,
    });
  }

  function acoes(item: Importacao) {
    const lista = [];
    if (pode("importacoes", "ler"))
      lista.push({ label: "Ver detalhes", icon: Eye, onSelect: () => void abrirDetalhe(item) });
    if (pode("importacoes", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={FileUp} size="lg" />}
      title={importacoes.length === 0 ? "Nenhuma importação registrada" : "Nenhuma importação encontrada"}
      description={
        importacoes.length === 0
          ? "Envie o relatório de inadimplência (CSV ou XLS) da administradora para alimentar os débitos."
          : "Ajuste a busca, o tipo ou a situação."
      }
      action={
        podeIniciarImportacao ? (
          <Button size="sm" onClick={() => openCreate("debitos")}>
            <Icon icon={Plus} size="sm" />
            Nova importação
          </Button>
        ) : undefined
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Importações">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Data
          </TableHead>
          <TableHead sortable sortDirection={directionFor("arquivo")} onSort={() => handleSort("arquivo")}>
            Arquivo
          </TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Situação
          </TableHead>
          <TableHead align="right">Erros</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataImportacao)}</TableCell>
              <TableCell>{item.arquivo || "—"}</TableCell>
              <TableCell>{rotuloTipo[item.tipo] ?? item.tipo}</TableCell>
              <TableCell>
                <Badge variant={variantStatusBadge(item.status)}>{rotuloStatusBadge(item.status)}</Badge>
              </TableCell>
              <TableCell align="right" className="tabular-nums">
                {item.quantidadeErros || "—"}
              </TableCell>
              <TableActionsCell label={`Ações da importação ${item.arquivo || item.id}`} actions={acoes(item)} />
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
      <TableMobileList aria-label="Importações">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                aria-hidden="true"
              >
                <Icon icon={FileUp} size="sm" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {item.arquivo || rotuloTipo[item.tipo] || "Importação"}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">{item.origem || "—"}</p>
              </div>
              <TableActionsButton label={`Ações da importação ${item.arquivo || item.id}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Tipo</p>
                  <p className="text-body-md font-semibold text-on-surface">{rotuloTipo[item.tipo] ?? item.tipo}</p>
                  <p className="text-body-sm text-on-surface-variant">{nomeUsuario(item.usuarioId)}</p>
                </div>
                <Badge variant={variantStatusBadge(item.status)} className="shrink-0">
                  {rotuloStatusBadge(item.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Data</p>
                  <p className="text-body-md text-on-surface">{formatarData(item.dataImportacao)}</p>
                </div>
                <div className="min-w-0 text-end">
                  <p className="text-label-sm uppercase text-on-surface-variant">Erros</p>
                  <p className="text-body-md tabular-nums text-on-surface">{item.quantidadeErros || "—"}</p>
                </div>
              </div>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={FileUp}
        title="Importações"
        description="Central de importação: inadimplência, condomínios, unidades e responsáveis — com validação, prévia e aprovação antes de gravar."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
        actions={
          podeIniciarImportacao ? (
            <Button size="md" onClick={() => openCreate("debitos")}>
              <Icon icon={Plus} size="sm" />
              Nova importação
            </Button>
          ) : undefined
        }
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        <section aria-label="Resumo de importações">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
            <KpiMobileCard
              rotulo="Importações"
              valor={metricValor(visible.length)}
              icon={FileUp}
              destaque
            />
            <KpiMobileCard rotulo="Concluídas" valor={metricValor(concluidas)} icon={CheckCircle2} />
            <KpiMobileCard rotulo="Com erro" valor={metricValor(comErro)} icon={AlertTriangle} />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
            <CardMetric
              accent="primary"
              rotulo="Importações"
              valor={metricValor(visible.length)}
              detalhe="Com os filtros aplicados"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={FileUp} size="md" className="text-primary-container" />}
            />
            <CardMetric
              accent="tertiary"
              rotulo="Concluídas"
              valor={metricValor(concluidas)}
              detalhe="Finalizadas com sucesso"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={CheckCircle2} size="md" className="text-tertiary-container" />}
            />
            <CardMetric
              accent="critical"
              rotulo="Com erro"
              valor={metricValor(comErro)}
              detalhe="Falharam no processamento"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={AlertTriangle} size="md" className="text-status-critical" />}
            />
          </div>
        </section>

        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar importação..."
            onApply={handleApply}
            onClear={handleClear}
            defaultMobile="grid"
            fields={[
              {
                id: "tipo",
                label: "Tipo",
                value: tipo,
                onChange: setTipo,
                options: [
                  { value: "todos", label: "Todos" },
                  ...tiposImportacao.map((item) => ({ value: item, label: rotuloTipo[item] ?? item })),
                ],
              },
              {
                id: "situacao",
                label: "Situação",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "todos", label: "Todas" },
                  ...SITUACOES_IMPORTACAO.map((item) => ({ value: item, label: rotuloSituacaoImportacao(item) })),
                ],
              },
            ]}
          />
        </FiltrosSection>

        <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
        {visible.length > 0 ? <Pagination page={currentPage} total={visible.length} onPageChange={setPage} /> : null}
      </PageContent>

      <ImportacaoWizardSheet ref={wizardRef} onHistoricoAtualizado={() => void recarregarImportacoes()} />
      <ImportacaoHistoricoDetalheSheet
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        importacao={detalheImportacao}
        carregando={detalheCarregando}
        retomada={retomadaDetalhe}
        podeExcluir={pode("importacoes", "excluir")}
        onRetomar={() => void retomarImportacaoDoDetalhe()}
        onExcluir={solicitarExclusaoDetalhe}
        retomando={retomandoDetalhe}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir importação?"
        description="O histórico deste arquivo será removido. Os registros já gravados permanecem."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
