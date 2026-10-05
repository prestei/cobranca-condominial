"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, DoorOpen, Eye, MapPin, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
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
  SheetFooter,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetPanel,
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
  advogados,
  getCadastros,
  registrarAuditoria,
  setCondominios,
  subscribeCadastros,
  type Condominio,
} from "@/data/catalogo";
import { buscarCep, CEP_TIMEOUT_MS, digitosCep, formatarCep } from "@/lib/cep";

const etapasCondominio = ["Dados", "Endereço", "Observação"] as const;

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

type SortKey = "nome" | "administradora" | "cidade" | "advogado" | "unidades";

function DetalheCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value.trim() ? value : "—"}</p>
    </div>
  );
}

const formularioVazio: Omit<Condominio, "id"> = {
  nome: "",
  advogado: "",
  administradora: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  observacao: "",
};

export default function CondominiosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const formId = useId();
  const condominios = useSyncExternalStore(subscribeCadastros, () => getCadastros().condominios, () => getCadastros().condominios);
  const unidades = useSyncExternalStore(subscribeCadastros, () => getCadastros().unidades, () => getCadastros().unidades);
  const unidadesPorCondominio = new Map<number, number>();
  for (const unidade of unidades) {
    unidadesPorCondominio.set(unidade.condominioId, (unidadesPorCondominio.get(unidade.condominioId) ?? 0) + 1);
  }
  const contarUnidades = (condominioId: number) => unidadesPorCondominio.get(condominioId) ?? 0;
  const [search, setSearch] = useState("");
  const [administradora, setAdministradora] = useState("todas");
  const [cidade, setCidade] = useState("todas");
  const [lawyer, setLawyer] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedAdministradora, setAppliedAdministradora] = useState("todas");
  const [appliedCidade, setAppliedCidade] = useState("todas");
  const [appliedLawyer, setAppliedLawyer] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Condominio | null>(null);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<Partial<Record<"nome" | "advogado", string>>>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [enderecoLiberado, setEnderecoLiberado] = useState(false);
  const ultimoCepBuscado = useRef("");

  useEffect(() => {
    const digitos = digitosCep(form.cep);
    if (digitos.length !== 8) {
      if (ultimoCepBuscado.current !== "") {
        ultimoCepBuscado.current = "";
        setBuscandoCep(false);
        setCepErro("");
        setEnderecoLiberado(false);
        setForm((current) => ({
          ...current,
          logradouro: "",
          complemento: "",
          cidade: "",
          estado: "",
        }));
      }
      return;
    }

    if (digitos === ultimoCepBuscado.current) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CEP_TIMEOUT_MS);
    let ativo = true;
    setBuscandoCep(true);
    setCepErro("");
    setEnderecoLiberado(false);

    buscarCep(digitos, controller.signal)
      .then((endereco) => {
        if (!ativo) return;
        ultimoCepBuscado.current = digitos;
        setForm((current) => ({
          ...current,
          logradouro: endereco.logradouro,
          complemento: endereco.complemento,
          cidade: endereco.cidade,
          estado: endereco.estado,
        }));
        setEnderecoLiberado(true);
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        const abortou = error instanceof DOMException && error.name === "AbortError";
        setCepErro(
          abortou
            ? "A consulta do CEP excedeu 6 segundos."
            : error instanceof Error && error.message === "CEP não encontrado."
              ? error.message
              : "Não foi possível consultar o CEP.",
        );
        setEnderecoLiberado(true);
      })
      .finally(() => {
        if (!ativo) return;
        window.clearTimeout(timeout);
        setBuscandoCep(false);
      });

    return () => {
      ativo = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.cep]);

  const administradoras = [...new Set(condominios.map((item) => item.administradora.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const cidades = [...new Set(condominios.map((item) => item.cidade.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = condominios
    .filter((item) => {
      const matchesAdministradora = appliedAdministradora === "todas" || item.administradora.trim() === appliedAdministradora;
      const matchesCidade = appliedCidade === "todas" || item.cidade.trim() === appliedCidade;
      const matchesLawyer = appliedLawyer === "todos" || item.advogado === appliedLawyer;
      const haystack = `${item.nome} ${item.cidade} ${item.administradora}`.toLocaleLowerCase("pt-BR");
      return matchesAdministradora && matchesCidade && matchesLawyer && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "unidades") {
        return (contarUnidades(a.id) - contarUnidades(b.id)) * factor;
      }
      const left =
        sortKey === "administradora"
          ? a.administradora
          : sortKey === "cidade"
            ? a.cidade
            : sortKey === "advogado"
              ? a.advogado
              : a.nome;
      const right =
        sortKey === "administradora"
          ? b.administradora
          : sortKey === "cidade"
            ? b.cidade
            : sortKey === "advogado"
              ? b.advogado
              : b.nome;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const advogadosNaLista = new Set(visible.map((item) => item.advogado)).size;
  const comEndereco = visible.filter((item) => item.cidade.trim().length > 0).length;
  const detalhe = detalheId === null ? null : (condominios.find((item) => item.id === detalheId) ?? null);
  const unidadesDoDetalhe = detalhe ? unidades.filter((item) => item.condominioId === detalhe.id) : [];

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
    setAppliedAdministradora(administradora);
    setAppliedCidade(cidade);
    setAppliedLawyer(lawyer);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setAdministradora("todas");
    setCidade("todas");
    setLawyer("todos");
    setAppliedSearch("");
    setAppliedAdministradora("todas");
    setAppliedCidade("todas");
    setAppliedLawyer("todos");
    setPage(1);
  }

  function openCreate() {
    ultimoCepBuscado.current = "";
    setBuscandoCep(false);
    setCepErro("");
    setEnderecoLiberado(false);
    setEditingId(null);
    setForm(formularioVazio);
    setErrors({});
    setStep(0);
    setSheetOpen(true);
  }

  function openEdit(item: Condominio) {
    const digitos = digitosCep(item.cep);
    const enderecoPreenchido = Boolean(item.logradouro || item.cidade || item.estado);
    ultimoCepBuscado.current = enderecoPreenchido && digitos.length === 8 ? digitos : "";
    setBuscandoCep(false);
    setCepErro("");
    setEnderecoLiberado(enderecoPreenchido);
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      advogado: item.advogado,
      administradora: item.administradora,
      cep: formatarCep(item.cep),
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      cidade: item.cidade,
      estado: item.estado,
      observacao: item.observacao,
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
    const cadastros = getCadastros();
    const emUso =
      cadastros.unidades.some((item) => item.condominioId === deleteTarget.id) ||
      cadastros.debitos.some((item) => item.condominioId === deleteTarget.id) ||
      cadastros.atendimentos.some((item) => {
        const unidade = cadastros.unidades.find((atual) => String(atual.id) === item.unidadeId);
        return unidade?.condominioId === deleteTarget.id;
      });
    if (emUso) {
      toast({
        variant: "error",
        title: "Condomínio em uso",
        description: "Existem unidades, débitos ou atendimentos ligados a este condomínio.",
      });
      setDeleteTarget(null);
      return;
    }
    registrarAuditoria({
      entidade: "condominium",
      registroId: String(deleteTarget.id),
      acao: "DELETE",
      dadosAnteriores: deleteTarget.nome,
      dadosNovos: "",
      camposAlterados: "nome",
    });
    setCondominios((current) => current.filter((item) => item.id !== deleteTarget.id));
    if (editingId === deleteTarget.id) {
      setSheetOpen(false);
      setLeaveConfirmOpen(false);
    }
    if (detalheId === deleteTarget.id) setDetalheId(null);
    toast({ variant: "success", title: "Condomínio excluído" });
    setDeleteTarget(null);
  }

  function verUnidades(item: Condominio) {
    router.push(`/unidades?condominio=${item.id}`);
  }

  function adicionarUnidade(item: Condominio) {
    router.push(`/unidades?condominio=${item.id}&novo=1`);
  }

  function acoes(item: Condominio) {
    return [
      { label: "Ver detalhes", icon: Eye, onSelect: () => setDetalheId(item.id) },
      { label: "Ver unidades", icon: DoorOpen, onSelect: () => verUnidades(item) },
      { label: "Adicionar unidade", icon: Plus, onSelect: () => adicionarUnidade(item) },
      { label: "Editar", icon: Pencil, onSelect: () => openEdit(item) },
      { label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) },
    ];
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = form.nome.trim();
    const nextErrors: Partial<Record<"nome" | "advogado", string>> = {};

    if (!nome) {
      nextErrors.nome = "Informe o nome do condomínio.";
    } else if (
      condominios.some(
        (item) =>
          item.id !== editingId && item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      nextErrors.nome = "Já existe um condomínio com este nome.";
    }

    if (!form.advogado) {
      nextErrors.advogado = "Selecione o advogado responsável.";
    }

    if (step < etapasCondominio.length - 1) {
      if (step === 0) {
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
      }
      setStep(step + 1);
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(0);
      return;
    }

    const saved: Omit<Condominio, "id"> = {
      ...form,
      nome,
      administradora: form.administradora.trim(),
      cep: form.cep.trim(),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),
      observacao: form.observacao.trim(),
    };

    if (editingId === null) {
      const nextId = condominios.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      setCondominios((current) => [...current, { id: nextId, ...saved }]);
      registrarAuditoria({
        entidade: "condominium",
        registroId: String(nextId),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: saved.nome,
        camposAlterados: "nome",
      });
      toast({ variant: "success", title: "Condomínio cadastrado" });
    } else {
      setCondominios((current) =>
        current.map((item) => (item.id === editingId ? { id: editingId, ...saved } : item)),
      );
      registrarAuditoria({
        entidade: "condominium",
        registroId: String(editingId),
        acao: "UPDATE",
        dadosAnteriores: condominios.find((item) => item.id === editingId)?.nome ?? "",
        dadosNovos: saved.nome,
        camposAlterados: "nome",
      });
      toast({ variant: "success", title: "Condomínio atualizado" });
    }

    setSheetOpen(false);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={Building2} size="lg" />}
      title={condominios.length === 0 ? "Nenhum condomínio na carteira" : "Nenhum condomínio encontrado"}
      description={
        condominios.length === 0
          ? "Cadastre o primeiro condomínio atendido pelo escritório."
          : "Ajuste os filtros ou cadastre um condomínio."
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
    <Table aria-label="Condomínios">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("nome")} onSort={() => handleSort("nome")}>
            Condomínio
          </TableHead>
          <TableHead sortable sortDirection={directionFor("cidade")} onSort={() => handleSort("cidade")}>
            Cidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("administradora")} onSort={() => handleSort("administradora")}>
            Administradora
          </TableHead>
          <TableHead sortable sortDirection={directionFor("advogado")} onSort={() => handleSort("advogado")}>
            Advogado responsável
          </TableHead>
          <TableHead
            align="right"
            className="w-32"
            sortable
            sortDirection={directionFor("unidades")}
            onSort={() => handleSort("unidades")}
          >
            Unidades
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
              <TableCell className="font-medium">{item.nome}</TableCell>
              <TableCell>{item.cidade || "—"}</TableCell>
              <TableCell>{item.administradora || "—"}</TableCell>
              <TableCell>{item.advogado}</TableCell>
              <TableCell align="right" className="tabular-nums">
                {contarUnidades(item.id)}
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
      <TableMobileList aria-label="Condomínios">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{item.nome}</TableMobileTitle>
              <TableActionsButton label={`Ações de ${item.nome}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Cidade">{item.cidade || "—"}</TableMobileField>
              <TableMobileField label="Administradora">{item.administradora || "—"}</TableMobileField>
              <TableMobileField label="Advogado">{item.advogado}</TableMobileField>
              <TableMobileField label="Unidades" valueClassName="tabular-nums">
                {contarUnidades(item.id)}
              </TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
        <PageHeader
          title="Condomínios"
          breadcrumbs={[{ label: "Início", href: "/" }, { label: "Condomínios" }]}
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
            searchPlaceholder="Buscar condomínio..."
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "administradora",
                label: "Administradora",
                value: administradora,
                onChange: setAdministradora,
                options: [
                  { value: "todas", label: "Todas" },
                  ...administradoras.map((nome) => ({ value: nome, label: nome })),
                ],
              },
              {
                id: "cidade",
                label: "Cidade",
                value: cidade,
                onChange: setCidade,
                options: [
                  { value: "todas", label: "Todas" },
                  ...cidades.map((nome) => ({ value: nome, label: nome })),
                ],
              },
              {
                id: "advogado",
                label: "Advogado responsável",
                value: lawyer,
                onChange: setLawyer,
                options: [
                  { value: "todos", label: "Todos os advogados" },
                  ...advogados.map((nome) => ({ value: nome, label: nome })),
                ],
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Building2} size="md" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">na carteira</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Scale} size="md" className="text-brass" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(advogadosNaLista).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">advogados</p>
            </CardMetric>
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={MapPin} size="md" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(comEndereco).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">com endereço</p>
            </CardMetric>
          </div>

          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
          {visible.length > 0 ? (
            <Pagination page={currentPage} total={visible.length} onPageChange={setPage} />
          ) : null}
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
                  <Icon icon={Building2} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>
                    {editingId === null ? "Novo condomínio" : "Editar condomínio"}
                  </SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    O cadastro é da administradora e vale para a palitagem e para os relatórios.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapasCondominio} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Nome" htmlFor={`${formId}-nome`} required error={errors.nome}>
                    <Input
                      id={`${formId}-nome`}
                      value={form.nome}
                      invalid={Boolean(errors.nome)}
                      onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                    />
                  </FormField>
                  <FormField
                    label="Advogado responsável"
                    htmlFor={`${formId}-advogado`}
                    required
                    error={errors.advogado}
                  >
                    <Select
                      id={`${formId}-advogado`}
                      value={form.advogado}
                      invalid={Boolean(errors.advogado)}
                      onChange={(event) => setForm((current) => ({ ...current, advogado: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {advogados.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Administradora do condomínio" htmlFor={`${formId}-administradora`}>
                    <Input
                      id={`${formId}-administradora`}
                      value={form.administradora}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, administradora: event.target.value }))
                      }
                    />
                  </FormField>
                </>
              ) : step === 1 ? (
                <>
                  <FormField label="CEP" htmlFor={`${formId}-cep`} error={cepErro}>
                    <Input
                      id={`${formId}-cep`}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
                      placeholder="00000-000"
                      value={form.cep}
                      invalid={Boolean(cepErro)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, cep: formatarCep(event.target.value) }))
                      }
                    />
                  </FormField>
                  {buscandoCep ? (
                    <p className="text-body-sm text-on-surface-variant">Buscando CEP...</p>
                  ) : null}
                    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-md">
                      <FormField label="Logradouro" htmlFor={`${formId}-logradouro`}>
                        <Input
                          id={`${formId}-logradouro`}
                          value={form.logradouro}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, logradouro: event.target.value }))}
                        />
                      </FormField>
                      <FormField label="Número" htmlFor={`${formId}-numero`}>
                        <Input
                          id={`${formId}-numero`}
                          value={form.numero}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))}
                        />
                      </FormField>
                    </div>
                    <FormField label="Complemento" htmlFor={`${formId}-complemento`}>
                      <Input
                        id={`${formId}-complemento`}
                        value={form.complemento}
                        disabled={!enderecoLiberado}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, complemento: event.target.value }))
                        }
                      />
                    </FormField>
                    <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-md">
                      <FormField label="Cidade" htmlFor={`${formId}-cidade`}>
                        <Input
                          id={`${formId}-cidade`}
                          value={form.cidade}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))}
                        />
                      </FormField>
                      <FormField label="Estado" htmlFor={`${formId}-estado`}>
                        <Select
                          id={`${formId}-estado`}
                          value={form.estado}
                          disabled={!enderecoLiberado}
                          onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {estados.map((sigla) => (
                            <option key={sigla} value={sigla}>
                              {sigla}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                </>
              ) : (
                <FormField label="Observação" htmlFor={`${formId}-observacao`}>
                  <Textarea
                    id={`${formId}-observacao`}
                    value={form.observacao}
                    onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
                  />
                </FormField>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              onBack={step > 0 ? () => setStep((current) => current - 1) : undefined}
              saveLabel={step < etapasCondominio.length - 1 ? "Continuar" : "Salvar"}
            />
          </SheetForm>
        </SheetContent>
      </Sheet>

      <Sheet
        open={detalhe !== null}
        onOpenChange={(open) => {
          if (!open) setDetalheId(null);
        }}
      >
        <SheetContent aria-labelledby={`${formId}-detalhe-title`} aria-describedby={`${formId}-detalhe-desc`}>
          {detalhe ? (
            <>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={Building2} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${formId}-detalhe-title`}>{detalhe.nome}</SheetTitle>
                    <SheetDescription id={`${formId}-detalhe-desc`}>
                      Endereço, administradora e unidades deste condomínio.
                    </SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                <SheetPanel variant="tint">
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="Advogado responsável" value={detalhe.advogado} />
                    <DetalheCampo label="Administradora" value={detalhe.administradora} />
                  </div>
                </SheetPanel>
                <SheetPanel className="flex flex-col gap-md">
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="CEP" value={detalhe.cep} />
                    <DetalheCampo label="Número" value={detalhe.numero} />
                  </div>
                  <DetalheCampo label="Logradouro" value={detalhe.logradouro} />
                  <DetalheCampo label="Complemento" value={detalhe.complemento} />
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="Cidade" value={detalhe.cidade} />
                    <DetalheCampo label="Estado" value={detalhe.estado} />
                  </div>
                </SheetPanel>
                <SheetPanel>
                  <DetalheCampo label="Observação" value={detalhe.observacao} />
                </SheetPanel>
                <SheetPanel className="flex flex-col gap-md">
                  <p className="text-label-lg text-on-surface">Unidades</p>
                  {unidadesDoDetalhe.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">Nenhuma unidade cadastrada neste condomínio.</p>
                  ) : (
                    unidadesDoDetalhe.map((unidade) => (
                      <div key={unidade.id} className="flex items-center justify-between gap-md">
                        <div className="min-w-0">
                          <p className="text-label-lg text-on-surface">{unidade.identificacao}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {[unidade.bloco, unidade.tipo].filter((parte) => parte.trim()).join(" · ")}
                          </p>
                        </div>
                        <Badge variant={unidade.status === "Ativa" ? "success" : "error"}>{unidade.status}</Badge>
                      </div>
                    ))
                  )}
                </SheetPanel>
              </SheetBody>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setDetalheId(null)}>
                  Fechar
                </Button>
                <Button type="button" variant="outline" onClick={() => verUnidades(detalhe)}>
                  <Icon icon={DoorOpen} size="sm" />
                  Ver unidades
                </Button>
                <Button type="button" onClick={() => adicionarUnidade(detalhe)}>
                  <Icon icon={Plus} size="sm" />
                  Adicionar unidade
                </Button>
              </SheetFooter>
            </>
          ) : null}
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
        title="Excluir condomínio?"
        description={deleteTarget ? `${deleteTarget.nome} será removido da carteira.` : undefined}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
