"use client";

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Select } from "@/components/input";
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
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  formatarData,
  nomeUsuario,
  origensDebito,
  registrarAuditoria,
  setImportacoes,
  statusImportacao,
  tiposImportacao,
  type Importacao,
} from "@/data/catalogo";
import type { PreviewImportacaoDebitos, ResultadoConfirmacaoDebitos } from "@/lib/importacoes/debitos-service";
import { FORMATO_IMPORTACAO_DEBITOS_V1 } from "@/lib/importacoes/importar-debitos-planilha";
import {
  aplicarImportacaoSalva,
  mesclarDebitosDoServidor,
  sincronizarImportacoesDoServidor,
} from "@/lib/importacoes/sync-cliente";

const etapas = ["Arquivo", "Prévia", "Resultado"] as const;
const rotuloTipo: Record<string, string> = { debitos: "Débitos", responsaveis: "Responsáveis", unidades: "Unidades" };
const rotuloStatus: Record<string, string> = { Processando: "Processando", Concluida: "Concluída", Erro: "Erro", Cancelada: "Cancelada" };
const badgeStatus: Record<string, "primary" | "success" | "error" | "secondary"> = {
  Processando: "primary",
  Concluida: "success",
  Erro: "error",
  Cancelada: "secondary",
};
const rotuloSituacaoLinha: Record<string, string> = {
  novo: "Novo",
  atualizacao: "Atualização",
  duplicado: "Duplicado",
  erro: "Erro",
  manual_protegido: "Manual protegido",
};

type SortKey = "data" | "arquivo" | "status";

