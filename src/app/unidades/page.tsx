"use client";

import { useEffect, useId, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import {
  ImportacaoWizardSheet,
  type ImportacaoWizardHandle,
} from "@/components/importacao-wizard/importacao-wizard-sheet";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Flag,
  Star,
  CreditCard,
  DoorOpen,
  Eye,
  FileText,
  Hash,
  Layers,
  LayoutGrid,
  Link2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Scale,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAgendarAtendimento } from "@/context/agendar-atendimento-context";
import { digitosTelefone, formatarTelefone } from "@/lib/telefone";
import { mascararEmail, mascararTelefone, podeVerDadosPessoaisResponsavel } from "@/lib/privacidade/dados-pessoais";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { FormSteps } from "@/components/form-steps";
import { FormField, Input, Select } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHelpText,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
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
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { UnidadeDetalheSheet } from "@/components/unidade-detalhe-sheet";
import {
  agruparUnidadesPorCondominio,
  UnidadesPorCondominioLista,
} from "@/components/unidades/unidades-por-condominio-lista";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { garantirCondominiosPersistidosNoServidor } from "@/lib/condominios/ensure-server-sync";
import { useAuth } from "@/context/auth-context";
import { diasDeAtraso, escopoCondominios, escopoUnidades, formatarMoeda, nomeCondominio, SITUACAO_COBRANCA_PADRAO, situacaoCobrancaUnidade, situacoesUnidade, statusUnidade, tiposPessoa, tiposUnidade, tiposVinculo, unidadeComDebitoOperacional, unidadeNaFilaCobrancaAtiva, type Responsavel, type Unidade, type Vinculo } from "@/data/catalogo";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";

type SortKey = "identificacao" | "condominio" | "tipo" | "status" | "debito";
type VisaoListagem = "geral" | "condominio";
const etapasCadastroUnidade = ["Unidade", "Responsável"] as const;

const unidadesMobileDataBarClassName =
  "grid w-full grid-cols-2 gap-sm [&>button]:min-h-11 [&>button]:w-full [&>button]:justify-center [&>button]:text-label-md";

const formularioVazio = {
  condominioId: "",
  identificacao: "",
  bloco: "",
  tipo: "",
  status: "Ativa",
  situacao: SITUACAO_COBRANCA_PADRAO,
};

const responsavelFormVazio = {
  modo: "novo" as "novo" | "existente",
  responsavelId: "",
  nome: "",
  cpfCnpj: "",
  tipoPessoa: "Fisica",
  telefone: "",
  whatsapp: "",
  email: "",
  tipoVinculo: "Proprietario",
  principal: true,
  observacoes: "",
};

type SituacaoCobrancaForm = (typeof situacoesUnidade)[number];

type ErrosUnidade = Partial<Record<"condominioId" | "identificacao" | "tipo" | "status" | "situacao", string>>;
type ErrosResponsavel = Partial<
  Record<"responsavelId" | "nome" | "cpfCnpj" | "tipoVinculo" | "email", string>
>;

const badgeStatus: Record<string, "success" | "error"> = { Ativa: "success", Inativa: "error" };

