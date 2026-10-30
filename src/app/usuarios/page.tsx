"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { Briefcase, KeyRound, Pencil, Phone, Plus, Trash2, UserRound, UserX } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { Checkbox, FormField, Input, Select } from "@/components/input";
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
  TableExport,
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
  TableSelectCell,
  type TableExportFormat,
  type TableSortDirection,
} from "@/components/table";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { iniciaisNome, nomeCargo, type Cargo, type Usuario } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { sincronizarCargosDoServidor } from "@/lib/cargos/sync-cliente";
import {
  aplicarUsuarioExcluido,
  aplicarUsuarioSalvo,
  garantirUsuariosPersistidosNoServidor,
  sincronizarUsuariosDoServidor,
} from "@/lib/usuarios/sync-cliente";
import type { UsuarioPublico } from "@/lib/usuarios/apresentacao";
import { usePermissao } from "@/hooks/use-permissao";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { codigoReDoUsuario, usuarioEhAtendente } from "@/lib/colaboradores/re";
import { idsCondominiosDoAdvogado } from "@/lib/usuarios/advogado-condominios";

type SortKey = "nome" | "codigoRe" | "email" | "telefone" | "cargo" | "ativo";

const colunasExportacao = [
  "Nome",
  "Código RE",
  "Login",
  "E-mail",
  "Telefone",
  "Perfil",
  "Situação",
] as const;
const formularioVazio = {
  cargoId: "",
  codigo: "",
  nome: "",
  telefone: "",
  email: "",
  senha: "",
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

function rotuloPerfil(cargoId: number) {
  const cargo = nomeCargo(cargoId);
  if (cargo === "Administrador") return "Administradora";
  return cargo;
}

export default function UsuariosPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCadastros();
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
  const [errors, setErrors] = useState<Partial<Record<"nome" | "codigo" | "cargoId" | "email" | "senha", string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const recarregarCargos = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/cargos", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { cargos?: Cargo[] };
      if (body.cargos) sincronizarCargosDoServidor(body.cargos);
    } catch {
      /* mantém catálogo local */
    }
  }, [user]);

  const recarregarUsuarios = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/usuarios", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { usuarios?: UsuarioPublico[] };
      if (body.usuarios) sincronizarUsuariosDoServidor(body.usuarios);
    } catch {
      /* mantém catálogo local */
    }
  }, [user]);

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
            return nomeCargo(item.cargoId);
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
  const comTelefone = visible.filter((item) => item.telefone.trim().length > 0).length;
  const comAcesso = visible.filter((item) => item.ativo !== false).length;
  const cargosNoRecorte = new Set(visible.map((item) => item.cargoId)).size;
  const metricValor = (n: number) => String(n).padStart(2, "0");

  const allSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));
  const someSelected = visible.some((item) => selected.has(item.id)) && !allSelected;

  function toggleRow(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(visible.map((item) => item.id)));
      return;
    }
    setSelected(new Set());
  }

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
    setSelected(new Set());
  }

  function handleClear() {
    setSearch("");
    setCargo("todos");
    setSituacao("todos");
    setAppliedSearch("");
    setAppliedCargo("todos");
    setAppliedSituacao("todos");
    setPage(1);
    setSelected(new Set());
  }

  function linhasExportacao() {
    return visible.map((item) => [
      item.nome,
      codigoReDoUsuario(item) ?? "—",
      item.codigo,
      item.email || "—",
      item.telefone.trim() || "—",
      nomeCargo(item.cargoId),
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
      telefone: item.telefone,
      email: item.email,
      senha: "",
      condominioIds:
        nomeCargo(item.cargoId) === "Advogado" ? idsCondominiosDoAdvogado(item.nome) : [],
    });
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    const preenchido =
      form.condominioIds.length > 0 ||
      (["cargoId", "codigo", "nome", "telefone", "email", "senha"] as const).some(
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
    aplicarUsuarioExcluido(deleteTarget.id);
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
    aplicarUsuarioSalvo(body.usuario, "UPDATE");
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
    const codigo = normalizarCodigoUsuario(form.codigo);
    const email = form.email.trim();
    const senha = form.senha.trim();
    const nextErrors: Partial<Record<"nome" | "codigo" | "cargoId" | "email" | "senha", string>> = {};

    if (!nome) nextErrors.nome = "Informe o nome.";
    if (!codigo) nextErrors.codigo = "Informe o código de login.";
    else if (!codigoUsuarioValido(codigo)) {
      nextErrors.codigo = "Use de 2 a 32 caracteres (letras, números, ponto, hífen ou sublinhado).";
    } else if (
      usuarios.some(
        (item) =>
          item.id !== editingId && normalizarCodigoUsuario(item.codigo) === codigo,
      )
    ) {
      nextErrors.codigo = "Já existe um colaborador com este código.";
    }
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

    const payload = {
      codigo,
      cargoId: Number(form.cargoId),
      nome,
      telefone: form.telefone.trim(),
      email,
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
        if (msgLower.includes("código")) setErrors({ codigo: msg });
        else if (msgLower.includes("e-mail")) setErrors({ email: msg });
        else if (msgLower.includes("cargo")) setErrors({ cargoId: msg });
        else if (msgLower.includes("senha")) setErrors({ senha: msg });
        else if (msgLower.includes("nome")) setErrors({ nome: msg });
        return;
      }
      aplicarUsuarioSalvo(body.usuario, editingId === null ? "INSERT" : "UPDATE");
      const reGerado = body.usuario.codigoRe;
      toast({
        variant: "success",
        title: editingId === null ? "Colaborador cadastrado" : "Colaborador atualizado",
        description:
          editingId === null && reGerado
            ? `Código RE atribuído: ${reGerado}`
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
    <Table aria-label="Colaboradores" showExport={false}>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead
            selection
            selectionChecked={allSelected}
            selectionIndeterminate={someSelected}
            onSelectionChange={toggleAll}
            selectionDisabled={visible.length === 0}
          />
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Nome
          </TableHead>
          <TableHead sortable sortDirection={directionFor("codigoRe")} onSort={() => handleSort("codigoRe")}>
            Código RE
          </TableHead>
          <TableHead sortable sortDirection={directionFor("cargo")} onSort={() => handleSort("cargo")}>
            Perfil
          </TableHead>
          <TableHead sortable sortDirection={directionFor("cargo")} onSort={() => handleSort("cargo")}>
            Cargo
          </TableHead>
          <TableHead sortable sortDirection={directionFor("ativo")} onSort={() => handleSort("ativo")}>
            Situação
          </TableHead>
          <TableHead sortable sortDirection={directionFor("telefone")} onSort={() => handleSort("telefone")}>
            Telefone
          </TableHead>
          <TableHead>Último acesso</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={9}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableSelectCell
                checked={selected.has(item.id)}
                label={`Selecionar ${item.nome}`}
                onCheckedChange={(checked) => toggleRow(item.id, checked)}
              />
              <TableCell>
                <div className="flex min-w-0 items-center gap-sm">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/45 text-label-md font-semibold text-primary-container"
                    aria-hidden="true"
                  >
                    {iniciaisNome(item.nome)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">{item.nome}</p>
                    <p className="truncate text-body-sm text-on-surface-variant">{item.email || "—"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-body-sm">{codigoReDoUsuario(item) ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="rounded-md bg-gold-subtle font-normal text-primary-container">
                  {rotuloPerfil(item.cargoId)}
                </Badge>
              </TableCell>
              <TableCell className="text-on-surface">{nomeCargo(item.cargoId)}</TableCell>
              <TableCell>
                <Badge variant={item.ativo === false ? "neutral" : "success"}>{rotuloSituacao(item)}</Badge>
              </TableCell>
              <TableCell>{item.telefone.trim() || "—"}</TableCell>
              <TableCell className="text-on-surface-variant">—</TableCell>
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
      <TableMobileList aria-label="Colaboradores">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <Checkbox
                checked={selected.has(item.id)}
                aria-label={`Selecionar ${item.nome}`}
                onChange={(event) => toggleRow(item.id, event.target.checked)}
              />
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="E-mail">{item.email || "—"}</TableMobileField>
              <TableMobileField label="RE">{codigoReDoUsuario(item) ?? "—"}</TableMobileField>
              <TableMobileField label="Perfil">
                <Badge variant="secondary" className="rounded-md bg-gold-subtle font-normal text-primary-container">
                  {rotuloPerfil(item.cargoId)}
                </Badge>
              </TableMobileField>
              <TableMobileField label="Cargo">{nomeCargo(item.cargoId)}</TableMobileField>
              <TableMobileField label="Telefone">{item.telefone.trim() || "—"}</TableMobileField>
              <TableMobileField label="Situação">
                <Badge variant={item.ativo === false ? "neutral" : "success"}>{rotuloSituacao(item)}</Badge>
              </TableMobileField>
              <TableMobileField label="Último acesso">—</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Colaboradores"
        description="Cadastre quem acessa o sistema, defina cargos e acompanhe situação e acesso."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Colaboradores" }]}
        actions={
          pode("usuarios", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo colaborador
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        <div
          className="grid grid-cols-1 gap-md min-[768px]:grid-cols-2 min-[1024px]:grid-cols-4"
          aria-label="Resumo de colaboradores"
        >
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={UserRound} size="md" className="text-primary-container" />}
            rotulo="Total de colaboradores"
            valor={metricValor(visible.length)}
            detalhe="No recorte após filtrar"
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={Briefcase} size="md" className="text-brass" />}
            rotulo="Cargos cadastrados"
            valor={metricValor(cargosNoRecorte)}
            detalhe="Perfis distintos na lista"
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={Phone} size="md" className="text-tertiary-container" />}
            rotulo="Colaboradores com telefone"
            valor={metricValor(comTelefone)}
            detalhe="Com número informado"
          />
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={KeyRound} size="md" className="text-primary-container" />}
            rotulo="Colaboradores com acesso ao sistema"
            valor={metricValor(comAcesso)}
            detalhe="Situação ativa no recorte"
          />
        </div>

        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm text-on-surface">Filtros</h2>
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
              {
                id: "situacao",
                label: "Situação",
                value: situacao,
                onChange: setSituacao,
                options: [
                  { value: "todos", label: "Todas" },
                  { value: "ativos", label: "Ativos" },
                  { value: "inativos", label: "Inativos" },
                ],
              },
            ]}
          />
        </section>

        <section className="flex flex-col gap-sm">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <p className="text-body-md text-on-surface">
              <span className="font-semibold tabular-nums">{visible.length}</span>{" "}
              {visible.length === 1 ? "colaborador" : "colaboradores"}
            </p>
            <TableExport onExport={aoExportar} />
          </div>
          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} showExport={false} />
        </section>
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
                  <Icon icon={UserRound} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Novo colaborador" : "Editar colaborador"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Atendentes recebem RE automático no cadastro. O código de login não aparece na listagem
                    operacional.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormField label="Nome" htmlFor={`${formId}-nome`} required error={errors.nome}>
                <Input
                  id={`${formId}-nome`}
                  value={form.nome}
                  invalid={Boolean(errors.nome)}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                />
              </FormField>
              <FormField label="Código de login" htmlFor={`${formId}-codigo`} required error={errors.codigo}>
                <Input
                  id={`${formId}-codigo`}
                  value={form.codigo}
                  invalid={Boolean(errors.codigo)}
                  autoComplete="off"
                  onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value }))}
                />
              </FormField>
              <FormField label="Cargo" htmlFor={`${formId}-cargo`} required error={errors.cargoId}>
                <Select
                  id={`${formId}-cargo`}
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
              {editingUsuario && usuarioEhAtendente(editingUsuario) && editingUsuario.codigoRe ? (
                <FormField label="Código RE" htmlFor={`${formId}-re`}>
                  <Input id={`${formId}-re`} value={editingUsuario.codigoRe} readOnly disabled />
                </FormField>
              ) : null}
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
              <FormField label="Telefone" htmlFor={`${formId}-telefone`}>
                <Input
                  id={`${formId}-telefone`}
                  value={form.telefone}
                  onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))}
                />
              </FormField>
              <FormField label="E-mail" htmlFor={`${formId}-email`} required error={errors.email}>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  value={form.email}
                  invalid={Boolean(errors.email)}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </FormField>
              <FormField
                label={editingId === null ? "Senha" : "Nova senha"}
                htmlFor={`${formId}-senha`}
                required={editingId === null}
                error={errors.senha}
              >
                <Input
                  id={`${formId}-senha`}
                  type="password"
                  autoComplete="new-password"
                  value={form.senha}
                  invalid={Boolean(errors.senha)}
                  onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
                />
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