export default function ImportacoesPage() {
  const { toast } = useToast();
  const { user: sessao } = useAuth();
  const { pode } = usePermissao();
  const formId = useId();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const cadastros = useCadastros();
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
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Importacao | null>(null);
  const [step, setStep] = useState(0);
  const [origem, setOrigem] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [conteudoArquivo, setConteudoArquivo] = useState("");
  const [preview, setPreview] = useState<PreviewImportacaoDebitos | null>(null);
  const [resultado, setResultado] = useState<ResultadoConfirmacaoDebitos | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroOrigem, setErroOrigem] = useState("");
  const [erroArquivo, setErroArquivo] = useState("");

  const recarregarImportacoes = useCallback(async () => {
    try {
      const response = await fetch("/api/importacoes", { credentials: "same-origin" });
      if (!response.ok) return;
      const body = (await response.json()) as { importacoes?: Importacao[] };
      if (body.importacoes) sincronizarImportacoesDoServidor(body.importacoes);
    } catch {
      /* mantém catálogo local */
    }
  }, []);

  useEffect(() => {
    void recarregarImportacoes();
  }, [recarregarImportacoes]);

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
  const metricValor = (n: number) => String(n).padStart(2, "0");

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

  function resetWizard() {
    setStep(0);
    setOrigem("");
    setNomeArquivo("");
    setConteudoArquivo("");
    setPreview(null);
    setResultado(null);
    setErroOrigem("");
    setErroArquivo("");
  }

  function openCreate() {
    resetWizard();
    setSheetOpen(true);
  }

  function closeSheet() {
    if (step > 0 || origem || nomeArquivo) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
    resetWizard();
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
    toast({ variant: "success", title: "Importação excluída" });
    setDeleteTarget(null);
  }

  function acoes(item: Importacao) {
    const lista = [];
    if (pode("importacoes", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  async function handleArquivoSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setErroArquivo("");
    try {
      const conteudo = await arquivo.text();
      setConteudoArquivo(conteudo);
      setNomeArquivo(arquivo.name);
    } catch {
      setErroArquivo("Não foi possível ler o arquivo.");
      setConteudoArquivo("");
      setNomeArquivo("");
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      void validarArquivo();
      return;
    }
    if (step === 1) {
      setConfirmImportOpen(true);
      return;
    }
    if (step === 2) {
      setSheetOpen(false);
      resetWizard();
    }
  }

  async function validarArquivo() {
    const errosOrigem = !origem ? "Selecione a origem dos dados." : "";
    const errosArquivo = !conteudoArquivo.trim() ? "Selecione um arquivo CSV ou XLS exportado." : "";
    setErroOrigem(errosOrigem);
    setErroArquivo(errosArquivo);
    if (errosOrigem || errosArquivo) return;

    setProcessando(true);
    try {
      const response = await fetch("/api/importacoes/debitos/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem, arquivo: nomeArquivo, conteudo: conteudoArquivo }),
      });
      const body = (await response.json()) as { preview?: PreviewImportacaoDebitos; error?: string };
      if (!response.ok || !body.preview) {
        toast({
          variant: "error",
          title: "Validação falhou",
          description: body.error ?? "Verifique o cabeçalho e o formato do arquivo.",
        });
        return;
      }
      setPreview(body.preview);
      setStep(1);
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível validar o arquivo." });
    } finally {
      setProcessando(false);
    }
  }

  async function executarImportacao() {
    if (!preview) return;
    setConfirmImportOpen(false);
    setProcessando(true);
    try {
      const response = await fetch("/api/importacoes/debitos/confirmar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: preview.origem,
          arquivo: preview.arquivo,
          conteudo: conteudoArquivo,
          hashArquivo: preview.hashArquivo,
        }),
      });
      const body = (await response.json()) as {
        resultado?: ResultadoConfirmacaoDebitos;
        debitos?: import("@/data/catalogo").Debito[];
        error?: string;
      };
      if (!response.ok || !body.resultado) {
        toast({
          variant: "error",
          title: "Importação não concluída",
          description: body.error ?? "Tente validar o arquivo novamente.",
        });
        return;
      }
      if (body.debitos) mesclarDebitosDoServidor(body.debitos);
      aplicarImportacaoSalva(body.resultado.importacao);
      setResultado(body.resultado);
      setStep(2);
      await recarregarImportacoes();
      toast({
        variant: "success",
        title: preview.arquivoJaImportado ? "Arquivo já importado" : "Importação concluída",
        description: preview.arquivoJaImportado
          ? "Nenhum débito duplicado foi gravado."
          : `${body.resultado.novos} novo(s), ${body.resultado.atualizados} atualizado(s).`,
      });
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível gravar a importação." });
    } finally {
      setProcessando(false);
    }
  }

  const linhasComProblema =
    preview?.linhas.filter((item) => item.situacao === "erro" || item.situacao === "manual_protegido").slice(0, 15) ??
    [];

  const emptyState = (
    <EmptyState
      icon={<Icon icon={FileUp} size="lg" />}
      title={importacoes.length === 0 ? "Nenhuma importação registrada" : "Nenhuma importação encontrada"}
      description={
        importacoes.length === 0
          ? "Envie o relatório de inadimplência (CSV ou XLS) da administradora para alimentar os débitos."
          : "Ajuste a busca, o tipo ou a situação."
      }
      action={
        pode("importacoes", "criar") ? (
          <Button size="sm" onClick={openCreate}>
            <Icon icon={Plus} size="sm" />
            Importar inadimplência
          </Button>
        ) : undefined
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
      <input
        ref={arquivoRef}
        type="file"
        accept=".csv,.xls,.txt,text/csv,application/vnd.ms-excel"
        className="sr-only"
        onChange={handleArquivoSelecionado}
      />
      <PageHeader
        title="Importações"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Importações" }]}
        actions={
          pode("importacoes", "criar") ? (
            <Button size="md" onClick={openCreate}>
              <Icon icon={Plus} size="sm" />
              Importar inadimplência
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        <div
          className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3"
          aria-label="Resumo de importações"
        >
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={FileUp} size="md" className="text-primary-container" />}
            rotulo="Importações"
            valor={metricValor(visible.length)}
            detalhe="No recorte atual da listagem"
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={CheckCircle2} size="md" className="text-brass" />}
            rotulo="Concluídas"
            valor={metricValor(concluidas)}
            detalhe="Processadas com sucesso"
          />
          <CardMetric
            accent="critical"
            iconClassName="bg-error-container text-status-critical"
            icon={<Icon icon={AlertTriangle} size="md" className="text-status-critical" />}
            rotulo="Com erro"
            valor={metricValor(comErro)}
            detalhe="Falha na validação ou gravação"
          />
        </div>

        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm text-on-surface">Filtros</h2>
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
        </section>

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
          <SheetForm onSubmit={handleFormSubmit}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={FileUp} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>Importar inadimplência</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Formato {FORMATO_IMPORTACAO_DEBITOS_V1}: CSV (;) ou XLS. Quem executa é o login atual (
                    {sessao?.nome ?? "—"}).
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Origem dos dados" htmlFor={`${formId}-origem`} required error={erroOrigem}>
                    <Select
                      id={`${formId}-origem`}
                      value={origem}
                      invalid={Boolean(erroOrigem)}
                      onChange={(event) => setOrigem(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {origensDebito.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Arquivo" required error={erroArquivo}>
                    <div className="flex flex-col gap-sm">
                      <Button type="button" variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()}>
                        Escolher arquivo
                      </Button>
                      <p className="text-body-sm text-on-surface-variant">
                        {nomeArquivo ? nomeArquivo : "CSV ou planilha XLS com colunas Unidade, Condomínio, Referência, Vencimento e valor."}
                      </p>
                    </div>
                  </FormField>
                </>
              ) : null}

              {step === 1 && preview ? (
                <div className="flex flex-col gap-md">
                  {preview.arquivoJaImportado ? (
                    <p className="flex items-start gap-sm rounded-md bg-gold-subtle px-md py-sm text-body-sm text-on-surface">
                      <Icon icon={AlertTriangle} size="sm" className="mt-0.5 shrink-0 text-brass" />
                      Este arquivo já foi importado com sucesso. Uma nova confirmação não duplicará débitos.
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-sm text-body-sm min-[480px]:grid-cols-3">
                    <p>
                      <span className="text-on-surface-variant">Lidas:</span> {preview.quantidadeRegistros}
                    </p>
                    <p>
                      <span className="text-on-surface-variant">Novos:</span> {preview.novos}
                    </p>
                    <p>
                      <span className="text-on-surface-variant">Atualizações:</span> {preview.atualizacoes}
                    </p>
                    <p>
                      <span className="text-on-surface-variant">Duplicadas:</span> {preview.duplicados}
                    </p>
                    <p>
                      <span className="text-on-surface-variant">Erros:</span> {preview.erros}
                    </p>
                    <p>
                      <span className="text-on-surface-variant">Manuais protegidos:</span> {preview.manualProtegido}
                    </p>
                  </div>
                  {preview.amostraValida.length > 0 ? (
                    <div>
                      <p className="mb-sm text-label text-on-surface-variant">Amostra do que será gravado</p>
                      <ul className="space-y-xs text-body-sm">
                        {preview.amostraValida.map((item) => (
                          <li key={`${item.linha}-${item.resumo?.referencia}`}>
                            Linha {item.linha}: {item.resumo?.unidade} — {item.resumo?.referencia} (
                            {item.resumo?.valorAtualizado})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {linhasComProblema.length > 0 ? (
                    <div>
                      <p className="mb-sm text-label text-on-surface-variant">Linhas com erro ou ignoradas</p>
                      <ul className="max-h-48 space-y-xs overflow-y-auto text-body-sm">
                        {linhasComProblema.map((item) => (
                          <li key={`err-${item.linha}`}>
                            Linha {item.linha} ({rotuloSituacaoLinha[item.situacao]}): {item.mensagem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {preview.novos + preview.atualizacoes === 0 && !preview.arquivoJaImportado ? (
                    <p className="text-body-sm text-on-surface-variant">
                      Nenhuma linha será gravada. Corrija o arquivo ou cancela a operação.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 2 && resultado ? (
                <div className="space-y-sm text-body-sm">
                  <p className="font-medium text-on-surface">Relatório da importação</p>
                  <p>Arquivo: {resultado.importacao.arquivo}</p>
                  <p>Situação: {rotuloStatus[resultado.importacao.status] ?? resultado.importacao.status}</p>
                  <p>Novos débitos: {resultado.novos}</p>
                  <p>Atualizados: {resultado.atualizados}</p>
                  <p>Duplicados/ignorados: {resultado.duplicados}</p>
                  <p>Erros na leitura: {resultado.erros}</p>
                  <p>Registros manuais protegidos: {resultado.manualProtegido}</p>
                </div>
              ) : null}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              onBack={
                step === 1
                  ? () => setStep(0)
                  : step === 2
                    ? undefined
                    : undefined
              }
              saveLabel={
                step === 0
                  ? processando
                    ? "Validando…"
                    : "Validar arquivo"
                  : step === 1
                    ? processando
                      ? "Gravando…"
                      : "Confirmar importação"
                    : "Fechar"
              }
              saveDisabled={
                processando ||
                (step === 1 &&
                  preview !== null &&
                  preview.novos + preview.atualizacoes === 0 &&
                  !preview.arquivoJaImportado)
              }
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
        open={confirmImportOpen}
        onOpenChange={setConfirmImportOpen}
        title="Confirmar importação?"
        description="Linhas inválidas não serão gravadas. Débitos manuais sem ID externo não serão sobrescritos."
        confirmLabel="Importar"
        cancelLabel="Voltar"
        onConfirm={() => void executarImportacao()}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir importação?"
        description="O histórico deste arquivo será removido. Os débitos já gravados permanecem."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
