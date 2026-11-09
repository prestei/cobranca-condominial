"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { LayoutGrid, Pencil, Plus, Shield, Trash2, UserRound } from "lucide-react";
import { CargoIconeListagem } from "@/components/cargo-icone-listagem";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FiltrosSection } from "@/components/filtros-section";
import { Icon } from "@/components/icon";
import { MatrizPermissoesCargo } from "@/components/matriz-permissoes-cargo";
import { FormField, Input, Switch } from "@/components/input";
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
  TableMobileList,
  TableMobileTitle,
  TableRow,
  TableExport,
  type TableExportFormat,
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
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";
import {
  cargoTemAlgumaPermissao,
  listarModulosPermitidos,
  parsePermissoesJson,
  permissoesVazias,
  serializarPermissoes,
} from "@/lib/permissions/parse";
import { MODULOS_PERMISSAO } from "@/lib/permissions/modulos";
import { permissoesPadraoPorNome } from "@/lib/permissions/seeds";

const colunasExportacao = ["Cargo", "Descrição", "Colaboradores"] as const;

type SortKey = "nome" | "descricao";

const formularioVazio = { nome: "", descricao: "", ativo: true, permissoes: permissoesVazias() };

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
  const [descricaoFiltro, setDescricaoFiltro] = useState("todos");
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedDescricaoFiltro, setAppliedDescricaoFiltro] = useState("todos");
  const [appliedAreaFiltro, setAppliedAreaFiltro] = useState("todas");
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

  const metricValor = (n: number) => String(n).padStart(2, "0");
  const totalColaboradoresVinculados = cadastros.usuarios.filter((usuario) =>
    cargos.some((cargo) => cargo.id === usuario.cargoId),
  ).length;

  function contagemColaboradores(cargoId: number) {
    return cadastros.usuarios.filter((usuario) => usuario.cargoId === cargoId).length;
  }

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = cargos
    .filter((item) => {
      const descricao = item.descricao.trim();
      const matchesDescricao =
        appliedDescricaoFiltro === "todos" ||
        (appliedDescricaoFiltro === "com" && descricao.length > 0) ||
        (appliedDescricaoFiltro === "sem" && descricao.length === 0);
      const modulos = listarModulosPermitidos(parsePermissoesJson(item.permissaoJson));
      const matchesArea =
        appliedAreaFiltro === "todas" || modulos.some((modulo) => modulo.modulo === appliedAreaFiltro);
      const haystack = `${item.nome} ${item.descricao}`.toLocaleLowerCase("pt-BR");
      return matchesDescricao && matchesArea && (query.length === 0 || haystack.includes(query));
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
    setAppliedDescricaoFiltro(descricaoFiltro);
    setAppliedAreaFiltro(areaFiltro);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setDescricaoFiltro("todos");
    setAreaFiltro("todas");
    setAppliedSearch("");
    setAppliedDescricaoFiltro("todos");
    setAppliedAreaFiltro("todas");
    setPage(1);
  }

  function linhasExportacao() {
    return visible.map((item) => [
      item.nome,
      item.descricao.trim() || "—",
      String(contagemColaboradores(item.id)),
    ]);
  }

  function aoExportar(formato: TableExportFormat) {
    if (visible.length === 0) {
      toast({
        variant: "info",
        title: "Nada para exportar",
        description: "Ajuste os filtros ou cadastre cargos.",
      });
      return;
    }
    const linhas = linhasExportacao();
    const colunas = [...colunasExportacao];
    const arquivoBase = `cargos-${new Date().toISOString().slice(0, 10)}`;
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
    const abriu = exportarPdf("Cargos", `${arquivoBase}.html`, [
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
      ativo: item.ativo !== false,
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
      ativo: form.ativo,
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
          : "Ajuste a busca ou os filtros de descrição e área."
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
    <Table
      aria-label="Cargos"
      showExport={false}
      fitContainer
      containerClassName="border-0 shadow-none rounded-none"
    >
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[46%]" />
        <col className="w-[16%]" />
        <col className="w-[10%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Cargo
          </TableHead>
          <TableHead sortable sortDirection={directionFor("descricao")} onSort={() => handleSort("descricao")}>
            Descrição
          </TableHead>
          <TableHead align="center" className="w-[6.5rem]">
            Colaboradores
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={4}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-0 align-middle py-md">
                <div className="flex min-w-0 items-center gap-sm">
                  <CargoIconeListagem nome={item.nome} />
                  <span className="min-w-0 truncate font-semibold text-on-surface">{item.nome}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-0 align-middle py-md text-body-sm leading-snug break-words text-on-surface">
                {item.descricao || "—"}
              </TableCell>
              <TableCell
                align="center"
                className="max-w-0 align-middle py-sm text-body-md font-medium tabular-nums text-on-surface min-[768px]:py-md"
              >
                {contagemColaboradores(item.id)}
              </TableCell>
              <TableActionsCell
                label={`Ações de ${item.nome}`}
                actions={acoes(item)}
                className="size-9 rounded-lg bg-primary-fixed/35 text-primary-container hover:bg-primary-fixed/50 hover:text-primary-container"
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
      <TableMobileList aria-label="Cargos">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <CargoIconeListagem nome={item.nome} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {item.nome}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs line-clamp-2 text-body-sm text-on-surface-variant">
                  {item.descricao.trim() || "Sem descrição"}
                </p>
              </div>
              <TableActionsButton
                label={`Ações de ${item.nome}`}
                actions={acoes(item)}
                className="size-9 rounded-lg bg-primary-fixed/35 text-primary-container hover:bg-primary-fixed/50 hover:text-primary-container"
              />
            </TableMobileCardHeader>
            <div className="mt-sm flex items-center justify-between gap-md border-t border-border-subtle/30 pt-sm">
              <p className="text-label-sm uppercase text-on-surface-variant">Colaboradores</p>
              <p className="text-body-md font-semibold tabular-nums text-on-surface">
                {contagemColaboradores(item.id)}
              </p>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={Shield}
        title="Cargos"
        description="Gerencie os cargos e permissões por área do sistema."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
        actions={
          pode("cargos", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Novo cargo
            </Button>
          ) : undefined
        }
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        <section aria-label="Resumo de cargos">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
            <KpiMobileCard rotulo="Cargos no sistema" valor={metricValor(cargos.length)} icon={Shield} destaque />
            <KpiMobileCard rotulo="Áreas de acesso" valor={metricValor(MODULOS_PERMISSAO.length)} icon={LayoutGrid} />
            <KpiMobileCard
              rotulo="Colaboradores vinculados"
              valor={metricValor(totalColaboradoresVinculados)}
              icon={UserRound}
            />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
            <CardMetric
              accent="primary"
              rotulo="Cargos no sistema"
              valor={metricValor(cargos.length)}
              detalhe="Total de cargos cadastrados"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={Shield} size="md" className="text-primary-container" />}
            />
            <CardMetric
              accent="tertiary"
              rotulo="Áreas de acesso"
              valor={metricValor(MODULOS_PERMISSAO.length)}
              detalhe="Áreas disponíveis"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={LayoutGrid} size="md" className="text-tertiary-container" />}
            />
            <CardMetric
              accent="brass"
              rotulo="Colaboradores vinculados"
              valor={metricValor(totalColaboradoresVinculados)}
              detalhe="Com cargos atribuídos"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={UserRound} size="md" className="text-brass" />}
            />
          </div>
        </section>

        <FiltrosSection>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar cargo..."
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "descricao",
                label: "Descrição",
                value: descricaoFiltro,
                onChange: setDescricaoFiltro,
                options: [
                  { value: "todos", label: "Todos" },
                  { value: "com", label: "Com descrição" },
                  { value: "sem", label: "Sem descrição" },
                ],
              },
              {
                id: "area",
                label: "Área",
                value: areaFiltro,
                onChange: setAreaFiltro,
                options: [
                  { value: "todas", label: "Todas" },
                  ...MODULOS_PERMISSAO.map((modulo) => ({ value: modulo.id, label: modulo.label })),
                ],
              },
            ]}
          />
        </FiltrosSection>

        <section className="flex min-w-0 flex-col gap-sm">
          <div className="flex justify-end">
            <TableExport onExport={aoExportar} />
          </div>
          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} showExport={false} onExport={aoExportar} />
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
                <div className="flex items-center justify-between gap-md rounded-lg border border-border-subtle bg-surface-subtle/50 px-md py-sm">
                  <div className="min-w-0">
                    <p className="text-label-md font-medium text-on-surface">Situação</p>
                    <p className="text-body-sm text-on-surface-variant">
                      Cargos inativos continuam no histórico, mas não devem ser usados em novos vínculos.
                    </p>
                  </div>
                  <Switch
                    id={`${formId}-ativo`}
                    checked={form.ativo}
                    onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))}
                    aria-label="Cargo ativo"
                  />
                </div>
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
