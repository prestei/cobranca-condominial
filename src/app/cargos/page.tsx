"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Shield, Trash2, UserRound } from "lucide-react";
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
import type { Cargo } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import {
  aplicarCargoExcluido,
  aplicarCargoSalvo,
  sincronizarCargosDoServidor,
} from "@/lib/cargos/sync-cliente";
import { usePermissao } from "@/hooks/use-permissao";
import {
  cargoTemAlgumaPermissao,
  parsePermissoesJson,
  permissoesVazias,
  serializarPermissoes,
} from "@/lib/permissions/parse";
import { permissoesPadraoPorNome } from "@/lib/permissions/seeds";

type SortKey = "nome" | "descricao";

const formularioVazio = { nome: "", descricao: "", permissoes: permissoesVazias() };

type FormularioCargo = typeof formularioVazio;

function clonarFormulario(valor: FormularioCargo): FormularioCargo {
  return {
    ...valor,
    permissoes: parsePermissoesJson(serializarPermissoes(valor.permissoes)),
  };
}

export default function CargosPage() {
  const { toast } = useToast();
  const { user: sessao } = useAuth();
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
  const [formBaseline, setFormBaseline] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"nome", string>>>({});
  const [salvando, setSalvando] = useState(false);

  const recarregarCargos = useCallback(async () => {
    if (!sessao) return;
    try {
      const response = await fetch("/api/cargos", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { cargos?: Cargo[] };
      if (body.cargos) sincronizarCargosDoServidor(body.cargos);
    } catch {
      /* mantém catálogo local */
    }
  }, [sessao]);

  useEffect(() => {
    void recarregarCargos();
  }, [recarregarCargos]);

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

  function contagemColaboradores(cargoId: number) {
    return cadastros.usuarios.filter((usuario) => usuario.cargoId === cargoId).length;
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
    const vazio = clonarFormulario(formularioVazio);
    setForm(vazio);
    setFormBaseline(vazio);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: Cargo) {
    setEditingId(item.id);
    const inicial = clonarFormulario({
      nome: item.nome,
      descricao: item.descricao,
      permissoes: parsePermissoesJson(item.permissaoJson),
    });
    setForm(inicial);
    setFormBaseline(inicial);
    setErrors({});
    setSheetOpen(true);
  }

  function restaurarPadraoPermissoes() {
    const seed = permissoesPadraoPorNome(form.nome);
    if (seed) {
      setForm((current) => ({ ...current, permissoes: parsePermissoesJson(serializarPermissoes(seed)) }));
      return;
    }
    setForm((current) => ({
      ...current,
      permissoes: parsePermissoesJson(serializarPermissoes(formBaseline.permissoes)),
    }));
  }

  function desmarcarTudoPermissoes() {
    setForm((current) => ({ ...current, permissoes: permissoesVazias() }));
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/cargos/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        toast({
          variant: "error",
          title: "Não foi possível excluir",
          description: body?.error ?? "Tente novamente.",
        });
        return;
      }
      aplicarCargoExcluido(deleteTarget.id);
      if (editingId === deleteTarget.id) {
        setSheetOpen(false);
        setLeaveConfirmOpen(false);
      }
      toast({ variant: "success", title: "Cargo excluído" });
      setDeleteTarget(null);
    } catch {
      toast({ variant: "error", title: "Não foi possível excluir", description: "Falha de conexão." });
    }
  }

  function acoes(item: Cargo) {
    const lista = [];
    if (pode("cargos", "editar")) lista.push({ label: "Editar", icon: Pencil, onSelect: () => openEdit(item) });
    if (pode("cargos", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
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

    const payload = {
      nome,
      descricao: form.descricao.trim(),
      permissoes: form.permissoes,
    };

    setSalvando(true);
    try {
      const response = await fetch(editingId === null ? "/api/cargos" : `/api/cargos/${editingId}`, {
        method: editingId === null ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { cargo?: Cargo; error?: string } | null;
      if (!response.ok || !body?.cargo) {
        toast({
          variant: "error",
          title: editingId === null ? "Não foi possível cadastrar" : "Não foi possível atualizar",
          description: body?.error ?? "Tente novamente.",
        });
        return;
      }
      aplicarCargoSalvo(body.cargo);
      toast({ variant: "success", title: editingId === null ? "Cargo cadastrado" : "Cargo atualizado" });
      setSheetOpen(false);
    } catch {
      toast({ variant: "error", title: "Falha de conexão", description: "Não foi possível salvar o cargo." });
    } finally {
      setSalvando(false);
    }
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
          <TableHead className="text-right">Colaboradores</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={5}>{emptyState}</TableEmpty>
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
              <TableCell className="align-middle text-right tabular-nums text-on-surface-variant">
                {contagemColaboradores(item.id)}
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
              <span aria-hidden="true" />
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Descrição" stacked>{item.descricao || "—"}</TableMobileField>
              <TableMobileField label="Áreas com acesso" stacked>
                <ResumoPermissoesCargo permissaoJson={item.permissaoJson} />
              </TableMobileField>
              <TableMobileField label="Colaboradores">
                {String(contagemColaboradores(item.id))}
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
        description="Perfis de acesso e permissões por área do sistema. Cada colaborador herda o cargo vinculado."
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
        <CardMetricRow aria-label="Resumo de cargos">
          <CardMetric
            accent="primary"
            rotulo="Cargos no recorte"
            valor={String(visible.length).padStart(2, "0")}
            detalhe="Total após busca e filtros."
            iconClassName="bg-surface-subtle text-primary-container"
            icon={<Icon icon={Shield} size="md" />}
          />
          <CardMetric
            accent="tertiary"
            rotulo="Com permissões"
            valor={String(comPermissao).padStart(2, "0")}
            detalhe="Perfis com ao menos uma área marcada."
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Shield} size="md" />}
          />
          <CardMetric
            accent="brass"
            rotulo="Em uso"
            valor={String(emUso).padStart(2, "0")}
            detalhe="Cargos com colaboradores vinculados."
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={UserRound} size="md" className="text-brass" />}
          />
        </CardMetricRow>
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
          size="wide"
          aria-labelledby={`${formId}-title`}
          aria-describedby={`${formId}-desc`}
        >
          <SheetForm onSubmit={handleSave}>
            <SheetHeader className="border-primary-fixed-dim/35 bg-primary-fixed/45">
              <SheetHeaderLead>
                <SheetHeaderIcon className="border border-primary-fixed-dim/30 bg-surface-card text-primary-container">
                  <Icon icon={Shield} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`} className="text-primary-container">
                    {form.nome.trim() || (editingId === null ? "Novo cargo" : "Editar cargo")}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`} className="text-on-primary-fixed-variant">
                    Defina quais permissões este cargo terá no sistema.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose className="text-primary-container hover:bg-primary-fixed/60 hover:text-on-primary-fixed" />
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
                onRestaurarPadrao={restaurarPadraoPermissoes}
                onDesmarcarTudo={desmarcarTudoPermissoes}
              />
            </SheetBody>
            <SheetFooterForm closeLabel="Cancelar" onClose={closeSheet} saveDisabled={salvando} />
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
