"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Clock,
  Handshake,
  History,
  ListOrdered,
  RotateCcw,
  Share2,
  User,
} from "lucide-react";
import { DistribuicaoAutomaticaPanel } from "@/components/atendimentos/distribuicao-automatica-panel";
import { PropostaNegociacaoSheet } from "@/components/negociacoes/proposta-negociacao-sheet";
import { HistoricoUnidadeSheet } from "@/components/unidades/historico-unidade-sheet";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { Checkbox, FormField, Select, Textarea } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import {
  ResponsiveTable,
  Table,
  TableActionsCell,
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
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import {
  escopoCondominios,
  formatarData,
  nomeCondominio,
  situacoesUnidade,
  type Atendimento,
  type AtribuicaoCobranca,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import {
  colunasFilaExport,
  exportarListagem,
  linhasFilaExport,
} from "@/lib/atendimentos/exportar-listagem";
import { aplicarAtendimentoSalvo } from "@/lib/atendimentos/sync-cliente";
import { formatarMomentoAtividade } from "@/lib/fila/formatar-atividade-recente";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { FilaCobrancaItem, FilaCobrancaResumo, FilaOrdenacaoCampo } from "@/lib/fila/service";
import { aplicarSnapshotAtribuicoes } from "@/lib/distribuicao/sync-cliente";
import type { HistoricoAtribuicaoItem } from "@/lib/distribuicao/service";

const retornoOpcoes = [
  { value: "todos", label: "Todos" },
  { value: "atrasado", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "sem", label: "Sem retorno" },
] as const;

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} - ${item.bloco}`;
  return item.identificacao;
}

function CelulaProximoRetorno({ data }: { data: string | null }) {
  const texto = formatarProximoRetorno(data);
  if (!data?.trim() || texto === "—") {
    return <span className="text-on-surface-variant">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-sm text-body-md text-on-surface">
      <CalendarClock className="size-4 shrink-0 text-on-surface-variant" aria-hidden />
      {texto}
    </span>
  );
}

export function FilaCobrancasPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");
  const podeImportar = pode("importacoes", "criar");
  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<FilaCobrancaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<FilaCobrancaResumo>({ emCobranca: 0, semResponsavel: 0, retornosHoje: 0 });
  const [atividade, setAtividade] = useState<HistoricoAtribuicaoItem[]>([]);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [condominioId, setCondominioId] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [filtroRe, setFiltroRe] = useState("todos");
  const [retorno, setRetorno] = useState("todos");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedSituacao, setAppliedSituacao] = useState("todos");
  const [appliedFiltroRe, setAppliedFiltroRe] = useState("todos");
  const [appliedRetorno, setAppliedRetorno] = useState("todos");

  const [sortKey, setSortKey] = useState<FilaOrdenacaoCampo | null>(null);
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");

  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [sheetAtribuirOpen, setSheetAtribuirOpen] = useState(false);
  const [codigoReAtribuir, setCodigoReAtribuir] = useState("");
  const [motivoAtribuir, setMotivoAtribuir] = useState("");
  const [salvandoAtribuir, setSalvandoAtribuir] = useState(false);

  const [historicoUnidadeId, setHistoricoUnidadeId] = useState<number | null>(null);
  const [historicoRotulo, setHistoricoRotulo] = useState<{ unidade: string; condominio: string } | null>(null);
  const [propostaContexto, setPropostaContexto] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);
  const [concluirAtendimentoId, setConcluirAtendimentoId] = useState<string | null>(null);

  const atendentesKey = snapshotAtendentesComRe();
  const atendentes = useMemo(() => listarAtendentesComRe(), [atendentesKey]);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, user?.userId).filter((item) => item.status === "Ativo"),
    [cadastros, user?.userId],
  );

  const situacoesFila = useMemo(
    () => situacoesUnidade.filter((item) => item !== "Sem cobrança" && item !== "Quitada"),
    [],
  );

  const aplicarQueryInicial = useCallback(() => {
    const retornoQuery = searchParams?.get("retorno");
    if (retornoQuery && retornoOpcoes.some((item) => item.value === retornoQuery)) {
      setRetorno(retornoQuery);
      setAppliedRetorno(retornoQuery);
    }
    const abaLegada = searchParams?.get("aba");
    if (abaLegada === "retornos") {
      setRetorno("hoje");
      setAppliedRetorno("hoje");
    }
  }, [searchParams]);

  useEffect(() => {
    aplicarQueryInicial();
  }, [aplicarQueryInicial]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (appliedRetorno !== "todos") params.set("retorno", appliedRetorno);
      if (visaoGeral && appliedFiltroRe === "sem") {
        params.set("semResponsavel", "1");
      } else if (visaoGeral && appliedFiltroRe !== "todos") {
        const atendente = listarAtendentesComRe().find((item) => item.codigoRe === appliedFiltroRe);
        if (atendente) params.set("atendente", String(atendente.id));
      }
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("order", sortDirection);
      }

      const requests: Promise<Response>[] = [fetch(`/api/fila?${params}`, { credentials: "same-origin" })];
      if (visaoGeral) {
        requests.push(fetch("/api/distribuicao/historico?limit=5", { credentials: "same-origin" }));
      }

      const [filaRes, historicoRes] = await Promise.all(requests);
      const payload = (await filaRes.json()) as {
        error?: string;
        itens?: FilaCobrancaItem[];
        total?: number;
        resumo?: FilaCobrancaResumo;
      };
      if (!filaRes.ok) throw new Error(payload.error ?? "Falha ao carregar a fila.");
      setItens(payload.itens ?? []);
      setTotal(payload.total ?? 0);
      setResumo(payload.resumo ?? { emCobranca: 0, semResponsavel: 0, retornosHoje: 0 });

      if (historicoRes) {
        const historicoPayload = (await historicoRes.json()) as { historico?: HistoricoAtribuicaoItem[] };
        setAtividade(historicoPayload.historico ?? []);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar dados.");
      setItens([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [
    appliedCondominioId,
    appliedFiltroRe,
    appliedRetorno,
    appliedSearch,
    appliedSituacao,
    atendentesKey,
    atribuicoesKey,
    page,
    sortDirection,
    sortKey,
    visaoGeral,
  ]);

  function directionFor(key: FilaOrdenacaoCampo): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function alternarOrdenacao(key: FilaOrdenacaoCampo) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      setPage(1);
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      setPage(1);
      return;
    }
    setSortKey(null);
    setSortDirection("asc");
    setPage(1);
  }

  useEffect(() => {
    void recarregar();
  }, [recarregar, user?.userId]);

  const idsPagina = itens.map((item) => item.unidadeId);
  const allSelected = idsPagina.length > 0 && idsPagina.every((id) => selecionadas.has(id));
  const someSelected = idsPagina.some((id) => selecionadas.has(id)) && !allSelected;

  function toggleAll(checked: boolean) {
    setSelecionadas((current) => {
      const next = new Set(current);
      if (checked) idsPagina.forEach((id) => next.add(id));
      else idsPagina.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleUnidade(unidadeId: number, checked: boolean) {
    setSelecionadas((current) => {
      const next = new Set(current);
      if (checked) next.add(unidadeId);
      else next.delete(unidadeId);
      return next;
    });
  }

  function sincronizarQueryRetorno(valorRetorno: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("aba");
    if (valorRetorno !== "todos") params.set("retorno", valorRetorno);
    else params.delete("retorno");
    const qs = params.toString();
    router.replace(qs ? `/atendimentos?${qs}` : "/atendimentos", { scroll: false });
  }

  function aplicarFiltros() {
    setAppliedSearch(search);
    setAppliedCondominioId(condominioId);
    setAppliedSituacao(situacao);
    setAppliedFiltroRe(filtroRe);
    setAppliedRetorno(retorno);
    setPage(1);
    sincronizarQueryRetorno(retorno);
  }

  function limparFiltros() {
    setSearch("");
    setCondominioId("todos");
    setSituacao("todos");
    setFiltroRe("todos");
    setRetorno("todos");
    setAppliedSearch("");
    setAppliedCondominioId("todos");
    setAppliedSituacao("todos");
    setAppliedFiltroRe("todos");
    setAppliedRetorno("todos");
    setPage(1);
    sincronizarQueryRetorno("todos");
  }

  function registrarAtendimento(unidadeId: number) {
    router.push(`/atendimentos?novo=1&unidade=${unidadeId}`);
  }

  function abrirHistorico(item: FilaCobrancaItem) {
    setHistoricoRotulo({
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId),
    });
    setHistoricoUnidadeId(item.unidadeId);
  }

  function abrirProposta(item: FilaCobrancaItem) {
    setPropostaContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId),
    });
  }

  function acoesLinha(item: FilaCobrancaItem) {
    const lista: Array<{
      label: string;
      icon: typeof History;
      onSelect: () => void;
      destructive?: boolean;
    }> = [];
    if (pode("atendimentos", "ler")) {
      lista.push({ label: "Histórico", icon: History, onSelect: () => abrirHistorico(item) });
    }
    if (pode("atendimentos", "criar")) {
      lista.push({ label: "Registrar contato", icon: ClipboardList, onSelect: () => registrarAtendimento(item.unidadeId) });
      lista.push({ label: "Proposta", icon: Handshake, onSelect: () => abrirProposta(item) });
    }
    if (
      pode("atendimentos", "editar") &&
      item.proximoRetornoAtendimentoId &&
      item.retornoSituacao !== "concluido"
    ) {
      lista.push({
        label: "Concluir retorno",
        icon: Check,
        onSelect: () => setConcluirAtendimentoId(item.proximoRetornoAtendimentoId),
      });
    }
    if (visaoGeral && selecionadas.size === 0) {
      lista.push({
        label: "Atribuir responsável",
        icon: Share2,
        onSelect: () => {
          setSelecionadas(new Set([item.unidadeId]));
          setSheetAtribuirOpen(true);
        },
      });
    }
    return lista;
  }

  async function confirmarConcluirRetorno() {
    if (!concluirAtendimentoId) return;
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(concluirAtendimentoId)}/concluir-retorno`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; atendimento?: { id: string } };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir o retorno.");
      if (payload.atendimento) {
        aplicarAtendimentoSalvo(payload.atendimento as Atendimento, "UPDATE");
      }
      toast({ variant: "success", title: "Retorno concluído" });
      setConcluirAtendimentoId(null);
      void recarregar();
    } catch (error) {
      toast({
        variant: "error",
        title: "Falha ao concluir retorno",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function confirmarAtribuicaoManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selecionadas.size === 0 || !codigoReAtribuir) {
      toast({ variant: "error", title: "Selecione unidades e o RE do atendente." });
      return;
    }
    setSalvandoAtribuir(true);
    try {
      const response = await fetch("/api/distribuicao/atribuicoes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeIds: [...selecionadas],
          codigoRe: codigoReAtribuir,
          motivo: motivoAtribuir.trim(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        detalhes?: string[];
        atribuidas?: number;
        atribuicoesCobranca?: AtribuicaoCobranca[];
      };
      if (!response.ok) {
        const detalhe = payload.detalhes?.length ? ` ${payload.detalhes.join(" ")}` : "";
        throw new Error((payload.error ?? "Falha na atribuição.") + detalhe);
      }
      if (payload.atribuicoesCobranca) aplicarSnapshotAtribuicoes(payload.atribuicoesCobranca);
      toast({ variant: "success", title: `${payload.atribuidas ?? 0} cobrança(s) atribuída(s)` });
      setSheetAtribuirOpen(false);
      setSelecionadas(new Set());
      setMotivoAtribuir("");
      void recarregar();
    } catch (error) {
      toast({
        variant: "error",
        title: "Não foi possível atribuir",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvandoAtribuir(false);
    }
  }

  function montarParamsFila(pageSize: number) {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
    if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
    if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
    if (appliedRetorno !== "todos") params.set("retorno", appliedRetorno);
    if (visaoGeral && appliedFiltroRe === "sem") {
      params.set("semResponsavel", "1");
    } else if (visaoGeral && appliedFiltroRe !== "todos") {
      const atendente = listarAtendentesComRe().find((item) => item.codigoRe === appliedFiltroRe);
      if (atendente) params.set("atendente", String(atendente.id));
    }
    if (sortKey) {
      params.set("sort", sortKey);
      params.set("order", sortDirection);
    }
    return params;
  }

  async function aoExportar(formato: TableExportFormat) {
    try {
      const response = await fetch(`/api/fila?${montarParamsFila(10_000)}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; itens?: FilaCobrancaItem[]; total?: number };
      if (!response.ok) {
        toast({ variant: "error", title: "Exportação falhou", description: payload.error });
        return;
      }
      const linhas = linhasFilaExport(payload.itens ?? [], nomeCondominio, formatarData);
      const base = `fila-cobrancas-${new Date().toISOString().slice(0, 10)}`;
      exportarListagem(toast, formato, "Fila de cobranças", base, colunasFilaExport, linhas);
    } catch {
      toast({ variant: "error", title: "Erro ao exportar", description: "Tente novamente." });
    }
  }

  function abrirImportacao() {
    router.push("/importacoes");
  }

  if (erro) {
    return (
      <EmptyState
        title="Não foi possível carregar"
        description={erro}
        action={
          <Button type="button" onClick={() => void recarregar()}>
            Tentar de novo
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3" aria-label="Indicadores da fila">
        <CardMetric
          accent="brass"
          iconClassName="bg-gold-subtle text-brass"
          icon={<Icon icon={Clock} size="md" className="text-brass" />}
          rotulo="Em cobrança"
          valor={carregando ? "—" : String(resumo.emCobranca)}
        />
        <CardMetric
          accent="primary"
          iconClassName="bg-primary-fixed/50 text-primary-container"
          icon={<Icon icon={User} size="md" className="text-primary-container" />}
          rotulo="Sem responsável"
          valor={carregando ? "—" : String(resumo.semResponsavel)}
        />
        <CardMetric
          accent="tertiary"
          iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
          icon={<Icon icon={RotateCcw} size="md" className="text-tertiary-container" />}
          rotulo="Retornos hoje"
          valor={carregando ? "—" : String(resumo.retornosHoje)}
        />
      </div>

      <FilterBar
        variant="toolbar"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Condomínio, unidade ou RE"
        onApply={aplicarFiltros}
        onClear={limparFiltros}
        fields={[
          {
            id: "condominio",
            label: "Condomínio",
            value: condominioId,
            onChange: setCondominioId,
            options: [{ value: "todos", label: "Todos" }, ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome }))],
          },
          {
            id: "situacao",
            label: "Situação",
            value: situacao,
            onChange: setSituacao,
            options: [{ value: "todos", label: "Todas" }, ...situacoesFila.map((item) => ({ value: item, label: item }))],
          },
          ...(visaoGeral
            ? [
                {
                  id: "re",
                  label: "Responsável",
                  value: filtroRe,
                  onChange: setFiltroRe,
                  options: [
                    { value: "todos", label: "Todos" },
                    { value: "sem", label: "Sem responsável" },
                    ...atendentes.map((item) => ({ value: item.codigoRe, label: item.codigoRe })),
                  ],
                },
              ]
            : []),
          {
            id: "retorno",
            label: "Retorno",
            value: retorno,
            onChange: setRetorno,
            options: retornoOpcoes.map((item) => ({ value: item.value, label: item.label })),
          },
        ]}
      />

      {visaoGeral ? (
        <DistribuicaoAutomaticaPanel refreshKey={atribuicoesKey} onDistribuido={() => void recarregar()} />
      ) : null}

      {carregando ? (
        <p className="text-body-md text-on-surface-variant">Carregando fila de cobranças…</p>
      ) : total === 0 ? (
        <>
          <ResponsiveTable
            onExport={(formato) => void aoExportar(formato)}
            onImport={abrirImportacao}
            showImport={podeImportar}
            desktop={
              <Table aria-label="Fila de cobranças" showExport={false}>
                <TableBody>
                  <TableEmpty colSpan={visaoGeral ? 9 : 8}>
                    <EmptyState
                      icon={<Icon icon={ListOrdered} size="lg" className="text-on-surface-variant" />}
                      title="Fila vazia"
                      description="Não há unidades em cobrança ativa com os filtros aplicados."
                    />
                  </TableEmpty>
                </TableBody>
              </Table>
            }
            mobile={<TableMobileEmpty>Nenhuma cobrança na fila.</TableMobileEmpty>}
          />
        </>
      ) : (
        <>
          {visaoGeral && selecionadas.size > 0 ? (
            <div className="flex flex-wrap items-center gap-sm">
              <Button type="button" size="sm" onClick={() => setSheetAtribuirOpen(true)}>
                <Icon icon={Share2} size="sm" />
                Atribuir selecionadas ({selecionadas.size})
              </Button>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
            <ResponsiveTable
              onExport={(formato) => void aoExportar(formato)}
              onImport={abrirImportacao}
              showImport={podeImportar}
              desktop={
                <Table
                  aria-label="Fila de cobranças ativas"
                  showExport={false}
                  containerClassName="rounded-none border-0 shadow-none"
                >
                  <TableHeader className="bg-[#E8EEF7]">
                    <TableRow className="border-b border-border-subtle hover:bg-transparent">
                      {visaoGeral ? (
                        <TableHead
                          selection
                          selectionChecked={allSelected}
                          selectionIndeterminate={someSelected}
                          selectionLabel="Selecionar todas nesta página"
                          onSelectionChange={toggleAll}
                        />
                      ) : null}
                      <TableHead
                        sortable
                        sortDirection={directionFor("condominio")}
                        onSort={() => alternarOrdenacao("condominio")}
                      >
                        Condomínio
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("unidade")}
                        onSort={() => alternarOrdenacao("unidade")}
                      >
                        Unidade
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("inadimplencia")}
                        onSort={() => alternarOrdenacao("inadimplencia")}
                      >
                        Inadimplência
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("situacao")}
                        onSort={() => alternarOrdenacao("situacao")}
                      >
                        Situação
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("re")}
                        onSort={() => alternarOrdenacao("re")}
                      >
                        RE responsável
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("ultimoAtendimento")}
                        onSort={() => alternarOrdenacao("ultimoAtendimento")}
                      >
                        Último atendimento
                      </TableHead>
                      <TableHead
                        sortable
                        sortDirection={directionFor("proximoRetorno")}
                        onSort={() => alternarOrdenacao("proximoRetorno")}
                      >
                        Próximo retorno
                      </TableHead>
                      <TableHead actions />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.unidadeId}>
                        {visaoGeral ? (
                          <TableCell align="center" className="w-12">
                            <div className="flex justify-center">
                              <Checkbox
                                aria-label={`Selecionar ${rotuloUnidade(item)}`}
                                checked={selecionadas.has(item.unidadeId)}
                                onChange={(event) => toggleUnidade(item.unidadeId, event.target.checked)}
                              />
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell className="text-on-surface">{nomeCondominio(item.condominioId)}</TableCell>
                        <TableCell className="font-medium text-on-surface">{rotuloUnidade(item)}</TableCell>
                        <TableCell>
                          {item.valorInadimplencia ? (
                            <span className="font-semibold text-on-surface">{item.valorInadimplencia}</span>
                          ) : (
                            "—"
                          )}
                          {item.diasAtrasoMax > 0 ? (
                            <span className="mt-xs block text-body-sm text-on-surface-variant">
                              {item.diasAtrasoMax} dias em atraso
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <BadgeSituacaoCobranca situacao={item.situacao} />
                        </TableCell>
                        <TableCell className="text-on-surface">
                          {item.codigoRe ?? <span className="text-on-surface-variant">Sem responsável</span>}
                        </TableCell>
                        <TableCell className="text-on-surface-variant">
                          {item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—"}
                        </TableCell>
                        <TableCell>
                          <CelulaProximoRetorno data={item.proximoRetorno} />
                        </TableCell>
                        <TableActionsCell label={`Ações da cobrança ${rotuloUnidade(item)}`} actions={acoesLinha(item)} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
              mobile={
              <TableMobileList aria-label="Fila de cobranças">
                {itens.map((item) => (
                  <TableMobileCard key={item.unidadeId}>
                    <TableMobileCardHeader>
                      {visaoGeral ? (
                        <Checkbox
                          aria-label={`Selecionar ${rotuloUnidade(item)}`}
                          checked={selecionadas.has(item.unidadeId)}
                          onChange={(event) => toggleUnidade(item.unidadeId, event.target.checked)}
                        />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <TableMobileTitle>
                        {nomeCondominio(item.condominioId)} · {rotuloUnidade(item)}
                      </TableMobileTitle>
                    </TableMobileCardHeader>
                    <TableMobileFields>
                      <TableMobileField label="Inadimplência">{item.valorInadimplencia ?? "—"}</TableMobileField>
                      <TableMobileField label="Situação">
                        <BadgeSituacaoCobranca situacao={item.situacao} />
                      </TableMobileField>
                      <TableMobileField label="RE">{item.codigoRe ?? "Sem responsável"}</TableMobileField>
                      <TableMobileField label="Retorno">{formatarProximoRetorno(item.proximoRetorno)}</TableMobileField>
                    </TableMobileFields>
                    <div className="mt-sm flex flex-col gap-xs">
                      {acoesLinha(item).map((acao) => (
                        <Button key={acao.label} type="button" variant="outline" size="sm" className="w-full" onClick={acao.onSelect}>
                          {acao.label}
                        </Button>
                      ))}
                    </div>
                  </TableMobileCard>
                ))}
              </TableMobileList>
              }
            />
            <div className="border-t border-border-subtle px-md py-md">
              <Pagination page={page} total={total} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {visaoGeral && atividade.length > 0 ? (
        <section aria-labelledby="atividade-recente-titulo" className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <h2 id="atividade-recente-titulo" className="mb-md flex items-center gap-sm text-title-sm text-on-surface">
            <Icon icon={Clock} size="sm" className="text-on-surface-variant" />
            Atividade recente
          </h2>
          <ul className="flex flex-col gap-sm">
            {atividade.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-sm text-body-sm">
                <span className="text-on-surface">
                  Unidade {item.identificacaoUnidade} atribuída para {item.codigoReAtual}
                </span>
                <time className="shrink-0 text-on-surface-variant" dateTime={item.atribuidoEm}>
                  {formatarMomentoAtividade(item.atribuidoEm)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HistoricoUnidadeSheet
        unidadeId={historicoUnidadeId}
        tituloUnidade={historicoRotulo?.unidade}
        tituloCondominio={historicoRotulo?.condominio}
        onClose={() => {
          setHistoricoUnidadeId(null);
          setHistoricoRotulo(null);
        }}
      />
      <PropostaNegociacaoSheet
        unidadeId={propostaContexto?.unidadeId ?? null}
        condominioId={propostaContexto?.condominioId ?? null}
        tituloUnidade={propostaContexto?.unidade}
        tituloCondominio={propostaContexto?.condominio}
        onClose={() => setPropostaContexto(null)}
      />

      <ConfirmDialog
        open={concluirAtendimentoId !== null}
        onOpenChange={(open) => {
          if (!open) setConcluirAtendimentoId(null);
        }}
        title="Concluir retorno agendado?"
        description="O retorno será marcado como realizado. A data prevista permanece no histórico."
        confirmLabel="Concluir"
        cancelLabel="Cancelar"
        onConfirm={() => void confirmarConcluirRetorno()}
      />

      <Sheet open={sheetAtribuirOpen} onOpenChange={setSheetAtribuirOpen}>
        <SheetContent aria-labelledby="atribuir-sheet-title">
          <SheetForm onSubmit={confirmarAtribuicaoManual}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={Share2} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id="atribuir-sheet-title">Atribuir cobranças</SheetTitle>
                  <SheetDescription>{selecionadas.size} unidade(s) selecionada(s).</SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormField label="RE do atendente" htmlFor="fila-atribuir-re" required>
                <Select id="fila-atribuir-re" value={codigoReAtribuir} onChange={(event) => setCodigoReAtribuir(event.target.value)}>
                  <option value="">Selecione</option>
                  {atendentes.map((item) => (
                    <option key={item.id} value={item.codigoRe}>
                      {item.codigoRe}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Motivo (opcional)" htmlFor="fila-atribuir-motivo">
                <Textarea
                  id="fila-atribuir-motivo"
                  value={motivoAtribuir}
                  onChange={(event) => setMotivoAtribuir(event.target.value)}
                />
              </FormField>
            </SheetBody>
            <SheetFooterForm
              onClose={() => setSheetAtribuirOpen(false)}
              saveLabel={salvandoAtribuir ? "Salvando…" : "Confirmar"}
            />
          </SheetForm>
        </SheetContent>
      </Sheet>
    </div>
  );
}
