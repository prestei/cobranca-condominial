"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { DoorOpen, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
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
  formatarMoeda,
  getCadastros,
  nomeCondominio,
  registrarAuditoria,
  setUnidades,
  statusUnidade,
  subscribeCadastros,
  tiposUnidade,
  type Unidade,
} from "@/data/catalogo";

type SortKey = "identificacao" | "condominio" | "tipo" | "status" | "debito";
const formularioVazio = { condominioId: "", identificacao: "", bloco: "", tipo: "", status: "Ativa" };

const badgeStatus: Record<string, "success" | "error"> = { Ativa: "success", Inativa: "error" };

export default function UnidadesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const unidades = cadastros.unidades;
  const [search, setSearch] = useState("");
  const [condominio, setCondominio] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [debito, setDebito] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCondominio, setAppliedCondominio] = useState("todos");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedDebito, setAppliedDebito] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("identificacao");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Unidade | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [baseline, setBaseline] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"condominioId" | "identificacao" | "tipo" | "status", string>>>({});

  useEffect(() => {
    const condominioQuery = searchParams.get("condominio");
    if (!condominioQuery) return;
    const existe = getCadastros().condominios.some((item) => String(item.id) === condominioQuery);
    if (!existe) return;
    setCondominio(condominioQuery);
    setAppliedCondominio(condominioQuery);
    setPage(1);
    if (searchParams.get("novo") !== "1") return;
    const inicial = { ...formularioVazio, condominioId: condominioQuery };
    setEditingId(null);
    setForm(inicial);
    setBaseline(inicial);
    setErrors({});
    setSheetOpen(true);
    router.replace(`/unidades?condominio=${condominioQuery}`);
  }, [router, searchParams]);

  const debitosAbertos = new Map<number, number>();
  for (const item of cadastros.debitos) {
    if (item.status !== "Pendente" && item.status !== "Vencido") continue;
    debitosAbertos.set(item.unidadeId, (debitosAbertos.get(item.unidadeId) ?? 0) + Number(item.valorAtualizado || 0));
  }

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = unidades
    .filter((item) => {
      const emDebito = debitosAbertos.has(item.id);
      const matchesCondominio = appliedCondominio === "todos" || String(item.condominioId) === appliedCondominio;
      const matchesStatus = appliedStatus === "todos" || item.status === appliedStatus;
      const matchesDebito = appliedDebito === "todos" || (appliedDebito === "devendo" ? emDebito : !emDebito);
      const haystack = `${item.identificacao} ${item.bloco} ${nomeCondominio(item.condominioId)}`.toLocaleLowerCase("pt-BR");
      return matchesCondominio && matchesStatus && matchesDebito && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "debito") return ((debitosAbertos.get(a.id) ?? 0) - (debitosAbertos.get(b.id) ?? 0)) * factor;
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
  const devendo = visible.filter((item) => debitosAbertos.has(item.id)).length;

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
    setAppliedDebito(debito);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setCondominio("todos");
    setStatus("todos");
    setDebito("todos");
    setAppliedSearch("");
    setAppliedCondominio("todos");
    setAppliedStatus("todos");
    setAppliedDebito("todos");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setBaseline(formularioVazio);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: Unidade) {
    const preenchido = {
      condominioId: String(item.condominioId),
      identificacao: item.identificacao,
      bloco: item.bloco,
      tipo: item.tipo,
      status: item.status,
    };
    setEditingId(item.id);
    setForm(preenchido);
    setBaseline(preenchido);
    setErrors({});
    setSheetOpen(true);
  }

  function closeSheet() {
    const dirty = (Object.keys(formularioVazio) as Array<keyof typeof formularioVazio>).some((key) => form[key] !== baseline[key]);
    if (dirty) {
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
      atuais.vinculos.some((item) => item.unidadeId === deleteTarget.id) ||
      atuais.debitos.some((item) => item.unidadeId === deleteTarget.id) ||
      atuais.atendimentos.some((item) => item.unidadeId === String(deleteTarget.id));
    if (emUso) {
      toast({
        variant: "error",
        title: "Unidade em uso",
        description: "Existem vínculos, débitos ou atendimentos ligados a esta unidade.",
      });
      setDeleteTarget(null);
      return;
    }
    registrarAuditoria({
      entidade: "unit",
      registroId: String(deleteTarget.id),
      acao: "DELETE",
      dadosAnteriores: deleteTarget.identificacao,
      dadosNovos: "",
      camposAlterados: "identificacao",
    });
    setUnidades((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Unidade excluída" });
    setDeleteTarget(null);
  }

  function celulaDebito(item: Unidade) {
    const valor = debitosAbertos.get(item.id);
    if (valor === undefined) return <Badge variant="success">Em dia</Badge>;
    return (
      <span className="inline-flex items-center gap-sm">
        <Badge variant="error">Devendo</Badge>
        <span className="tabular-nums">{formatarMoeda(String(valor))}</span>
      </span>
    );
  }

  function acoes(item: Unidade) {
    return [
      { label: "Editar", icon: Pencil, onSelect: () => openEdit(item) },
      { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) },
    ];
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identificacao = form.identificacao.trim();
    const nextErrors: Partial<Record<"condominioId" | "identificacao" | "tipo" | "status", string>> = {};
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

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const saved = {
      condominioId: Number(form.condominioId),
      identificacao,
      bloco: form.bloco.trim(),
      tipo: form.tipo,
      status: form.status,
    };

    if (editingId === null) {
      const nextId = unidades.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setUnidades((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "unit",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.identificacao,
        camposAlterados: "condominio_id, identificacao, bloco, tipo, status",
      });
      toast({ variant: "success", title: "Unidade cadastrada" });
    } else {
      setUnidades((current) => current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)));
      registrarAuditoria({
        entidade: "unit",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: unidades.find((item) => item.id === editingId)?.identificacao ?? "",
        dadosNovos: saved.identificacao,
        camposAlterados: "condominio_id, identificacao, bloco, tipo, status",
      });
      toast({ variant: "success", title: "Unidade atualizada" });
    }

    setSheetOpen(false);
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
        <Button size="sm" onClick={openCreate}>
          <Icon icon={Plus} size="sm" />
          Novo
        </Button>
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Unidades">
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
            Situação
          </TableHead>
          <TableHead sortable sortDirection={directionFor("debito")} onSort={() => handleSort("debito")}>
            Débito
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
              <TableCell className="font-medium">{item.identificacao}</TableCell>
              <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
              <TableCell>{item.bloco || "—"}</TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
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
              <TableMobileField label="Situação">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableMobileField>
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
                ...cadastros.condominios.map((item) => ({ value: String(item.id), label: item.nome })),
              ],
            },
            {
              id: "situacao",
              label: "Situação",
              value: status,
              onChange: setStatus,
              options: [
                { value: "todos", label: "Todas" },
                ...statusUnidade.map((item) => ({ value: item, label: item })),
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
                  <Icon icon={DoorOpen} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{editingId === null ? "Nova unidade" : "Editar unidade"}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Apartamento, casa, sala ou loja de um condomínio da carteira.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                <Select
                  id={`${formId}-condominio`}
                  value={form.condominioId}
                  invalid={Boolean(errors.condominioId)}
                  onChange={(event) => setForm((current) => ({ ...current, condominioId: event.target.value }))}
                >
                  <option value="">Selecione</option>
                  {cadastros.condominios.map((item) => (
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
                <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
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
        title="Excluir unidade?"
        description={deleteTarget ? `${deleteTarget.identificacao} será removida.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
