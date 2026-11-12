"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import {
  Briefcase,
  Calendar,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  UserRound,
  Users,
  UserX,
} from "lucide-react";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { FormField, Input, Select } from "@/components/input";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
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
  SheetHelpText,
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
  TableDataBar,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { iniciaisNome, nomeCargo, type Cargo, type Usuario } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import type { UsuarioPublico } from "@/lib/usuarios/apresentacao";
import { usePermissao } from "@/hooks/use-permissao";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";
import { digitosTelefone, formatarTelefone } from "@/lib/telefone";
import { idsCondominiosDoAdvogadoNoCadastro } from "@/lib/usuarios/advogado-condominios-client";
import { garantirUsuariosPersistidosNoServidor } from "@/lib/usuarios/ensure-server-sync";

type SortKey = "nome" | "codigoRe" | "email" | "telefone" | "cargo" | "ativo";

const colunasExportacao = [
  "Nome",
  "Código RE",
  "Login",
  "E-mail",
  "Telefone",
  "Cargo",
  "Situação",
] as const;
const formularioVazio = {
  cargoId: "",
  codigo: "",
  nome: "",
  telefone: "",
  email: "",
  senha: "",
  ativo: true,
  condominioIds: [] as number[],
};

function identificacaoListagem(item: Usuario) {
  const re = codigoReDoUsuario(item);
  if (re) return re;
  return item.nome.trim() || item.codigo;
}

function rotuloSituacao(item: Usuario) {
  return item.ativo === false ? "Inativo" : "Ativo";
}

function rotuloReListagem(item: Usuario): string {
  const re = codigoReDoUsuario(item);
  if (!re) return "—";
  return re.replace(/^RE-/i, "RE - ");
}

