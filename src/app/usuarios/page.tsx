"use client";

import { useId, useState, useSyncExternalStore } from "react";
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
import {
  getCadastros,
  nomeCargo,
  registrarAuditoria,
  setUsuarios,
  subscribeCadastros,
  type Usuario,
} from "@/data/catalogo";

type SortKey = "nome" | "email" | "cargo";
const formularioVazio = { cargoId: "", nome: "", telefone: "", email: "", senha: "" };

export default function UsuariosPage() {
  const { toast } = useToast();
  const formId = useId();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
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
  const [errors, setErrors] = useState<Partial<Record<"nome" | "cargoId" | "email" | "senha", string>>>({});

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = usuarios
    .filter((item) => {
      const matchesCargo = appliedCargo === "todos" || String(item.cargoId) === appliedCargo;
      const haystack = `${item.nome} ${item.email} ${item.telefone}`.toLocaleLowerCase("pt-BR");
      return matchesCargo && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "email" ? a.email : sortKey === "cargo" ? nomeCargo(a.cargoId) : a.nome;
      const right = sortKey === "email" ? b.email : sortKey === "cargo" ? nomeCargo(b.cargoId) : b.nome;
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
    setForm({ cargoId: String(item.cargoId), nome: item.nome, telefone: item.telefone, email: item.email, senha: "" });
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

  function confirmDelete() {
    if (!deleteTarget) return;
    const atuais = getCadastros();
    const emUso =
      atuais.atendimentos.some((item) => item.usuarioId === deleteTarget.id) ||
      atuais.importacoes.some((item) => item.usuarioId === deleteTarget.id) ||
      atuais.auditoria.some((item) => item.usuarioId === String(deleteTarget.id));
    if (emUso) {
      toast({
        variant: "error",
        title: "Colaborador em uso",
        description: "Existem atendimentos, importações ou auditoria ligados a esta pessoa.",
      });
      setDeleteTarget(null);
      return;
    }
    registrarAuditoria({
      entidade: "user",
      registroId: String(deleteTarget.id),
      acao: "DELETE",
      dadosAnteriores: deleteTarget.nome,
      dadosNovos: "",
      camposAlterados: "nome",
    });
    setUsuarios((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Colaborador excluído" });
    setDeleteTarget(null);
  }

  function acoes(item: Usuario) {
    return [
      { label: "Editar", icon: Pencil, onSelect: () => openEdit(item) },
      { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) },
    ];
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    const anterior = usuarios.find((item) => item.id === editingId);
    const saved = {
      cargoId: Number(form.cargoId),
      nome,
      telefone: form.telefone.trim(),
      email,
      senha: senha || anterior?.senha || "",
    };

    if (editingId === null) {
      const nextId = usuarios.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setUsuarios((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "user",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.nome,
        camposAlterados: "nome, cargo_id, email",
      });
      toast({ variant: "success", title: "Colaborador cadastrado" });
    } else {
      setUsuarios((current) => current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)));
      registrarAuditoria({
        entidade: "user",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: anterior?.nome ?? "",
        dadosNovos: saved.nome,
        camposAlterados: senha ? "nome, cargo_id, email, senha" : "nome, cargo_id, email",
      });
      toast({ variant: "success", title: "Colaborador atualizado" });
    }

    setSheetOpen(false);
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
        <Button size="sm" onClick={openCreate}>
          <Icon icon={Plus} size="sm" />
          Novo
        </Button>
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
          <TableEmpty colSpan={5}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.nome}</TableCell>
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
          <Button size="md" onClick={openCreate}>
            <Icon icon={Plus} size="sm" />
            Novo
          </Button>
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
                    Cada pessoa entra com o próprio login. A senha não aparece na listagem.
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
            <SheetFooterForm onClose={closeSheet} />
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
