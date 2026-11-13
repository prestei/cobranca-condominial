"use client";

import { useEffect, useId, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import {
  ImportacaoWizardSheet,
  type ImportacaoWizardHandle,
} from "@/components/importacao-wizard/importacao-wizard-sheet";
import {
  agruparDebitosPorCondominio,
  InadimplenciaPorCondominioLista,
} from "@/components/debitos/inadimplencia-relatorio-table";
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Flag,
  ClipboardList,
  Clock,
  DoorOpen,
  FileText,
  Hash,
  Layers,
  Link2,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Scale,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAgendarAtendimento } from "@/context/agendar-atendimento-context";
import { Badge } from "@/components/badge";
import { GraficoBarras, GraficoRosca } from "@/components/charts";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Input, Select } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { resolverPeriodo, type PeriodValue } from "@/components/period-input";
import { SkeletonListPage } from "@/components/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import {
  ResponsiveTable,
  Table,
  TableDataBar,
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
  TableMobileField,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  vencimentoParaFaixaDashboard,
  type FaixaAtrasoDashboardId,
} from "@/lib/dashboard/faixas-atraso";
import {
  dataCorteLimite,
  debitoAbertoNaData,
  diasDeAtraso,
  formatarData,
  formatarMoeda,
  grupoDebito,
  hojeIso,
  escopoCondominios,
  escopoUnidades,
  nomeCondominio,
  nomeUnidade,
  origensDebito,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  statusDebito,
  unidadePrescrita,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import { DelinquencyTrackingBadge } from "@/components/debitos/delinquency-tracking-badge";
import {
  computeDelinquencyTrackingForDebt,
  delinquencyTrackingDaysCaptionForCondominiumId,
  resolveDelinquencyTrackingDays,
} from "@/lib/inadimplencia/delinquency-tracking";
import { garantirCondominiosPersistidosNoServidor } from "@/lib/condominios/ensure-server-sync";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { calcularIndicadoresInadimplencia } from "@/lib/debitos/indicadores";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";

const etapas = ["Identificação", "Valores e acréscimos", "Pagamento"] as const;
const badgeStatus: Record<string, "success" | "error" | "secondary"> = {
  Pendente: "secondary",
  Pago: "success",
  Vencido: "error",
  Cancelado: "error",
};
type SortKey = "referencia" | "unidade" | "grupo" | "vencimento" | "dias" | "status" | "original" | "atualizado";
type VisaoListagem = "geral" | "condominio";
type ErroCampo =
  | "condominioId"
  | "unidadeId"
  | "referencia"
  | "dataVencimento"
  | "status"
  | "valor"
  | "valorOriginal"
  | "multa"
  | "juros"
  | "correcao"
  | "valorAtualizado"
  | "valorPago";
function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function debitoParaFormulario(item: Debito) {
  return {
    condominioId: String(item.condominioId),
    unidadeId: String(item.unidadeId),
    referencia: item.referencia ?? "",
    descricao: item.descricao ?? "",
    dataVencimento: item.dataVencimento ?? "",
    valor: item.valor ?? "",
    valorOriginal: item.valorOriginal ?? "",
    multa: item.multa ?? "",
    juros: item.juros ?? "",
    correcao: item.correcao ?? "",
    valorAtualizado: item.valorAtualizado ?? "",
    status: item.status ?? "",
    dataPagamento: item.dataPagamento ?? "",
    valorPago: item.valorPago ?? "",
    origem: item.origem ?? "",
    identificadorExterno: item.identificadorExterno ?? "",
  };
}

function rotuloUnidadeForm(item: Unidade) {
  const bloco = item.bloco?.trim();
  return bloco ? `${item.identificacao} · ${bloco}` : item.identificacao;
}

const formularioVazio = {
  condominioId: "",
  unidadeId: "",
  referencia: "",
  descricao: "",
  dataVencimento: "",
  valor: "",
  valorOriginal: "",
  multa: "",
  juros: "",
  correcao: "",
  valorAtualizado: "",
  status: "",
  dataPagamento: "",
  valorPago: "",
  origem: "",
  identificadorExterno: "",
};

const dinheiro = /^\d+([.,]\d{1,2})?$/;
const periodoTodos: PeriodValue = { preset: "todos", de: "", ate: "" };

function DebitosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user: sessao, loading: authLoading } = useAuth();
  const { pode } = usePermissao();
  const { abrir: abrirAgendar } = useAgendarAtendimento();
  const podeImportar = pode("importacoes", "criar");
  const formId = useId();
  const importacaoWizardRef = useRef<ImportacaoWizardHandle>(null);
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const debitos = cadastros.debitos;
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState(periodoTodos);
  const [dataBase, setDataBase] = useState(hojeIso);
  const [condominioId, setCondominioId] = useState("todos");
  const [cidade, setCidade] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedPeriodo, setAppliedPeriodo] = useState(periodoTodos);
  const [appliedDataBase, setAppliedDataBase] = useState(hojeIso);
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedCidade, setAppliedCidade] = useState("todas");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [origem, setOrigem] = useState("todas");
  const [appliedOrigem, setAppliedOrigem] = useState("todas");
  const [unidadeId, setUnidadeId] = useState("todas");
  const [appliedUnidadeId, setAppliedUnidadeId] = useState("todas");
  const [situacaoCobranca, setSituacaoCobranca] = useState("todas");
  const [appliedSituacaoCobranca, setAppliedSituacaoCobranca] = useState("todas");
  const [visao, setVisao] = useState<VisaoListagem>("condominio");
  const [sortKey, setSortKey] = useState<SortKey>("vencimento");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Debito | null>(null);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<ErroCampo, string>>>({});
  const [carregandoEdicao, setCarregandoEdicao] = useState(false);

  const condominiosVisiveis = escopoCondominios(cadastros, sessao?.userId);
  const unidadesVisiveis = escopoUnidades(cadastros, sessao?.userId);

  async function sincronizarCadastrosRelacionados() {
    await garantirCondominiosPersistidosNoServidor(sessao?.userId);
    const response = await fetch("/api/unidades", { credentials: "same-origin" });
    if (response.ok) {
      const payload = (await response.json()) as { unidades?: Unidade[] };
      if (payload.unidades) void refetch()
    }
  }

  async function recarregarDebitosDoServidor() {
    const response = await fetch("/api/debitos", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { debitos?: Debito[] };
    if (payload.debitos) void refetch()
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await sincronizarCadastrosRelacionados();
      if (cancelled) return;
      await recarregarDebitosDoServidor();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [sessao?.userId]);

  useEffect(() => {
    if (!searchParams) return;
    if (!searchParams.toString()) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    const dataBaseQuery = params.get("dataBase");
    if (dataBaseQuery && /^\d{4}-\d{2}-\d{2}$/.test(dataBaseQuery)) {
      setDataBase(dataBaseQuery);
      setAppliedDataBase(dataBaseQuery);
      changed = true;
      params.delete("dataBase");
    }

    const condominioQuery = params.get("condominio") ?? params.get("condominioId");
    if (condominioQuery && cadastros.condominios.some((item) => String(item.id) === condominioQuery)) {
      setCondominioId(condominioQuery);
      setAppliedCondominioId(condominioQuery);
      changed = true;
      params.delete("condominio");
    }

    const unidadeQuery = params.get("unidade");
    if (unidadeQuery && cadastros.unidades.some((item) => String(item.id) === unidadeQuery)) {
      setUnidadeId(unidadeQuery);
      setAppliedUnidadeId(unidadeQuery);
      changed = true;
      params.delete("unidade");
    }

    const faixaQuery = params.get("faixaAtraso");
    if (faixaQuery) {
      const base = dataBaseQuery || appliedDataBase;
      const intervalo = vencimentoParaFaixaDashboard(faixaQuery as FaixaAtrasoDashboardId, base);
      if (intervalo) {
        const periodoFaixa: PeriodValue = {
          preset: "personalizado",
          de: intervalo.vencimentoDe ?? "",
          ate: intervalo.vencimentoAte ?? "",
        };
        setPeriodo(periodoFaixa);
        setAppliedPeriodo(periodoFaixa);
        changed = true;
        params.delete("faixaAtraso");
      }
    }

    if (!changed) return;
    setPage(1);
    router.replace(params.toString() ? `/debitos?${params.toString()}` : "/debitos");
  }, [appliedDataBase, cadastros.condominios, cadastros.unidades, router, searchParams]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const cidades = [...new Set(cadastros.condominios.map((item) => item.cidade.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const condominiosOrdenados = [...cadastros.condominios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const faixaPeriodo = resolverPeriodo(appliedPeriodo, hojeIso());
  const visible = debitos
    .filter((item) => {
      const matchesStatus = appliedStatus === "todos" || item.status === appliedStatus;
      const matchesOrigem = appliedOrigem === "todas" || item.origem === appliedOrigem;
      const matchesCondominio = appliedCondominioId === "todos" || String(item.condominioId) === appliedCondominioId;
      const cidadeDebito = cadastros.condominios.find((condominio) => condominio.id === item.condominioId)?.cidade.trim() ?? "";
      const matchesCidade = appliedCidade === "todas" || cidadeDebito === appliedCidade;
      const matchesPeriodo =
        (!faixaPeriodo.inicio || item.dataVencimento >= faixaPeriodo.inicio) &&
        (!faixaPeriodo.fim || item.dataVencimento <= faixaPeriodo.fim);
      const matchesUnidade = appliedUnidadeId === "todas" || String(item.unidadeId) === appliedUnidadeId;
      const unidadeDebito = cadastros.unidades.find((u) => u.id === item.unidadeId);
      const cobrancaUnidade = unidadeDebito ? situacaoCobrancaUnidade(unidadeDebito) : "";
      const matchesSituacaoCobranca =
        appliedSituacaoCobranca === "todas" || cobrancaUnidade === appliedSituacaoCobranca;
      const haystack = `${item.referencia} ${item.descricao} ${nomeUnidade(item.unidadeId, cadastros)} ${nomeCondominio(item.condominioId, cadastros)}`.toLocaleLowerCase("pt-BR");
      return (
        matchesStatus &&
        matchesOrigem &&
        matchesCondominio &&
        matchesCidade &&
        matchesPeriodo &&
        matchesUnidade &&
        matchesSituacaoCobranca &&
        (query.length === 0 || haystack.includes(query))
      );
    })
    .sort((a, b) => {
      if (visao === "condominio") {
        const condo = nomeCondominio(a.condominioId, cadastros).localeCompare(nomeCondominio(b.condominioId, cadastros), "pt-BR");
        if (condo !== 0) return condo;
        const unidade = nomeUnidade(a.unidadeId, cadastros).localeCompare(nomeUnidade(b.unidadeId, cadastros), "pt-BR");
        if (unidade !== 0) return unidade;
        return a.dataVencimento.localeCompare(b.dataVencimento);
      }
      const factor = sortDirection === "asc" ? 1 : -1;
      const diasDe = (item: Debito) =>
        item.dataVencimento && item.dataVencimento <= appliedDataBase
          ? diasDeAtraso(item.dataVencimento, appliedDataBase)
          : -1;
      if (sortKey === "atualizado") return (Number(a.valorAtualizado) - Number(b.valorAtualizado)) * factor;
      if (sortKey === "original") return (Number(a.valorOriginal) - Number(b.valorOriginal)) * factor;
      if (sortKey === "dias") return (diasDe(a) - diasDe(b)) * factor;
      const left =
        sortKey === "unidade"
          ? nomeUnidade(a.unidadeId, cadastros)
          : sortKey === "grupo"
            ? grupoDebito(a.descricao)
            : sortKey === "vencimento"
              ? a.dataVencimento
              : sortKey === "status"
                ? a.status
                : a.referencia;
      const right =
        sortKey === "unidade"
          ? nomeUnidade(b.unidadeId, cadastros)
          : sortKey === "grupo"
            ? grupoDebito(b.descricao)
            : sortKey === "vencimento"
              ? b.dataVencimento
              : sortKey === "status"
                ? b.status
                : b.referencia;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const gruposCondominio = useMemo(
    () => agruparDebitosPorCondominio(visible, cadastros),
    [visible, cadastros],
  );
  const descricaoPrazoCondominio = (condominioId: number) =>
    delinquencyTrackingDaysCaptionForCondominiumId(condominioId, cadastros);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const condominioFiltrado =
    appliedCondominioId !== "todos"
      ? cadastros.condominios.find((item) => String(item.id) === appliedCondominioId)
      : undefined;
  const prazoReferenciaKpi = condominioFiltrado ? resolveDelinquencyTrackingDays(condominioFiltrado) : null;
  const rotuloDentroPrazo = prazoReferenciaKpi
    ? `Até ${prazoReferenciaKpi} dias`
    : "Dentro do prazo do condomínio";
  const rotuloAcimaPrazo = prazoReferenciaKpi
    ? `Acima de ${prazoReferenciaKpi} dias`
    : "Acima do prazo do condomínio";
  const corte =
    prazoReferenciaKpi != null ? dataCorteLimite(appliedDataBase, prazoReferenciaKpi) : "";
  const emAbertoNaData = visible.filter((item) => debitoAbertoNaData(item, appliedDataBase));
  const condominiosNoFiltro = cadastros.condominios.filter((item) => {
    const matchesCondominio = appliedCondominioId === "todos" || String(item.id) === appliedCondominioId;
    const matchesCidade = appliedCidade === "todas" || item.cidade.trim() === appliedCidade;
    return matchesCondominio && matchesCidade;
  });
  const unidadesNoRecorte = cadastros.unidades.filter((item) =>
    condominiosNoFiltro.some((condominio) => condominio.id === item.condominioId),
  );
  const unidadesCarteira = unidadesNoRecorte.length;
  const unidadesPrescritasRecorte = unidadesNoRecorte.filter((item) => unidadePrescrita(item)).length;
  const indicadores = calcularIndicadoresInadimplencia({
    debitos: emAbertoNaData,
    dataBase: appliedDataBase,
    unidadesCarteira,
    catalog: cadastros,
  });
  const totalOriginal = indicadores.totalOriginal;
  const totalAtualizado = indicadores.totalAtualizado;
  const ateLimite = indicadores.ateLimite;
  const acimaLimite = indicadores.acimaLimite;
  const unidadesDevedoras = indicadores.unidadesDevedoras;
  const percentualUnidades = indicadores.percentualUnidades;
  const unidadesEmDia = Math.max(0, unidadesCarteira - unidadesDevedoras);
  const percentualValorAcima =
    totalAtualizado > 0 ? (acimaLimite / totalAtualizado) * 100 : null;
  const percentualValorAte =
    totalAtualizado > 0 ? (ateLimite / totalAtualizado) * 100 : null;
  const chaveGraficos = `${appliedCondominioId}-${appliedUnidadeId}-${appliedCidade}-${appliedStatus}-${appliedSituacaoCobranca}-${appliedOrigem}-${appliedDataBase}-${query}`;
  const vazioGrafico = (
    <p className="py-lg text-center text-body-sm text-on-surface-variant">Sem dados no recorte.</p>
  );

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "vencimento" || key === "atualizado" || key === "original" || key === "dias" ? "desc" : "asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("vencimento");
    setSortDirection("desc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedPeriodo(periodo);
    setAppliedDataBase(dataBase || hojeIso());
    setAppliedCondominioId(condominioId);
    setAppliedCidade(cidade);
    setAppliedStatus(status);
    setAppliedOrigem(origem);
    setAppliedUnidadeId(unidadeId);
    setAppliedSituacaoCobranca(situacaoCobranca);
    setPage(1);
  }

  function handleClear() {
    const hoje = hojeIso();
    setSearch("");
    setPeriodo(periodoTodos);
    setDataBase(hoje);
    setCondominioId("todos");
    setCidade("todas");
    setStatus("todos");
    setAppliedSearch("");
    setAppliedPeriodo(periodoTodos);
    setAppliedDataBase(hoje);
    setAppliedCondominioId("todos");
    setAppliedCidade("todas");
    setAppliedStatus("todos");
    setOrigem("todas");
    setAppliedOrigem("todas");
    setUnidadeId("todas");
    setAppliedUnidadeId("todas");
    setSituacaoCobranca("todas");
    setAppliedSituacaoCobranca("todas");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  async function openEdit(item: Debito) {
    setCarregandoEdicao(true);
    setSheetOpen(true);
    setEditingId(item.id);
    setErrors({});
    setStep(0);
    setForm(debitoParaFormulario(item));
    try {
      await sincronizarCadastrosRelacionados();
      const response = await fetch(`/api/debitos/${item.id}`, { credentials: "same-origin" });
      const body = (await response.json()) as { debito?: Debito; error?: string };
      const debito =
        response.ok && body.debito
          ? body.debito
          : (cadastros.debitos.find((registro) => registro.id === item.id) ?? item);
      if (!response.ok && !body.debito) {
        toast({
          variant: "error",
          title: "Não foi possível carregar o débito",
          description: body.error ?? "Exibindo os dados disponíveis na listagem.",
        });
      }
      setForm(debitoParaFormulario(debito));
    } catch {
      setForm(debitoParaFormulario(item));
      toast({
        variant: "error",
        title: "Erro ao carregar",
        description: "Exibindo os dados disponíveis na listagem.",
      });
    } finally {
      setCarregandoEdicao(false);
    }
  }

  function closeSheet() {
    const preenchido = Object.entries(form).some(([, value]) => value.trim() !== "");
    if (preenchido) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const response = await fetch(`/api/debitos/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      toast({ variant: "error", title: body.error ?? "Não foi possível excluir o débito." });
      return;
    }
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Débito excluído" });
    setDeleteTarget(null);
  }

  async function confirmarQuitacaoUnidade(item: Debito, forcar = false) {
    const response = await fetch(`/api/debitos/unidade/${item.unidadeId}/confirmar-quitacao`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forcar }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      unidade?: { id: number; situacao: string };
    };
    if (response.status === 409 && !forcar) {
      const aceitar = window.confirm(
        `${body.error ?? "Há débitos em aberto."}\n\nConfirmar quitação da unidade mesmo assim? Atendimentos anteriores serão mantidos.`,
      );
      if (aceitar) void confirmarQuitacaoUnidade(item, true);
      return;
    }
    if (!response.ok) {
      toast({ variant: "error", title: body.error ?? "Não foi possível confirmar a quitação." });
      return;
    }
    if (body.unidade) {
      const atual = cadastros.unidades.find((u) => u.id === body.unidade!.id);
      if (atual) void refetch()
    }
    toast({ variant: "success", title: "Unidade marcada como quitada" });
    await recarregarDebitosDoServidor();
  }

  function iniciarAtendimento(item: Debito) {
    const params = new URLSearchParams({
      novo: "1",
      condominio: String(item.condominioId),
      unidade: String(item.unidadeId),
    });
    router.push(`/atendimentos?${params.toString()}`);
  }

  function acoes(item: Debito) {
    const lista = [];
    if (pode("atendimentos", "criar")) {
      lista.push({ label: "Iniciar atendimento", icon: ClipboardList, onSelect: () => iniciarAtendimento(item) });
      lista.push({
        label: "Agendar atendimento",
        icon: CalendarClock,
        onSelect: () =>
          abrirAgendar({
            unidadeId: item.unidadeId,
            condominioId: item.condominioId,
            tituloUnidade: nomeUnidade(item.unidadeId, cadastros),
          }),
      });
    }
    if (pode("debitos", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("debitos", "editar") || pode("unidades", "editar")) {
      const unidade = cadastros.unidades.find((u) => u.id === item.unidadeId);
      if (unidade && unidade.situacao !== "Quitada") {
        lista.push({
          label: "Confirmar unidade quitada",
          icon: CheckCircle2,
          onSelect: () => void confirmarQuitacaoUnidade(item),
        });
      }
    }
    if (pode("debitos", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const referencia = form.referencia.trim();
    const nextErrors: Partial<Record<ErroCampo, string>> = {};
    if (!form.condominioId) nextErrors.condominioId = "Selecione o condomínio.";
    if (!form.unidadeId) nextErrors.unidadeId = "Selecione a unidade.";
    else if (
      !cadastros.unidades.some(
        (item) => item.id === Number(form.unidadeId) && item.condominioId === Number(form.condominioId),
      )
    ) {
      nextErrors.unidadeId = "A unidade não pertence ao condomínio selecionado.";
    }
    if (!referencia) nextErrors.referencia = "Informe a referência. Ex.: 09/2026.";
    if (!form.dataVencimento) nextErrors.dataVencimento = "Informe o vencimento.";
    if (!form.status) nextErrors.status = "Selecione a situação.";

    const camposValor = ["valor", "valorOriginal", "multa", "juros", "correcao", "valorAtualizado", "valorPago"] as const;
    for (const campo of camposValor) {
      const raw = form[campo].trim();
      if (raw && !dinheiro.test(raw)) nextErrors[campo] = "Informe um valor com até duas casas.";
    }

    const daEtapa: Partial<Record<ErroCampo, string>> = {};
    if (step === 0) {
      if (nextErrors.condominioId) daEtapa.condominioId = nextErrors.condominioId;
      if (nextErrors.unidadeId) daEtapa.unidadeId = nextErrors.unidadeId;
      if (nextErrors.referencia) daEtapa.referencia = nextErrors.referencia;
    } else if (step === 1) {
      if (nextErrors.dataVencimento) daEtapa.dataVencimento = nextErrors.dataVencimento;
      if (nextErrors.status) daEtapa.status = nextErrors.status;
      if (nextErrors.valor) daEtapa.valor = nextErrors.valor;
      if (nextErrors.valorOriginal) daEtapa.valorOriginal = nextErrors.valorOriginal;
      if (nextErrors.multa) daEtapa.multa = nextErrors.multa;
      if (nextErrors.juros) daEtapa.juros = nextErrors.juros;
      if (nextErrors.correcao) daEtapa.correcao = nextErrors.correcao;
      if (nextErrors.valorAtualizado) daEtapa.valorAtualizado = nextErrors.valorAtualizado;
    }

    if (step < etapas.length - 1) {
      setErrors(daEtapa);
      if (Object.keys(daEtapa).length > 0) return;
      setStep(step + 1);
      return;
    }

    setErrors(nextErrors);
    if (nextErrors.condominioId || nextErrors.unidadeId || nextErrors.referencia) {
      setStep(0);
      return;
    }
    if (
      nextErrors.dataVencimento ||
      nextErrors.status ||
      nextErrors.valor ||
      nextErrors.valorOriginal ||
      nextErrors.multa ||
      nextErrors.juros ||
      nextErrors.correcao ||
      nextErrors.valorAtualizado
    ) {
      setStep(1);
      return;
    }
    if (Object.keys(nextErrors).length > 0) return;

    await sincronizarCadastrosRelacionados();

    const canon = (value: string) => value.trim().replace(",", ".");
    const saved = {
      condominioId: Number(form.condominioId),
      unidadeId: Number(form.unidadeId),
      referencia,
      descricao: form.descricao.trim(),
      dataVencimento: form.dataVencimento,
      valor: canon(form.valor),
      valorOriginal: canon(form.valorOriginal),
      multa: canon(form.multa),
      juros: canon(form.juros),
      correcao: canon(form.correcao),
      valorAtualizado: canon(form.valorAtualizado),
      status: form.status,
      dataPagamento: form.dataPagamento,
      valorPago: canon(form.valorPago),
      origem: form.origem,
      identificadorExterno: form.identificadorExterno.trim(),
    };

    const url = editingId === null ? "/api/debitos" : `/api/debitos/${editingId}`;
    const method = editingId === null ? "POST" : "PATCH";
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved),
    });
    const body = (await response.json().catch(() => ({}))) as { debito?: Debito; error?: string };
    if (!response.ok) {
      toast({ variant: "error", title: body.error ?? "Não foi possível salvar o débito." });
      return;
    }
    if (body.debito) aplicarDebitoSalvo(body.debito, editingId === null ? "INSERT" : "UPDATE");
    toast({ variant: "success", title: editingId === null ? "Débito cadastrado" : "Débito atualizado" });
    setSheetOpen(false);
  }

  const unidadesDoCondominio = useMemo(() => {
    const lista = unidadesVisiveis.filter((item) => String(item.condominioId) === form.condominioId);
    if (!form.unidadeId) return lista;
    if (lista.some((item) => String(item.id) === form.unidadeId)) return lista;
    const vinculada = unidadesVisiveis.find((item) => String(item.id) === form.unidadeId);
    if (vinculada) return [...lista, vinculada];
    return lista;
  }, [form.condominioId, form.unidadeId, unidadesVisiveis]);

  const emptyState = (
    <EmptyState
      icon={<Icon icon={Receipt} size="lg" />}
      title={debitos.length === 0 ? "Nenhum débito cadastrado" : "Nenhum débito encontrado"}
      description={
        debitos.length === 0
          ? "Cadastre os encargos das unidades ou importe o relatório da administradora."
          : "Ajuste a busca ou os filtros."
      }
      action={
        pode("debitos", "criar") ? (
          <Button size="sm" onClick={openCreate}>
            <Icon icon={Plus} size="sm" />
            Nova inadimplência
          </Button>
        ) : undefined
      }
    />
  );

  function rotuloFonteValores(item: Debito) {
    if (item.fonteValores === "manual") return "Correção manual";
    return item.origem ? `Origem: ${item.origem}` : "Valores da origem";
  }

  function metricasPrazoDebito(item: Debito) {
    if (!item.dataVencimento || item.dataVencimento > appliedDataBase) return null;
    return computeDelinquencyTrackingForDebt(item.condominioId, item.dataVencimento, appliedDataBase, cadastros);
  }

  function celulaDias(item: Debito) {
    const metricas = metricasPrazoDebito(item);
    if (!metricas) return "—";
    return (
      <div className="flex flex-col items-center gap-xs">
        <span
          className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-error-container px-sm py-xs text-label-sm tabular-nums text-status-critical"
          title={`Prazo do condomínio: ${metricas.trackingDays} dias`}
        >
          {metricas.elapsedDays}
        </span>
        <DelinquencyTrackingBadge status={metricas.status} />
      </div>
    );
  }

  function celulaDiasRestantes(item: Debito) {
    const metricas = metricasPrazoDebito(item);
    if (!metricas || metricas.status === "no_arrears") return "—";
    return (
      <span className="tabular-nums text-body-sm text-on-surface">
        {metricas.remainingDays}
        <span className="text-on-surface-variant"> / {metricas.trackingDays}</span>
      </span>
    );
  }

  function linhasExportacao() {
    if (visao === "condominio") {
      return visible.map((item) => {
        const unidade = cadastros.unidades.find((u) => u.id === item.unidadeId);
        return [
          nomeCondominio(item.condominioId, cadastros),
          unidade?.identificacao ?? nomeUnidade(item.unidadeId, cadastros),
          grupoDebito(item.descricao) || item.descricao || "—",
          item.referencia,
          formatarData(item.dataVencimento),
          formatarMoeda(item.valorOriginal || item.valor),
          formatarMoeda(item.juros),
          formatarMoeda(item.multa),
          formatarMoeda(item.correcao),
          formatarMoeda(item.valorAtualizado),
          item.status,
        ];
      });
    }
    return visible.map((item) => [
      item.referencia,
      nomeUnidade(item.unidadeId, cadastros),
      grupoDebito(item.descricao),
      formatarData(item.dataVencimento),
      (() => {
        const metricas = metricasPrazoDebito(item);
        return metricas ? String(metricas.elapsedDays) : "—";
      })(),
      formatarMoeda(item.valorOriginal),
      formatarMoeda(item.valorAtualizado),
      item.status,
      rotuloFonteValores(item),
      formatarData(item.atualizadoEm),
    ]);
  }

  function abrirImportacao() {
    importacaoWizardRef.current?.abrir("debitos");
  }

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou cadastre débitos no escopo.",
      });
      return;
    }
    const colunas =
      visao === "condominio"
        ? [
            "Condomínio",
            "Unidade",
            "Lançamento",
            "Mês ref.",
            "Vencimento",
            "Valor",
            "Juros",
            "Multa",
            "Correção",
            "Proj. rec.",
            "Situação",
          ]
        : [
            "Referência",
            "Unidade",
            "Tipo",
            "Vencimento",
            "Dias",
            "Original",
            "Atualizado",
            "Situação",
            "Origem",
            "Atualização",
          ];
    const linhas = linhasExportacao();
    const arquivoBase = `inadimplencia-${appliedDataBase}`;
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
    const abriu = exportarPdf("Inadimplência", `${arquivoBase}.html`, [
      { titulo: "Registros (filtros aplicados)", colunas, linhas },
    ]);
    if (abriu) {
      toast({ variant: "success", title: "PDF", description: "Use imprimir ou salvar como PDF no navegador." });
    } else {
      toast({ variant: "error", title: "Não foi possível abrir a visualização para impressão." });
    }
  }

  const desktopTableGeral = (
    <Table aria-label="Inadimplência geral" showExport={false}>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("referencia")} onSort={() => handleSort("referencia")}>
            Referência
          </TableHead>
          <TableHead sortable sortDirection={directionFor("unidade")} onSort={() => handleSort("unidade")}>
            Unidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("grupo")} onSort={() => handleSort("grupo")}>
            Tipo
          </TableHead>
          <TableHead sortable sortDirection={directionFor("vencimento")} onSort={() => handleSort("vencimento")}>
            Vencimento
          </TableHead>
          <TableHead align="center" sortable sortDirection={directionFor("dias")} onSort={() => handleSort("dias")}>
            Dias em atraso
          </TableHead>
          <TableHead align="center">Restantes</TableHead>
          <TableHead align="center" sortable sortDirection={directionFor("original")} onSort={() => handleSort("original")}>
            Original
          </TableHead>
          <TableHead align="right" sortable sortDirection={directionFor("atualizado")} onSort={() => handleSort("atualizado")}>
            Atualizado
          </TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Situação
          </TableHead>
          <TableHead>Origem / atualização</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={11}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.referencia}</TableCell>
              <TableCell>{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
              <TableCell>{grupoDebito(item.descricao)}</TableCell>
              <TableCell>{formatarData(item.dataVencimento)}</TableCell>
              <TableCell>{celulaDias(item)}</TableCell>
              <TableCell align="right" className="tabular-nums">
                {formatarMoeda(item.valorOriginal)}
              </TableCell>
              <TableCell align="right" className="tabular-nums">
                {formatarMoeda(item.valorAtualizado)}
              </TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell className="text-body-sm text-on-surface-variant">
                <span className="block">{rotuloFonteValores(item)}</span>
                <span className="block tabular-nums">{formatarData(item.atualizadoEm)}</span>
              </TableCell>
              <TableActionsCell label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const mobileTableGeral =
    visible.length === 0 ? (
      <TableMobileEmpty>{emptyState}</TableMobileEmpty>
    ) : (
      <TableMobileList aria-label="Inadimplência geral">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                aria-hidden="true"
              >
                <Icon icon={Receipt} size="sm" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {item.referencia}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">{nomeUnidade(item.unidadeId, cadastros)}</p>
              </div>
              <TableActionsButton label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Valor atualizado</p>
                  <p className="text-body-md font-semibold tabular-nums text-on-surface">
                    {formatarMoeda(item.valorAtualizado)}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    Original {formatarMoeda(item.valorOriginal)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-xs">
                  <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                  {celulaDias(item)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Vencimento</p>
                  <p className="text-body-md text-on-surface">{formatarData(item.dataVencimento)}</p>
                </div>
                <div className="min-w-0 text-end">
                  <p className="text-label-sm uppercase text-on-surface-variant">Tipo</p>
                  <p className="text-body-md text-on-surface">{grupoDebito(item.descricao)}</p>
                </div>
              </div>
              <TableMobileField label="Origem / atualização" stacked>
                <span className="block">{rotuloFonteValores(item)}</span>
                <span className="block tabular-nums text-on-surface-variant">{formatarData(item.atualizadoEm)}</span>
              </TableMobileField>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  const desktopTableCondominio = (
    <InadimplenciaPorCondominioLista
      condominios={gruposCondominio}
      emptyState={emptyState}
      acoes={acoes}
      variante="desktop"
      descricaoPrazoCondominio={descricaoPrazoCondominio}
    />
  );

  const mobileTableCondominio = (
    <InadimplenciaPorCondominioLista
      condominios={gruposCondominio}
      emptyState={emptyState}
      acoes={acoes}
      variante="mobile"
      descricaoPrazoCondominio={descricaoPrazoCondominio}
    />
  );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={Wallet}
        title="Inadimplência"
        description="Débitos em aberto na data-base, com valor original, valor atualizado e o corte entre a fase amigável e o jurídico."
        actions={
          pode("debitos", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Nova inadimplência
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        {authLoading ? (
          <SkeletonListPage metrics={4} rows={8} cols={6} label="Carregando inadimplência" />
        ) : (
        <>
        <section aria-label="Indicadores de inadimplência">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2 min-[768px]:hidden">
            <KpiMobileCard rotulo="Valor original" valor={moeda(totalOriginal)} icon={Receipt} destaque />
            <KpiMobileCard rotulo="Valor atualizado" valor={moeda(totalAtualizado)} icon={Wallet} />
            <KpiMobileCard rotulo={rotuloDentroPrazo} valor={moeda(ateLimite)} icon={Clock} />
            <KpiMobileCard rotulo={rotuloAcimaPrazo} valor={moeda(acimaLimite)} icon={Scale} />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4">
            <CardMetric
              accent="brass"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Receipt} size="md" className="text-brass" />}
              rotulo="Valor original"
              valor={moeda(totalOriginal)}
            />
            <CardMetric
              accent="primary"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={Wallet} size="md" className="text-primary-container" />}
              rotulo="Valor atualizado"
              valor={moeda(totalAtualizado)}
            />
            <CardMetric
              accent="tertiary"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={Clock} size="md" className="text-tertiary-container" />}
              rotulo={rotuloDentroPrazo}
              valor={moeda(ateLimite)}
            />
            <CardMetric
              accent="critical"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={Scale} size="md" className="text-status-critical" />}
              rotulo={rotuloAcimaPrazo}
              valor={moeda(acimaLimite)}
            />
          </div>
        </section>

        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar débito, unidade, condomínio..."
            onApply={handleApply}
            onClear={handleClear}
            defaultMobile="grid"
            fields={[
            {
              id: "periodo",
              label: "Período",
              type: "period",
              value: periodo,
              onChange: setPeriodo,
            },
            {
              id: "data-base",
              label: "Data-base",
              type: "date",
              value: dataBase,
              onChange: setDataBase,
            },
            {
              id: "condominio",
              label: "Condomínio",
              value: condominioId,
              onChange: setCondominioId,
              options: [
                { value: "todos", label: "Todos" },
                ...condominiosOrdenados.map((item) => ({ value: String(item.id), label: item.nome })),
              ],
            },
            {
              id: "unidade",
              label: "Unidade",
              value: unidadeId,
              onChange: setUnidadeId,
              options: [
                { value: "todas", label: "Todas" },
                ...cadastros.unidades.map((item) => ({
                  value: String(item.id),
                  label: `${nomeUnidade(item.id, cadastros)}`,
                })),
              ],
            },
            {
              id: "cidade",
              label: "Cidade",
              value: cidade,
              onChange: setCidade,
              options: [
                { value: "todas", label: "Todas" },
                ...cidades.map((item) => ({ value: item, label: item })),
              ],
            },
            {
              id: "situacao",
              label: "Situação do débito",
              value: status,
              onChange: setStatus,
              options: [
                { value: "todos", label: "Todas" },
                ...statusDebito.map((item) => ({ value: item, label: item })),
              ],
            },
            {
              id: "situacao-cobranca",
              label: "Situação de cobrança",
              value: situacaoCobranca,
              onChange: setSituacaoCobranca,
              options: [
                { value: "todas", label: "Todas" },
                ...situacoesUnidade.map((item) => ({ value: item, label: item })),
              ],
            },
            {
              id: "origem",
              label: "Origem dos dados",
              value: origem,
              onChange: setOrigem,
              options: [
                { value: "todas", label: "Todas" },
                ...origensDebito.map((item) => ({ value: item, label: item })),
              ],
            },
            ]}
          />
        </FiltrosSection>

        <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card min-[768px]:p-lg">
          <div className="grid grid-cols-1 gap-lg min-[768px]:grid-cols-2 min-[768px]:items-stretch min-[768px]:gap-0">
            <div className="flex min-w-0 flex-col gap-md min-[768px]:pr-lg">
              <div>
                <h3 className="text-label-lg text-on-surface">Inadimplência das unidades</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {unidadesCarteira > 0
                    ? `${unidadesDevedoras} de ${unidadesCarteira} unidades com débito vencido na data-base ${formatarData(appliedDataBase)}${
                        unidadesPrescritasRecorte > 0
                          ? ` · ${unidadesPrescritasRecorte} unidade(s) prescrita(s) no recorte`
                          : ""
                      }`
                    : "Sem unidades no recorte filtrado"}
                </p>
              </div>
              {unidadesCarteira > 0 ? (
                <GraficoRosca
                  chave={`${chaveGraficos}-unidades`}
                  vazio={vazioGrafico}
                  centro={percentualUnidades === null ? "—" : percentual(percentualUnidades)}
                  legenda="unidades"
                  fatias={[
                    {
                      nome: "Com débito vencido",
                      valor: unidadesDevedoras,
                      detalhe:
                        percentualUnidades === null
                          ? String(unidadesDevedoras)
                          : `${unidadesDevedoras} · ${percentual(percentualUnidades)}`,
                      tom: "critical",
                    },
                    {
                      nome: "Sem débito vencido",
                      valor: unidadesEmDia,
                      detalhe:
                        percentualUnidades === null
                          ? String(unidadesEmDia)
                          : `${unidadesEmDia} · ${percentual(100 - percentualUnidades)}`,
                      tom: "navy",
                    },
                  ]}
                />
              ) : (
                vazioGrafico
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-md border-t border-border-subtle pt-lg min-[768px]:border-l min-[768px]:border-t-0 min-[768px]:pl-lg min-[768px]:pt-0">
              <div>
                <h3 className="text-label-lg text-on-surface">Valor por faixa de atraso</h3>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {totalAtualizado > 0
                    ? corte
                      ? `Total atualizado em aberto ${moeda(totalAtualizado)} · corte ${formatarData(corte)} (${prazoReferenciaKpi} dias)`
                      : `Total atualizado em aberto ${moeda(totalAtualizado)} · prazos individuais por condomínio`
                    : "Sem valor em aberto no recorte filtrado"}
                </p>
              </div>
              <GraficoBarras
                chave={`${chaveGraficos}-faixas`}
                vazio={vazioGrafico}
                itens={[
                  {
                    nome: rotuloDentroPrazo,
                    valor: ateLimite,
                    detalhe:
                      percentualValorAte === null
                        ? moeda(ateLimite)
                        : `${moeda(ateLimite)} · ${percentual(percentualValorAte)}`,
                    tom: "brass",
                  },
                  {
                    nome: rotuloAcimaPrazo,
                    valor: acimaLimite,
                    detalhe:
                      percentualValorAcima === null
                        ? moeda(acimaLimite)
                        : `${moeda(acimaLimite)} · ${percentual(percentualValorAcima)}`,
                    tom: "critical",
                  },
                ]}
              />
            </div>
          </div>
        </section>

        <Tabs
          value={visao}
          onValueChange={(value) => {
            setVisao(value as VisaoListagem);
            setPage(1);
          }}
          defaultValue="condominio"
          className="flex flex-col gap-md"
        >
          <div className="flex flex-col gap-sm border-b border-border-subtle min-[768px]:flex-row min-[768px]:items-end min-[768px]:justify-between">
            <TabsList className="min-w-0 w-full border-b-0 min-[768px]:w-auto">
              <TabsTrigger value="condominio">Por condomínio</TabsTrigger>
              <TabsTrigger value="geral">Geral</TabsTrigger>
            </TabsList>
            <TableDataBar
              className="w-full shrink-0 justify-end pb-sm min-[768px]:w-auto"
              onExport={aoExportar}
              onImport={abrirImportacao}
              showImport={podeImportar}
            />
          </div>
          <TabsContent value="condominio" className="flex flex-col gap-md !bg-transparent !p-0">
            <ResponsiveTable
              desktop={desktopTableCondominio}
              mobile={mobileTableCondominio}
              onExport={aoExportar}
              onImport={abrirImportacao}
              showImport={podeImportar}
              showExport={false}
            />
          </TabsContent>
          <TabsContent value="geral" className="flex flex-col gap-md !bg-transparent !p-0">
            <ResponsiveTable
              desktop={desktopTableGeral}
              mobile={mobileTableGeral}
              onExport={aoExportar}
              onImport={abrirImportacao}
              showImport={podeImportar}
              showExport={false}
            />
            {visible.length > 0 ? (
              <Pagination page={currentPage} total={visible.length} onPageChange={setPage} />
            ) : null}
          </TabsContent>
        </Tabs>
        </>
        )}
      </PageContent>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (open) setSheetOpen(true);
          else closeSheet();
        }}
      >
        <SheetContent aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-desc`}>
          <SheetForm noValidate onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={Receipt} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{editingId === null ? "Novo débito" : "Editar débito"}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Encargo da unidade, com valor original e valor atualizado.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                    <Select
                      id={`${formId}-condominio`}
                      icon={Building2}
                      value={form.condominioId}
                      invalid={Boolean(errors.condominioId)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, condominioId: event.target.value, unidadeId: "" }))
                      }
                    >
                      <option value="">Selecione</option>
                      {condominiosVisiveis.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nome}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Unidade" htmlFor={`${formId}-unidade`} required error={errors.unidadeId}>
                    <Select
                      id={`${formId}-unidade`}
                      icon={DoorOpen}
                      value={form.unidadeId}
                      invalid={Boolean(errors.unidadeId)}
                      onChange={(event) => setForm((current) => ({ ...current, unidadeId: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {unidadesDoCondominio.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {rotuloUnidadeForm(item)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Referência" htmlFor={`${formId}-referencia`} required error={errors.referencia}>
                    <Input
                      id={`${formId}-referencia`}
                      icon={Hash}
                      value={form.referencia}
                      invalid={Boolean(errors.referencia)}
                      onChange={(event) => setForm((current) => ({ ...current, referencia: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
                    <Input
                      id={`${formId}-descricao`}
                      icon={FileText}
                      value={form.descricao}
                      onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Origem" htmlFor={`${formId}-origem`}>
                    <Select
                      id={`${formId}-origem`}
                      icon={Layers}
                      value={form.origem}
                      onChange={(event) => setForm((current) => ({ ...current, origem: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {origensDebito.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Identificador externo" htmlFor={`${formId}-externo`}>
                    <Input
                      id={`${formId}-externo`}
                      icon={Link2}
                      value={form.identificadorExterno}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, identificadorExterno: event.target.value }))
                      }
                    />
                  </FormField>
                </>
              ) : step === 1 ? (
                <>
                  <FormField label="Vencimento" htmlFor={`${formId}-vencimento`} required error={errors.dataVencimento}>
                    <Input
                      id={`${formId}-vencimento`}
                      icon={Calendar}
                      type="date"
                      value={form.dataVencimento}
                      invalid={Boolean(errors.dataVencimento)}
                      onChange={(event) => setForm((current) => ({ ...current, dataVencimento: event.target.value }))}
                    />
                  </FormField>
                  {form.condominioId && form.dataVencimento ? (() => {
                    const metricas = computeDelinquencyTrackingForDebt(
                      Number(form.condominioId),
                      form.dataVencimento,
                      appliedDataBase,
                      cadastros,
                    );
                    return (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-md text-body-sm text-on-surface">
                        <p className="font-semibold text-on-surface">Acompanhamento do prazo</p>
                        <p className="mt-xs text-on-surface-variant">
                          Prazo do condomínio: {metricas.trackingDays} dias
                          {metricas.usesDefaultTrackingDays ? " (padrão do sistema)" : ""}
                        </p>
                        <p className="tabular-nums">
                          {metricas.elapsedDays} dias transcorridos · {metricas.remainingDays} dias restantes
                        </p>
                        <div className="mt-sm">
                          <DelinquencyTrackingBadge status={metricas.status} />
                        </div>
                      </div>
                    );
                  })() : null}
                  <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
                    <Select
                      id={`${formId}-status`}
                      icon={Flag}
                      value={form.status}
                      invalid={Boolean(errors.status)}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {statusDebito.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Valor" htmlFor={`${formId}-valor`} error={errors.valor}>
                    <Input
                      id={`${formId}-valor`}
                      icon={Wallet}
                      inputMode="decimal"
                      value={form.valor}
                      invalid={Boolean(errors.valor)}
                      onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor original" htmlFor={`${formId}-original`} error={errors.valorOriginal}>
                    <Input
                      id={`${formId}-original`}
                      icon={Wallet}
                      inputMode="decimal"
                      value={form.valorOriginal}
                      invalid={Boolean(errors.valorOriginal)}
                      onChange={(event) => setForm((current) => ({ ...current, valorOriginal: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Multa" htmlFor={`${formId}-multa`} error={errors.multa}>
                    <Input
                      id={`${formId}-multa`}
                      icon={Percent}
                      inputMode="decimal"
                      value={form.multa}
                      invalid={Boolean(errors.multa)}
                      onChange={(event) => setForm((current) => ({ ...current, multa: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Juros" htmlFor={`${formId}-juros`} error={errors.juros}>
                    <Input
                      id={`${formId}-juros`}
                      icon={Percent}
                      inputMode="decimal"
                      value={form.juros}
                      invalid={Boolean(errors.juros)}
                      onChange={(event) => setForm((current) => ({ ...current, juros: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Correção" htmlFor={`${formId}-correcao`} error={errors.correcao}>
                    <Input
                      id={`${formId}-correcao`}
                      icon={Percent}
                      inputMode="decimal"
                      value={form.correcao}
                      invalid={Boolean(errors.correcao)}
                      onChange={(event) => setForm((current) => ({ ...current, correcao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor atualizado" htmlFor={`${formId}-atualizado`} error={errors.valorAtualizado}>
                    <Input
                      id={`${formId}-atualizado`}
                      icon={Wallet}
                      inputMode="decimal"
                      value={form.valorAtualizado}
                      invalid={Boolean(errors.valorAtualizado)}
                      onChange={(event) => setForm((current) => ({ ...current, valorAtualizado: event.target.value }))}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Data do pagamento" htmlFor={`${formId}-pagamento`}>
                    <Input
                      id={`${formId}-pagamento`}
                      icon={Calendar}
                      type="date"
                      value={form.dataPagamento}
                      onChange={(event) => setForm((current) => ({ ...current, dataPagamento: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor pago" htmlFor={`${formId}-pago`} error={errors.valorPago}>
                    <Input
                      id={`${formId}-pago`}
                      icon={Wallet}
                      inputMode="decimal"
                      value={form.valorPago}
                      invalid={Boolean(errors.valorPago)}
                      onChange={(event) => setForm((current) => ({ ...current, valorPago: event.target.value }))}
                    />
                  </FormField>
                </>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              saveDisabled={carregandoEdicao}
              onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
              saveLabel={step < etapas.length - 1 ? "Continuar" : "Salvar"}
            />
          </SheetForm>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Tem certeza que quer sair?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Sair"
        cancelLabel="Permanecer"
        confirmVariant="critical"
        onConfirm={confirmLeave}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir débito?"
        description={deleteTarget ? `A referência ${deleteTarget.referencia} será removida.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
      {podeImportar ? (
        <ImportacaoWizardSheet
          ref={importacaoWizardRef}
          moduloInicial="debitos"
          moduloTravado
          onConcluida={() => void recarregarDebitosDoServidor()}
        />
      ) : null}
    </WorkspaceShell>
  );
}

export default function DebitosPageRoute() {
  return (
    <Suspense fallback={<SkeletonListPage metrics={4} label="Carregando" />}>
      <DebitosPage />
    </Suspense>
  );
}