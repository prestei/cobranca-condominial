"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { KeyRound, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { BadgeCargo } from "@/components/role-badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
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
  SheetHelpText,
  SheetPanel,
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
import { nomeCargo, type Usuario } from "@/lib/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import { usePermissao } from "@/hooks/use-permissao";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/login-code";
import { digitosCpf, formatarCpf } from "@/lib/cpf";
import { digitosDataNascimento, formatarDataNascimento } from "@/lib/birth-date";
import { digitosTelefone, formatarTelefone } from "@/lib/telefone";
import {
  carregarUsuariosDaApi,
  excluirUsuarioNaApi,
  salvarUsuarioNaApi,
} from "@/lib/users/client";
import type { UsuarioFieldErrors } from "@/lib/users/types";

type SortKey = "nome" | "codigo" | "email" | "cargo";
const formularioVazio = {
  cargoId: "",
  codigo: "",
  nome: "",
  cpf: "",
  dataNascimento: "",
  telefone: "",
  email: "",
  senha: "",
};

function TituloPainelSheet({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-sm">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-card text-primary-container"
        aria-hidden="true"
      >
        <Icon icon={icon} size="sm" />
      </span>
      <p className="text-label-lg text-on-surface">{title}</p>
    </div>
  );
}

export default function UsuariosPage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCatalog();
  const usuarios = cadastros.usuarios;
  const [search, setSearch] = useState("");
  const [cargo, setCargo] = useState("todos");
  const [telefone, setTelefone] = useState("todos");
  const [email, setEmail] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCargo, setAppliedCargo] = useState("todos");
  const [appliedTelefone, setAppliedTelefone] = useState("todos");
  const [appliedEmail, setAppliedEmail] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [baseline, setBaseline] = useState(formularioVazio);
  const [errors, setErrors] = useState<UsuarioFieldErrors>({});
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const skipCloseGuardRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await carregarUsuariosDaApi();
      } catch (error) {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Falha ao carregar",
            description: error instanceof Error ? error.message : "Tente novamente.",
          });
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = usuarios
    .filter((item) => {
      const matchesCargo = appliedCargo === "todos" || String(item.cargoId) === appliedCargo;
      const temTelefone = item.telefone.trim().length > 0;
      const matchesTelefone =
        appliedTelefone === "todos" ||
        (appliedTelefone === "com" ? temTelefone : !temTelefone);
      const temEmail = item.email.trim().length > 0;
      const matchesEmail =
        appliedEmail === "todos" || (appliedEmail === "com" ? temEmail : !temEmail);
      const haystack = `${item.nome} ${item.codigo} ${item.email} ${item.telefone}`.toLocaleLowerCase("pt-BR");
      return (
        matchesCargo &&
        matchesTelefone &&
        matchesEmail &&
        (query.length === 0 || haystack.includes(query))
      );
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
    setAppliedTelefone(telefone);
    setAppliedEmail(email);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setCargo("todos");
    setTelefone("todos");
    setEmail("todos");
    setAppliedSearch("");
    setAppliedCargo("todos");
    setAppliedTelefone("todos");
    setAppliedEmail("todos");
    setPage(1);
  }

  function dismissSheet() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
    setEditingId(null);
    setForm(formularioVazio);
    setBaseline(formularioVazio);
    setErrors({});
  }

  function finalizeSheetClose() {
    skipCloseGuardRef.current = true;
    dismissSheet();
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setBaseline(formularioVazio);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: Usuario) {
    const preenchido = {
      cargoId: String(item.cargoId),
      codigo: item.codigo,
      nome: item.nome,
      cpf: formatarCpf(item.cpf ?? ""),
      dataNascimento: formatarDataNascimento(item.dataNascimento ?? ""),
      telefone: formatarTelefone(item.telefone),
      email: item.email,
      senha: "",
    };
    setEditingId(item.id);
    setForm(preenchido);
    setBaseline(preenchido);
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    if (skipCloseGuardRef.current) {
      skipCloseGuardRef.current = false;
      return;
    }
    const dirty = (Object.keys(formularioVazio) as Array<keyof typeof formularioVazio>).some(
      (key) => form[key] !== baseline[key],
    );
    if (dirty) {
      setLeaveConfirmOpen(true);
      return;
    }
    dismissSheet();
  }

  function confirmLeave() {
    finalizeSheetClose();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await excluirUsuarioNaApi(deleteTarget.id);
    if (!result.ok) {
      toast({
        variant: "error",
        title: "Não foi possível excluir",
        description: result.error,
      });
      setDeleteTarget(null);
      return;
    }
    if (editingId === deleteTarget.id) {
      finalizeSheetClose();
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
    if (saving) return;
    const nome = form.nome.trim();
    const codigo = normalizarCodigoUsuario(form.codigo);
    const email = form.email.trim();
    const senha = form.senha.trim();
    const nextErrors: UsuarioFieldErrors = {};

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
    const cpf = digitosCpf(form.cpf);
    if (cpf.length > 0 && cpf.length !== 11) nextErrors.cpf = "Informe o CPF completo.";
    const dataNascimento = digitosDataNascimento(form.dataNascimento);
    if (dataNascimento.length > 0 && dataNascimento.length !== 8) {
      nextErrors.dataNascimento = "Informe a data completa (DD/MM/AAAA).";
    }
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

    setSaving(true);
    const result = await salvarUsuarioNaApi({
      editingId,
      codigo,
      cargoId: Number(form.cargoId),
      nome,
      cpf,
      dataNascimento,
      telefone: digitosTelefone(form.telefone),
      email,
      senha: senha || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.fields) setErrors(result.fields);
      toast({
        variant: "error",
        title: "Não foi possível salvar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: editingId === null ? "Colaborador cadastrado" : "Colaborador atualizado",
    });
    finalizeSheetClose();
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
                <BadgeCargo cargoId={item.cargoId} />
              </TableCell>
              <TableCell>{item.telefone ? formatarTelefone(item.telefone) : "—"}</TableCell>
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
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Código">{item.codigo}</TableMobileField>
              <TableMobileField label="E-mail">{item.email || "—"}</TableMobileField>
              <TableMobileField label="Cargo">
                <BadgeCargo cargoId={item.cargoId} />
              </TableMobileField>
              <TableMobileField label="Telefone">
                {item.telefone ? formatarTelefone(item.telefone) : "—"}
              </TableMobileField>
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
        <CardMetricRow aria-label="Resumo de colaboradores">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={UserRound} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">colaboradores</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={UserRound} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(cargosNaLista).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">cargos na lista</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={UserRound} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(comTelefone).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">com telefone</p>
          </CardMetric>
        </CardMetricRow>
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
              id: "telefone",
              label: "Telefone",
              value: telefone,
              onChange: setTelefone,
              options: [
                { value: "todos", label: "Todos" },
                { value: "com", label: "Com telefone" },
                { value: "sem", label: "Sem telefone" },
              ],
            },
            {
              id: "email",
              label: "E-mail",
              value: email,
              onChange: setEmail,
              options: [
                { value: "todos", label: "Todos" },
                { value: "com", label: "Com e-mail" },
                { value: "sem", label: "Sem e-mail" },
              ],
            },
          ]}
        />
        {loadingList ? (
          <p className="text-body-sm text-on-surface-variant">Carregando colaboradores…</p>
        ) : (
          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
        )}
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
            <SheetBody className="gap-md min-[768px]:gap-lg">
              <SheetPanel className="flex flex-col gap-md">
                <TituloPainelSheet icon={UserRound} title="Identificação" />
                <FormField label="Nome" htmlFor={`${formId}-nome`} required error={errors.nome}>
                  <Input
                    id={`${formId}-nome`}
                    autoComplete="name"
                    placeholder="Nome completo do colaborador"
                    value={form.nome}
                    invalid={Boolean(errors.nome)}
                    onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                  <FormField label="CPF" htmlFor={`${formId}-cpf`} error={errors.cpf}>
                    <Input
                      id={`${formId}-cpf`}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={form.cpf}
                      invalid={Boolean(errors.cpf)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, cpf: formatarCpf(event.target.value) }))
                      }
                    />
                  </FormField>
                  <FormField
                    label="Data de nascimento"
                    htmlFor={`${formId}-data-nascimento`}
                    error={errors.dataNascimento}
                  >
                    <Input
                      id={`${formId}-data-nascimento`}
                      inputMode="numeric"
                      autoComplete="bday"
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      value={form.dataNascimento}
                      invalid={Boolean(errors.dataNascimento)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dataNascimento: formatarDataNascimento(event.target.value),
                        }))
                      }
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                  <FormField label="Código de login" htmlFor={`${formId}-codigo`} required error={errors.codigo}>
                    <Input
                      id={`${formId}-codigo`}
                      value={form.codigo}
                      invalid={Boolean(errors.codigo)}
                      autoComplete="username"
                      placeholder="Ex.: MILENA"
                      spellCheck={false}
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
                </div>
              </SheetPanel>
              <SheetPanel className="flex flex-col gap-md">
                <TituloPainelSheet icon={Phone} title="Contato" />
                <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                  <FormField label="Telefone" htmlFor={`${formId}-telefone`}>
                    <Input
                      id={`${formId}-telefone`}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
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
                      type="email"
                      autoComplete="email"
                      placeholder="nome@escritorio.example"
                      value={form.email}
                      invalid={Boolean(errors.email)}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </FormField>
                </div>
              </SheetPanel>
              <SheetPanel className="flex flex-col gap-md">
                <TituloPainelSheet icon={KeyRound} title="Senha de acesso" />
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
                    placeholder={editingId === null ? "Senha inicial" : "Preencha só para alterar"}
                    value={form.senha}
                    invalid={Boolean(errors.senha)}
                    onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
                  />
                  <SheetHelpText className="leading-snug">
                    {editingId === null
                      ? "O colaborador entra com o código e esta senha na tela de login."
                      : "Deixe em branco para manter a senha atual."}
                  </SheetHelpText>
                </FormField>
              </SheetPanel>
            </SheetBody>
            <SheetFooterForm onClose={closeSheet} saveDisabled={saving} saveLabel={saving ? "Salvando…" : "Salvar"} />
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
