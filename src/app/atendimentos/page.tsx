"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/alert";
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
  canaisAtendimento,
  debitoEmAberto,
  diasDeAtraso,
  formatarData,
  formatarMoeda,
  getCadastros,
  motivosPendencia,
  nomeUnidade,
  nomeUsuario,
  registrarAuditoria,
  setAtendimentos,
  statusAtendimento,
  subscribeCadastros,
  type Atendimento,
} from "@/data/catalogo";

const USUARIO_LOGADO = 1;
const etapas = ["Registro", "Retorno"] as const;
const badgeStatus: Record<string, "success" | "secondary"> = { Resolvido: "success", Pendente: "secondary" };
type SortKey = "data" | "assunto" | "status";
const formularioVazio = {
  condominioId: "",
  unidadeId: "",
  responsavelId: "",
  canal: "",
  respondeu: "",
  motivo: "",
  assunto: "",
  descricao: "",
  status: "",
  dataProximaAcao: "",
  proximaAcao: "",
};

export default function AtendimentosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const atendimentos = cadastros.atendimentos;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [canal, setCanal] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedCanal, setAppliedCanal] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Atendimento | null>(null);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<
    Partial<Record<"condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo", string>>
  >({});

  useEffect(() => {
    if (!searchParams || searchParams.get("novo") !== "1") return;
    const cadastrosAtuais = getCadastros();
    const condominioQuery = searchParams.get("condominio");
    const unidadeQuery = searchParams.get("unidade");
    let condominioId = "";
    let unidadeId = "";
    if (unidadeQuery) {
      const unidade = cadastrosAtuais.unidades.find((item) => String(item.id) === unidadeQuery);
      if (unidade) {
        unidadeId = unidadeQuery;
        condominioId = String(unidade.condominioId);
      }
    } else if (
      condominioQuery &&
      cadastrosAtuais.condominios.some((item) => String(item.id) === condominioQuery)
    ) {
      condominioId = condominioQuery;
    }
    setEditingId(null);
    setForm({ ...formularioVazio, condominioId, unidadeId });
    setErrors({});
    setStep(0);
    setSheetOpen(true);
    router.replace("/atendimentos");
  }, [router, searchParams]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = atendimentos
    .filter((item) => {
      const matchesStatus = appliedStatus === "todos" || item.status === appliedStatus;
      const matchesCanal = appliedCanal === "todos" || item.canal === appliedCanal;
      const haystack = `${item.assunto} ${item.descricao} ${nomeUnidade(item.unidadeId)} ${nomeUsuario(item.usuarioId)}`.toLocaleLowerCase("pt-BR");
      return matchesStatus && matchesCanal && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "assunto" ? a.assunto : sortKey === "status" ? a.status : a.dataHora;
      const right = sortKey === "assunto" ? b.assunto : sortKey === "status" ? b.status : b.dataHora;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pendentes = visible.filter((item) => item.status === "Pendente").length;
  const comRetorno = visible.filter((item) => item.dataProximaAcao.trim().length > 0).length;
  const debitosDaUnidade = cadastros.debitos.filter(
    (item) => String(item.unidadeId) === form.unidadeId && debitoEmAberto(item),
  );
  const condominiosOrdenados = [...cadastros.condominios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const unidadesDoCondominio = cadastros.unidades.filter((item) => String(item.condominioId) === form.condominioId);

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
    setAppliedCanal(canal);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setStatus("todos");
    setCanal("todos");
    setAppliedSearch("");
    setAppliedStatus("todos");
    setAppliedCanal("todos");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  function openEdit(item: Atendimento) {
    const unidade = cadastros.unidades.find((atual) => String(atual.id) === item.unidadeId);
    setEditingId(item.id);
    setForm({
      condominioId: unidade ? String(unidade.condominioId) : "",
      unidadeId: item.unidadeId,
      responsavelId: item.responsavelId,
      canal: item.canal,
      respondeu: item.respondeu,
      motivo: item.motivo,
      assunto: item.assunto,
      descricao: item.descricao,
      status: item.status,
      dataProximaAcao: item.dataProximaAcao,
      proximaAcao: item.proximaAcao,
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
      entidade: "service_ticket",
      registroId: deleteTarget.id,
      acao: "DELETE",
      dadosAnteriores: deleteTarget.assunto,
      dadosNovos: "",
      camposAlterados: "assunto",
    });
    setAtendimentos((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    toast({ variant: "success", title: "Atendimento excluído" });
    setDeleteTarget(null);
  }

  function acoes(item: Atendimento) {
    return [
      { label: "Editar", icon: Pencil, onSelect: () => openEdit(item) },
      { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) },
    ];
  }

  function escolherCondominio(condominioId: string) {
    setForm((current) => ({ ...current, condominioId, unidadeId: "", responsavelId: "" }));
  }

  function escolherUnidade(unidadeId: string) {
    const vinculo = cadastros.vinculos.find((item) => String(item.unidadeId) === unidadeId && item.principal);
    setForm((current) => ({
      ...current,
      unidadeId,
      responsavelId: vinculo ? String(vinculo.responsavelId) : "",
    }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<"condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo", string>> = {};
    if (!form.condominioId) nextErrors.condominioId = "Selecione o condomínio.";
    if (!form.unidadeId) nextErrors.unidadeId = "Selecione a unidade.";
    if (!form.canal) nextErrors.canal = "Selecione o canal.";
    if (!form.respondeu) nextErrors.respondeu = "Informe se o condômino respondeu.";
    if (form.respondeu === "Sim" && !form.motivo) nextErrors.motivo = "Selecione o motivo.";
    if (!form.status) nextErrors.status = "Selecione a situação.";

    if (step === 0) {
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
      setStep(1);
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(0);
      return;
    }

    const anterior = atendimentos.find((item) => item.id === editingId);
    const saved = {
      unidadeId: form.unidadeId,
      responsavelId: form.responsavelId,
      usuarioId: anterior?.usuarioId ?? USUARIO_LOGADO,
      dataHora: anterior?.dataHora ?? agoraIso(),
      canal: form.canal,
      respondeu: form.respondeu,
      motivo: form.respondeu === "Sim" ? form.motivo : "",
      assunto: form.assunto.trim(),
      descricao: form.descricao.trim(),
      status: form.status,
      dataProximaAcao: form.dataProximaAcao,
      proximaAcao: form.proximaAcao.trim(),
    };

    if (editingId === null) {
      const nextId = crypto.randomUUID();
      setAtendimentos((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "service_ticket",
        registroId: nextId,
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.assunto || saved.canal,
        camposAlterados: "unidade, canal, status",
      });
      toast({ variant: "success", title: "Atendimento registrado" });
    } else {
      setAtendimentos((current) => current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)));
      registrarAuditoria({
        entidade: "service_ticket",
        registroId: editingId,
        acao: "UPDATE",
        dadosAnteriores: anterior?.status ?? "",
        dadosNovos: saved.status,
        camposAlterados: "unidade, canal, status, descricao",
      });
      toast({ variant: "success", title: "Atendimento atualizado" });
    }

    setSheetOpen(false);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={ClipboardList} size="lg" />}
      title={atendimentos.length === 0 ? "Nenhum atendimento registrado" : "Nenhum atendimento encontrado"}
      description={
        atendimentos.length === 0
          ? "O registro grava quem atendeu a partir do login. A data e a hora entram sozinhas."
          : "Ajuste a busca, a situação ou o canal."
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
    <Table aria-label="Atendimentos">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Data
          </TableHead>
          <TableHead>Atendente</TableHead>
          <TableHead sortable sortDirection={directionFor("assunto")} onSort={() => handleSort("assunto")}>
            Assunto
          </TableHead>
          <TableHead>Canal</TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Situação
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataHora)}</TableCell>
              <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
              <TableCell>{item.assunto || "—"}</TableCell>
              <TableCell>{item.canal || "—"}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableActionsCell label={`Ações do atendimento ${item.assunto || item.id}`} actions={acoes(item)} />
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
      <TableMobileList aria-label="Atendimentos">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{item.assunto || formatarData(item.dataHora)}</TableMobileTitle>
              <TableActionsButton label={`Ações do atendimento ${item.assunto || item.id}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Data">{formatarData(item.dataHora)}</TableMobileField>
              <TableMobileField label="Atendente">{nomeUsuario(item.usuarioId)}</TableMobileField>
              <TableMobileField label="Canal">{item.canal || "—"}</TableMobileField>
              <TableMobileField label="Situação">
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Atendimentos"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Atendimentos" }]}
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
          searchPlaceholder="Buscar atendimento..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "situacao",
              label: "Situação",
              value: status,
              onChange: setStatus,
              options: [
                { value: "todos", label: "Todas" },
                ...statusAtendimento.map((item) => ({ value: item, label: item })),
              ],
            },
            {
              id: "canal",
              label: "Canal",
              value: canal,
              onChange: setCanal,
              options: [
                { value: "todos", label: "Todos os canais" },
                ...canaisAtendimento.map((item) => ({ value: item, label: item })),
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ClipboardList} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">atendimentos</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ClipboardList} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(pendentes).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">pendentes</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={ClipboardList} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(comRetorno).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">com retorno</p>
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
                  <Icon icon={ClipboardList} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Novo atendimento" : "Editar atendimento"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Tentativa de cobrança da unidade inadimplente. Quem registra é o login atual.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                    <Select
                      id={`${formId}-condominio`}
                      value={form.condominioId}
                      invalid={Boolean(errors.condominioId)}
                      onChange={(event) => escolherCondominio(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {condominiosOrdenados.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Unidade" htmlFor={`${formId}-unidade`} required error={errors.unidadeId}>
                    <Select
                      id={`${formId}-unidade`}
                      value={form.unidadeId}
                      invalid={Boolean(errors.unidadeId)}
                      disabled={!form.condominioId}
                      onChange={(event) => escolherUnidade(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {unidadesDoCondominio.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.identificacao}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {form.unidadeId ? (
                    <Alert variant={debitosDaUnidade.length > 0 ? "warning" : "success"} title="Débitos em aberto">
                      {debitosDaUnidade.length === 0
                        ? "Esta unidade não tem débito em aberto."
                        : debitosDaUnidade
                            .map(
                              (item) =>
                                `${item.descricao || item.referencia}: ${formatarMoeda(item.valorAtualizado)} · ${diasDeAtraso(item.dataVencimento)} dias`,
                            )
                            .join(" · ")}
                    </Alert>
                  ) : null}
                  <FormField label="Canal" htmlFor={`${formId}-canal`} required error={errors.canal}>
                    <Select
                      id={`${formId}-canal`}
                      value={form.canal}
                      invalid={Boolean(errors.canal)}
                      onChange={(event) => setForm((current) => ({ ...current, canal: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {canaisAtendimento.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="O condômino respondeu?" htmlFor={`${formId}-respondeu`} required error={errors.respondeu}>
                    <Select
                      id={`${formId}-respondeu`}
                      value={form.respondeu}
                      invalid={Boolean(errors.respondeu)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          respondeu: event.target.value,
                          motivo: event.target.value === "Sim" ? current.motivo : "",
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </Select>
                  </FormField>
                  {form.respondeu === "Sim" ? (
                    <FormField label="Motivo da pendência" htmlFor={`${formId}-motivo`} required error={errors.motivo}>
                      <Select
                        id={`${formId}-motivo`}
                        value={form.motivo}
                        invalid={Boolean(errors.motivo)}
                        onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
                      >
                        <option value="">Selecione</option>
                        {motivosPendencia.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  ) : null}
                  {form.motivo === "Doença / problema de saúde" ? (
                    <SheetHelpText>
                      Registre só a categoria. Não anote diagnóstico nem detalhes de saúde.
                    </SheetHelpText>
                  ) : null}
                  <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
                    <Select
                      id={`${formId}-status`}
                      value={form.status}
                      invalid={Boolean(errors.status)}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {statusAtendimento.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Assunto" htmlFor={`${formId}-assunto`}>
                    <Input
                      id={`${formId}-assunto`}
                      value={form.assunto}
                      onChange={(event) => setForm((current) => ({ ...current, assunto: event.target.value }))}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
                    <Textarea
                      id={`${formId}-descricao`}
                      value={form.descricao}
                      onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Data da próxima ação" htmlFor={`${formId}-proxima-data`}>
                    <Input
                      id={`${formId}-proxima-data`}
                      type="date"
                      value={form.dataProximaAcao}
                      onChange={(event) => setForm((current) => ({ ...current, dataProximaAcao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Próxima ação" htmlFor={`${formId}-proxima`}>
                    <Input
                      id={`${formId}-proxima`}
                      value={form.proximaAcao}
                      onChange={(event) => setForm((current) => ({ ...current, proximaAcao: event.target.value }))}
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
        title="Excluir atendimento?"
        description="A correção fica na auditoria. A exclusão é da administradora."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
