"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, FileUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
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
  SheetFooter,
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
  tiposImportacao,
  type Importacao,
} from "@/data/catalogo";
import type { PreviewImportacaoModulo, ResultadoConfirmacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";
import {
  configWizardImportacao,
  MODULOS_WIZARD_IMPORTACAO,
  moduloWizardValido,
  type ModuloWizardImportacao,
} from "@/lib/importacoes/config-wizard-importacao";
import {
  aplicarImportacaoExcluida,
  aplicarImportacaoSalva,
  mesclarCondominiosImportacao,
  mesclarDebitosDoServidor,
  mesclarResponsaveisImportacao,
  mesclarUnidadesImportacao,
  sincronizarImportacoesDoServidor,
} from "@/lib/importacoes/sync-cliente";
import { ImportacaoPreVisualizacao } from "@/components/importacao-pre-visualizacao/importacao-pre-visualizacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";
import {
  ImportacaoAprovacao,
  podeEnviarAprovacaoImportacao,
} from "@/components/importacao-aprovacao/importacao-aprovacao";
import { ImportacaoResultado } from "@/components/importacao-aprovacao/importacao-resultado";
import { linhaSeraGravada } from "@/lib/importacao-centro/pre-visualizacao";
import { agoraIso } from "@/data/catalogo";
import { ImportacaoHistoricoDetalheSheet } from "@/components/importacao-historico/importacao-historico-detalhe-sheet";
import type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-auditoria";
import type { RetomadaImportacaoHistorico } from "@/lib/importacoes/historico-service";
import {
  SITUACOES_IMPORTACAO,
  badgeVariantSituacaoImportacao,
  normalizarSituacaoImportacao,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";

const etapas = ["Arquivo", "Prévia", "Aprovação", "Resultado"] as const;
const rotuloTipo: Record<string, string> = {
  debitos: "Débitos",
  condominios: "Condomínios",
  responsaveis: "Responsáveis",
  unidades: "Unidades",
};
function rotuloStatusBadge(status: string) {
  return rotuloSituacaoImportacao(status);
}
function variantStatusBadge(status: string) {
  return badgeVariantSituacaoImportacao(status);
}
type SortKey = "data" | "arquivo" | "status";

export default function ImportacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user: sessao } = useAuth();
  const { pode } = usePermissao();
  const podeIniciarImportacao = pode("importacoes", "criar");
  const podeAprovarImportacao = pode("importacoes", "editar");
  const podeCorrigirPrevia = pode("importacoes", "editar");
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
  const [deleteTarget, setDeleteTarget] = useState<Importacao | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheCarregando, setDetalheCarregando] = useState(false);
  const [detalheImportacao, setDetalheImportacao] = useState<ImportacaoConsulta | null>(null);
  const [retomadaDetalhe, setRetomadaDetalhe] = useState<RetomadaImportacaoHistorico | null>(null);
  const [retomandoDetalhe, setRetomandoDetalhe] = useState(false);
  const [confirmacaoMarcada, setConfirmacaoMarcada] = useState(false);
  const [cienciaParcial, setCienciaParcial] = useState(false);
  const [confirmacaoJaEnviada, setConfirmacaoJaEnviada] = useState(false);
  const [step, setStep] = useState(0);
  const [origem, setOrigem] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [processoId, setProcessoId] = useState("");
  const [hashRecebimento, setHashRecebimento] = useState("");
  const [moduloWizard, setModuloWizard] = useState<ModuloWizardImportacao>("debitos");
  const [preview, setPreview] = useState<PreviewImportacaoModulo | null>(null);
  const [dataHoraPrevia, setDataHoraPrevia] = useState("");
  const [resultado, setResultado] = useState<ResultadoConfirmacaoModulo | null>(null);
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

  const configModulo = useMemo(() => configWizardImportacao(moduloWizard), [moduloWizard]);

  useEffect(() => {
    const moduloParam = searchParams.get("modulo");
    const abrir = searchParams.get("abrir") === "1";
    if (moduloParam && moduloWizardValido(moduloParam) && abrir && pode("importacoes", "criar")) {
      setModuloWizard(moduloParam);
      resetWizardForModulo(moduloParam);
      setSheetOpen(true);
      router.replace("/importacoes", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abre uma vez via query string
  }, [searchParams, pode, router]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = importacoes
    .filter((item) => {
      const matchesStatus =
        appliedStatus === "todos" || normalizarSituacaoImportacao(item.status) === normalizarSituacaoImportacao(appliedStatus);
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
  const concluidas = visible.filter((item) => {
    const s = normalizarSituacaoImportacao(item.status);
    return s === "Concluida" || s === "Concluida parcialmente" || s === "Aprovada";
  }).length;
  const comErro = visible.filter((item) => normalizarSituacaoImportacao(item.status) === "Falhou").length;
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

  function resetWizardForModulo(modulo: ModuloWizardImportacao) {
    setModuloWizard(modulo);
    setStep(0);
    const cfg = configWizardImportacao(modulo);
    setOrigem(cfg.origemPadraoCarteira);
    setNomeArquivo("");
    setProcessoId("");
    setHashRecebimento("");
    setPreview(null);
    setDataHoraPrevia("");
    setResultado(null);
    setErroOrigem("");
    setErroArquivo("");
    setConfirmacaoMarcada(false);
    setCienciaParcial(false);
    setConfirmacaoJaEnviada(false);
  }

  function resetWizard() {
    resetWizardForModulo(moduloWizard);
  }

  function openCreate(modulo: ModuloWizardImportacao = "debitos") {
    resetWizardForModulo(modulo);
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

  async function excluirImportacaoHistorico(id: number) {
    const response = await fetch(`/api/importacoes/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "Não foi possível excluir.");
    }
    aplicarImportacaoExcluida(id);
    if (detalheImportacao?.id === id) {
      setDetalheOpen(false);
      setDetalheImportacao(null);
      setRetomadaDetalhe(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await excluirImportacaoHistorico(deleteTarget.id);
      toast({ variant: "success", title: "Importação excluída" });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "error",
        title: "Não foi possível excluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function abrirDetalhe(item: Importacao) {
    setDetalheOpen(true);
    setDetalheCarregando(true);
    setDetalheImportacao(null);
    setRetomadaDetalhe(null);
    try {
      const response = await fetch(`/api/importacoes/${item.id}`, { credentials: "same-origin" });
      const body = (await response.json()) as {
        importacao?: ImportacaoConsulta;
        retomada?: RetomadaImportacaoHistorico;
        error?: string;
      };
      if (response.ok && body.importacao) {
        setDetalheImportacao(body.importacao);
        setRetomadaDetalhe(body.retomada ?? null);
      } else {
        toast({ variant: "error", title: "Detalhe indisponível", description: body.error ?? "Tente novamente." });
        setDetalheOpen(false);
      }
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível carregar o histórico." });
      setDetalheOpen(false);
    } finally {
      setDetalheCarregando(false);
    }
  }

  async function retomarImportacaoDoDetalhe() {
    if (!retomadaDetalhe?.disponivel || !moduloWizardValido(retomadaDetalhe.modulo)) return;
    setRetomandoDetalhe(true);
    try {
      const cfg = configWizardImportacao(retomadaDetalhe.modulo);
      setModuloWizard(retomadaDetalhe.modulo);
      setOrigem(retomadaDetalhe.origem);
      setNomeArquivo(retomadaDetalhe.arquivo);
      setProcessoId(retomadaDetalhe.processoId);
      setHashRecebimento(retomadaDetalhe.hashArquivo);
      setPreview(null);
      setResultado(null);
      setConfirmacaoMarcada(false);
      setCienciaParcial(false);
      setConfirmacaoJaEnviada(false);
      setErroOrigem("");
      setErroArquivo("");
      setDetalheOpen(false);

      const response = await fetch(`${cfg.apiBase}/preview`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: retomadaDetalhe.origem,
          arquivo: retomadaDetalhe.arquivo,
          processoId: retomadaDetalhe.processoId,
          hashArquivo: retomadaDetalhe.hashArquivo,
        }),
      });
      const body = (await response.json()) as { preview?: PreviewImportacaoModulo; error?: string };
      if (!response.ok || !body.preview) {
        toast({
          variant: "error",
          title: "Não foi possível retomar",
          description: body.error ?? "Valide o arquivo novamente.",
        });
        return;
      }
      setPreview(body.preview);
      setDataHoraPrevia(agoraIso());
      setStep(1);
      setSheetOpen(true);
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível retomar a conferência." });
    } finally {
      setRetomandoDetalhe(false);
    }
  }

  function solicitarExclusaoDetalhe() {
    if (!detalheImportacao) return;
    setDetalheOpen(false);
    setDeleteTarget({
      id: detalheImportacao.id,
      origem: detalheImportacao.origem,
      tipo: detalheImportacao.tipo,
      arquivo: detalheImportacao.arquivo,
      status: detalheImportacao.status,
      quantidadeRegistros: detalheImportacao.quantidadeRegistros,
      quantidadeImportados: detalheImportacao.quantidadeImportados,
      quantidadeAtualizados: detalheImportacao.quantidadeAtualizados,
      quantidadeErros: detalheImportacao.quantidadeErros,
      observacaoInterna: detalheImportacao.observacaoInterna,
      usuarioId: detalheImportacao.usuarioId,
      dataImportacao: detalheImportacao.dataImportacao,
      processoId: detalheImportacao.processoId,
      quantidadeIgnorados: detalheImportacao.quantidadeIgnorados,
      iniciadoEm: detalheImportacao.iniciadoEm,
      usuarioAprovacaoId: detalheImportacao.usuarioAprovacaoId ?? undefined,
      aprovadoEm: detalheImportacao.aprovadoEm ?? undefined,
    });
  }

  function acoes(item: Importacao) {
    const lista = [];
    if (pode("importacoes", "ler"))
      lista.push({ label: "Ver detalhes", icon: Eye, onSelect: () => void abrirDetalhe(item) });
    if (pode("importacoes", "excluir"))
      lista.push({ label: "Excluir", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(item) });
    return lista;
  }

  async function handleArquivoSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setErroArquivo("");
    setProcessando(true);
    try {
      const formData = new FormData();
      formData.set("modulo", moduloWizard);
      formData.set("arquivo", arquivo);
      const response = await fetch("/api/importacoes/arquivo", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const body = (await response.json()) as {
        recebimento?: { processoId: string; nomeArquivo: string; hashArquivo: string };
        error?: string;
      };
      if (!response.ok || !body.recebimento) {
        setErroArquivo(body.error ?? "Não foi possível validar o arquivo.");
        setProcessoId("");
        setHashRecebimento("");
        setNomeArquivo("");
        return;
      }
      setProcessoId(body.recebimento.processoId);
      setHashRecebimento(body.recebimento.hashArquivo);
      setNomeArquivo(body.recebimento.nomeArquivo);
    } catch {
      setErroArquivo("Não foi possível enviar o arquivo.");
      setProcessoId("");
      setHashRecebimento("");
      setNomeArquivo("");
    } finally {
      setProcessando(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      void validarArquivo();
      return;
    }
    if (step === 1) {
      if (!podeAprovarImportacao) {
        toast({
          variant: "error",
          title: "Sem permissão",
          description: "Você não pode aprovar importações. Solicite a permissão de alterar no módulo Importações.",
        });
        return;
      }
      if (!preview?.resumoAprovacao?.podeConfirmar && !preview?.arquivoJaImportado) return;
      setConfirmacaoMarcada(false);
      setCienciaParcial(false);
      setStep(2);
      if (processoId) {
        void fetch(`/api/importacoes/processo/${encodeURIComponent(processoId)}/aprovacao`, {
          method: "POST",
          credentials: "same-origin",
        }).then(() => recarregarImportacoes());
      }
      return;
    }
    if (step === 2) {
      if (
        !preview?.resumoAprovacao ||
        !podeEnviarAprovacaoImportacao(preview.resumoAprovacao, confirmacaoMarcada, cienciaParcial, {
          processando,
          confirmacaoJaEnviada,
          permissaoAprovar: podeAprovarImportacao,
        })
      ) {
        return;
      }
      void executarImportacao();
      return;
    }
    if (step === 3) {
      setSheetOpen(false);
      resetWizard();
    }
  }

  async function validarArquivo() {
    const errosOrigem = !origem ? "Selecione a origem dos dados." : "";
    const errosArquivo = !processoId ? `Selecione um arquivo válido para ${ROTULO_MODULO_IMPORTACAO[moduloWizard] ?? "importação"}.` : "";
    setErroOrigem(errosOrigem);
    setErroArquivo(errosArquivo);
    if (errosOrigem || errosArquivo) return;

    setProcessando(true);
    try {
      const response = await fetch(`${configModulo.apiBase}/preview`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem,
          arquivo: nomeArquivo,
          processoId,
          hashArquivo: hashRecebimento,
        }),
      });
      const body = (await response.json()) as { preview?: PreviewImportacaoModulo; error?: string };
      if (!response.ok || !body.preview) {
        toast({
          variant: "error",
          title: "Validação falhou",
          description: body.error ?? "Verifique o cabeçalho e o formato do arquivo.",
        });
        return;
      }
      setPreview(body.preview);
      setDataHoraPrevia(agoraIso());
      setStep(1);
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível validar o arquivo." });
    } finally {
      setProcessando(false);
    }
  }

  async function executarImportacao() {
    if (!preview?.resumoAprovacao) return;
    setProcessando(true);
    setConfirmacaoJaEnviada(true);
    try {
      const response = await fetch(`${configModulo.apiBase}/confirmar`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origem: preview.origem,
          arquivo: preview.arquivo,
          processoId,
          hashArquivo: preview.hashArquivo,
          confirmacaoExplicita: true,
          cienciaImportacaoParcial: preview.resumoAprovacao.importacaoParcial ? cienciaParcial : undefined,
        }),
      });
      const body = (await response.json()) as {
        resultado?: ResultadoConfirmacaoModulo;
        debitos?: import("@/data/catalogo").Debito[];
        condominios?: import("@/data/catalogo").Condominio[];
        unidades?: import("@/data/catalogo").Unidade[];
        responsaveis?: import("@/data/catalogo").Responsavel[];
        vinculos?: import("@/data/catalogo").Vinculo[];
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
      if (body.condominios) mesclarCondominiosImportacao(body.condominios, sessao?.id);
      if (body.unidades) mesclarUnidadesImportacao(body.unidades, sessao?.id);
      if (body.responsaveis || body.vinculos) {
        mesclarResponsaveisImportacao(body.responsaveis ?? [], body.vinculos ?? []);
      }
      aplicarImportacaoSalva(body.resultado.importacao);
      setResultado(body.resultado);
      setStep(3);
      await recarregarImportacoes();
      toast({
        variant: "success",
        title: preview.arquivoJaImportado ? "Arquivo já importado" : "Importação concluída",
        description: preview.arquivoJaImportado
          ? "Nenhum registro duplicado foi gravado."
          : `${body.resultado.novos} novo(s), ${body.resultado.atualizados} atualizado(s).`,
      });
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível gravar a importação." });
      setConfirmacaoJaEnviada(false);
    } finally {
      setProcessando(false);
    }
  }

  const gravacaoNaPrevia = useMemo(() => {
    if (!preview) return 0;
    return preview.linhas.filter((item) => linhaSeraGravada(item)).length;
  }, [preview]);

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
        podeIniciarImportacao ? (
          <Button size="sm" onClick={() => openCreate("debitos")}>
            <Icon icon={Plus} size="sm" />
            Nova importação
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
                <Badge variant={variantStatusBadge(item.status)}>{rotuloStatusBadge(item.status)}</Badge>
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
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                aria-hidden="true"
              >
                <Icon icon={FileUp} size="sm" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {item.arquivo || rotuloTipo[item.tipo] || "Importação"}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">{item.origem || "—"}</p>
              </div>
              <TableActionsButton label={`Ações da importação ${item.arquivo || item.id}`} actions={acoes(item)} />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Tipo</p>
                  <p className="text-body-md font-semibold text-on-surface">{rotuloTipo[item.tipo] ?? item.tipo}</p>
                  <p className="text-body-sm text-on-surface-variant">{nomeUsuario(item.usuarioId)}</p>
                </div>
                <Badge variant={variantStatusBadge(item.status)} className="shrink-0">
                  {rotuloStatusBadge(item.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Data</p>
                  <p className="text-body-md text-on-surface">{formatarData(item.dataImportacao)}</p>
                </div>
                <div className="min-w-0 text-end">
                  <p className="text-label-sm uppercase text-on-surface-variant">Erros</p>
                  <p className="text-body-md tabular-nums text-on-surface">{item.quantidadeErros || "—"}</p>
                </div>
              </div>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <input
        ref={arquivoRef}
        type="file"
        accept={configModulo.accept}
        className="sr-only"
        onChange={handleArquivoSelecionado}
      />
      <PageHeader
        title="Importações"
        description="Central de importação: inadimplência, condomínios, unidades e responsáveis — com validação, prévia e aprovação antes de gravar."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Importações" }]}
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
        actions={
          podeIniciarImportacao ? (
            <Button size="md" onClick={() => openCreate("debitos")}>
              <Icon icon={Plus} size="sm" />
              Nova importação
            </Button>
          ) : undefined
        }
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        <section aria-label="Resumo de importações">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
            <KpiMobileCard
              rotulo="Importações"
              valor={metricValor(visible.length)}
              icon={FileUp}
              destaque
            />
            <KpiMobileCard rotulo="Concluídas" valor={metricValor(concluidas)} icon={CheckCircle2} />
            <KpiMobileCard rotulo="Com erro" valor={metricValor(comErro)} icon={AlertTriangle} />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
            <CardMetric
              accent="primary"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={FileUp} size="md" className="text-primary-container" />}
              rotulo="Importações"
              valor={metricValor(visible.length)}
            />
            <CardMetric
              accent="brass"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={CheckCircle2} size="md" className="text-brass" />}
              rotulo="Concluídas"
              valor={metricValor(concluidas)}
            />
            <CardMetric
              accent="critical"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={AlertTriangle} size="md" className="text-status-critical" />}
              rotulo="Com erro"
              valor={metricValor(comErro)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm text-on-surface">Filtros</h2>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar importação..."
            onApply={handleApply}
            onClear={handleClear}
            defaultMobile="grid"
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
                  ...SITUACOES_IMPORTACAO.map((item) => ({ value: item, label: rotuloSituacaoImportacao(item) })),
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
        <SheetContent
          size={step === 1 ? "wide" : "default"}
          aria-labelledby={`${formId}-title`}
          aria-describedby={`${formId}-desc`}
        >
          <SheetForm onSubmit={handleFormSubmit}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={FileUp} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>{configModulo.tituloSheet}</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Formato {configModulo.formato}. Quem executa é o login atual ({sessao?.nome ?? "—"}).
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="O que importar" htmlFor={`${formId}-modulo`} required>
                    <Select
                      id={`${formId}-modulo`}
                      value={moduloWizard}
                      onChange={(event) => {
                        const valor = event.target.value;
                        if (moduloWizardValido(valor)) resetWizardForModulo(valor);
                      }}
                    >
                      {MODULOS_WIZARD_IMPORTACAO.map((item) => (
                        <option key={item} value={item}>
                          {ROTULO_MODULO_IMPORTACAO[item] ?? item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Origem dos dados" htmlFor={`${formId}-origem`} required error={erroOrigem}>
                    <Select
                      id={`${formId}-origem`}
                      value={origem}
                      invalid={Boolean(erroOrigem)}
                      onChange={(event) => setOrigem(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {configModulo.origens.map((item) => (
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
                        {nomeArquivo ? nomeArquivo : configModulo.descricaoArquivo}
                      </p>
                    </div>
                  </FormField>
                </>
              ) : null}

              {step === 1 && preview ? (
                <ImportacaoPreVisualizacao
                  cabecalho={{
                    nomeArquivo: preview.arquivo,
                    moduloDestino: preview.moduloDestino,
                    moduloRotulo: ROTULO_MODULO_IMPORTACAO[preview.moduloDestino] ?? "Inadimplência",
                    usuarioResponsavel: sessao?.nome ?? "—",
                    dataHoraImportacao: dataHoraPrevia,
                    origem: preview.origem,
                    quantidadeRegistros: preview.quantidadeRegistros,
                    contagens: preview.contagensPrevia,
                    arquivoJaImportado: preview.arquivoJaImportado,
                  }}
                  linhas={preview.linhas}
                  sessaoPreviaId={preview.sessaoPreviaId ?? processoId}
                  hashArquivo={preview.hashArquivo}
                  onPreviewAtualizado={setPreview}
                  onVoltarArquivo={() => {
                    setStep(0);
                    setPreview(null);
                    setDataHoraPrevia("");
                  }}
                  onCancelar={closeSheet}
                  permissaoCorrigir={configModulo.suportaCorrecaoPrevia && podeCorrigirPrevia}
                />
              ) : null}

              {step === 2 && preview?.resumoAprovacao ? (
                <ImportacaoAprovacao
                  resumo={preview.resumoAprovacao}
                  usuarioResponsavel={sessao?.nome ?? "—"}
                  confirmacaoMarcada={confirmacaoMarcada}
                  onConfirmacaoMarcadaChange={setConfirmacaoMarcada}
                  cienciaParcial={cienciaParcial}
                  onCienciaParcialChange={setCienciaParcial}
                  confirmacaoJaEnviada={confirmacaoJaEnviada}
                />
              ) : null}

              {step === 3 && resultado ? (
                <ImportacaoResultado
                  resultado={resultado}
                  moduloDestino={moduloWizard}
                  exibirManualProtegido={moduloWizard === "debitos"}
                />
              ) : null}
            </SheetBody>
            {step === 3 ? (
              <SheetFooter>
                <Button
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    resetWizard();
                  }}
                >
                  Fechar
                </Button>
              </SheetFooter>
            ) : (
              <SheetFooterForm
                onClose={closeSheet}
                onBack={
                  step === 1
                    ? () => setStep(0)
                    : step === 2
                      ? () => {
                          setStep(1);
                          setConfirmacaoMarcada(false);
                          setCienciaParcial(false);
                        }
                      : undefined
                }
                saveLabel={
                  step === 0
                    ? processando
                      ? "Validando…"
                      : "Validar arquivo"
                    : step === 1
                      ? "Revisar aprovação"
                      : processando
                        ? "Gravando…"
                        : "Confirmar e gravar"
                }
                saveDisabled={
                  processando ||
                  confirmacaoJaEnviada ||
                  (step === 1 && !podeAprovarImportacao) ||
                  (step === 1 &&
                    preview !== null &&
                    gravacaoNaPrevia === 0 &&
                    !preview.arquivoJaImportado &&
                    !preview.resumoAprovacao?.podeConfirmar) ||
                  (step === 2 &&
                    preview?.resumoAprovacao !== undefined &&
                    !podeEnviarAprovacaoImportacao(preview.resumoAprovacao, confirmacaoMarcada, cienciaParcial, {
                      processando,
                      confirmacaoJaEnviada,
                      permissaoAprovar: podeAprovarImportacao,
                    }))
                }
              />
            )}
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
      <ImportacaoHistoricoDetalheSheet
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        importacao={detalheImportacao}
        carregando={detalheCarregando}
        retomada={retomadaDetalhe}
        podeExcluir={pode("importacoes", "excluir")}
        onRetomar={() => void retomarImportacaoDoDetalhe()}
        onExcluir={solicitarExclusaoDetalhe}
        retomando={retomandoDetalhe}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Excluir importação?"
        description="O histórico deste arquivo será removido. Os registros já gravados permanecem."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
      />
    </WorkspaceShell>
  );
}
