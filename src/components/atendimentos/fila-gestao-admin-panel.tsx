"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ImportacaoWizardSheet,
  type ImportacaoWizardHandle,
} from "@/components/importacao-wizard/importacao-wizard-sheet";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Clock,
  Handshake,
  History,
  ListOrdered,
  RotateCcw,
  Scale,
  Share2,
  User,
  Users,
} from "lucide-react";
import { EncaminhamentoJuridicoSheet } from "@/components/juridico/encaminhamento-juridico-sheet";
import { PropostaNegociacaoSheet } from "@/components/negociacoes/proposta-negociacao-sheet";
import { HistoricoUnidadeSheet } from "@/components/unidades/historico-unidade-sheet";
import { AtalhosContatoAtendente } from "@/components/atendimentos/atalhos-contato-atendente";
import {
  agruparFilaPorAtendente,
  agruparFilaPorCondominio,
  FilaPorGruposLista,
} from "@/components/atendimentos/fila-por-grupos-lista";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { Checkbox, FormField, Select, Textarea } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { SkeletonMetrics, SkeletonTable } from "@/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
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
  TableDataBar,
  Table,
  TableActionsCell,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableActionsButton,
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
import {
  escopoCondominios,
  formatarData,
  nomeCondominio,
  situacoesUnidade,
  type Atendimento,
  type AtribuicaoCobranca,
  type Cadastros,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import {
  colunasFilaExport,
  exportarListagem,
  linhasFilaExport,
} from "@/lib/atendimentos/exportar-listagem";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { FilaCobrancaItem, FilaCobrancaResumo, FilaOrdenacaoCampo } from "@/lib/fila/service";

const retornoOpcoes = [
  { value: "todos", label: "Todos" },
  { value: "atrasado", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "sem", label: "Sem retorno" },
] as const;

type VisaoListagem = "condominio" | "atendente" | "geral";
const PAGE_SIZE_AGRUPADO = 10_000;

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} - ${item.bloco}`;
  return item.identificacao;
}

function tituloCobrancaMobile(item: FilaCobrancaItem, cadastros: Cadastros) {
  return `${nomeCondominio(item.condominioId, cadastros)} - ${rotuloUnidade(item)}`;
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

export function FilaGestaoAdminPanel({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");
  const podeImportar = pode("importacoes", "criar");
  const importacaoWizardRef = useRef<ImportacaoWizardHandle>(null);
  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<FilaCobrancaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<FilaCobrancaResumo>({ emCobranca: 0, semResponsavel: 0, retornosHoje: 0 });
  const [page, setPage] = useState(1);
  const [visao, setVisao] = useState<VisaoListagem>(() => (visaoGeral ? "atendente" : "condominio"));

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
  const [juridicoContexto, setJuridicoContexto] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);
  const [concluirAtendimentoId, setConcluirAtendimentoId] = useState<string | null>(null);
  const [destaqueUnidadeId, setDestaqueUnidadeId] = useState<number | null>(null);

  useEffect(() => {
    if (!visaoGeral && visao === "atendente") {
      setVisao("geral");
      setPage(1);
    }
  }, [visao, visaoGeral]);

  const atendentesKey = snapshotAtendentesComRe(cadastros);
  const atendentes = useMemo(() => listarAtendentesComRe(cadastros), [atendentesKey, cadastros]);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, user?.userId).filter((item) => item.status === "Ativo"),
    [cadastros, user?.userId],
  );

  const situacoesFila = useMemo(
    () =>
      situacoesUnidade.filter(
        (item) => item !== "Sem cobrança" && item !== "Quitada" && item !== "Unidade prescrita",
      ),
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
    const unidadeQuery = searchParams?.get("unidade");
    const unidadeNum = Number(unidadeQuery);
    if (Number.isFinite(unidadeNum) && unidadeNum > 0) {
      setDestaqueUnidadeId(unidadeNum);
    }
    const atendimentoQuery = searchParams?.get("atendimento")?.trim();
    if (atendimentoQuery) {
      const atendimento = cadastros.atendimentos.find((item) => item.id === atendimentoQuery);
      if (atendimento) {
        setDestaqueUnidadeId(Number(atendimento.unidadeId));
      }
    }
  }, [cadastros.atendimentos, searchParams]);

  useEffect(() => {
    aplicarQueryInicial();
  }, [aplicarQueryInicial]);

  useEffect(() => {
    if (!destaqueUnidadeId || carregando) return;
    const alvo = document.getElementById(`fila-unidade-${destaqueUnidadeId}`);
    alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [carregando, destaqueUnidadeId, itens]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const agrupado = visao !== "geral";
      const params = new URLSearchParams();
      params.set("page", agrupado ? "1" : String(page));
      params.set("pageSize", String(agrupado ? PAGE_SIZE_AGRUPADO : PAGE_SIZE));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (appliedRetorno !== "todos") params.set("retorno", appliedRetorno);
      if (visaoGeral && appliedFiltroRe === "sem") {
        params.set("semResponsavel", "1");
      } else if (visaoGeral && appliedFiltroRe !== "todos") {
        const atendente = atendentes.find((item) => item.codigoRe === appliedFiltroRe);
        if (atendente) params.set("atendente", String(atendente.id));
      }
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("order", sortDirection);
      }

      const filaRes = await fetch(`/api/fila?${params}`, { credentials: "same-origin" });
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
    visao,
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

  function registrarAtendimento(unidadeId: number, canal?: "WhatsApp" | "E-mail" | "Telefone") {
    const params = new URLSearchParams({ novo: "1", unidade: String(unidadeId) });
    if (canal) params.set("canal", canal);
    router.push(`/atendimentos?${params.toString()}`);
  }

  function abrirHistorico(item: FilaCobrancaItem) {
    setHistoricoRotulo({
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId, cadastros),
    });
    setHistoricoUnidadeId(item.unidadeId);
  }

  function abrirProposta(item: FilaCobrancaItem) {
    setPropostaContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId, cadastros),
    });
  }

  function abrirJuridico(item: FilaCobrancaItem) {
    setJuridicoContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId, cadastros),
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
    if (pode("juridico", "ler")) {
      lista.push({ label: "Jurídico", icon: Scale, onSelect: () => abrirJuridico(item) });
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
        void refetch()
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
      void refetch();
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
      const atendente = atendentes.find((item) => item.codigoRe === appliedFiltroRe);
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
      const linhas = linhasFilaExport(
        payload.itens ?? [],
        (id) => nomeCondominio(id, cadastros),
        formatarData,
      );
      const base = `fila-cobrancas-${new Date().toISOString().slice(0, 10)}`;
      exportarListagem(toast, formato, "Fila de cobranças", base, colunasFilaExport, linhas);
    } catch {
      toast({ variant: "error", title: "Erro ao exportar", description: "Tente novamente." });
    }
  }

  function abrirImportacao() {
    importacaoWizardRef.current?.abrir("debitos");
  }

  const gruposCondominio = useMemo(() => agruparFilaPorCondominio(itens, cadastros), [itens, cadastros]);
  const gruposAtendente = useMemo(() => agruparFilaPorAtendente(itens, cadastros), [itens, cadastros]);

  const emptyStateFila = (
    <EmptyState
      icon={<Icon icon={ListOrdered} size="lg" className="text-on-surface-variant" />}
      title="Fila vazia"
      description={
        visaoGeral
          ? "Não há unidades em cobrança ativa com os filtros aplicados."
          : "Nenhuma unidade na sua carteira em cobrança ativa. Importe a inadimplência ou aguarde a distribuição automática."
      }
    />
  );

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
    <div className={`flex min-h-0 flex-1 flex-col gap-md overflow-y-auto p-md min-[768px]:gap-lg ${className ?? ""}`}>
      <section aria-label="Indicadores da fila">
        {carregando ? (
          <SkeletonMetrics count={3} desktopCols={3} label="Carregando indicadores da fila" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
              <KpiMobileCard rotulo="Em cobrança" valor={String(resumo.emCobranca)} icon={Clock} destaque />
              <KpiMobileCard rotulo="Sem responsável" valor={String(resumo.semResponsavel)} icon={Users} />
              <KpiMobileCard rotulo="Retornos hoje" valor={String(resumo.retornosHoje)} icon={RotateCcw} />
            </div>
            <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
              <CardMetric
                accent="brass"
                iconClassName="bg-gold-subtle text-brass"
                icon={<Icon icon={Clock} size="md" className="text-brass" />}
                rotulo="Em cobrança"
                valor={String(resumo.emCobranca)}
              />
              <CardMetric
                accent="primary"
                iconClassName="bg-primary-fixed/50 text-primary-container"
                icon={<Icon icon={User} size="md" className="text-primary-container" />}
                rotulo="Sem responsável"
                valor={String(resumo.semResponsavel)}
              />
              <CardMetric
                accent="tertiary"
                iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
                icon={<Icon icon={RotateCcw} size="md" className="text-tertiary-container" />}
                rotulo="Retornos hoje"
                valor={String(resumo.retornosHoje)}
              />
            </div>
          </>
        )}
      </section>

      <FiltrosSection>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar condomínio, unidade ou RE..."
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
      </FiltrosSection>

      {carregando ? (
        <SkeletonTable rows={8} cols={visaoGeral ? 9 : 8} label="Carregando fila de cobranças" />
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

          <Tabs
            value={visao}
            onValueChange={(value) => {
              setVisao(value as VisaoListagem);
              setPage(1);
            }}
            defaultValue={visaoGeral ? "atendente" : "condominio"}
            className="flex flex-col gap-md"
          >
            <div className="flex flex-col gap-sm border-b border-border-subtle min-[768px]:flex-row min-[768px]:items-end min-[768px]:justify-between">
              <TabsList className="min-w-0 w-full border-b-0 min-[768px]:w-auto">
                {visaoGeral ? <TabsTrigger value="atendente">Por atendente</TabsTrigger> : null}
                <TabsTrigger value="condominio">Por condomínio</TabsTrigger>
                <TabsTrigger value="geral">Geral</TabsTrigger>
              </TabsList>
              <TableDataBar
                className="w-full shrink-0 justify-end pb-sm min-[768px]:w-auto"
                onExport={(formato) => void aoExportar(formato)}
                onImport={abrirImportacao}
                showImport={podeImportar}
              />
            </div>

            <TabsContent value="condominio" className="flex flex-col gap-md !bg-transparent !p-0">
              <ResponsiveTable
                onExport={(formato) => void aoExportar(formato)}
                onImport={abrirImportacao}
                showImport={podeImportar}
                showExport={false}
                desktop={
                  <FilaPorGruposLista
                    grupos={gruposCondominio}
                    modo="condominio"
                    cadastros={cadastros}
                    emptyState={emptyStateFila}
                    variante="desktop"
                    visaoGeral={visaoGeral}
                    selecionadas={selecionadas}
                    destaqueUnidadeId={destaqueUnidadeId}
                    onToggleUnidade={toggleUnidade}
                    acoesLinha={acoesLinha}
                    onIniciarCanal={
                      visaoGeral
                        ? undefined
                        : (unidadeId, canal) => registrarAtendimento(unidadeId, canal)
                    }
                  />
                }
                mobile={
                  <FilaPorGruposLista
                    grupos={gruposCondominio}
                    modo="condominio"
                    cadastros={cadastros}
                    emptyState={<TableMobileEmpty>Nenhuma cobrança na fila.</TableMobileEmpty>}
                    variante="mobile"
                    visaoGeral={visaoGeral}
                    selecionadas={selecionadas}
                    destaqueUnidadeId={destaqueUnidadeId}
                    onToggleUnidade={toggleUnidade}
                    acoesLinha={acoesLinha}
                    onIniciarCanal={
                      visaoGeral
                        ? undefined
                        : (unidadeId, canal) => registrarAtendimento(unidadeId, canal)
                    }
                  />
                }
              />
            </TabsContent>

            {visaoGeral ? (
              <TabsContent value="atendente" className="flex flex-col gap-md !bg-transparent !p-0">
                <ResponsiveTable
                  onExport={(formato) => void aoExportar(formato)}
                  onImport={abrirImportacao}
                  showImport={podeImportar}
                  showExport={false}
                  desktop={
                    <FilaPorGruposLista
                      grupos={gruposAtendente}
                      modo="atendente"
                      cadastros={cadastros}
                      emptyState={emptyStateFila}
                      variante="desktop"
                      visaoGeral={visaoGeral}
                      selecionadas={selecionadas}
                      destaqueUnidadeId={destaqueUnidadeId}
                      onToggleUnidade={toggleUnidade}
                      acoesLinha={acoesLinha}
                    />
                  }
                  mobile={
                    <FilaPorGruposLista
                      grupos={gruposAtendente}
                      modo="atendente"
                      cadastros={cadastros}
                      emptyState={<TableMobileEmpty>Nenhuma cobrança na fila.</TableMobileEmpty>}
                      variante="mobile"
                      visaoGeral={visaoGeral}
                      selecionadas={selecionadas}
                      destaqueUnidadeId={destaqueUnidadeId}
                      onToggleUnidade={toggleUnidade}
                      acoesLinha={acoesLinha}
                    />
                  }
                />
              </TabsContent>
            ) : null}

            <TabsContent value="geral" className="flex flex-col gap-md !bg-transparent !p-0">
              {total === 0 ? (
                <ResponsiveTable
                  onExport={(formato) => void aoExportar(formato)}
                  onImport={abrirImportacao}
                  showImport={podeImportar}
                  showExport={false}
                  desktop={
                    <Table aria-label="Fila de cobranças" showExport={false}>
                      <TableBody>
                        <TableEmpty colSpan={visaoGeral ? 9 : 8}>{emptyStateFila}</TableEmpty>
                      </TableBody>
                    </Table>
                  }
                  mobile={<TableMobileEmpty>Nenhuma cobrança na fila.</TableMobileEmpty>}
                />
              ) : (
                <div className="flex flex-col gap-sm min-[768px]:overflow-hidden min-[768px]:rounded-xl min-[768px]:border min-[768px]:border-border-subtle min-[768px]:bg-surface-card min-[768px]:shadow-card">
                  <ResponsiveTable
                    onExport={(formato) => void aoExportar(formato)}
                    onImport={abrirImportacao}
                    showImport={podeImportar}
                    showExport={false}
                    desktop={
                      <Table
                        aria-label="Fila de cobranças ativas"
                        showExport={false}
                        fitContainer
                        containerClassName="rounded-none border-0 shadow-none"
                      >
                        {visaoGeral ? (
                          <colgroup>
                            <col className="w-[4%]" />
                            <col className="w-[13%]" />
                            <col className="w-[10%]" />
                            <col className="w-[14%]" />
                            <col className="w-[12%]" />
                            <col className="w-[11%]" />
                            <col className="w-[14%]" />
                            <col className="w-[13%]" />
                            <col className="w-[9%]" />
                          </colgroup>
                        ) : (
                          <colgroup>
                            <col className="w-[14%]" />
                            <col className="w-[11%]" />
                            <col className="w-[14%]" />
                            <col className="w-[12%]" />
                            <col className="w-[18%]" />
                            <col className="w-[14%]" />
                            <col className="w-[12%]" />
                            <col className="w-[5%]" />
                          </colgroup>
                        )}
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
                              align="center"
                              sortable
                              sortDirection={directionFor("condominio")}
                              onSort={() => alternarOrdenacao("condominio")}
                            >
                              Condomínio
                            </TableHead>
                            <TableHead
                              align="center"
                              sortable
                              sortDirection={directionFor("unidade")}
                              onSort={() => alternarOrdenacao("unidade")}
                            >
                              Unidade
                            </TableHead>
                            <TableHead
                              align="center"
                              sortable
                              sortDirection={directionFor("inadimplencia")}
                              onSort={() => alternarOrdenacao("inadimplencia")}
                            >
                              Inadimplência
                            </TableHead>
                            <TableHead
                              align="center"
                              sortable
                              sortDirection={directionFor("situacao")}
                              onSort={() => alternarOrdenacao("situacao")}
                            >
                              Situação
                            </TableHead>
                            {visaoGeral ? (
                              <TableHead
                                align="center"
                                sortable
                                sortDirection={directionFor("re")}
                                onSort={() => alternarOrdenacao("re")}
                              >
                                RE responsável
                              </TableHead>
                            ) : (
                              <TableHead align="center">Iniciar contato</TableHead>
                            )}
                            <TableHead
                              align="center"
                              sortable
                              sortDirection={directionFor("ultimoAtendimento")}
                              onSort={() => alternarOrdenacao("ultimoAtendimento")}
                            >
                              Último atendimento
                            </TableHead>
                            <TableHead
                              align="center"
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
                            <TableRow
                              key={item.unidadeId}
                              id={`fila-unidade-${item.unidadeId}`}
                              className={destaqueUnidadeId === item.unidadeId ? "bg-[#FFF8E6]" : undefined}
                            >
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
                              <TableCell align="center" className="text-on-surface">
                                {nomeCondominio(item.condominioId, cadastros)}
                              </TableCell>
                              <TableCell align="center" className="font-medium text-on-surface">
                                {rotuloUnidade(item)}
                              </TableCell>
                              <TableCell align="center">
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
                              <TableCell align="center" className="align-middle">
                                <div className="flex justify-center">
                                  <BadgeSituacaoCobranca situacao={item.situacao} />
                                </div>
                              </TableCell>
                              {visaoGeral ? (
                                <TableCell align="center" className="text-on-surface">
                                  {item.codigoRe ?? (
                                    <span className="text-on-surface-variant">Sem responsável</span>
                                  )}
                                </TableCell>
                              ) : (
                                <TableCell align="center">
                                  <div className="flex justify-center">
                                    <AtalhosContatoAtendente
                                      compacto
                                      unidadeId={item.unidadeId}
                                      condominioId={item.condominioId}
                                      identificacao={item.identificacao}
                                      bloco={item.bloco}
                                      onIniciar={(canal) => registrarAtendimento(item.unidadeId, canal)}
                                    />
                                  </div>
                                </TableCell>
                              )}
                              <TableCell align="center" className="text-on-surface-variant">
                                {item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—"}
                              </TableCell>
                              <TableCell align="center" className="align-middle">
                                <div className="flex justify-center">
                                  <CelulaProximoRetorno data={item.proximoRetorno} />
                                </div>
                              </TableCell>
                              <TableActionsCell
                                label={`Ações da cobrança ${rotuloUnidade(item)}`}
                                actions={acoesLinha(item)}
                              />
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    }
                    mobile={
                      <TableMobileList aria-label="Fila de cobranças">
                        {itens.map((item, index) => {
                          const acoes = acoesLinha(item);
                          const acoesRapidas = acoes.filter((acao) =>
                            ["Histórico", "Registrar contato", "Proposta", "Jurídico"].includes(acao.label),
                          );
                          const acoesExtras = acoes.filter(
                            (acao) =>
                              !["Histórico", "Registrar contato", "Proposta", "Jurídico"].includes(acao.label),
                          );
                          return (
                            <TableMobileCard
                              key={item.unidadeId}
                              className={
                                visaoGeral
                                  ? undefined
                                  : "border-brass/25 bg-gradient-to-b from-gold-subtle/70 to-surface-card"
                              }
                            >
                              <TableMobileCardHeader>
                                {visaoGeral ? (
                                  <Checkbox
                                    aria-label={`Selecionar ${rotuloUnidade(item)}`}
                                    checked={selecionadas.has(item.unidadeId)}
                                    onChange={(event) => toggleUnidade(item.unidadeId, event.target.checked)}
                                  />
                                ) : (
                                  <span
                                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass"
                                    aria-hidden="true"
                                  >
                                    <Icon icon={ClipboardList} size="sm" />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                                    <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                                      {tituloCobrancaMobile(item, cadastros)}
                                    </TableMobileTitle>
                                    <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                                      {index + 1} de {itens.length}
                                    </span>
                                  </div>
                                </div>
                                {acoesExtras.length > 0 ? (
                                  <TableActionsButton
                                    label={`Mais ações — ${rotuloUnidade(item)}`}
                                    actions={acoesExtras}
                                  />
                                ) : (
                                  <span aria-hidden="true" />
                                )}
                              </TableMobileCardHeader>
                              <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
                                <div className="flex items-start justify-between gap-md">
                                  <div className="min-w-0">
                                    <p className="text-label-sm uppercase text-on-surface-variant">Inadimplência</p>
                                    <p className="text-body-md font-semibold tabular-nums text-on-surface">
                                      {item.valorInadimplencia ?? "—"}
                                    </p>
                                    {item.diasAtrasoMax > 0 ? (
                                      <p className="text-body-sm text-on-surface-variant">
                                        {item.diasAtrasoMax} dias em atraso
                                      </p>
                                    ) : null}
                                  </div>
                                  <BadgeSituacaoCobranca situacao={item.situacao} className="shrink-0" />
                                </div>
                                <div className="grid grid-cols-2 gap-sm text-body-sm">
                                  {visaoGeral ? (
                                    <div className="min-w-0">
                                      <p className="text-label-sm uppercase text-on-surface-variant">RE</p>
                                      <p className="text-body-md text-on-surface">
                                        {item.codigoRe ?? "Sem responsável"}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="min-w-0">
                                      <p className="text-label-sm uppercase text-on-surface-variant">Último</p>
                                      <p className="text-body-md text-on-surface">
                                        {item.ultimoAtendimento
                                          ? formatarData(item.ultimoAtendimento)
                                          : "—"}
                                      </p>
                                    </div>
                                  )}
                                  <div className="min-w-0 text-end">
                                    <p className="text-label-sm uppercase text-on-surface-variant">Retorno</p>
                                    <div className="flex justify-end text-body-md">
                                      <CelulaProximoRetorno data={item.proximoRetorno} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {!visaoGeral ? (
                                <div className="mt-sm">
                                  <AtalhosContatoAtendente
                                    unidadeId={item.unidadeId}
                                    condominioId={item.condominioId}
                                    identificacao={item.identificacao}
                                    bloco={item.bloco}
                                    onIniciar={(canal) => registrarAtendimento(item.unidadeId, canal)}
                                  />
                                </div>
                              ) : null}
                              {acoesRapidas.length > 0 ? (
                                <div className="mt-sm flex flex-col gap-xs">
                                  {acoesRapidas.find((a) => a.label === "Registrar contato") ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="min-h-11 w-full"
                                      variant={visaoGeral ? "primary" : "outline"}
                                      onClick={() => registrarAtendimento(item.unidadeId)}
                                    >
                                      <Icon icon={ClipboardList} size="sm" aria-hidden />
                                      {visaoGeral ? "Registrar contato" : "Registrar sem abrir canal"}
                                    </Button>
                                  ) : null}
                                  <div className="grid grid-cols-2 gap-xs">
                                    {acoesRapidas
                                      .filter((acao) => acao.label !== "Registrar contato")
                                      .map((acao) => (
                                        <Button
                                          key={acao.label}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="min-h-10 w-full px-sm text-body-sm"
                                          onClick={acao.onSelect}
                                        >
                                          <Icon icon={acao.icon} size="sm" className="shrink-0" aria-hidden />
                                          {acao.label}
                                        </Button>
                                      ))}
                                  </div>
                                </div>
                              ) : null}
                            </TableMobileCard>
                          );
                        })}
                      </TableMobileList>
                    }
                  />
                  <div className="min-[768px]:border-t min-[768px]:border-border-subtle min-[768px]:px-md min-[768px]:py-md">
                    <Pagination page={page} total={total} onPageChange={setPage} />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

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
      <EncaminhamentoJuridicoSheet
        unidadeId={juridicoContexto?.unidadeId ?? null}
        condominioId={juridicoContexto?.condominioId ?? null}
        tituloUnidade={juridicoContexto?.unidade}
        tituloCondominio={juridicoContexto?.condominio}
        onClose={() => setJuridicoContexto(null)}
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
      {podeImportar ? (
        <ImportacaoWizardSheet
          ref={importacaoWizardRef}
          moduloInicial="debitos"
          moduloTravado
          onConcluida={() => void recarregar()}
        />
      ) : null}
    </div>
  );
}
