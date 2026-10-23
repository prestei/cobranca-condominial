"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { DoorOpen, Eye, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { FormSteps } from "@/components/form-steps";
import { FormField, Input, Select } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
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
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { UnidadeDetalheSheet } from "@/components/unidade-detalhe-sheet";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useAuth } from "@/context/auth-context";
import {
  escopoCondominios,
  formatarMoeda,
  getCadastros,
  nomeCondominio,
  SITUACAO_COBRANCA_PADRAO,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  statusUnidade,
  tiposPessoa,
  tiposUnidade,
  tiposVinculo,
  unidadeComDebitoOperacional,
  type Unidade,
} from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";
import { interpretarArquivoUnidades } from "@/lib/unidades/importar-planilha";
import {
  aplicarUnidadeExcluida,
  aplicarUnidadeSalva,
  aplicarVinculoSalvo,
  sincronizarUnidadesDoServidor,
} from "@/lib/unidades/sync-cliente";

type SortKey = "identificacao" | "condominio" | "tipo" | "status" | "debito";
const etapasCadastroUnidade = ["Unidade", "Responsável"] as const;

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

const badgeSituacaoCobranca: Record<string, "success" | "error" | "secondary" | "neutral"> = {
  "Sem cobrança": "neutral",
  "Em cobrança": "error",
  "Em acordo": "secondary",
  Notificada: "neutral",
  Ajuizada: "error",
  Quitada: "success",
};

