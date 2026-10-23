"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, CircleOff, DoorOpen, Eye, MapPin, Pencil, Plus, RotateCcw, Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Switch, Textarea } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetPanel,
  SheetHelpText,
  SheetToggleRow,
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
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/export";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  condominioAtendeAdvogado,
  escopoCondominios,
  getCadastros,
  opcoesAdvogadosResponsaveis,
  registrarAuditoria,
  rotuloAdvogadosCondominio,
  setCondominios,
  statusCondominio,
  type Condominio,
} from "@/lib/catalog";
import { buscarCep, CEP_TIMEOUT_MS, digitosCep, formatarCep } from "@/lib/cep";
import { interpretarArquivoCondominios } from "@/lib/condominios/importar-planilha";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/hooks/use-catalog";
import { usePermissao } from "@/hooks/use-permissao";

const etapasCondominio = ["Dados", "Endereço", "Observação"] as const;

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

type SortKey = "nome" | "administradora" | "cidade" | "advogado" | "unidades" | "status";

function DetalheCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value.trim() ? value : "—"}</p>
    </div>
  );
}

const formularioVazio: Omit<Condominio, "id"> = {
  nome: "",
  identificadorExterno: "",
  status: "Ativo",
  advogados: [],
  administradora: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  observacao: "",
};

