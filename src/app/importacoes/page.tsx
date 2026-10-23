"use client";

import { useId, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Textarea } from "@/components/input";
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
  agoraIso,
  formatarData,
  getCadastros,
  nomeUsuario,
  registrarAuditoria,
  setImportacoes,
  statusImportacao,
  subscribeCadastros,
  tiposImportacao,
  type Importacao,
} from "@/data/catalogo";

const USUARIO_LOGADO = 1;
const etapas = ["Arquivo", "Resultado"] as const;
const rotuloTipo: Record<string, string> = { debitos: "Débitos", responsaveis: "Responsáveis", unidades: "Unidades" };
const rotuloStatus: Record<string, string> = { Processando: "Processando", Concluida: "Concluída", Erro: "Erro", Cancelada: "Cancelada" };
const badgeStatus: Record<string, "primary" | "success" | "error" | "secondary"> = {
  Processando: "primary",
  Concluida: "success",
  Erro: "error",
  Cancelada: "secondary",
};
type Quantidade = "quantidadeRegistros" | "quantidadeImportados" | "quantidadeAtualizados" | "quantidadeErros";
type SortKey = "data" | "arquivo" | "status";
const formularioVazio = {
  origem: "",
  tipo: "",
  arquivo: "",
  status: "",
  quantidadeRegistros: "",
  quantidadeImportados: "",
  quantidadeAtualizados: "",
  quantidadeErros: "",
  observacaoInterna: "",
};