export default function UnidadesPage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const cadastros = useCadastros();
  const condominiosVisiveis = escopoCondominios(cadastros, user?.userId);
  const unidades = useMemo(() => {
    const ids = new Set(condominiosVisiveis.map((item) => item.id));
    return cadastros.unidades.filter((item) => ids.has(item.condominioId));
  }, [cadastros.unidades, condominiosVisiveis]);
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
  const [importando, setImportando] = useState(false);
  const importArquivoRef = useRef<HTMLInputElement>(null);
  const podeImportar = pode("unidades", "criar");

  async function recarregarUnidadesDoServidor() {
    const response = await fetch("/api/unidades", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { unidades?: Unidade[] };
    if (payload.unidades) sincronizarUnidadesDoServidor(payload.unidades, user?.userId);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await recarregarUnidadesDoServidor();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  useEffect(() => {
    const condominioQuery = searchParams?.get("condominio");
    if (!condominioQuery) return;
    const existe = escopoCondominios(getCadastros(), user?.userId).some((item) => String(item.id) === condominioQuery);
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
  for (const item of cadastros.debitos) {
    if (item.status !== "Pendente" && item.status !== "Vencido") continue;
    debitosAbertos.set(item.unidadeId, (debitosAbertos.get(item.unidadeId) ?? 0) + Number(item.valorAtualizado || 0));
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
      const haystack = `${item.identificacao} ${item.bloco} ${nomeCondominio(item.condominioId)}`.toLocaleLowerCase("pt-BR");
      return (
        matchesCondominio &&
        matchesStatus &&
        matchesCobranca &&
        matchesDebito &&
        (query.length === 0 || haystack.includes(query))
      );
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "debito") {
        const valorA = emDebitoOperacional(a) ? (debitosAbertos.get(a.id) ?? 0) : 0;
        const valorB = emDebitoOperacional(b) ? (debitosAbertos.get(b.id) ?? 0) : 0;
        return (valorA - valorB) * factor;
      }
      const left =
        sortKey === "condominio"
          ? nomeCondominio(a.condominioId)
          : sortKey === "tipo"
            ? a.tipo
            : sortKey === "status"
              ? a.status
              : a.identificacao;
      const right =
        sortKey === "condominio"
          ? nomeCondominio(b.condominioId)
          : sortKey === "tipo"
            ? b.tipo
            : sortKey === "status"
              ? b.status
              : b.identificacao;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const ativas = visible.filter((item) => item.status === "Ativa").length;
  const devendo = visible.filter((item) => emDebitoOperacional(item)).length;

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
    const atual = getCadastros().unidades.find((u) => u.id === item.id) ?? item;
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
        telefone: responsavelForm.telefone.trim(),
        whatsapp: responsavelForm.whatsapp.trim(),
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

  function celulaCobranca(item: Unidade) {
    const rotulo = situacaoCobrancaUnidade(item);
    return <Badge variant={badgeSituacaoCobranca[rotulo] ?? "neutral"}>{rotulo}</Badge>;
  }

  function celulaDebito(item: Unidade) {
    if (!emDebitoOperacional(item)) {
      return <Badge variant="success">Em dia</Badge>;
    }
    const valor = debitosAbertos.get(item.id) ?? 0;
    return (
      <span className="inline-flex items-center gap-sm">
        <Badge variant="error">Devendo</Badge>
        <span className="tabular-nums">{formatarMoeda(String(valor))}</span>
      </span>
    );
  }

  const colunasExportacao = [
    "Unidade",
    "Condomínio",
    "Bloco",
    "Tipo",
    "Cadastro",
    "Cobrança",
    "Débito",
    "Valor em aberto",
  ] as const;

  function textoDebitoExport(item: Unidade) {
    if (!emDebitoOperacional(item)) return "Em dia";
    return "Devendo";
  }

  function valorAbertoExport(item: Unidade) {
    if (!emDebitoOperacional(item)) return "";
    return formatarMoeda(String(debitosAbertos.get(item.id) ?? 0));
  }

  function linhasExportacao() {
    return visible.map((item) => [
      item.identificacao,
      nomeCondominio(item.condominioId),
      item.bloco?.trim() ? item.bloco : "—",
      item.tipo,
      item.status,
      situacaoCobrancaUnidade(item),
      textoDebitoExport(item),
      valorAbertoExport(item),
    ]);
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

  function abrirImportacao() {
    importArquivoRef.current?.click();
  }

  async function handleArquivoImportacao(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    setImportando(true);
    try {
      const conteudo = await arquivo.text();
      const { linhas, importaveis } = interpretarArquivoUnidades(conteudo, condominiosVisiveis);
      const errosParse = linhas.filter((item) => item.erro);
      if (importaveis.length === 0) {
        toast({
          variant: "error",
          title: "Importação não realizada",
          description:
            errosParse[0]?.erro ??
            "Verifique o cabeçalho (Unidade, Condomínio, Tipo…) e o formato CSV ou XLS exportado pelo sistema.",
        });
        return;
      }

      let criadas = 0;
      let duplicadas = 0;
      let falhas = errosParse.length;

      for (const payload of importaveis) {
        const { response, body } = await salvarUnidadeApi({
          condominioId: payload.condominioId,
          identificacao: payload.identificacao,
          bloco: payload.bloco ?? "",
          tipo: payload.tipo,
          status: payload.status,
          situacao: payload.situacao ?? SITUACAO_COBRANCA_PADRAO,
        });
        if (response.ok && body.unidade) {
          aplicarUnidadeSalva(body.unidade, "INSERT");
          criadas += 1;
          continue;
        }
        if (response.status === 409) {
          duplicadas += 1;
          continue;
        }
        falhas += 1;
      }

      if (criadas > 0) {
        await recarregarUnidadesDoServidor();
      }

      if (criadas === 0 && duplicadas > 0 && falhas === 0) {
        toast({
          variant: "info",
          title: "Nenhuma unidade nova",
          description: "Todas as linhas já existiam no condomínio informado.",
        });
        return;
      }

      const partes: string[] = [];
      if (criadas > 0) partes.push(`${criadas} criada(s)`);
      if (duplicadas > 0) partes.push(`${duplicadas} ignorada(s) (duplicadas)`);
      if (falhas > 0) partes.push(`${falhas} com erro`);

      toast({
        variant: criadas > 0 ? "success" : "info",
        title: criadas > 0 ? "Importação concluída" : "Importação parcial",
        description: partes.join(" · "),
      });
    } catch {
      toast({
        variant: "error",
        title: "Erro ao ler arquivo",
        description: "Use CSV (;) ou planilha XLS exportada por esta tela.",
      });
    } finally {
      setImportando(false);
    }
  }

  function acoes(item: Unidade) {
    const lista = [];
    if (pode("unidades", "ler")) lista.push({ label: "Consultar", icon: Eye, onSelect: () => setDetalheId(item.id) });
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

        aplicarUnidadeSalva(body.unidade, "INSERT");
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
            let responsavel = getCadastros().responsaveis.find((item) => item.id === respId);
            if (!responsavel && responsavelForm.modo === "novo") {
              responsavel = {
                id: respId,
                nome: responsavelForm.nome.trim(),
                cpfCnpj: responsavelForm.cpfCnpj.trim(),
                tipoPessoa: responsavelForm.tipoPessoa,
                telefone: responsavelForm.telefone.trim(),
                whatsapp: responsavelForm.whatsapp.trim(),
                email: responsavelForm.email.trim(),
                endereco: "",
                observacoes: "",
              };
            }
            aplicarVinculoSalvo(body.unidade.id, vinculoBody.vinculo, responsavel);
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

      aplicarUnidadeSalva(body.unidade, "UPDATE");
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
    <Table
      aria-label="Unidades"
      onExport={aoExportar}
      onImport={abrirImportacao}
      showImport={podeImportar}
      importDisabled={importando}
    >
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("identificacao")} onSort={() => handleSort("identificacao")}>
            Unidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("condominio")} onSort={() => handleSort("condominio")}>
            Condomínio
          </TableHead>
          <TableHead>Bloco</TableHead>
          <TableHead sortable sortDirection={directionFor("tipo")} onSort={() => handleSort("tipo")}>
            Tipo
          </TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Cadastro
          </TableHead>
          <TableHead>Cobrança</TableHead>
          <TableHead sortable sortDirection={directionFor("debito")} onSort={() => handleSort("debito")}>
            Débito
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={8}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.identificacao}</TableCell>
              <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
              <TableCell>{item.bloco || "—"}</TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell>{celulaCobranca(item)}</TableCell>
              <TableCell>{celulaDebito(item)}</TableCell>
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
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{item.identificacao}</TableMobileTitle>
              <TableActionsButton label={`Ações da unidade ${item.identificacao}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Condomínio">{nomeCondominio(item.condominioId)}</TableMobileField>
              <TableMobileField label="Bloco">{item.bloco || "—"}</TableMobileField>
              <TableMobileField label="Tipo">{item.tipo}</TableMobileField>
              <TableMobileField label="Cadastro">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableMobileField>
              <TableMobileField label="Cobrança">{celulaCobranca(item)}</TableMobileField>
              <TableMobileField label="Débito">{celulaDebito(item)}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Unidades"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Unidades" }]}
        actions={
          pode("unidades", "criar") ? (
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
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={DoorOpen} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">unidades</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={DoorOpen} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(ativas).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">ativas</p>
          </CardMetric>
          <CardMetric iconClassName="bg-status-critical text-on-primary" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(devendo).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">devendo</p>
          </CardMetric>
        </div>
        <input
          ref={importArquivoRef}
          type="file"
          accept=".csv,.xls,text/csv,application/vnd.ms-excel"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleArquivoImportacao}
        />
        <ResponsiveTable
          desktop={desktopTable}
          mobile={mobileTable}
          onExport={aoExportar}
          onImport={abrirImportacao}
          showImport={podeImportar}
          importDisabled={importando}
        />
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
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={DoorOpen} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{editingId === null ? "Nova unidade" : "Editar unidade"}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    {editingId === null
                      ? "Cadastro em duas etapas: unidade e responsável (condômino ou financeiro)."
                      : "Apartamento, casa, sala ou loja de um condomínio da carteira."}
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
                    value={form.identificacao}
                    invalid={Boolean(errors.identificacao)}
                    onChange={(event) => setForm((current) => ({ ...current, identificacao: event.target.value }))}
                  />
                </FormField>
                <FormField label="Bloco" htmlFor={`${formId}-bloco`}>
                  <Input
                    id={`${formId}-bloco`}
                    value={form.bloco}
                    onChange={(event) => setForm((current) => ({ ...current, bloco: event.target.value }))}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <FormField label="Tipo" htmlFor={`${formId}-tipo`} required error={errors.tipo}>
                  <Select
                    id={`${formId}-tipo`}
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
                <p className="text-body-sm text-on-surface-variant">
                  Sem cobrança: fora da fila de inadimplência. Em cobrança e demais: operação ativa.
                </p>
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
                            value={responsavelForm.telefone}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({ ...current, telefone: event.target.value }))
                            }
                          />
                        </FormField>
                        <FormField label="WhatsApp" htmlFor={`${formId}-wa-resp`}>
                          <Input
                            id={`${formId}-wa-resp`}
                            value={responsavelForm.whatsapp}
                            onChange={(event) =>
                              setResponsavelForm((current) => ({ ...current, whatsapp: event.target.value }))
                            }
                          />
                        </FormField>
                      </div>
                      <FormField label="E-mail" htmlFor={`${formId}-email-resp`}>
                        <Input
                          id={`${formId}-email-resp`}
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
    </WorkspaceShell>
  );
}