export default function CondominiosPage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const { user } = useAuth();
  const router = useRouter();
  const formId = useId();
  const cadastros = useCatalog();
  const opcoesAdvogados = opcoesAdvogadosResponsaveis(cadastros);
  const condominios = escopoCondominios(cadastros, user?.userId);
  const unidades = cadastros.unidades;
  const unidadesPorCondominio = new Map<number, number>();
  for (const unidade of unidades) {
    unidadesPorCondominio.set(unidade.condominioId, (unidadesPorCondominio.get(unidade.condominioId) ?? 0) + 1);
  }
  const contarUnidades = (condominioId: number) => unidadesPorCondominio.get(condominioId) ?? 0;
  const [search, setSearch] = useState("");
  const [administradora, setAdministradora] = useState("todas");
  const [cidade, setCidade] = useState("todas");
  const [lawyer, setLawyer] = useState("todos");
  const [situacao, setSituacao] = useState("Ativo");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedAdministradora, setAppliedAdministradora] = useState("todas");
  const [appliedCidade, setAppliedCidade] = useState("todas");
  const [appliedLawyer, setAppliedLawyer] = useState("todos");
  const [appliedSituacao, setAppliedSituacao] = useState("Ativo");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Condominio | null>(null);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"nome" | "advogados" | "identificadorExterno", string>>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [enderecoLiberado, setEnderecoLiberado] = useState(false);
  const ultimoCepBuscado = useRef("");
  const importArquivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const podeImportar = pode("condominios", "criar");

  useEffect(() => {
    const digitos = digitosCep(form.cep);
    if (digitos.length !== 8) {
      if (ultimoCepBuscado.current !== "") {
        ultimoCepBuscado.current = "";
        setBuscandoCep(false);
        setCepErro("");
        setEnderecoLiberado(false);
        setForm((current) => ({
          ...current,
          logradouro: "",
          complemento: "",
          cidade: "",
          estado: "",
        }));
      }
      return;
    }

    if (digitos === ultimoCepBuscado.current) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);
    let ativo = true;
    setBuscandoCep(true);
    setCepErro("");
    setEnderecoLiberado(false);

    buscarCep(digitos, controller.signal)
      .then((endereco) => {
        if (!ativo) return;
        ultimoCepBuscado.current = digitos;
        setForm((current) => ({
          ...current,
          logradouro: endereco.logradouro,
          complemento: endereco.complemento,
          cidade: endereco.cidade,
          estado: endereco.estado,
        }));
        setEnderecoLiberado(true);
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        const abortou = error instanceof DOMException && error.name === "AbortError";
        setCepErro(
          abortou
            ? "A consulta do CEP excedeu 6 segundos."
            : error instanceof Error && error.message === "CEP não encontrado."
              ? error.message
              : "Não foi possível consultar o CEP.",
        );
        setEnderecoLiberado(true);
      })
      .finally(() => {
        if (!ativo) return;
        window.clearTimeout(timeout);
        setBuscandoCep(false);
      });

    return () => {
      ativo = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.cep]);

  const administradoras = [...new Set(condominios.map((item) => item.administradora.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const cidades = [...new Set(condominios.map((item) => item.cidade.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = condominios
    .filter((item) => {
      const matchesAdministradora = appliedAdministradora === "todas" || item.administradora.trim() === appliedAdministradora;
      const matchesCidade = appliedCidade === "todas" || item.cidade.trim() === appliedCidade;
      const matchesLawyer = appliedLawyer === "todos" || condominioAtendeAdvogado(item, appliedLawyer);
      const matchesSituacao = appliedSituacao === "todos" || item.status === appliedSituacao;
      const haystack =
        `${item.nome} ${item.identificadorExterno} ${item.cidade} ${item.administradora}`.toLocaleLowerCase("pt-BR");
      return (
        matchesAdministradora &&
        matchesCidade &&
        matchesLawyer &&
        matchesSituacao &&
        (query.length === 0 || haystack.includes(query))
      );
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "unidades") {
        return (contarUnidades(a.id) - contarUnidades(b.id)) * factor;
      }
      const left =
        sortKey === "administradora"
          ? a.administradora
          : sortKey === "cidade"
            ? a.cidade
            : sortKey === "advogado"
              ? rotuloAdvogadosCondominio(a)
              : sortKey === "status"
                ? a.status
                : a.nome;
      const right =
        sortKey === "administradora"
          ? b.administradora
          : sortKey === "cidade"
            ? b.cidade
            : sortKey === "advogado"
              ? rotuloAdvogadosCondominio(b)
              : sortKey === "status"
                ? b.status
                : b.nome;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const advogadosNaLista = new Set(visible.flatMap((item) => item.advogados)).size;
  const comEndereco = visible.filter((item) => item.cidade.trim().length > 0).length;
  const detalhe = detalheId === null ? null : (condominios.find((item) => item.id === detalheId) ?? null);
  const unidadesDoDetalhe = detalhe ? unidades.filter((item) => item.condominioId === detalhe.id) : [];

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
    setSortKey("nome");
    setSortDirection("asc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedAdministradora(administradora);
    setAppliedCidade(cidade);
    setAppliedLawyer(lawyer);
    setAppliedSituacao(situacao);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setAdministradora("todas");
    setCidade("todas");
    setLawyer("todos");
    setSituacao("Ativo");
    setAppliedSearch("");
    setAppliedAdministradora("todas");
    setAppliedCidade("todas");
    setAppliedLawyer("todos");
    setAppliedSituacao("Ativo");
    setPage(1);
  }

  function openCreate() {
    ultimoCepBuscado.current = "";
    setBuscandoCep(false);
    setCepErro("");
    setEnderecoLiberado(false);
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  function openEdit(item: Condominio) {
    const digitos = digitosCep(item.cep);
    const enderecoPreenchido = Boolean(item.logradouro || item.cidade || item.estado);
    ultimoCepBuscado.current = enderecoPreenchido && digitos.length === 8 ? digitos : "";
    setBuscandoCep(false);
    setCepErro("");
    setEnderecoLiberado(enderecoPreenchido);
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      identificadorExterno: item.identificadorExterno,
      status: item.status,
      advogados: [...item.advogados],
      administradora: item.administradora,
      cep: formatarCep(item.cep),
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      cidade: item.cidade,
      estado: item.estado,
      observacao: item.observacao,
    });
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  function closeSheet() {
    const preenchido =
      form.advogados.length > 0 ||
      Object.entries(form).some(([key, value]) => {
        if (key === "advogados" || key === "status") return false;
        return String(value).trim() !== "";
      });
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

  function confirmStatusChange() {
    if (!statusTarget) return;
    const proximoStatus = statusTarget.status === "Ativo" ? "Inativo" : "Ativo";
    setCondominios((current) =>
      current.map((item) => (item.id === statusTarget.id ? { ...item, status: proximoStatus } : item)),
    );
    registrarAuditoria({
      entidade: "condominium",
      registroId: String(statusTarget.id),
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({ status: statusTarget.status }),
      dadosNovos: JSON.stringify({ status: proximoStatus }),
      camposAlterados: "status",
    });
    if (editingId === statusTarget.id) {
      setForm((current) => ({ ...current, status: proximoStatus }));
    }
    toast({
      variant: "success",
      title: proximoStatus === "Inativo" ? "Condomínio inativado" : "Condomínio reativado",
      description:
        proximoStatus === "Inativo"
          ? "Unidades, débitos e atendimentos permanecem consultáveis."
          : "O condomínio volta a aparecer nas rotinas operacionais ativas.",
    });
    setStatusTarget(null);
  }

  function verUnidades(item: Condominio) {
    router.push(`/unidades?condominio=${item.id}`);
  }

  function adicionarUnidade(item: Condominio) {
    router.push(`/unidades?condominio=${item.id}&novo=1`);
  }

  function acoes(item: Condominio) {
    const lista = [];
    if (pode("condominios", "ler")) {
      lista.push({ label: "Ver detalhes", icon: Eye, onSelect: () => setDetalheId(item.id) });
      if (pode("unidades", "ler")) {
        lista.push({ label: "Ver unidades", icon: DoorOpen, onSelect: () => verUnidades(item) });
      }
    }
    if (pode("unidades", "criar") && item.status === "Ativo") {
      lista.push({ label: "Adicionar unidade", icon: Plus, onSelect: () => adicionarUnidade(item) });
    }
    if (pode("condominios", "editar")) {
      lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
      if (item.status === "Ativo") {
        lista.push({
          label: "Inativar",
          icon: CircleOff,
          destructive: true,
          onSelect: () => setStatusTarget(item),
        });
      } else {
        lista.push({ label: "Reativar", icon: RotateCcw, onSelect: () => setStatusTarget(item) });
      }
    }
    return lista;
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pode("condominios", editingId === null ? "criar" : "editar")) return;
    const nome = form.nome.trim();
    const identificadorExterno = form.identificadorExterno.trim();
    const nextErrors: Partial<Record<"nome" | "advogados" | "identificadorExterno", string>> = {};

    if (!nome) {
      nextErrors.nome = "Informe o nome do condomínio.";
    }

    if (form.advogados.length === 0) {
      nextErrors.advogados = "Selecione ao menos um advogado responsável.";
    }

    if (identificadorExterno) {
      const duplicado = cadastros.condominios.some(
        (item) =>
          item.id !== editingId &&
          item.identificadorExterno.trim().toLocaleLowerCase("pt-BR") ===
            identificadorExterno.toLocaleLowerCase("pt-BR"),
      );
      if (duplicado) {
        nextErrors.identificadorExterno = "Já existe um condomínio com este identificador.";
      }
    }

    if (step < etapasCondominio.length - 1) {
      if (step === 0) {
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
      }
      setStep(step + 1);
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(0);
      return;
    }

    const saved: Omit<Condominio, "id"> = {
      ...form,
      nome,
      identificadorExterno,
      advogados: [...form.advogados],
      administradora: form.administradora.trim(),
      cep: form.cep.trim(),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),
      observacao: form.observacao.trim(),
    };

    if (editingId === null) {
      const nextId = cadastros.condominios.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setCondominios((current) => [...current, { id: nextId, ...saved, status: "Ativo" }]);
      registrarAuditoria({
        entidade: "condominium",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.nome,
        camposAlterados: "nome",
      });
      toast({ variant: "success", title: "Condomínio cadastrado" });
    } else {
      setCondominios((current) =>
        current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)),
      );
      registrarAuditoria({
        entidade: "condominium",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: condominios.find((item) => item.id === editingId)?.nome ?? "",
        dadosNovos: saved.nome,
        camposAlterados: "nome",
      });
      toast({ variant: "success", title: "Condomínio atualizado" });
    }

    setSheetOpen(false);
  }

  const colunasExportacao = [
    "Nome",
    "Identificador",
    "Situação",
    "Cidade",
    "Estado",
    "Administradora",
    "Advogados",
    "Unidades",
    "CEP",
    "Logradouro",
    "Número",
    "Complemento",
    "Observação",
  ] as const;

  function linhasExportacao() {
    return visible.map((item) => [
      item.nome,
      item.identificadorExterno,
      item.status,
      item.cidade,
      item.estado,
      item.administradora,
      rotuloAdvogadosCondominio(item),
      String(contarUnidades(item.id)),
      item.cep,
      item.logradouro,
      item.numero,
      item.complemento,
      item.observacao,
    ]);
  }

  function abrirImportacao() {
    importArquivoRef.current?.click();
  }

  async function handleArquivoImportacao(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo || !podeImportar) return;

    setImportando(true);
    try {
      const conteudo = await arquivo.text();
      const { linhas, importaveis } = interpretarArquivoCondominios(conteudo, opcoesAdvogados);
      const errosParse = linhas.filter((item) => item.erro);
      if (importaveis.length === 0) {
        toast({
          variant: "error",
          title: "Importação não realizada",
          description:
            errosParse[0]?.erro ??
            'Use CSV (;) ou XLS exportado por esta tela, com colunas "Nome" e "Advogados".',
        });
        return;
      }

      const base = getCadastros().condominios;
      const identificadoresUsados = new Set(
        base
          .map((item) => item.identificadorExterno.trim().toLocaleLowerCase("pt-BR"))
          .filter(Boolean),
      );
      let nextId = base.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      let criadas = 0;
      let duplicadas = 0;
      let falhas = errosParse.length;
      const novos: Condominio[] = [];

      for (const payload of importaveis) {
        const identificador = payload.identificadorExterno.trim();
        if (identificador) {
          const chave = identificador.toLocaleLowerCase("pt-BR");
          if (identificadoresUsados.has(chave)) {
            duplicadas += 1;
            continue;
          }
          identificadoresUsados.add(chave);
        }

        const registro: Condominio = { id: nextId, ...payload };
        nextId += 1;
        novos.push(registro);
        criadas += 1;
      }

      if (novos.length > 0) {
        setCondominios((current) => [...current, ...novos]);
        for (const item of novos) {
          registrarAuditoria({
            entidade: "condominium",
            registroId: String(item.id),
            acao: "INSERT",
            dadosAnteriores: "",
            dadosNovos: item.nome,
            camposAlterados: "importacao",
          });
        }
      }

      if (criadas === 0 && duplicadas > 0 && falhas === 0) {
        toast({
          variant: "info",
          title: "Nenhum condomínio novo",
          description: "Todos os identificadores da planilha já existem na carteira.",
        });
        return;
      }

      const partes: string[] = [];
      if (criadas > 0) partes.push(`${criadas} criado(s)`);
      if (duplicadas > 0) partes.push(`${duplicadas} ignorado(s) (identificador duplicado)`);
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

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou cadastre condomínios na carteira.",
      });
      return;
    }
    const linhas = linhasExportacao();
    const colunas = [...colunasExportacao];
    const arquivoBase = `condominios-${new Date().toISOString().slice(0, 10)}`;
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
    const abriu = exportarPdf("Condomínios", `${arquivoBase}.html`, [
      { titulo: "Carteira (filtros aplicados)", colunas, linhas },
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

  const emptyState = (
    <EmptyState
      icon={<Icon icon={Building2} size="lg" />}
      title={condominios.length === 0 ? "Nenhum condomínio na carteira" : "Nenhum condomínio encontrado"}
      description={
        condominios.length === 0
          ? "Cadastre o primeiro condomínio atendido pelo escritório."
          : "Ajuste os filtros ou cadastre um condomínio."
      }
      action={
        pode("condominios", "criar") ? (
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
      aria-label="Condomínios"
      onExport={aoExportar}
      onImport={abrirImportacao}
      showImport={podeImportar}
      importDisabled={importando}
    >
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Condomínio
          </TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Situação
          </TableHead>
          <TableHead sortable sortDirection={directionFor("cidade")} onSort={() => handleSort("cidade")}>
            Cidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("administradora")} onSort={() => handleSort("administradora")}>
            Administradora
          </TableHead>
          <TableHead sortable sortDirection={directionFor("advogado")} onSort={() => handleSort("advogado")}>
            Advogado responsável
          </TableHead>
          <TableHead
            align="right"
            className="w-32"
            sortable
            sortDirection={directionFor("unidades")}
            onSort={() => handleSort("unidades")}
          >
            Unidades
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
              <TableCell className="font-medium">
                <div className="flex flex-col gap-xs">
                  <span>{item.nome}</span>
                  {item.identificadorExterno ? (
                    <span className="text-body-sm text-on-surface-variant">{item.identificadorExterno}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === "Ativo" ? "success" : "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell>{item.cidade || "—"}</TableCell>
              <TableCell>{item.administradora || "—"}</TableCell>
              <TableCell>{rotuloAdvogadosCondominio(item)}</TableCell>
              <TableCell align="right" className="tabular-nums">
                {contarUnidades(item.id)}
              </TableCell>
              <TableActionsCell label={`Ações de ${item.nome}`} actions={acoes(item)} />
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
      <TableMobileList aria-label="Condomínios">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Situação">
                <Badge variant={item.status === "Ativo" ? "success" : "secondary"}>{item.status}</Badge>
              </TableMobileField>
              <TableMobileField label="Cidade">{item.cidade || "—"}</TableMobileField>
              <TableMobileField label="Administradora">{item.administradora || "—"}</TableMobileField>
              <TableMobileField label="Advogados">{rotuloAdvogadosCondominio(item)}</TableMobileField>
              <TableMobileField label="Unidades" valueClassName="tabular-nums">
                {contarUnidades(item.id)}
              </TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
        <PageHeader
          title="Condomínios"
          breadcrumbs={[{ label: "Início", href: "/" }, { label: "Condomínios" }]}
          actions={
            pode("condominios", "criar") ? (
              <Button size="md" onClick={openCreate}>
                <Icon icon={Plus} size="sm" />
                Novo
              </Button>
            ) : undefined
          }
        />
        <PageContent>
          <CardMetricRow aria-label="Resumo de condomínios">
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Building2} size="md" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">na carteira</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Scale} size="md" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(advogadosNaLista).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">advogados</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={MapPin} size="md" className="text-brass" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(comEndereco).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">com endereço</p>
            </CardMetric>
          </CardMetricRow>

          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar condomínio..."
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "administradora",
                label: "Administradora",
                value: administradora,
                onChange: setAdministradora,
                options: [
                  { value: "todas", label: "Todas" },
                  ...administradoras.map((nome) => ({ value: nome, label: nome })),
                ],
              },
              {
                id: "cidade",
                label: "Cidade",
                value: cidade,
                onChange: setCidade,
                options: [
                  { value: "todas", label: "Todas" },
                  ...cidades.map((nome) => ({ value: nome, label: nome })),
                ],
              },
              {
                id: "advogado",
                label: "Advogado responsável",
                value: lawyer,
                onChange: setLawyer,
                options: [
                  { value: "todos", label: "Todos os advogados" },
                  ...opcoesAdvogados.map((nome) => ({ value: nome, label: nome })),
                ],
              },
              {
                id: "situacao",
                label: "Situação",
                value: situacao,
                onChange: setSituacao,
                options: [
                  { value: "todos", label: "Todos" },
                  ...statusCondominio.map((item) => ({ value: item, label: item })),
                ],
              },
            ]}
          />

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
          {visible.length > 0 ? (
            <Pagination page={currentPage} total={visible.length} onPageChange={setPage} />
          ) : null}
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
                  <Icon icon={Building2} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Novo condomínio" : "Editar condomínio"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    O cadastro é da administradora e vale para a palitagem e para os relatórios.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapasCondominio} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Nome" htmlFor={`${formId}-nome`} required error={errors.nome}>
                    <Input
                      id={`${formId}-nome`}
                      value={form.nome}
                      invalid={Boolean(errors.nome)}
                      onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    label="Identificador externo"
                    htmlFor={`${formId}-identificador`}
                    error={errors.identificadorExterno}
                  >
                    <Input
                      id={`${formId}-identificador`}
                      value={form.identificadorExterno}
                      invalid={Boolean(errors.identificadorExterno)}
                      placeholder="Código da administradora ou integração"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, identificadorExterno: event.target.value }))
                      }
                    />
                    <SheetHelpText>
                      Opcional. Quando preenchido, deve ser único. Não use só o nome como identificador confiável.
                    </SheetHelpText>
                  </FormField>
                  <FormField label="Advogados responsáveis" required error={errors.advogados}>
                    <SheetPanel className="flex flex-col gap-md">
                      {opcoesAdvogados.map((nome) => (
                        <SheetToggleRow
                          key={nome}
                          label={nome}
                          htmlFor={`${formId}-adv-${nome}`}
                        >
                          <Switch
                            id={`${formId}-adv-${nome}`}
                            checked={form.advogados.includes(nome)}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                advogados: event.target.checked
                                  ? [...current.advogados, nome]
                                  : current.advogados.filter((item) => item !== nome),
                              }))
                            }
                          />
                        </SheetToggleRow>
                      ))}
                    </SheetPanel>
                  </FormField>
                  <FormField label="Administradora do condomínio" htmlFor={`${formId}-administradora`}>
                    <Input
                      id={`${formId}-administradora`}
                      value={form.administradora}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, administradora: event.target.value }))
                      }
                    />
                  </FormField>
                </>
              ) : step === 1 ? (
                <>
                  <FormField label="CEP" htmlFor={`${formId}-cep`} error={cepErro}>
                    <Input
                      id={`${formId}-cep`}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
                      placeholder="00000-000"
                      value={form.cep}
                      invalid={Boolean(cepErro)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, cep: formatarCep(event.target.value) }))
                      }
                    />
                  </FormField>
                  {buscandoCep ? (
                    <p className="text-body-sm text-on-surface-variant">Buscando CEP...</p>
                  ) : null}
                    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-md">
                      <FormField label="Logradouro" htmlFor={`${formId}-logradouro`}>
                        <Input
                          id={`${formId}-logradouro`}
                          value={form.logradouro}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, logradouro: event.target.value }))}
                        />
                      </FormField>
                      <FormField label="Número" htmlFor={`${formId}-numero`}>
                        <Input
                          id={`${formId}-numero`}
                          value={form.numero}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))}
                        />
                      </FormField>
                    </div>
                    <FormField label="Complemento" htmlFor={`${formId}-complemento`}>
                      <Input
                        id={`${formId}-complemento`}
                        value={form.complemento}
                        disabled={!enderecoLiberado}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, complemento: event.target.value }))
                        }
                      />
                    </FormField>
                    <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-md">
                      <FormField label="Cidade" htmlFor={`${formId}-cidade`}>
                        <Input
                          id={`${formId}-cidade`}
                          value={form.cidade}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))}
                        />
                      </FormField>
                      <FormField label="Estado" htmlFor={`${formId}-estado`}>
                        <Select
                          id={`${formId}-estado`}
                          value={form.estado}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {estados.map((sigla) => (
                            <option key={sigla} value={sigla}>
                              {sigla}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                </>
              ) : (
                <FormField label="Observação" htmlFor={`${formId}-observacao`}>
                  <Textarea
                    id={`${formId}-observacao`}
                    value={form.observacao}
                    onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
                  />
                </FormField>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
              saveLabel={step < etapasCondominio.length - 1 ? "Continuar" : "Salvar"}
            />
          </SheetForm>
        </SheetContent>
      </Sheet>

      <Sheet
        open={detalhe !== null}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
      >
        <SheetContent aria-labelledby={`${formId}-detalhe-title`} aria-describedby={`${formId}-detalhe-desc`}>
          {detalhe ? (
            <>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={Building2} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${formId}-detalhe-title`}>{detalhe.nome}</SheetTitle>
                    <SheetDescription id={`${formId}-detalhe-desc`}>
                      Endereço, administradora e unidades deste condomínio.
                    </SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                <SheetPanel variant="tint">
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="Situação" value={detalhe.status} />
                    <DetalheCampo label="Identificador" value={detalhe.identificadorExterno} />
                    <DetalheCampo label="Advogados responsáveis" value={rotuloAdvogadosCondominio(detalhe)} />
                    <DetalheCampo label="Administradora" value={detalhe.administradora} />
                  </div>
                </SheetPanel>
                <SheetPanel className="flex flex-col gap-md">
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="CEP" value={detalhe.cep} />
                    <DetalheCampo label="Número" value={detalhe.numero} />
                  </div>
                  <DetalheCampo label="Logradouro" value={detalhe.logradouro} />
                  <DetalheCampo label="Complemento" value={detalhe.complemento} />
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="Cidade" value={detalhe.cidade} />
                    <DetalheCampo label="Estado" value={detalhe.estado} />
                  </div>
                </SheetPanel>
                <SheetPanel>
                  <DetalheCampo label="Observação" value={detalhe.observacao} />
                </SheetPanel>
                <SheetPanel className="flex flex-col gap-md">
                  <p className="text-label-lg text-on-surface">Unidades</p>
                  {unidadesDoDetalhe.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">Nenhuma unidade cadastrada neste condomínio.</p>
                  ) : (
                    unidadesDoDetalhe.map((unidade) => (
                      <div key={unidade.id} className="flex items-center justify-between gap-md">
                        <div className="min-w-0">
                          <p className="text-label-lg text-on-surface">{unidade.identificacao}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {[unidade.bloco, unidade.tipo].filter((parte) => parte.trim()).join(" · ")}
                          </p>
                        </div>
                        <Badge variant={unidade.status === "Ativa" ? "success" : "error"}>{unidade.status}</Badge>
                      </div>
                    ))
                  )}
                </SheetPanel>
              </SheetBody>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setDetalheId(null)}>
                  Fechar
                </Button>
                <Button type="button" variant="outline" onClick={() => verUnidades(detalhe)}>
                  <Icon icon={DoorOpen} size="sm" />
                  Ver unidades
                </Button>
                {pode("unidades", "criar") && detalhe.status === "Ativo" ? (
                  <Button type="button" onClick={() => adicionarUnidade(detalhe)}>
                    <Icon icon={Plus} size="sm" />
                    Adicionar unidade
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
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
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={statusTarget?.status === "Ativo" ? "Inativar condomínio?" : "Reativar condomínio?"}
        description={
          statusTarget
            ? statusTarget.status === "Ativo"
              ? `${statusTarget.nome} deixa de aparecer nas rotinas ativas. Débitos, atendimentos e relatórios históricos permanecem.`
              : `${statusTarget.nome} volta a ficar disponível para operação.`
            : undefined
        }
        confirmLabel={statusTarget?.status === "Ativo" ? "Inativar" : "Reativar"}
        cancelLabel="Cancelar"
        confirmVariant={statusTarget?.status === "Ativo" ? "critical" : "primary"}
        onConfirm={confirmStatusChange}
      />
    </WorkspaceShell>
  );
}