export default function ImportacoesPage() {
  const { toast } = useToast();
  const formId = useId();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const importacoes = cadastros.importacoes;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedTipo, setAppliedTipo] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Importacao | null>(null);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"tipo" | "status" | Quantidade, string>>>({});

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = importacoes
    .filter((item) => {
      const matchesStatus = appliedStatus === "todos" || item.status === appliedStatus;
      const matchesTipo = appliedTipo === "todos" || item.tipo === appliedTipo;
      const haystack = `${item.arquivo} ${item.origem} ${item.observacaoInterna}`.toLocaleLowerCase("pt-BR");
      return matchesStatus && matchesTipo && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "arquivo" ? a.arquivo : sortKey === "status" ? a.status : a.dataImportacao;
      const right = sortKey === "arquivo" ? b.arquivo : sortKey === "status" ? b.status : b.dataImportacao;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const concluidas = visible.filter((item) => item.status === "Concluida").length;
  const comErro = visible.filter((item) => item.status === "Erro").length;

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "data" ? "desc" : "asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("data");
    setSortDirection("desc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedStatus(status);
    setAppliedTipo(tipo);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setStatus("todos");
    setTipo("todos");
    setAppliedSearch("");
    setAppliedStatus("todos");
    setAppliedTipo("todos");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  function openEdit(item: Importacao) {
    setEditingId(item.id);
    setForm({
      origem: item.origem,
      tipo: item.tipo,
      arquivo: item.arquivo,
      status: item.status,
      quantidadeRegistros: item.quantidadeRegistros,
      quantidadeImportados: item.quantidadeImportados,
      quantidadeAtualizados: item.quantidadeAtualizados,
      quantidadeErros: item.quantidadeErros,
      observacaoInterna: item.observacaoInterna,
    });
    setErrors({});
    setStep(0);
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
    registrarAuditoria({
      entidade: "import",
      registroId: String(deleteTarget.id),
      acao: "DELETE",
      dadosAnteriores: deleteTarget.arquivo,
      dadosNovos: "",
      camposAlterados: "arquivo",
    });
    setImportacoes((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Importação excluída" });
    setDeleteTarget(null);
  }

  function acoes(item: Importacao) {
    return [
      { label: "Editar", icon: Pencil, onSelect: () => openEdit(item) },
      { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) },
    ];
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<"tipo" | "status" | Quantidade, string>> = {};
    if (!form.tipo) nextErrors.tipo = "Selecione o tipo do arquivo.";
    if (!form.status) nextErrors.status = "Selecione a situação.";
    const quantidades = ["quantidadeRegistros", "quantidadeImportados", "quantidadeAtualizados", "quantidadeErros"] as const;
    for (const campo of quantidades) {
      const raw = form[campo].trim();
      if (raw && !/^\d+$/.test(raw)) nextErrors[campo] = "Informe um número inteiro.";
    }

    if (step === 0) {
      const daEtapa: Partial<Record<"tipo" | "status", string>> = {};
      if (nextErrors.tipo) daEtapa.tipo = nextErrors.tipo;
      if (nextErrors.status) daEtapa.status = nextErrors.status;
      setErrors(daEtapa);
      if (Object.keys(daEtapa).length > 0) return;
      setStep(1);
      return;
    }

    setErrors(nextErrors);
    if (nextErrors.tipo || nextErrors.status) {
      setStep(0);
      return;
    }
    if (Object.keys(nextErrors).length > 0) return;

    const anterior = importacoes.find((item) => item.id === editingId);
    const saved = {
      origem: form.origem.trim(),
      tipo: form.tipo,
      arquivo: form.arquivo.trim(),
      status: form.status,
      quantidadeRegistros: form.quantidadeRegistros.trim(),
      quantidadeImportados: form.quantidadeImportados.trim(),
      quantidadeAtualizados: form.quantidadeAtualizados.trim(),
      quantidadeErros: form.quantidadeErros.trim(),
      observacaoInterna: form.observacaoInterna.trim(),
      usuarioId: anterior?.usuarioId ?? USUARIO_LOGADO,
      dataImportacao: anterior?.dataImportacao ?? agoraIso(),
    };

    if (editingId === null) {
      const nextId = importacoes.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setImportacoes((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "import",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.arquivo || saved.tipo,
        camposAlterados: "tipo, status, arquivo",
      });
      toast({ variant: "success", title: "Importação registrada" });
    } else {
      setImportacoes((current) => current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)));
      registrarAuditoria({
        entidade: "import",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: anterior?.status ?? "",
        dadosNovos: saved.status,
        camposAlterados: "tipo, status, arquivo",
      });
      toast({ variant: "success", title: "Importação atualizada" });
    }

    setSheetOpen(false);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={FileUp} size="lg" />}
      title={importacoes.length === 0 ? "Nenhuma importação registrada" : "Nenhuma importação encontrada"}
      description={
        importacoes.length === 0
          ? "Registre o arquivo de débitos, unidades ou responsáveis enviado pela administradora."
          : "Ajuste a busca, o tipo ou a situação."
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
    <Table aria-label="Importações">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Data
          </TableHead>
          <TableHead sortable sortDirection={directionFor("arquivo")} onSort={() => handleSort("arquivo")}>
            Arquivo
          </TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Situação
          </TableHead>
          <TableHead align="right">Erros</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataImportacao)}</TableCell>
              <TableCell>{item.arquivo || "—"}</TableCell>
              <TableCell>{rotuloTipo[item.tipo] ?? item.tipo}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{rotuloStatus[item.status] ?? item.status}</Badge>
              </TableCell>
              <TableCell align="right" className="tabular-nums">
                {item.quantidadeErros || "—"}
              </TableCell>
              <TableActionsCell label={`Ações da importação ${item.arquivo || item.id}`} actions={acoes(item)} />
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
      <TableMobileList aria-label="Importações">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{item.arquivo || rotuloTipo[item.tipo] || "Importação"}</TableMobileTitle>
              <TableActionsButton label={`Ações da importação ${item.arquivo || item.id}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Data">{formatarData(item.dataImportacao)}</TableMobileField>
              <TableMobileField label="Tipo">{rotuloTipo[item.tipo] ?? item.tipo}</TableMobileField>
              <TableMobileField label="Situação">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{rotuloStatus[item.status] ?? item.status}</Badge>
              </TableMobileField>
              <TableMobileField label="Quem importou">{nomeUsuario(item.usuarioId)}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Importações"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Importações" }]}
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
          searchPlaceholder="Buscar importação..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "tipo",
              label: "Tipo",
              value: tipo,
              onChange: setTipo,
              options: [
                { value: "todos", label: "Todos" },
                ...tiposImportacao.map((item) => ({ value: item, label: rotuloTipo[item] ?? item })),
              ],
            },
            {
              id: "situacao",
              label: "Situação",
              value: status,
              onChange: setStatus,
              options: [
                { value: "todos", label: "Todas" },
                ...statusImportacao.map((item) => ({ value: item, label: rotuloStatus[item] ?? item })),
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={FileUp} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">importações</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={FileUp} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(concluidas).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">concluídas</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={FileUp} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(comErro).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">com erro</p>
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
                  <Icon icon={FileUp} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Nova importação" : "Editar importação"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Histórico do arquivo recebido da administradora. Quem executou é o login atual.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Origem" htmlFor={`${formId}-origem`}>
                    <Input
                      id={`${formId}-origem`}
                      value={form.origem}
                      onChange={(event) => setForm((current) => ({ ...current, origem: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Tipo" htmlFor={`${formId}-tipo`} required error={errors.tipo}>
                    <Select
                      id={`${formId}-tipo`}
                      value={form.tipo}
                      invalid={Boolean(errors.tipo)}
                      onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {tiposImportacao.map((item) => (
                        <option key={item} value={item}>
                          {rotuloTipo[item]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Arquivo" htmlFor={`${formId}-arquivo`}>
                    <Input
                      id={`${formId}-arquivo`}
                      value={form.arquivo}
                      onChange={(event) => setForm((current) => ({ ...current, arquivo: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
                    <Select
                      id={`${formId}-status`}
                      value={form.status}
                      invalid={Boolean(errors.status)}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {statusImportacao.map((item) => (
                        <option key={item} value={item}>
                          {rotuloStatus[item]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Registros" htmlFor={`${formId}-registros`} error={errors.quantidadeRegistros}>
                    <Input
                      id={`${formId}-registros`}
                      inputMode="numeric"
                      value={form.quantidadeRegistros}
                      invalid={Boolean(errors.quantidadeRegistros)}
                      onChange={(event) => setForm((current) => ({ ...current, quantidadeRegistros: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Importados" htmlFor={`${formId}-importados`} error={errors.quantidadeImportados}>
                    <Input
                      id={`${formId}-importados`}
                      inputMode="numeric"
                      value={form.quantidadeImportados}
                      invalid={Boolean(errors.quantidadeImportados)}
                      onChange={(event) => setForm((current) => ({ ...current, quantidadeImportados: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Atualizados" htmlFor={`${formId}-atualizados`} error={errors.quantidadeAtualizados}>
                    <Input
                      id={`${formId}-atualizados`}
                      inputMode="numeric"
                      value={form.quantidadeAtualizados}
                      invalid={Boolean(errors.quantidadeAtualizados)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, quantidadeAtualizados: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="Erros" htmlFor={`${formId}-erros`} error={errors.quantidadeErros}>
                    <Input
                      id={`${formId}-erros`}
                      inputMode="numeric"
                      value={form.quantidadeErros}
                      invalid={Boolean(errors.quantidadeErros)}
                      onChange={(event) => setForm((current) => ({ ...current, quantidadeErros: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Observação interna" htmlFor={`${formId}-observacao`}>
                    <Textarea
                      id={`${formId}-observacao`}
                      value={form.observacaoInterna}
                      onChange={(event) => setForm((current) => ({ ...current, observacaoInterna: event.target.value }))}
                    />
                  </FormField>
                </>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              onBack={step > 0 ? () => setStep(0) : undefined}
              saveLabel={step === 0 ? "Continuar" : "Salvar"}
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
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir importação?"
        description="O histórico deste arquivo será removido."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