function SituacaoColaboradorBadge({ ativo }: { ativo: boolean }) {
  const inativo = ativo === false;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-body-sm font-medium ${
        inativo
          ? "bg-primary-fixed/45 text-primary-container"
          : "bg-[color-mix(in_srgb,var(--color-status-settled)_18%,var(--color-surface-card))] text-status-settled"
      }`}
    >
      <span
        className={`size-2 shrink-0 rounded-full ${inativo ? "bg-primary-container/80" : "bg-status-settled"}`}
        aria-hidden
      />
      {inativo ? "Inativo" : "Ativo"}
    </span>
  );
}

export default function UsuariosPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const usuarios = cadastros.usuarios;
  const [search, setSearch] = useState("");
  const [cargo, setCargo] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCargo, setAppliedCargo] = useState("todos");
  const [appliedSituacao, setAppliedSituacao] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"nome" | "cargoId" | "email" | "senha", string>>>({});
  const [salvando, setSalvando] = useState(false);

  const recarregarCargos = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/cargos", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { cargos?: Cargo[] };
      if (body.cargos) void refetch()
    } catch {
      /* mantém catálogo local */
    }
  }, [user, refetch]);

  const recarregarUsuarios = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/usuarios", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { usuarios?: UsuarioPublico[] };
      if (body.usuarios) void refetch()
    } catch {
      /* mantém catálogo local */
    }
  }, [user, refetch]);

  useEffect(() => {
    void recarregarCargos();
  }, [recarregarCargos]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await recarregarUsuarios();
      const resultado = await garantirUsuariosPersistidosNoServidor();
      if (cancelled || resultado.ok) return;
      toast({ variant: "error", title: "Sincronização", description: resultado.error });
    })();
    return () => {
      cancelled = true;
    };
  }, [recarregarUsuarios, user?.userId, toast]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = usuarios
    .filter((item) => {
      const matchesCargo = appliedCargo === "todos" || String(item.cargoId) === appliedCargo;
      const matchesSituacao =
        appliedSituacao === "todos" ||
        (appliedSituacao === "ativos" && item.ativo !== false) ||
        (appliedSituacao === "inativos" && item.ativo === false);
      const haystack = `${identificacaoListagem(item)} ${item.nome} ${item.codigo} ${item.codigoRe ?? ""} ${item.email} ${item.telefone}`.toLocaleLowerCase(
        "pt-BR",
      );
      return matchesCargo && matchesSituacao && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const valorOrdenacao = (item: Usuario, key: SortKey) => {
        switch (key) {
          case "cargo":
            return nomeCargo(item.cargoId, cadastros);
          case "codigoRe":
            return codigoReDoUsuario(item) ?? "";
          case "email":
            return item.email;
          case "telefone":
            return item.telefone;
          case "ativo":
            return rotuloSituacao(item);
          default:
            return item.nome;
        }
      };
      const left = valorOrdenacao(a, sortKey);
      const right = valorOrdenacao(b, sortKey);
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    setAppliedCargo(cargo);
    setAppliedSituacao(situacao);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setCargo("todos");
    setSituacao("todos");
    setAppliedSearch("");
    setAppliedCargo("todos");
    setAppliedSituacao("todos");
    setPage(1);
  }

  function handleTabSituacao(value: string) {
    setSituacao(value);
    setAppliedSituacao(value);
    setPage(1);
  }

  function aoImportar() {
    toast({
      variant: "info",
      title: "Importar",
      description: "Importação em lote de colaboradores ainda não está disponível.",
    });
  }

  function linhasExportacao() {
    return visible.map((item) => [
      item.nome,
      codigoReDoUsuario(item) ?? "—",
      item.codigo,
      item.email || "—",
      item.telefone.trim() ? formatarTelefone(item.telefone) : "—",
      nomeCargo(item.cargoId, cadastros),
      rotuloSituacao(item),
    ]);
  }

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou cadastre colaboradores.",
      });
      return;
    }
    const linhas = linhasExportacao();
    const colunas = [...colunasExportacao];
    const arquivoBase = `colaboradores-${new Date().toISOString().slice(0, 10)}`;
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
    const abriu = exportarPdf("Colaboradores", `${arquivoBase}.html`, [
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

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: Usuario) {
    setEditingId(item.id);
    setForm({
      cargoId: String(item.cargoId),
      codigo: item.codigo,
      nome: item.nome,
      telefone: formatarTelefone(item.telefone),
      email: item.email,
      senha: "",
      ativo: item.ativo !== false,
      condominioIds:
        nomeCargo(item.cargoId, cadastros) === "Advogado"
          ? idsCondominiosDoAdvogadoNoCadastro(cadastros.condominios, item.nome)
          : [],
    });
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    const preenchido =
      form.condominioIds.length > 0 ||
      (["cargoId", "nome", "telefone", "email", "senha"] as const).some(
        (key) => form[key].trim() !== "",
      );
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
    if (!deleteTarget || !pode("usuarios", "excluir")) return;
    const response = await fetch(`/api/usuarios/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast({
        variant: "error",
        title: "Erro ao excluir",
        description: body.error ?? "Não foi possível excluir o colaborador.",
      });
      setDeleteTarget(null);
      return;
    }
    void refetch();
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Colaborador excluído" });
    setDeleteTarget(null);
  }

  async function alternarSituacao(item: Usuario) {
    if (!pode("usuarios", "editar")) return;
    const ativo = item.ativo === false;
    const response = await fetch(`/api/usuarios/${item.id}/situacao`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    const body = (await response.json()) as { usuario?: Omit<Usuario, "senha">; error?: string };
    if (!response.ok || !body.usuario) {
      toast({
        variant: "error",
        title: "Situação",
        description: body.error ?? "Não foi possível alterar a situação.",
      });
      return;
    }
    void refetch();
    toast({
      variant: "success",
      title: ativo ? "Colaborador reativado" : "Colaborador desativado",
    });
  }

  function acoes(item: Usuario) {
    const lista = [];
    if (pode("usuarios", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("usuarios", "editar")) {
      lista.push({
        label: item.ativo === false ? "Reativar" : "Desativar",
        icon: UserX,
        onSelect: () => void alternarSituacao(item),
      });
    }
    if (pode("usuarios", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  const cargoAdvogadoId = cadastros.cargos.find((item) => item.nome === "Advogado")?.id;
  const cargoSelecionadoAdvogado =
    form.cargoId !== "" && cargoAdvogadoId !== undefined && Number(form.cargoId) === cargoAdvogadoId;
  const editingUsuario = editingId !== null ? usuarios.find((item) => item.id === editingId) : undefined;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pode("usuarios", editingId === null ? "criar" : "editar")) return;
    const nome = form.nome.trim();
    const email = form.email.trim();
    const senha = form.senha.trim();
    const nextErrors: Partial<Record<"nome" | "cargoId" | "email" | "senha", string>> = {};

    if (!nome) nextErrors.nome = "Informe o nome.";
    if (!form.cargoId) nextErrors.cargoId = "Selecione o cargo.";
    if (!email) nextErrors.email = "Informe o e-mail de acesso.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Informe um e-mail válido.";
    else if (
      usuarios.some(
        (item) => item.id !== editingId && item.email.localeCompare(email, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      nextErrors.email = "Já existe um colaborador com este e-mail.";
    }
    if (editingId === null && !senha) nextErrors.senha = "Informe a senha de acesso.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const reExistente = editingUsuario ? codigoReDoUsuario(editingUsuario) : null;
    const codigo =
      reExistente ??
      editingUsuario?.codigo ??
      email.split("@")[0]?.trim() ??
      "";

    const payload = {
      codigo,
      cargoId: Number(form.cargoId),
      nome,
      telefone: digitosTelefone(form.telefone),
      email,
      ativo: form.ativo,
      ...(senha ? { senha } : {}),
      ...(cargoSelecionadoAdvogado ? { condominioIds: form.condominioIds } : {}),
    };

    setSalvando(true);
    try {
      const url = editingId === null ? "/api/usuarios" : `/api/usuarios/${editingId}`;
      const method = editingId === null ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { usuario?: Omit<Usuario, "senha">; error?: string };
      if (!response.ok || !body.usuario) {
        const msg = body.error ?? "Não foi possível salvar o colaborador.";
        toast({
          variant: "error",
          title: editingId === null ? "Erro ao cadastrar" : "Erro ao atualizar",
          description: msg,
        });
        const msgLower = msg.toLocaleLowerCase("pt-BR");
        if (msgLower.includes("e-mail") || msgLower.includes("login")) setErrors({ email: msg });
        else if (msgLower.includes("cargo")) setErrors({ cargoId: msg });
        else if (msgLower.includes("senha")) setErrors({ senha: msg });
        else if (msgLower.includes("nome")) setErrors({ nome: msg });
        return;
      }
      void refetch();
      const reGerado = body.usuario.codigoRe;
      toast({
        variant: "success",
        title: editingId === null ? "Colaborador cadastrado" : "Colaborador atualizado",
        description:
          editingId === null && reGerado
            ? `Código RE (login): ${reGerado}`
            : undefined,
      });
      setSheetOpen(false);
    } finally {
      setSalvando(false);
    }
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={UserRound} size="lg" />}
      title={usuarios.length === 0 ? "Nenhum colaborador cadastrado" : "Nenhum colaborador encontrado"}
      description={
        usuarios.length === 0
          ? "Cadastre quem acessa o sistema. O nome do atendimento vem deste login."
          : "Ajuste a busca ou o cargo."
      }
      action={
        pode("usuarios", "criar") ? (
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
      aria-label="Colaboradores"
      showExport={false}
      fitContainer
      containerClassName="border-0 shadow-none rounded-none"
    >
      <colgroup>
        <col className="min-w-[12rem] w-[26%]" />
        <col className="w-[14%]" />
        <col className="w-[14%]" />
        <col className="w-[24%]" />
        <col className="w-[18%]" />
        <col className="w-[4.5rem]" />
      </colgroup>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Nome
          </TableHead>
          <TableHead
            align="center"
            sortable
            sortDirection={directionFor("cargo")}
            onSort={() => handleSort("cargo")}
          >
            Cargo
          </TableHead>
          <TableHead
            align="center"
            sortable
            sortDirection={directionFor("ativo")}
            onSort={() => handleSort("ativo")}
          >
            Situação
          </TableHead>
          <TableHead
            align="center"
            sortable
            sortDirection={directionFor("email")}
            onSort={() => handleSort("email")}
          >
            Contato
          </TableHead>
          <TableHead align="center">Último acesso</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="!align-middle py-md">
                <div className="flex min-w-0 items-center gap-sm">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/45 text-label-md font-semibold text-primary-container"
                    aria-hidden="true"
                  >
                    {iniciaisNome(item.nome)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">{item.nome}</p>
                    <p className="truncate text-body-sm text-on-surface-variant">{rotuloReListagem(item)}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell align="center" className="!align-middle py-md text-on-surface">
                {nomeCargo(item.cargoId, cadastros)}
              </TableCell>
              <TableCell align="center" className="!align-middle py-md">
                <div className="flex justify-center">
                  <SituacaoColaboradorBadge ativo={item.ativo !== false} />
                </div>
              </TableCell>
              <TableCell align="center" className="!align-middle py-md">
                <div className="flex min-w-0 items-center justify-center gap-sm text-on-surface">
                  <Icon icon={Mail} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden />
                  <span className="min-w-0 max-w-full truncate">{item.email.trim() || "—"}</span>
                </div>
              </TableCell>
              <TableCell align="center" className="!align-middle py-md text-on-surface-variant">
                <span className="inline-flex items-center justify-center gap-sm">
                  <Icon icon={Calendar} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden />
                  —
                </span>
              </TableCell>
              <TableActionsCell
                label={`Ações de ${item.nome}`}
                actions={acoes(item)}
                className="!align-middle py-md size-9 rounded-lg bg-primary-fixed/35 text-primary-container hover:bg-primary-fixed/50 hover:text-primary-container"
              />
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
      <TableMobileList aria-label="Colaboradores">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed/45 text-label-md font-semibold text-primary-container"
                aria-hidden="true"
              >
                {iniciaisNome(item.nome)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {item.nome}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">{rotuloReListagem(item)}</p>
              </div>
              <TableActionsButton
                label={`Ações de ${item.nome}`}
                actions={acoes(item)}
                className="size-9 rounded-lg bg-primary-fixed/35 text-primary-container hover:bg-primary-fixed/50 hover:text-primary-container"
              />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col items-center gap-sm border-t border-border-subtle/30 pt-sm text-center">
              <div className="flex w-full flex-col items-center gap-xs text-body-sm">
                <p className="text-label-sm uppercase text-on-surface-variant">Cargo</p>
                <p className="text-body-md text-on-surface">{nomeCargo(item.cargoId, cadastros)}</p>
                <SituacaoColaboradorBadge ativo={item.ativo !== false} />
              </div>
              <div className="flex w-full flex-col items-center gap-xs">
                <p className="text-label-sm uppercase text-on-surface-variant">Contato</p>
                <p className="flex max-w-full items-center justify-center gap-xs text-body-md text-on-surface">
                  <Icon icon={Mail} size="sm" className="shrink-0 text-on-surface-variant" aria-hidden />
                  <span className="truncate">{item.email.trim() || "—"}</span>
                </p>
              </div>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={UserRound}
        title="Colaboradores"
        description="Colaboradores, cargos e acesso ao sistema."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
        actions={
          pode("usuarios", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo
            </Button>
          ) : undefined
        }
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        {authLoading ? (
          <SkeletonListPage
            showMetrics={false}
            rows={8}
            cols={6}
            label="Carregando colaboradores"
          />
        ) : (
        <>
        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar colaborador..."
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "cargo",
                label: "Cargo",
                value: cargo,
                onChange: setCargo,
                options: [
                  { value: "todos", label: "Todos os cargos" },
                  ...cadastros.cargos.map((item) => ({ value: String(item.id), label: item.nome })),
                ],
              },
            ]}
          />
        </FiltrosSection>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-card shadow-card">
          <div className="flex flex-col gap-sm border-b border-border-subtle px-md pt-sm min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
            <Tabs value={appliedSituacao} onValueChange={handleTabSituacao} className="min-w-0 flex-1">
              <TabsList className="w-full border-b-0 min-[768px]:w-auto">
                <TabsTrigger value="todos" className="gap-sm">
                  <Icon icon={Users} size="sm" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="ativos" className="gap-sm">
                  <span className="size-2.5 shrink-0 rounded-full bg-status-settled" aria-hidden />
                  Ativos
                </TabsTrigger>
                <TabsTrigger value="inativos" className="gap-sm">
                  <span className="size-2.5 shrink-0 rounded-full bg-on-surface-variant/50" aria-hidden />
                  Inativos
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <TableDataBar className="shrink-0 pb-sm" onExport={aoExportar} onImport={aoImportar} showImport />
          </div>
          <ResponsiveTable
            className="min-w-0"
            desktop={desktopTable}
            mobile={mobileTable}
            showExport={false}
            onExport={aoExportar}
            onImport={aoImportar}
            showImport
          />
        </section>
        {visible.length > 0 ? (
          <Pagination
            page={currentPage}
            total={visible.length}
            onPageChange={setPage}
            itemLabel="colaboradores"
          />
        ) : null}
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
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={UserRound} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Novo colaborador" : "Editar colaborador"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Altere dados do colaborador. Todo colaborador recebe código RE (login) no cadastro.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormField label="Nome" htmlFor={`${formId}-nome`} required error={errors.nome}>
                <Input
                  id={`${formId}-nome`}
                  icon={UserRound}
                  value={form.nome}
                  invalid={Boolean(errors.nome)}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                />
              </FormField>
              <FormField label="Cargo" htmlFor={`${formId}-cargo`} required error={errors.cargoId}>
                <Select
                  id={`${formId}-cargo`}
                  icon={Briefcase}
                  value={form.cargoId}
                  invalid={Boolean(errors.cargoId)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cargoId: event.target.value,
                      condominioIds: [],
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {cadastros.cargos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </FormField>
              {cargoSelecionadoAdvogado ? (
                <FormField label="Condomínios sob responsabilidade">
                  <div className="flex max-h-48 flex-col gap-sm overflow-y-auto rounded-md border border-border-subtle p-md">
                    {cadastros.condominios.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant">Nenhum condomínio cadastrado.</p>
                    ) : (
                      cadastros.condominios.map((condominio) => (
                        <label key={condominio.id} className="flex items-center gap-sm text-body-sm">
                          <input
                            type="checkbox"
                            checked={form.condominioIds.includes(condominio.id)}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                condominioIds: event.target.checked
                                  ? [...current.condominioIds, condominio.id]
                                  : current.condominioIds.filter((id) => id !== condominio.id),
                              }))
                            }
                          />
                          {condominio.nome}
                        </label>
                      ))
                    )}
                  </div>
                </FormField>
              ) : null}
              <div className="grid grid-cols-2 gap-md">
                <FormField label="Contato" htmlFor={`${formId}-telefone`}>
                  <Input
                    id={`${formId}-telefone`}
                    icon={Phone}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        telefone: formatarTelefone(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <FormField label="E-mail" htmlFor={`${formId}-email`} required error={errors.email}>
                  <Input
                    id={`${formId}-email`}
                    icon={Mail}
                    type="email"
                    value={form.email}
                    invalid={Boolean(errors.email)}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </FormField>
              </div>
              <FormField
                label={editingId === null ? "Senha" : "Nova senha"}
                htmlFor={`${formId}-senha`}
                required={editingId === null}
                error={errors.senha}
              >
                <Input
                  id={`${formId}-senha`}
                  icon={Lock}
                  type="password"
                  autoComplete="new-password"
                  placeholder={editingId !== null ? "Deixe em branco para manter a senha atual." : undefined}
                  value={form.senha}
                  invalid={Boolean(errors.senha)}
                  onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
                />
                {editingId !== null ? (
                  <SheetHelpText>A administradora pode redefinir a qualquer momento.</SheetHelpText>
                ) : null}
              </FormField>
              <FormField label="Situação" htmlFor={`${formId}-situacao`}>
                <Select
                  id={`${formId}-situacao`}
                  icon={Power}
                  value={form.ativo ? "ativo" : "inativo"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ativo: event.target.value === "ativo" }))
                  }
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </FormField>
            </SheetBody>
            <SheetFooterForm onClose={closeSheet} saveDisabled={salvando} saveLabel={salvando ? "Salvando…" : "Salvar"} />
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
        title="Excluir colaborador?"
        description={deleteTarget ? `${deleteTarget.nome} perderá o acesso.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}