"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { CheckCircle2, ClipboardList, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Input, Select } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { resolverPeriodo, type PeriodValue } from "@/components/period-input";
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
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableSortDirection,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  acimaDoLimite,
  dataCorteLimite,
  debitoAbertoNaData,
  diasDeAtraso,
  formatarData,
  formatarMoeda,
  grupoDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  nomeCondominio,
  nomeUnidade,
  origensDebito,
  statusDebito,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { calcularIndicadoresInadimplencia } from "@/lib/debitos/indicadores";
import {
  aplicarDebitoExcluido,
  aplicarDebitoSalvo,
  sincronizarDebitosDoServidor,
} from "@/lib/debitos/sync-cliente";
import { garantirCondominiosPersistidosNoServidor } from "@/lib/condominios/sync-cliente";
import { sincronizarUnidadesDoServidor } from "@/lib/unidades/sync-cliente";

const etapas = ["Identificação", "Valores e acréscimos", "Pagamento"] as const;
const badgeStatus: Record<string, "success" | "error" | "secondary"> = {
  Pendente: "secondary",
  Pago: "success",
  Vencido: "error",
  Cancelado: "error",
};
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
type SortKey = "referencia" | "unidade" | "grupo" | "vencimento" | "dias" | "status" | "original" | "atualizado";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function limiteNumerico(valor: string) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : LIMITE_AMIGAVEL_DIAS;
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

