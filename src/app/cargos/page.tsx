"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { MatrizPermissoesCargo } from "@/components/matriz-permissoes-cargo";
import { ResumoPermissoesCargo } from "@/components/resumo-permissoes-cargo";
import { FormField, Input } from "@/components/input";
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
import {
  getCadastros,
  registrarAuditoria,
  setCargos,
  type Cargo,
} from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  cargoTemAlgumaPermissao,
  parsePermissoesJson,
  permissoesVazias,
  serializarPermissoes,
} from "@/lib/permissions/parse";

type SortKey = "nome" | "descricao";

const formularioVazio = { nome: "", descricao: "", permissoes: permissoesVazias() };

export default function CargosPage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const formId = useId();
  const cadastros = useCadastros();
  const cargos = cadastros.cargos;
  const [search, setSearch] = useState("");
  const [permissao, setPermissao] = useState("todas");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedPermissao, setAppliedPermissao] = useState("todas");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"nome", string>>>({});

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = cargos
    .filter((item) => {
      const temPermissao = cargoTemAlgumaPermissao(parsePermissoesJson(item.permissaoJson));
      const matchesPermissao =
        appliedPermissao === "todas" ||
        (appliedPermissao === "com" && temPermissao) ||
        (appliedPermissao === "sem" && !temPermissao);
      const haystack = `${item.nome} ${item.descricao}`.toLocaleLowerCase("pt-BR");
      return matchesPermissao && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "descricao" ? a.descricao : a.nome;
      const right = sortKey === "descricao" ? b.descricao : b.nome;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const comPermissao = visible.filter((item) => cargoTemAlgumaPermissao(parsePermissoesJson(item.permissaoJson))).length;
  const emUso = visible.filter((item) => cadastros.usuarios.some((usuario) => usuario.cargoId === item.id)).length;

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
    setAppliedPermissao(permissao);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setPermissao("todas");
    setAppliedSearch("");
    setAppliedPermissao("todas");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: Cargo) {
    setEditingId(item.id);
    setForm({ nome: item.nome, descricao: item.descricao, permissoes: parsePermissoesJson(item.permissaoJson) });
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    const preenchido =
      form.nome.trim() !== "" ||
      form.descricao.trim() !== "" ||
      cargoTemAlgumaPermissao(form.permissoes);
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
    if (getCadastros().usuarios.some((item) => item.cargoId === deleteTarget.id)) {
      toast({
        variant: "error",
        title: "Cargo em uso",
        description: "Existem colaboradores com este cargo.",
      });
      setDeleteTarget(null);
      return;
    }
    registrarAuditoria({
      entidade: "role",
      registroId: String(deleteTarget.id),
      acao: "DELETE",
      dadosAnteriores: deleteTarget.nome,
      dadosNovos: "",
      camposAlterados: "nome",
    });
    setCargos((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Cargo excluído" });
    setDeleteTarget(null);
  }

  function acoes(item: Cargo) {
    const lista = [];
    if (pode("cargos", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("cargos", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = form.nome.trim();
    const nextErrors: Partial<Record<"nome", string>> = {};

    if (!nome) nextErrors.nome = "Informe o nome do cargo.";
    else if (
      cargos.some(
        (item) => item.id !== editingId && item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      nextErrors.nome = "Já existe um cargo com este nome.";
    }

    if (!cargoTemAlgumaPermissao(form.permissoes)) {
      toast({
        variant: "error",
        title: "Falta marcar permissões",
        description: "Escolha pelo menos uma opção em alguma área do sistema.",
      });
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const saved = { nome, descricao: form.descricao.trim(), permissaoJson: serializarPermissoes(form.permissoes) };

    if (editingId === null) {
      const nextId = cargos.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setCargos((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "role",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.nome,
        camposAlterados: "nome, descricao, permissao_json",
      });
      toast({ variant: "success", title: "Cargo cadastrado" });
    } else {
      setCargos((current) => current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)));
      registrarAuditoria({
        entidade: "role",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: cargos.find((item) => item.id === editingId)?.nome ?? "",
        dadosNovos: saved.nome,
        camposAlterados: "nome, descricao, permissao_json",
      });
      toast({ variant: "success", title: "Cargo atualizado" });
    }

    setSheetOpen(false);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={Shield} size="lg" />}
      title={cargos.length === 0 ? "Nenhum cargo cadastrado" : "Nenhum cargo encontrado"}
      description={
        cargos.length === 0
          ? "Cadastre os cargos que definem o que cada pessoa pode fazer."
          : "Ajuste a busca ou o filtro de permissões."
      }
      action={
        pode("cargos", "criar") ? (
          <Button size="sm" onClick={openCreate}>
            <Icon icon={Plus} size="sm" />
            Novo
          </Button>
        ) : undefined
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Cargos">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Cargo
          </TableHead>
          <TableHead sortable sortDirection={directionFor("descricao")} onSort={() => handleSort("descricao")}>
            Descrição
          </TableHead>
          <TableHead>Áreas com acesso</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={4}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="align-middle font-medium">{item.nome}</TableCell>
              <TableCell className="align-middle max-w-[16rem] text-on-surface-variant">
                {item.descricao || "—"}
              </TableCell>
              <TableCell className="align-middle">
                <ResumoPermissoesCargo permissaoJson={item.permissaoJson} />
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
      <TableMobileList aria-label="Cargos">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Descrição" stacked>{item.descricao || "—"}</TableMobileField>
              <TableMobileField label="Áreas com acesso" stacked>
                <ResumoPermissoesCargo permissaoJson={item.permissaoJson} />
              </TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Cargos"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Cargos" }]}
        actions={
          pode("cargos", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        <CardMetricRow aria-label="Resumo de cargos">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Shield} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">cargos</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Shield} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(comPermissao).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">com permissões</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={Shield} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(emUso).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">em uso</p>
          </CardMetric>
        </CardMetricRow>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar cargo..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "permissoes",
              label: "Permissões",
              value: permissao,
              onChange: setPermissao,
              options: [
                { value: "todas", label: "Todas" },
                { value: "com", label: "Com permissões" },
                { value: "sem", label: "Sem permissões" },
              ],
            },
          ]}
        />
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
        <SheetContent
          aria-labelledby={`${formId}-title`}
          aria-describedby={`${formId}-desc`}
        >
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={Shield} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{editingId === null ? "Novo cargo" : "Editar cargo"}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Defina o nome e marque o que este cargo pode fazer no sistema.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody className="gap-md min-[768px]:gap-lg">
              <SheetPanel className="flex flex-col gap-md">
                <FormField label="Nome do cargo" htmlFor={`${formId}-nome`} required error={errors.nome}>
                  <Input
                    id={`${formId}-nome`}
                    placeholder="Ex.: Atendente, Advogado, Administrador"
                    value={form.nome}
                    invalid={Boolean(errors.nome)}
                    onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                  />
                </FormField>
                <FormField label="Para que serve" htmlFor={`${formId}-descricao`}>
                  <Input
                    id={`${formId}-descricao`}
                    placeholder="Ex.: Quem registra atendimentos e acompanha retornos"
                    value={form.descricao}
                    onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                  />
                </FormField>
              </SheetPanel>
              <MatrizPermissoesCargo
                formId={formId}
                permissoes={form.permissoes}
                onChange={(permissoes) => setForm((current) => ({ ...current, permissoes }))}
              />
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
        title="Excluir cargo?"
        description={deleteTarget ? `${deleteTarget.nome} será removido.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
