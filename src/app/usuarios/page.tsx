"use client";

import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
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
import { nomeCargo, type Usuario } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import {
  aplicarUsuarioExcluido,
  aplicarUsuarioSalvo,
  garantirUsuariosPersistidosNoServidor,
} from "@/lib/usuarios/sync-cliente";
import { usePermissao } from "@/hooks/use-permissao";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";

type SortKey = "nome" | "codigo" | "email" | "cargo";
const formularioVazio = { cargoId: "", codigo: "", nome: "", telefone: "", email: "", senha: "" };

export default function UsuariosPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCadastros();
  const usuarios = cadastros.usuarios;
  const [search, setSearch] = useState("");
  const [cargo, setCargo] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCargo, setAppliedCargo] = useState("todos");
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resultado = await garantirUsuariosPersistidosNoServidor();
      if (cancelled || resultado.ok) return;
      toast({ variant: "error", title: "Sincronização", description: resultado.error });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId, toast]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = usuarios
    .filter((item) => {
      const matchesCargo = appliedCargo === "todos" || String(item.cargoId) === appliedCargo;
      const haystack = `${item.nome} ${item.codigo} ${item.email} ${item.telefone}`.toLocaleLowerCase("pt-BR");
      return matchesCargo && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left =
        sortKey === "email"
          ? a.email
          : sortKey === "cargo"
            ? nomeCargo(a.cargoId)
            : sortKey === "codigo"
              ? a.codigo
              : a.nome;
      const right =
        sortKey === "email"
          ? b.email
          : sortKey === "cargo"
            ? nomeCargo(b.cargoId)
            : sortKey === "codigo"
              ? b.codigo
              : b.nome;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cargosNaLista = new Set(visible.map((item) => item.cargoId)).size;
  const comTelefone = visible.filter((item) => item.telefone.trim().length > 0).length;

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
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setCargo("todos");
    setAppliedSearch("");
    setAppliedCargo("todos");
    setPage(1);
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
    });
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    const preenchido = Object.values(form).some((value) => value.trim() !== "");
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

  function acoes(item: Usuario) {
    const lista = [];
    if (pode("usuarios", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("usuarios", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

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
      toast({
        variant: "success",
        title: editingId === null ? "Colaborador cadastrado" : "Colaborador atualizado",
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
    <Table aria-label="Colaboradores">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Nome
          </TableHead>
          <TableHead sortable sortDirection={directionFor("codigo")} onSort={() => handleSort("codigo")}>
            Código
          </TableHead>
          <TableHead sortable sortDirection={directionFor("email")} onSort={() => handleSort("email")}>
            E-mail
          </TableHead>
          <TableHead sortable sortDirection={directionFor("cargo")} onSort={() => handleSort("cargo")}>
            Cargo
          </TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.nome}</TableCell>
              <TableCell className="font-mono text-body-sm">{item.codigo}</TableCell>
              <TableCell>{item.email || "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{nomeCargo(item.cargoId)}</Badge>
              </TableCell>
              <TableCell>{item.telefone || "—"}</TableCell>
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
              <span aria-hidden="true" />
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Código">{item.codigo}</TableMobileField>
              <TableMobileField label="E-mail">{item.email || "—"}</TableMobileField>
              <TableMobileField label="Cargo">
                <Badge variant="secondary">{nomeCargo(item.cargoId)}</Badge>
              </TableMobileField>
              <TableMobileField label="Telefone">{item.telefone || "—"}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Colaboradores"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Colaboradores" }]}
        actions={
          pode("usuarios", "criar") ? (
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
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={UserRound} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">colaboradores</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={UserRound} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(cargosNaLista).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">cargos na lista</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={UserRound} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(comTelefone).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">com telefone</p>
          </CardMetric>
        </div>
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
                    O código é o login de cada pessoa. A senha não aparece na listagem.
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
                  onChange={(event) => setForm((current) => ({ ...current, cargoId: event.target.value }))}
                >
                  <option value="">Selecione</option>
                  {cadastros.cargos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </FormField>
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