export default function DebitosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user: sessao } = useAuth();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCadastros();
  const debitos = cadastros.debitos;
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState(periodoTodos);
  const [dataBase, setDataBase] = useState(hojeIso);
  const [limite, setLimite] = useState(String(LIMITE_AMIGAVEL_DIAS));
  const [condominioId, setCondominioId] = useState("todos");
  const [cidade, setCidade] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedPeriodo, setAppliedPeriodo] = useState(periodoTodos);
  const [appliedDataBase, setAppliedDataBase] = useState(hojeIso);
  const [appliedLimite, setAppliedLimite] = useState(String(LIMITE_AMIGAVEL_DIAS));
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedCidade, setAppliedCidade] = useState("todas");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [origem, setOrigem] = useState("todas");
  const [appliedOrigem, setAppliedOrigem] = useState("todas");
  const [unidadeId, setUnidadeId] = useState("todas");
  const [appliedUnidadeId, setAppliedUnidadeId] = useState("todas");
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
      if (payload.unidades) sincronizarUnidadesDoServidor(payload.unidades, sessao?.userId);
    }
  }

  async function recarregarDebitosDoServidor() {
    const response = await fetch("/api/debitos", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { debitos?: Debito[] };
    if (payload.debitos) sincronizarDebitosDoServidor(payload.debitos, sessao?.userId);
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
    const unidadeQuery = searchParams?.get("unidade");
    if (!unidadeQuery) return;
    const existe = cadastros.unidades.some((item) => String(item.id) === unidadeQuery);
    if (!existe) return;
    setUnidadeId(unidadeQuery);
    setAppliedUnidadeId(unidadeQuery);
    setPage(1);
    router.replace("/debitos");
  }, [cadastros.unidades, router, searchParams]);

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
      const haystack = `${item.referencia} ${item.descricao} ${nomeUnidade(item.unidadeId)} ${nomeCondominio(item.condominioId)}`.toLocaleLowerCase("pt-BR");
      return (
        matchesStatus &&
        matchesOrigem &&
        matchesCondominio &&
        matchesCidade &&
        matchesPeriodo &&
        matchesUnidade &&
        (query.length === 0 || haystack.includes(query))
      );
    })
    .sort((a, b) => {
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
          ? nomeUnidade(a.unidadeId)
          : sortKey === "grupo"
            ? grupoDebito(a.descricao)
            : sortKey === "vencimento"
              ? a.dataVencimento
              : sortKey === "status"
                ? a.status
                : a.referencia;
      const right =
        sortKey === "unidade"
          ? nomeUnidade(b.unidadeId)
          : sortKey === "grupo"
            ? grupoDebito(b.descricao)
            : sortKey === "vencimento"
              ? b.dataVencimento
              : sortKey === "status"
                ? b.status
                : b.referencia;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const limiteDias = limiteNumerico(appliedLimite);
  const corte = dataCorteLimite(appliedDataBase, limiteDias);
  const emAbertoNaData = visible.filter((item) => debitoAbertoNaData(item, appliedDataBase));
  const condominiosNoFiltro = cadastros.condominios.filter((item) => {
    const matchesCondominio = appliedCondominioId === "todos" || String(item.id) === appliedCondominioId;
    const matchesCidade = appliedCidade === "todas" || item.cidade.trim() === appliedCidade;
    return matchesCondominio && matchesCidade;
  });
  const unidadesCarteira = cadastros.unidades.filter((item) =>
    condominiosNoFiltro.some((condominio) => condominio.id === item.condominioId),
  ).length;
  const indicadores = calcularIndicadoresInadimplencia({
    debitos: emAbertoNaData,
    dataBase: appliedDataBase,
    limiteDias,
    unidadesCarteira,
  });
  const totalOriginal = indicadores.totalOriginal;
  const totalAtualizado = indicadores.totalAtualizado;
  const ateLimite = indicadores.ateLimite;
  const acimaLimite = indicadores.acimaLimite;
  const unidadesDevedoras = indicadores.unidadesDevedoras;
  const percentualUnidades = indicadores.percentualUnidades;
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
    setAppliedLimite(limite);
    setAppliedCondominioId(condominioId);
    setAppliedCidade(cidade);
    setAppliedStatus(status);
    setAppliedOrigem(origem);
    setAppliedUnidadeId(unidadeId);
    setPage(1);
  }

  function handleClear() {
    const hoje = hojeIso();
    setSearch("");
    setPeriodo(periodoTodos);
    setDataBase(hoje);
    setLimite(String(LIMITE_AMIGAVEL_DIAS));
    setCondominioId("todos");
    setCidade("todas");
    setStatus("todos");
    setAppliedSearch("");
    setAppliedPeriodo(periodoTodos);
    setAppliedDataBase(hoje);
    setAppliedLimite(String(LIMITE_AMIGAVEL_DIAS));
    setAppliedCondominioId("todos");
    setAppliedCidade("todas");
    setAppliedStatus("todos");
    setOrigem("todas");
    setAppliedOrigem("todas");
    setUnidadeId("todas");
    setAppliedUnidadeId("todas");
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
          : (getCadastros().debitos.find((registro) => registro.id === item.id) ?? item);
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
    aplicarDebitoExcluido(deleteTarget.id);
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
      setUnidades((current) =>
        current.map((u) => (u.id === body.unidade!.id ? { ...u, situacao: body.unidade!.situacao } : u)),
      );
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
    if (pode("atendimentos", "criar"))
      lista.push({ label: "Iniciar atendimento", icon: ClipboardList, onSelect: () => iniciarAtendimento(item) });
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

  function rotuloFonteValores(item: Debito) {
    if (item.fonteValores === "manual") return "Correção manual";
    return item.origem ? `Origem: ${item.origem}` : "Valores da origem";
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
            Novo
          </Button>
        ) : undefined
      }
    />
  );

  const diasDaLinha = (item: Debito) =>
    item.dataVencimento && item.dataVencimento <= appliedDataBase
      ? String(diasDeAtraso(item.dataVencimento, appliedDataBase))
      : "—";

  const desktopTable = (
    <Table aria-label="Inadimplência">
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
          <TableHead align="right" sortable sortDirection={directionFor("dias")} onSort={() => handleSort("dias")}>
            Dias
          </TableHead>
          <TableHead align="right" sortable sortDirection={directionFor("original")} onSort={() => handleSort("original")}>
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
          <TableEmpty colSpan={10}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.referencia}</TableCell>
              <TableCell>{nomeUnidade(item.unidadeId)}</TableCell>
              <TableCell>{grupoDebito(item.descricao)}</TableCell>
              <TableCell>{formatarData(item.dataVencimento)}</TableCell>
              <TableCell align="right" className="tabular-nums">
                {diasDaLinha(item)}
              </TableCell>
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

  const mobileTable =
    visible.length === 0 ? (
      <TableMobileEmpty>{emptyState}</TableMobileEmpty>
    ) : (
      <TableMobileList aria-label="Inadimplência">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{item.referencia}</TableMobileTitle>
              <TableActionsButton label={`Ações do débito ${item.referencia}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Unidade">{nomeUnidade(item.unidadeId)}</TableMobileField>
              <TableMobileField label="Tipo">{grupoDebito(item.descricao)}</TableMobileField>
              <TableMobileField label="Vencimento">{formatarData(item.dataVencimento)}</TableMobileField>
              <TableMobileField label="Dias" valueClassName="tabular-nums">
                {diasDaLinha(item)}
              </TableMobileField>
              <TableMobileField label="Original" valueClassName="tabular-nums">
                {formatarMoeda(item.valorOriginal)}
              </TableMobileField>
              <TableMobileField label="Atualizado" valueClassName="tabular-nums">
                {formatarMoeda(item.valorAtualizado)}
              </TableMobileField>
              <TableMobileField label="Situação">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableMobileField>
              <TableMobileField label="Origem">{rotuloFonteValores(item)}</TableMobileField>
              <TableMobileField label="Atualizado">{formatarData(item.atualizadoEm)}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Inadimplência"
        description="Débitos em aberto na data-base, com valor original, valor atualizado e o corte entre a fase amigável e o jurídico."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Inadimplência" }]}
        actions={
          pode("debitos", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar débito..."
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
              id: "data-base",
              label: "Data-base",
              type: "date",
              value: dataBase,
              onChange: setDataBase,
            },
            {
              id: "limite",
              label: "Limite de dias",
              type: "number",
              min: 1,
              value: limite,
              onChange: setLimite,
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
                  label: `${nomeUnidade(item.id)}`,
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
              label: "Situação",
              value: status,
              onChange: setStatus,
              options: [
                { value: "todos", label: "Todas" },
                ...statusDebito.map((item) => ({ value: item, label: item })),
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
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4">
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={Receipt} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{moeda(totalOriginal)}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">valor original</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{moeda(totalAtualizado)}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">valor atualizado</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{moeda(ateLimite)}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">até {limiteDias} dias</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{moeda(acimaLimite)}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">acima de {limiteDias} dias</p>
          </CardMetric>
        </div>
        <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <h2 className="text-headline-sm text-on-surface">Percentuais</h2>
          <div className="grid grid-cols-1 gap-lg min-[640px]:grid-cols-2">
            <div className="min-w-0">
              <p className="text-metric text-on-surface tabular-nums">
                {percentualUnidades === null ? "—" : percentual(percentualUnidades)}
              </p>
              <p className="mt-sm text-body-sm text-on-surface-variant">inadimplência das unidades</p>
              {unidadesCarteira > 0 ? (
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  {unidadesDevedoras} de {unidadesCarteira} unidades com débito vencido na data-base
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-metric text-on-surface tabular-nums">—</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">inadimplência do valor emitido</p>
              <p className="mt-xs text-body-sm text-on-surface-variant">Depende do total emitido no período filtrado (ainda não vem na importação).</p>
            </div>
          </div>
          <p className="border-t border-border-subtle pt-md text-body-sm text-on-surface-variant">
            Data-base {formatarData(appliedDataBase)}. Vencimento até {formatarData(corte)} conta como acima de {limiteDias} dias.
            O percentual de unidades divide as unidades com débito vencido pelo total de unidades cadastradas no recorte dos filtros.
          </p>
        </section>
        <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
        {visible.length > 0 ? <Pagination page={currentPage} total={visible.length} onPageChange={setPage} /> : null}
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
                      value={form.referencia}
                      invalid={Boolean(errors.referencia)}
                      onChange={(event) => setForm((current) => ({ ...current, referencia: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
                    <Input
                      id={`${formId}-descricao`}
                      value={form.descricao}
                      onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Origem" htmlFor={`${formId}-origem`}>
                    <Select
                      id={`${formId}-origem`}
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
                      type="date"
                      value={form.dataVencimento}
                      invalid={Boolean(errors.dataVencimento)}
                      onChange={(event) => setForm((current) => ({ ...current, dataVencimento: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
                    <Select
                      id={`${formId}-status`}
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
                      inputMode="decimal"
                      value={form.valor}
                      invalid={Boolean(errors.valor)}
                      onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor original" htmlFor={`${formId}-original`} error={errors.valorOriginal}>
                    <Input
                      id={`${formId}-original`}
                      inputMode="decimal"
                      value={form.valorOriginal}
                      invalid={Boolean(errors.valorOriginal)}
                      onChange={(event) => setForm((current) => ({ ...current, valorOriginal: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Multa" htmlFor={`${formId}-multa`} error={errors.multa}>
                    <Input
                      id={`${formId}-multa`}
                      inputMode="decimal"
                      value={form.multa}
                      invalid={Boolean(errors.multa)}
                      onChange={(event) => setForm((current) => ({ ...current, multa: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Juros" htmlFor={`${formId}-juros`} error={errors.juros}>
                    <Input
                      id={`${formId}-juros`}
                      inputMode="decimal"
                      value={form.juros}
                      invalid={Boolean(errors.juros)}
                      onChange={(event) => setForm((current) => ({ ...current, juros: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Correção" htmlFor={`${formId}-correcao`} error={errors.correcao}>
                    <Input
                      id={`${formId}-correcao`}
                      inputMode="decimal"
                      value={form.correcao}
                      invalid={Boolean(errors.correcao)}
                      onChange={(event) => setForm((current) => ({ ...current, correcao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor atualizado" htmlFor={`${formId}-atualizado`} error={errors.valorAtualizado}>
                    <Input
                      id={`${formId}-atualizado`}
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
                      type="date"
                      value={form.dataPagamento}
                      onChange={(event) => setForm((current) => ({ ...current, dataPagamento: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Valor pago" htmlFor={`${formId}-pago`} error={errors.valorPago}>
                    <Input
                      id={`${formId}-pago`}
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
    </WorkspaceShell>
  );
}