function UnidadesPage() {
  const { toast } = useToast();
  const { pode, permissoes } = usePermissao();
  const { abrir: abrirAgendar } = useAgendarAtendimento();
  const podeImportar = pode("importacoes", "criar");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const importacaoWizardRef = useRef<ImportacaoWizardHandle>(null);
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const userIdEscopo = user?.userId;
  const condominiosVisiveis = useMemo(
    () => (userIdEscopo == null ? [] : escopoCondominios(cadastros, userIdEscopo)),
    [cadastros, userIdEscopo],
  );
  const unidades = useMemo(
    () => (userIdEscopo == null ? [] : escopoUnidades(cadastros, userIdEscopo)),
    [cadastros, userIdEscopo],
  );
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [search, setSearch] = useState("");
  const [condominio, setCondominio] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [cobranca, setCobranca] = useState("todos");
  const [debito, setDebito] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCondominio, setAppliedCondominio] = useState("todos");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedCobranca, setAppliedCobranca] = useState("todos");
  const [appliedDebito, setAppliedDebito] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("identificacao");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [visao, setVisao] = useState<VisaoListagem>("condominio");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Unidade | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(formularioVazio);
  const [baseline, setBaseline] = useState(formularioVazio);
  const [responsavelForm, setResponsavelForm] = useState(responsavelFormVazio);
  const [baselineResponsavel, setBaselineResponsavel] = useState(responsavelFormVazio);
  const [errors, setErrors] = useState<ErrosUnidade>({});
  const [errorsResponsavel, setErrorsResponsavel] = useState<ErrosResponsavel>({});
  const [detalheVersao, setDetalheVersao] = useState(0);

  async function recarregarUnidadesDoServidor() {
    const response = await fetch("/api/unidades", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      unidades?: Unidade[];
      vinculos?: Vinculo[];
      responsaveis?: Responsavel[];
    };
    if (payload.unidades) void refetch()
    if (payload.responsaveis || payload.vinculos) {
      void refetch()
    }
  }

  async function recarregarDebitosDoServidor() {
    const response = await fetch("/api/debitos", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { debitos?: import("@/data/catalogo").Debito[] };
    if (payload.debitos) void refetch()
  }

  async function prepararCondominiosParaSalvar(): Promise<boolean> {
    const sync = await garantirCondominiosPersistidosNoServidor(user?.userId);
    if (sync.ok) return true;
    toast({
      variant: "error",
      title: "Condomínio não disponível",
      description: sync.error,
    });
    setErrors({ condominioId: sync.error });
    setStep(0);
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await garantirCondominiosPersistidosNoServidor(user?.userId);
      if (cancelled) return;
      await recarregarUnidadesDoServidor();
      if (cancelled) return;
      await recarregarDebitosDoServidor();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  useEffect(() => {
    const condominioQuery = searchParams?.get("condominio");
    if (!condominioQuery) return;
    const existe = escopoCondominios(cadastros, user?.userId).some((item) => String(item.id) === condominioQuery);
    if (!existe) return;
    setCondominio(condominioQuery);
    setAppliedCondominio(condominioQuery);
    setPage(1);
    if (searchParams?.get("novo") !== "1") return;
    const inicial = { ...formularioVazio, condominioId: condominioQuery };
    setEditingId(null);
    setStep(0);
    setForm(inicial);
    setBaseline(inicial);
    setResponsavelForm(responsavelFormVazio);
    setBaselineResponsavel(responsavelFormVazio);
    setErrors({});
    setErrorsResponsavel({});
    setSheetOpen(true);
    router.replace(`/unidades?condominio=${condominioQuery}`);
  }, [router, searchParams, user?.userId]);

  const debitosAbertos = new Map<number, number>();
  const diasAtrasoMax = new Map<number, number>();
  for (const item of cadastros.debitos) {
    if (item.status !== "Pendente" && item.status !== "Vencido") continue;
    debitosAbertos.set(item.unidadeId, (debitosAbertos.get(item.unidadeId) ?? 0) + Number(item.valorAtualizado || 0));
    const dias = diasDeAtraso(item.dataVencimento);
    diasAtrasoMax.set(item.unidadeId, Math.max(diasAtrasoMax.get(item.unidadeId) ?? 0, dias));
  }

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  function emDebitoOperacional(item: Unidade) {
    return unidadeComDebitoOperacional(item, debitosAbertos.has(item.id));
  }

  const visible = unidades
    .filter((item) => {
      const emDebito = emDebitoOperacional(item);
      const matchesCondominio = appliedCondominio === "todos" || String(item.condominioId) === appliedCondominio;
      const matchesStatus = appliedStatus === "todos" || item.status === appliedStatus;
      const situacaoCobranca = situacaoCobrancaUnidade(item);
      const matchesCobranca = appliedCobranca === "todos" || situacaoCobranca === appliedCobranca;
      const matchesDebito = appliedDebito === "todos" || (appliedDebito === "devendo" ? emDebito : !emDebito);
      const haystack = `${item.identificacao} ${item.bloco} ${nomeCondominio(item.condominioId, cadastros)}`.toLocaleLowerCase("pt-BR");
      return (
        matchesCondominio &&
        matchesStatus &&
        matchesCobranca &&
        matchesDebito &&
        (query.length === 0 || haystack.includes(query))
      );
    })
    .sort((a, b) => {
      if (visao === "condominio") {
        const condo = nomeCondominio(a.condominioId, cadastros).localeCompare(nomeCondominio(b.condominioId, cadastros), "pt-BR");
        if (condo !== 0) return condo;
        return a.identificacao.localeCompare(b.identificacao, "pt-BR");
      }
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "debito") {
        const valorA = emDebitoOperacional(a) ? (debitosAbertos.get(a.id) ?? 0) : 0;
        const valorB = emDebitoOperacional(b) ? (debitosAbertos.get(b.id) ?? 0) : 0;
        return (valorA - valorB) * factor;
      }
      const left =
        sortKey === "condominio"
          ? nomeCondominio(a.condominioId, cadastros)
          : sortKey === "tipo"
            ? a.tipo
            : sortKey === "status"
              ? a.status
              : a.identificacao;
      const right =
        sortKey === "condominio"
          ? nomeCondominio(b.condominioId, cadastros)
          : sortKey === "tipo"
            ? b.tipo
            : sortKey === "status"
              ? b.status
              : b.identificacao;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const gruposCondominio = useMemo(() => agruparUnidadesPorCondominio(visible, cadastros), [visible, cadastros]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const ativas = visible.filter((item) => item.status === "Ativa").length;
  const devendo = visible.filter((item) => emDebitoOperacional(item)).length;
  const emCobranca = visible.filter(
    (item) => situacaoCobrancaUnidade(item) !== "Sem cobrança",
  ).length;
  const metricValor = (n: number) => String(n).padStart(2, "0");

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("identificacao");
    setSortDirection("asc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedCondominio(condominio);
    setAppliedStatus(status);
    setAppliedCobranca(cobranca);
    setAppliedDebito(debito);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setCondominio("todos");
    setStatus("todos");
    setCobranca("todos");
    setDebito("todos");
    setAppliedSearch("");
    setAppliedCondominio("todos");
    setAppliedStatus("todos");
    setAppliedCobranca("todos");
    setAppliedDebito("todos");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setStep(0);
    setForm(formularioVazio);
    setBaseline(formularioVazio);
    setResponsavelForm(responsavelFormVazio);
    setBaselineResponsavel(responsavelFormVazio);
    setErrors({});
    setErrorsResponsavel({});
    setSheetOpen(true);
  }

  function openEdit(item: Unidade) {
    const atual = cadastros.unidades.find((u) => u.id === item.id) ?? item;
    const preenchido = {
      condominioId: String(atual.condominioId),
      identificacao: atual.identificacao,
      bloco: atual.bloco ?? "",
      tipo: atual.tipo,
      status: atual.status,
      situacao: situacaoCobrancaUnidade(atual) as SituacaoCobrancaForm,
    };
    setEditingId(item.id);
    setStep(0);
    setForm(preenchido);
    setBaseline(preenchido);
    setErrors({});
    setErrorsResponsavel({});
    setSheetOpen(true);
  }

  function formularioSujo() {
    const unidadeSujou = (Object.keys(formularioVazio) as Array<keyof typeof formularioVazio>).some(
      (key) => form[key] !== baseline[key],
    );
    const respSujou = (Object.keys(responsavelFormVazio) as Array<keyof typeof responsavelFormVazio>).some(
      (key) => responsavelForm[key] !== baselineResponsavel[key],
    );
    return unidadeSujou || (editingId === null && respSujou);
  }

  function closeSheet() {
    if (formularioSujo()) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setStep(0);
    setSheetOpen(false);
  }

  function validarEtapaUnidade() {
    const identificacao = form.identificacao.trim();
    const situacao = form.situacao.trim() || SITUACAO_COBRANCA_PADRAO;
    const nextErrors: ErrosUnidade = {};
    if (!form.condominioId) nextErrors.condominioId = "Selecione o condomínio.";
    if (!identificacao) nextErrors.identificacao = "Informe a identificação da unidade.";
    else if (
      unidades.some(
        (item) =>
          item.id !== editingId &&
          item.condominioId === Number(form.condominioId) &&
          item.identificacao.localeCompare(identificacao, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      nextErrors.identificacao = "Já existe esta identificação neste condomínio.";
    }
    if (!form.tipo) nextErrors.tipo = "Selecione o tipo.";
    if (!form.status) nextErrors.status = "Selecione a situação.";
    if (!situacoesUnidade.includes(situacao as (typeof situacoesUnidade)[number])) {
      nextErrors.situacao = "Selecione uma situação de cobrança válida.";
    }
    return { nextErrors, identificacao, situacao };
  }

  function responsavelPreenchido() {
    if (responsavelForm.modo === "existente") return Boolean(responsavelForm.responsavelId);
    return Boolean(responsavelForm.nome.trim() || responsavelForm.cpfCnpj.trim());
  }

  function validarEtapaResponsavel() {
    const nextErrors: ErrosResponsavel = {};
    if (!responsavelPreenchido()) return { nextErrors, pular: true as const };

    if (responsavelForm.modo === "existente") {
      if (!responsavelForm.responsavelId) nextErrors.responsavelId = "Selecione o responsável.";
    } else {
      if (!responsavelForm.nome.trim()) nextErrors.nome = "Informe o nome.";
      if (!responsavelForm.cpfCnpj.trim()) nextErrors.cpfCnpj = "Informe o CPF ou CNPJ.";
    }
    if (!responsavelForm.tipoVinculo) nextErrors.tipoVinculo = "Selecione o tipo de vínculo.";
    return { nextErrors, pular: false as const };
  }

  function montarPayloadVinculo() {
    if (responsavelForm.modo === "existente") {
      return {
        responsavelId: Number(responsavelForm.responsavelId),
        tipoVinculo: responsavelForm.tipoVinculo,
        principal: responsavelForm.principal,
        observacoes: responsavelForm.observacoes.trim(),
      };
    }
    return {
      tipoVinculo: responsavelForm.tipoVinculo,
      principal: responsavelForm.principal,
      observacoes: responsavelForm.observacoes.trim(),
      responsavel: {
        nome: responsavelForm.nome.trim(),
        cpfCnpj: responsavelForm.cpfCnpj.trim(),
        tipoPessoa: responsavelForm.tipoPessoa,
        telefone: digitosTelefone(responsavelForm.telefone),
        whatsapp: digitosTelefone(responsavelForm.whatsapp),
        email: responsavelForm.email.trim(),
        endereco: "",
        observacoes: "",
      },
    };
  }

  async function salvarUnidadeApi(payload: {
    condominioId: number;
    identificacao: string;
    bloco: string;
    tipo: string;
    status: string;
    situacao: string;
  }) {
    const url = editingId === null ? "/api/unidades" : `/api/unidades/${editingId}`;
    const method = editingId === null ? "POST" : "PATCH";
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { unidade?: Unidade; error?: string };
    return { response, body };
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const response = await fetch(`/api/unidades/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast({
        variant: "error",
        title: "Não foi possível excluir",
        description: payload.error ?? "Verifique permissões ou histórico da unidade.",
      });
      setDeleteTarget(null);
      return;
    }
    aplicarUnidadeExcluida(deleteTarget.id);
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    if (detalheId === deleteTarget.id) setDetalheId(null);
    toast({ variant: "success", title: "Unidade excluída" });
    setDeleteTarget(null);
  }

  function contatoResponsavel(unidadeId: number) {
    const vinculosDaUnidade = cadastros.vinculos.filter((item) => item.unidadeId === unidadeId);
    const vinculo = vinculosDaUnidade.find((item) => item.principal) ?? vinculosDaUnidade[0];
    const responsavel = vinculo && cadastros.responsaveis.find((item) => item.id === vinculo.responsavelId);
    if (!responsavel) return null;
    if (podeVerDadosPessoaisResponsavel(permissoes)) {
      return {
        nome: responsavel.nome,
        telefone: responsavel.telefone.trim() ? formatarTelefone(responsavel.telefone) : "",
        email: responsavel.email.trim(),
      };
    }
    return {
      nome: responsavel.nome,
      telefone: mascararTelefone(responsavel.telefone),
      email: mascararEmail(responsavel.email),
    };
  }

  function celulaResponsavel(item: Unidade) {
    const contato = contatoResponsavel(item.id);
    if (!contato) return <span className="text-on-surface-variant">—</span>;
    return <span className="block truncate text-center text-on-surface">{contato.nome}</span>;
  }

  function celulaDebito(item: Unidade) {
    if (emDebitoOperacional(item)) {
      const valor = debitosAbertos.get(item.id) ?? 0;
      return (
        <span className="inline-flex flex-col items-center gap-xs">
          <Badge variant="error">Devendo</Badge>
          <span className="tabular-nums">{formatarMoeda(String(valor))}</span>
        </span>
      );
    }
    // Em cobrança sem débitos na base = importação incompleta ou sync — não é quitação/"em dia".
    if (unidadeNaFilaCobrancaAtiva(item)) {
      return <Badge variant="secondary">Aguardando débitos</Badge>;
    }
    return <Badge variant="success">Em dia</Badge>;
  }

  function celulaDiasAtraso(item: Unidade) {
    if (!emDebitoOperacional(item)) {
      return <span className="text-on-surface-variant">—</span>;
    }
    const dias = diasAtrasoMax.get(item.id) ?? 0;
    if (dias <= 0) {
      return <span className="text-on-surface-variant">—</span>;
    }
    return (
      <Badge variant="error" className="min-w-[2.25rem] justify-center tabular-nums">
        {dias}
      </Badge>
    );
  }

  function textoDiasAtrasoExport(item: Unidade) {
    if (!emDebitoOperacional(item)) return "";
    const dias = diasAtrasoMax.get(item.id) ?? 0;
    return dias > 0 ? String(dias) : "";
  }

  const colunasExportacao = [
    "Unidade",
    "Condomínio",
    "Cadastro",
    "Dias em atraso",
    "Débito",
    "Valor em aberto",
  ] as const;

  function textoDebitoExport(item: Unidade) {
    if (emDebitoOperacional(item)) return "Devendo";
    if (unidadeNaFilaCobrancaAtiva(item)) return "Aguardando débitos";
    return "Em dia";
  }

  function valorAbertoExport(item: Unidade) {
    if (!emDebitoOperacional(item)) return "";
    return formatarMoeda(String(debitosAbertos.get(item.id) ?? 0));
  }

  function linhasExportacao() {
    return visible.map((item) => [
      item.identificacao,
      nomeCondominio(item.condominioId, cadastros),
      item.status,
      textoDiasAtrasoExport(item),
      textoDebitoExport(item),
      valorAbertoExport(item),
    ]);
  }

  function abrirImportacao() {
    importacaoWizardRef.current?.abrir("unidades");
  }

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou cadastre unidades no escopo.",
      });
      return;
    }
    const linhas = linhasExportacao();
    const colunas = [...colunasExportacao];
    const arquivoBase = `unidades-${new Date().toISOString().slice(0, 10)}`;
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
    const abriu = exportarPdf("Unidades", `${arquivoBase}.html`, [
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

  function acoes(item: Unidade) {
    const lista = [];
    if (pode("unidades", "ler")) lista.push({ label: "Consultar", icon: Eye, onSelect: () => setDetalheId(item.id) });
    if (pode("atendimentos", "criar")) {
      lista.push({
        label: "Agendar atendimento",
        icon: CalendarClock,
        onSelect: () =>
          abrirAgendar({
            unidadeId: item.id,
            condominioId: item.condominioId,
            tituloUnidade: item.identificacao,
          }),
      });
    }
    if (pode("unidades", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("unidades", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { nextErrors: errosUnidade, identificacao, situacao } = validarEtapaUnidade();

    if (editingId === null && step === 0) {
      setErrors(errosUnidade);
      setErrorsResponsavel({});
      if (Object.keys(errosUnidade).length > 0) return;
      setStep(1);
      return;
    }

    if (editingId === null && step === 1) {
      const { nextErrors: errosResp, pular } = validarEtapaResponsavel();
      setErrorsResponsavel(errosResp);
      if (Object.keys(errosResp).length > 0) return;

      setErrors(errosUnidade);
      if (Object.keys(errosUnidade).length > 0) {
        setStep(0);
        return;
      }

      const payload = {
        condominioId: Number(form.condominioId),
        identificacao,
        bloco: form.bloco.trim(),
        tipo: form.tipo,
        status: form.status,
        situacao,
      };

      setSalvando(true);
      try {
        if (!(await prepararCondominiosParaSalvar())) return;

        const { response, body } = await salvarUnidadeApi(payload);
        if (!response.ok || !body.unidade) {
          toast({
            variant: "error",
            title: "Erro ao cadastrar",
            description: body.error ?? "Não foi possível salvar a unidade.",
          });
          if (body.error?.includes("identificação")) setErrors({ identificacao: body.error });
          if (body.error?.includes("Condomínio")) setErrors({ condominioId: body.error });
          if (body.error?.includes("cobrança")) setErrors({ situacao: body.error });
          setStep(0);
          return;
        }

        void refetch()
        await recarregarUnidadesDoServidor();

        if (!pular) {
          const vinculoResponse = await fetch(`/api/unidades/${body.unidade.id}/vinculos`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(montarPayloadVinculo()),
          });
          const vinculoBody = (await vinculoResponse.json()) as {
            vinculo?: { id: number; unidadeId: number; responsavelId: number; tipoVinculo: string; principal: boolean; observacoes: string };
            error?: string;
          };
          if (!vinculoResponse.ok) {
            toast({
              variant: "error",
              title: "Unidade cadastrada",
              description: vinculoBody.error ?? "Não foi possível vincular o responsável. Vincule em Consultar.",
            });
          } else if (vinculoBody.vinculo) {
            const respId = vinculoBody.vinculo.responsavelId;
            let responsavel = cadastros.responsaveis.find((item) => item.id === respId);
            if (!responsavel && responsavelForm.modo === "novo") {
              responsavel = {
                id: respId,
                nome: responsavelForm.nome.trim(),
                cpfCnpj: responsavelForm.cpfCnpj.trim(),
                tipoPessoa: responsavelForm.tipoPessoa,
                telefone: digitosTelefone(responsavelForm.telefone),
                whatsapp: digitosTelefone(responsavelForm.whatsapp),
                email: responsavelForm.email.trim(),
                endereco: "",
                observacoes: "",
              };
            }
            void refetch()
          }
        }

        toast({
          variant: "success",
          title: "Unidade cadastrada",
          description: pular ? undefined : "Responsável vinculado à unidade.",
        });
        setStep(0);
        setSheetOpen(false);
        setLeaveConfirmOpen(false);
      } catch {
        toast({
          variant: "error",
          title: "Erro ao cadastrar",
          description: "Falha de comunicação com o servidor. Verifique se o sistema está em execução e tente de novo.",
        });
      } finally {
        setSalvando(false);
      }
      return;
    }

    setErrors(errosUnidade);
    if (Object.keys(errosUnidade).length > 0) return;

    const payload = {
      condominioId: Number(form.condominioId),
      identificacao,
      bloco: form.bloco.trim(),
      tipo: form.tipo,
      status: form.status,
      situacao,
    };

    setSalvando(true);
    try {
      if (!(await prepararCondominiosParaSalvar())) return;

      const { response, body } = await salvarUnidadeApi(payload);
      if (!response.ok) {
        toast({
          variant: "error",
          title: "Erro ao atualizar",
          description: body.error ?? "Não foi possível salvar.",
        });
        if (body.error?.includes("identificação")) setErrors({ identificacao: body.error });
        if (body.error?.includes("Condomínio")) setErrors({ condominioId: body.error });
        if (body.error?.includes("cobrança")) setErrors({ situacao: body.error });
        return;
      }
      if (!body.unidade) {
        toast({
          variant: "error",
          title: "Resposta inválida",
          description: "O servidor não retornou os dados da unidade.",
        });
        return;
      }

      void refetch()
      await recarregarUnidadesDoServidor();
      const salvo = {
        condominioId: String(body.unidade.condominioId),
        identificacao: body.unidade.identificacao,
        bloco: body.unidade.bloco ?? "",
        tipo: body.unidade.tipo,
        status: body.unidade.status,
        situacao: situacaoCobrancaUnidade(body.unidade) as SituacaoCobrancaForm,
      };
      setBaseline(salvo);
      setForm(salvo);
      toast({ variant: "success", title: "Unidade atualizada" });
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
      if (detalheId === body.unidade.id) setDetalheVersao((v) => v + 1);
    } catch {
      toast({
        variant: "error",
        title: "Erro ao atualizar",
        description: "Falha de comunicação com o servidor. Verifique se o sistema está em execução e tente de novo.",
      });
    } finally {
      setSalvando(false);
    }
  }

  function editarDaConsulta(item: Unidade) {
    setDetalheId(null);
    openEdit(item);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={DoorOpen} size="lg" />}
      title={unidades.length === 0 ? "Nenhuma unidade cadastrada" : "Nenhuma unidade encontrada"}
      description={
        unidades.length === 0
          ? "Cadastre apartamentos, casas, salas e lojas dos condomínios."
          : "Ajuste a busca, o condomínio, a situação ou o débito."
      }
      action={
        pode("unidades", "criar") ? (
          <Button size="sm" onClick={openCreate}>
            <Icon icon={Plus} size="sm" />
            Novo
          </Button>
        ) : undefined
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Unidades" showExport={false} fitContainer>
      <colgroup>
        <col className="w-[12%]" />
        <col className="w-[16%]" />
        <col className="w-[18%]" />
        <col className="w-[11%]" />
        <col className="w-[13%]" />
        <col className="w-[18%]" />
        <col className="w-[12%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("identificacao")} onSort={() => handleSort("identificacao")}>
            Unidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("condominio")} onSort={() => handleSort("condominio")}>
            Condomínio
          </TableHead>
          <TableHead align="center">Responsável</TableHead>
          <TableHead align="center" sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Cadastro
          </TableHead>
          <TableHead align="center" className="min-w-[7rem] whitespace-nowrap">
            Dias em atraso
          </TableHead>
          <TableHead align="center" sortable sortDirection={directionFor("debito")} onSort={() => handleSort("debito")}>
            Débito
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={7}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-0 align-middle font-medium">
                <div className="flex min-w-0 items-center gap-sm">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                    aria-hidden="true"
                  >
                    <Icon icon={DoorOpen} size="sm" />
                  </span>
                  <span className="truncate">{item.identificacao}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-0 align-middle">
                <div className="flex min-w-0 items-center gap-sm">
                  <Icon icon={Building2} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden="true" />
                  <span className="truncate">{nomeCondominio(item.condominioId, cadastros)}</span>
                </div>
              </TableCell>
              <TableCell align="center" className="max-w-0 align-middle">
                {celulaResponsavel(item)}
              </TableCell>
              <TableCell align="center" className="align-middle">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell align="center" className="align-middle whitespace-nowrap">
                {celulaDiasAtraso(item)}
              </TableCell>
              <TableCell align="center" className="max-w-0 align-middle">
                {celulaDebito(item)}
              </TableCell>
              <TableActionsCell label={`Ações da unidade ${item.identificacao}`} actions={acoes(item)} />
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
      <TableMobileList aria-label="Unidades">
        {pageRows.map((item, index) => {
          return (
            <TableMobileCard key={item.id}>
              <TableMobileCardHeader>
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                  aria-hidden="true"
                >
                  <Icon icon={DoorOpen} size="sm" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                    <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                      {item.identificacao}
                    </TableMobileTitle>
                    <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                      {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                    </span>
                  </div>
                  <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                    {nomeCondominio(item.condominioId, cadastros)}
                  </p>
                </div>
                <TableActionsButton label={`Ações da unidade ${item.identificacao}`} actions={acoes(item)} />
              </TableMobileCardHeader>
              <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Responsável</p>
                  {celulaResponsavel(item)}
                </div>
                <div className="min-w-0 border-t border-border-subtle/30 pt-sm">
                  <p className="text-label-sm uppercase text-on-surface-variant">Dias em atraso</p>
                  <div className="mt-xs">{celulaDiasAtraso(item)}</div>
                </div>
                <div className="flex items-start justify-between gap-md border-t border-border-subtle/30 pt-sm">
                  <div className="min-w-0">
                    <p className="text-label-sm uppercase text-on-surface-variant">Débito</p>
                    <div className="mt-xs">{celulaDebito(item)}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-xs">
                    <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                  </div>
                </div>
              </div>
            </TableMobileCard>
          );
        })}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={DoorOpen}
        title="Unidades"
        description="Unidades da carteira e situação de cobrança."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
        actions={
          pode("unidades", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo
            </Button>
          ) : undefined
        }
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        {authLoading ? (
          <SkeletonListPage metrics={4} rows={8} cols={7} label="Carregando unidades" />
        ) : (
        <>
        <section aria-label="Resumo de unidades">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2 min-[768px]:hidden">
            <KpiMobileCard
              rotulo="Total de unidades"
              valor={metricValor(visible.length)}
              icon={DoorOpen}
              destaque
            />
            <KpiMobileCard rotulo="Ativas" valor={metricValor(ativas)} icon={CheckCircle2} />
            <KpiMobileCard rotulo="Inadimplentes" valor={metricValor(devendo)} icon={Receipt} />
            <KpiMobileCard rotulo="Em cobrança" valor={metricValor(emCobranca)} icon={Scale} />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4">
            <CardMetric
              accent="primary"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={DoorOpen} size="md" className="text-primary-container" />}
              rotulo="Total de unidades"
              valor={metricValor(visible.length)}
            />
            <CardMetric
              accent="brass"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={CheckCircle2} size="md" className="text-brass" />}
              rotulo="Ativas"
              valor={metricValor(ativas)}
            />
            <CardMetric
              accent="critical"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={Receipt} size="md" className="text-status-critical" />}
              rotulo="Inadimplentes"
              valor={metricValor(devendo)}
            />
            <CardMetric
              accent="tertiary"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={Scale} size="md" className="text-tertiary-container" />}
              rotulo="Em cobrança"
              valor={metricValor(emCobranca)}
            />
          </div>
        </section>

        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar unidade..."
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "condominio",
                label: "Condomínio",
                value: condominio,
                onChange: setCondominio,
                options: [
                  { value: "todos", label: "Todos os condomínios" },
                  ...condominiosVisiveis.map((item) => ({ value: String(item.id), label: item.nome })),
                ],
              },
              {
                id: "situacao-cadastro",
                label: "Cadastro",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "todos", label: "Todas" },
                  ...statusUnidade.map((item) => ({ value: item, label: item })),
                ],
              },
              {
                id: "situacao-cobranca",
                label: "Cobrança",
                value: cobranca,
                onChange: setCobranca,
                options: [
                  { value: "todos", label: "Todas" },
                  ...situacoesUnidade.map((item) => ({ value: item, label: item })),
                ],
              },
              {
                id: "debito",
                label: "Débito",
                value: debito,
                onChange: setDebito,
                options: [
                  { value: "todos", label: "Todos" },
                  { value: "devendo", label: "Devendo" },
                  { value: "em-dia", label: "Em dia" },
                ],
              },
            ]}
          />
        </FiltrosSection>

        <Tabs
          value={visao}
          onValueChange={(value) => {
            setVisao(value as VisaoListagem);
            setPage(1);
          }}
          defaultValue="condominio"
          className="flex flex-col gap-md"
        >
          <TabsList>
            <TabsTrigger value="condominio">Por condomínio</TabsTrigger>
            <TabsTrigger value="geral">Geral</TabsTrigger>
          </TabsList>
          <TabsContent value="condominio" className="flex flex-col gap-md !bg-transparent !p-0">
            <ResponsiveTable
              desktop={
                <UnidadesPorCondominioLista
                  grupos={gruposCondominio}
                  emptyState={emptyState}
                  variante="desktop"
                  badgeStatus={badgeStatus}
                  renderResponsavel={celulaResponsavel}
                  renderDiasAtraso={celulaDiasAtraso}
                  renderDebito={celulaDebito}
                  acoes={acoes}
                />
              }
              mobile={
                <UnidadesPorCondominioLista
                  grupos={gruposCondominio}
                  emptyState={emptyState}
                  variante="mobile"
                  badgeStatus={badgeStatus}
                  renderResponsavel={celulaResponsavel}
                  renderDiasAtraso={celulaDiasAtraso}
                  renderDebito={celulaDebito}
                  acoes={acoes}
                />
              }
              onExport={aoExportar}
              onImport={abrirImportacao}
              showImport={podeImportar}
              mobileDataBarClassName={unidadesMobileDataBarClassName}
            />
          </TabsContent>
          <TabsContent value="geral" className="flex flex-col gap-md !bg-transparent !p-0">
            <ResponsiveTable
              desktop={desktopTable}
              mobile={mobileTable}
              onExport={aoExportar}
              onImport={abrirImportacao}
              showImport={podeImportar}
              mobileDataBarClassName={unidadesMobileDataBarClassName}
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
                  <Icon icon={DoorOpen} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{editingId === null ? "Nova unidade" : "Editar unidade"}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    {editingId === null
                      ? "Cadastro em duas etapas: unidade e responsável."
                      : "Unidade de um condomínio da carteira."}
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {editingId === null ? <FormSteps steps={etapasCadastroUnidade} current={step} /> : null}
              {editingId !== null || step === 0 ? (
                <>
              <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                <Select
                  id={`${formId}-condominio`}
                  icon={Building2}
                  value={form.condominioId}
                  invalid={Boolean(errors.condominioId)}
                  onChange={(event) => setForm((current) => ({ ...current, condominioId: event.target.value }))}
                >
                  <option value="">Selecione</option>
                  {condominiosVisiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-2 gap-md">
                <FormField label="Identificação" htmlFor={`${formId}-identificacao`} required error={errors.identificacao}>
                  <Input
                    id={`${formId}-identificacao`}
                    icon={Hash}
                    value={form.identificacao}
                    invalid={Boolean(errors.identificacao)}
                    onChange={(event) => setForm((current) => ({ ...current, identificacao: event.target.value }))}
                  />
                </FormField>
                <FormField label="Bloco" htmlFor={`${formId}-bloco`}>
                  <Input
                    id={`${formId}-bloco`}
                    icon={Layers}
                    value={form.bloco}
                    onChange={(event) => setForm((current) => ({ ...current, bloco: event.target.value }))}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <FormField label="Tipo" htmlFor={`${formId}-tipo`} required error={errors.tipo}>
                  <Select
                    id={`${formId}-tipo`}
                    icon={LayoutGrid}
                    value={form.tipo}
                    invalid={Boolean(errors.tipo)}
                    onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {tiposUnidade.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Situação cadastral" htmlFor={`${formId}-status`} required error={errors.status}>
                  <Select
                    id={`${formId}-status`}
                    icon={Flag}
                    value={form.status}
                    invalid={Boolean(errors.status)}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    {statusUnidade.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <FormField label="Situação de cobrança" htmlFor={`${formId}-situacao`} error={errors.situacao}>
                <Select
                  id={`${formId}-situacao`}
                  icon={Flag}
                  value={form.situacao}
                  invalid={Boolean(errors.situacao)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      situacao: event.target.value as SituacaoCobrancaForm,
                    }))
                  }
                >
                  {situacoesUnidade.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
                <SheetHelpText>
                  Sem cobrança: fora da fila de inadimplência. Em cobrança e demais: operação ativa.
                </SheetHelpText>
              </FormField>
                </>
              ) : (
                <>
                  <SheetHelpText>
                    Proprietário, inquilino ou responsável financeiro. Deixe em branco para cadastrar só a unidade e
                    vincular depois em Consultar.
                  </SheetHelpText>
                  <FormField label="Origem" htmlFor={`${formId}-modo-resp`}>
                    <Select
                      id={`${formId}-modo-resp`}
                      icon={UserRound}
                      value={responsavelForm.modo}
                      onChange={(event) =>
                        setResponsavelForm((current) => ({
                          ...current,
                          modo: event.target.value as "novo" | "existente",
                        }))
                      }
                    >
                      <option value="novo">Cadastrar novo responsável</option>
                      <option value="existente">Usar responsável já cadastrado</option>
                    </Select>
                  </FormField>
                  {responsavelForm.modo === "existente" ? (
                    <FormField label="Responsável" htmlFor={`${formId}-resp`} error={errorsResponsavel.responsavelId}>
                      <Select
                        id={`${formId}-resp`}
                        icon={UserRound}
                        value={responsavelForm.responsavelId}
                        invalid={Boolean(errorsResponsavel.responsavelId)}
                        onChange={(event) =>
                          setResponsavelForm((current) => ({ ...current, responsavelId: event.target.value }))
                        }
                      >
                        <option value="">Selecione</option>
                        {cadastros.responsaveis.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  ) : (
                    <>
                      <FormField label="Nome" htmlFor={`${formId}-nome-resp`} error={errorsResponsavel.nome}>
                        <Input
                          id={`${formId}-nome-resp`}
                          icon={UserRound}
                          value={responsavelForm.nome}
                          invalid={Boolean(errorsResponsavel.nome)}
                          onChange={(event) =>
                            setResponsavelForm((current) => ({ ...current, nome: event.target.value }))
                          }
                        />
                      </FormField>
                      <div className="grid grid-cols-2 gap-md">
                        <FormField label="CPF/CNPJ" htmlFor={`${formId}-cpf-resp`} error={errorsResponsavel.cpfCnpj}>
                          <Input
                            id={`${formId}-cpf-resp`}
                            icon={CreditCard}
                            value={responsavelForm.cpfCnpj}
                            invalid={Boolean(errorsResponsavel.cpfCnpj)}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({ ...current, cpfCnpj: event.target.value }))
                            }
                          />
                        </FormField>
                        <FormField label="Tipo de pessoa" htmlFor={`${formId}-tipo-pessoa-resp`}>
                          <Select
                            id={`${formId}-tipo-pessoa-resp`}
                            icon={LayoutGrid}
                            value={responsavelForm.tipoPessoa}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({ ...current, tipoPessoa: event.target.value }))
                            }
                          >
                            {tiposPessoa.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-md">
                        <FormField label="Telefone" htmlFor={`${formId}-tel-resp`}>
                          <Input
                            id={`${formId}-tel-resp`}
                            icon={Phone}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="(00) 00000-0000"
                            value={responsavelForm.telefone}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({
                                ...current,
                                telefone: formatarTelefone(event.target.value),
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="WhatsApp" htmlFor={`${formId}-wa-resp`}>
                          <Input
                            id={`${formId}-wa-resp`}
                            icon={MessageCircle}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="(00) 00000-0000"
                            value={responsavelForm.whatsapp}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({
                                ...current,
                                whatsapp: formatarTelefone(event.target.value),
                              }))
                            }
                          />
                        </FormField>
                      </div>
                      <FormField label="E-mail" htmlFor={`${formId}-email-resp`}>
                        <Input
                          id={`${formId}-email-resp`}
                          icon={Mail}
                          type="email"
                          value={responsavelForm.email}
                          onChange={(event) =>
                            setResponsavelForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </FormField>
                    </>
                  )}
                  <FormField label="Vínculo" htmlFor={`${formId}-tipo-vinculo`} error={errorsResponsavel.tipoVinculo}>
                    <Select
                      id={`${formId}-tipo-vinculo`}
                      icon={Link2}
                      value={responsavelForm.tipoVinculo}
                      invalid={Boolean(errorsResponsavel.tipoVinculo)}
                      onChange={(event) =>
                        setResponsavelForm((current) => ({ ...current, tipoVinculo: event.target.value }))
                      }
                    >
                      {tiposVinculo.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Responsável financeiro principal" htmlFor={`${formId}-principal-resp`}>
                    <Select
                      id={`${formId}-principal-resp`}
                      icon={Star}
                      value={responsavelForm.principal ? "sim" : "nao"}
                      onChange={(event) =>
                        setResponsavelForm((current) => ({ ...current, principal: event.target.value === "sim" }))
                      }
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </Select>
                  </FormField>
                  <FormField label="Observações do vínculo" htmlFor={`${formId}-obs-vinculo`}>
                    <Input
                      id={`${formId}-obs-vinculo`}
                      icon={FileText}
                      value={responsavelForm.observacoes}
                      onChange={(event) =>
                        setResponsavelForm((current) => ({ ...current, observacoes: event.target.value }))
                      }
                    />
                  </FormField>
                </>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              saveDisabled={salvando}
              onBack={editingId === null && step > 0 ? () => setStep(0) : undefined}
              saveLabel={editingId === null && step === 0 ? "Continuar" : "Salvar"}
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
      <UnidadeDetalheSheet
        key={`${detalheId ?? "fechado"}-${detalheVersao}`}
        unidadeId={detalheId}
        onClose={() => setDetalheId(null)}
        responsaveisDisponiveis={cadastros.responsaveis}
        onMutacao={() => setDetalheVersao((v) => v + 1)}
        onEditar={
          pode("unidades", "editar")
            ? (unidade) => editarDaConsulta({ ...unidade, bloco: unidade.bloco ?? "" })
            : undefined
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir unidade?"
        description={deleteTarget ? `${deleteTarget.identificacao} será removida.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
      {podeImportar ? (
        <ImportacaoWizardSheet ref={importacaoWizardRef} moduloInicial="unidades" moduloTravado />
      ) : null}
    </WorkspaceShell>
  );
}

export default function UnidadesPageRoute() {
  return (
    <Suspense fallback={<SkeletonListPage metrics={4} label="Carregando" />}>
      <UnidadesPage />
    </Suspense>
  );
}