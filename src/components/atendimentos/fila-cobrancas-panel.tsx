"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ImportacaoWizardSheet,
  type ImportacaoWizardHandle,
} from "@/components/importacao-wizard/importacao-wizard-sheet";
import { Check, Handshake, Scale, SlidersHorizontal } from "lucide-react";
import { EncaminhamentoJuridicoSheet } from "@/components/juridico/encaminhamento-juridico-sheet";
import { PropostaNegociacaoSheet } from "@/components/negociacoes/proposta-negociacao-sheet";
import { HistoricoUnidadeSheet } from "@/components/unidades/historico-unidade-sheet";
import { AtendimentoOperacaoView } from "@/components/atendimentos/atendimento-operacao-view";
import { type PeriodValue } from "@/components/period-input";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import { type TableSortDirection } from "@/components/table";
import { useToast } from "@/components/toast";
import { escopoCondominios, hojeIso, nomeCondominio, situacoesUnidade, SITUACAO_COBRANCA_PRESCRITA } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import type { FilaCobrancaItem, FilaCobrancaResumo, FilaOrdenacaoCampo } from "@/lib/fila/service";

const periodoTodos: PeriodValue = { preset: "todos", de: "", ate: "" };

function deslocarIso(iso: string, dias: number) {
  const data = new Date(`${iso}T00:00:00`);
  data.setDate(data.getDate() + dias);
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

/** Atalhos antigos da fila (`?retorno=`) viram o período do chip. */
function periodoDaQuery(retorno: string | null): { periodo: PeriodValue; semRetorno: boolean } | null {
  if (!retorno) return null;
  if (retorno === "todos") return { periodo: periodoTodos, semRetorno: false };
  if (retorno === "hoje") return { periodo: { preset: "hoje", de: "", ate: "" }, semRetorno: false };
  if (retorno === "sem") return { periodo: periodoTodos, semRetorno: true };
  const hoje = hojeIso();
  if (retorno === "atrasado") {
    return { periodo: { preset: "personalizado", de: "", ate: deslocarIso(hoje, -1) }, semRetorno: false };
  }
  if (retorno === "semana") {
    return {
      periodo: { preset: "personalizado", de: deslocarIso(hoje, 1), ate: deslocarIso(hoje, 7) },
      semRetorno: false,
    };
  }
  return null;
}

const PAGE_SIZE_AGRUPADO = 10_000;

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} - ${item.bloco}`;
  return item.identificacao;
}

export function FilaCobrancasPanel({ topoAcoes, className }: { topoAcoes?: ReactNode; className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");
  const podeImportar = pode("importacoes", "criar");
  const importacaoWizardRef = useRef<ImportacaoWizardHandle>(null);
  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<FilaCobrancaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<FilaCobrancaResumo>({ emCobranca: 0, semResponsavel: 0, retornosHoje: 0 });

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedSituacao, setAppliedSituacao] = useState("todos");
  const [appliedFiltroRe, setAppliedFiltroRe] = useState("todos");
  const [appliedPeriodo, setAppliedPeriodo] = useState<PeriodValue>(periodoTodos);
  const [appliedSemRetorno, setAppliedSemRetorno] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [search, setSearch] = useState("");
  const [condominioId, setCondominioId] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [filtroRe, setFiltroRe] = useState("todos");
  const [periodo, setPeriodo] = useState<PeriodValue>(periodoTodos);
  const [semRetorno, setSemRetorno] = useState(false);

  const [sortKey, setSortKey] = useState<FilaOrdenacaoCampo | null>(null);
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("asc");

  const [historicoUnidadeId, setHistoricoUnidadeId] = useState<number | null>(null);
  const [historicoRotulo, setHistoricoRotulo] = useState<{ unidade: string; condominio: string } | null>(null);
  const [propostaContexto, setPropostaContexto] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);
  const [juridicoContexto, setJuridicoContexto] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);
  const [concluirAtendimentoId, setConcluirAtendimentoId] = useState<string | null>(null);
  const [destaqueUnidadeId, setDestaqueUnidadeId] = useState<number | null>(null);

  const atendentesKey = snapshotAtendentesComRe(cadastros);
  const atendentes = useMemo(() => listarAtendentesComRe(cadastros), [atendentesKey, cadastros]);
  const condominiosEscopo = useMemo(
    () =>
      escopoCondominios(cadastros, user?.userId)
        .filter((item) => item.status === "Ativo")
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [cadastros, user?.userId],
  );
  const situacoesFila = useMemo(
    () =>
      situacoesUnidade.filter(
        (item) => item !== "Sem cobrança" && item !== "Quitada" && item !== SITUACAO_COBRANCA_PRESCRITA,
      ),
    [],
  );
  const filtrosExtrasAtivos =
    appliedSearch.trim() !== "" ||
    appliedCondominioId !== "todos" ||
    appliedSituacao !== "todos" ||
    appliedFiltroRe !== "todos";

  const aplicarQueryInicial = useCallback(() => {
    const retornoQuery = searchParams?.get("retorno");
    const periodoQuery = periodoDaQuery(retornoQuery);
    if (periodoQuery) {
      setAppliedPeriodo(periodoQuery.periodo);
      setAppliedSemRetorno(periodoQuery.semRetorno);
    }
    const abaLegada = searchParams?.get("aba");
    if (abaLegada === "retornos") {
      setAppliedPeriodo({ preset: "hoje", de: "", ate: "" });
      setAppliedSemRetorno(false);
    }
    const unidadeQuery = searchParams?.get("unidade");
    const unidadeNum = Number(unidadeQuery);
    if (Number.isFinite(unidadeNum) && unidadeNum > 0) {
      setDestaqueUnidadeId(unidadeNum);
    }
    const atendimentoQuery = searchParams?.get("atendimento")?.trim();
    if (atendimentoQuery) {
      const atendimento = cadastros.atendimentos.find((item) => item.id === atendimentoQuery);
      if (atendimento) {
        setDestaqueUnidadeId(Number(atendimento.unidadeId));
      }
    }
  }, [cadastros.atendimentos, searchParams]);

  useEffect(() => {
    aplicarQueryInicial();
  }, [aplicarQueryInicial]);

  useEffect(() => {
    if (!destaqueUnidadeId || carregando) return;
    const idDestaque = destaqueUnidadeId;
    const alvo = document.getElementById(`fila-unidade-${idDestaque}`);
    alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
    setDestaqueUnidadeId(null);
  }, [carregando, destaqueUnidadeId, itens]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", String(PAGE_SIZE_AGRUPADO));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (visaoGeral && appliedFiltroRe === "sem") {
        params.set("semResponsavel", "1");
      } else if (visaoGeral && appliedFiltroRe !== "todos") {
        const atendente = atendentes.find((item) => item.codigoRe === appliedFiltroRe);
        if (atendente) params.set("atendente", String(atendente.id));
      }
      if (sortKey) {
        params.set("sort", sortKey);
        params.set("order", sortDirection);
      }

      const filaRes = await fetch(`/api/fila?${params}`, { credentials: "same-origin" });
      const payload = (await filaRes.json()) as {
        error?: string;
        itens?: FilaCobrancaItem[];
        total?: number;
        resumo?: FilaCobrancaResumo;
      };
      if (!filaRes.ok) throw new Error(payload.error ?? "Falha ao carregar a fila.");
      setItens(payload.itens ?? []);
      setTotal(payload.total ?? 0);
      setResumo(payload.resumo ?? { emCobranca: 0, semResponsavel: 0, retornosHoje: 0 });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar dados.");
      setItens([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [
    appliedCondominioId,
    appliedFiltroRe,
    appliedSearch,
    appliedSituacao,
    atendentesKey,
    atribuicoesKey,
    sortDirection,
    sortKey,
    visaoGeral,
  ]);

  function directionFor(key: FilaOrdenacaoCampo): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function alternarOrdenacao(key: FilaOrdenacaoCampo) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey(null);
    setSortDirection("asc");
  }

  useEffect(() => {
    void recarregar();
  }, [recarregar, user?.userId]);

  function abrirFiltros() {
    setSearch(appliedSearch);
    setCondominioId(appliedCondominioId);
    setSituacao(appliedSituacao);
    setFiltroRe(appliedFiltroRe);
    setPeriodo(appliedPeriodo);
    setSemRetorno(appliedSemRetorno);
    setFiltrosAbertos(true);
  }

  function aplicarFiltros() {
    setAppliedSearch(search);
    setAppliedCondominioId(condominioId);
    setAppliedSituacao(situacao);
    setAppliedFiltroRe(filtroRe);
    setAppliedPeriodo(periodo);
    setAppliedSemRetorno(semRetorno);
    setFiltrosAbertos(false);
  }

  function limparFiltros() {
    setSearch("");
    setCondominioId("todos");
    setSituacao("todos");
    setFiltroRe("todos");
    setPeriodo(periodoTodos);
    setSemRetorno(false);
    setAppliedSearch("");
    setAppliedCondominioId("todos");
    setAppliedSituacao("todos");
    setAppliedFiltroRe("todos");
    setAppliedPeriodo(periodoTodos);
    setAppliedSemRetorno(false);
    setFiltrosAbertos(false);
  }

  function escolherPeriodo(proximo: PeriodValue) {
    setAppliedPeriodo(proximo);
    setAppliedSemRetorno(false);
    setPeriodo(proximo);
    setSemRetorno(false);
  }

  function registrarAtendimento(unidadeId: number, canal?: "WhatsApp" | "E-mail" | "Telefone") {
    const params = new URLSearchParams({ novo: "1", unidade: String(unidadeId) });
    if (canal) params.set("canal", canal);
    router.push(`/atendimentos?${params.toString()}`);
  }

  function abrirProposta(item: FilaCobrancaItem) {
    setPropostaContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId),
    });
  }

  function abrirJuridico(item: FilaCobrancaItem) {
    setJuridicoContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: rotuloUnidade(item),
      condominio: nomeCondominio(item.condominioId),
    });
  }

  function acoesLinha(item: FilaCobrancaItem) {
    const lista: Array<{
      label: string;
      icon: typeof Handshake;
      onSelect: () => void;
      destructive?: boolean;
    }> = [];
    if (pode("atendimentos", "criar")) {
      lista.push({ label: "Proposta", icon: Handshake, onSelect: () => abrirProposta(item) });
    }
    if (pode("juridico", "ler")) {
      lista.push({ label: "Jurídico", icon: Scale, onSelect: () => abrirJuridico(item) });
    }
    if (
      pode("atendimentos", "editar") &&
      item.proximoRetornoAtendimentoId &&
      item.retornoSituacao !== "concluido"
    ) {
      lista.push({
        label: "Concluir retorno",
        icon: Check,
        onSelect: () => setConcluirAtendimentoId(item.proximoRetornoAtendimentoId),
      });
    }
    return lista;
  }

  async function confirmarConcluirRetorno() {
    if (!concluirAtendimentoId) return;
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(concluirAtendimentoId)}/concluir-retorno`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; atendimento?: { id: string } };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir o retorno.");
      if (payload.atendimento) {
        void refetch()
      }
      toast({ variant: "success", title: "Retorno concluído" });
      setConcluirAtendimentoId(null);
      void recarregar();
    } catch (error) {
      toast({
        variant: "error",
        title: "Falha ao concluir retorno",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (erro) {
    return (
      <EmptyState
        title="Não foi possível carregar"
        description={erro}
        action={
          <Button type="button" onClick={() => void recarregar()}>
            Tentar de novo
          </Button>
        }
      />
    );
  }

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${className ?? ""}`}>
      <AtendimentoOperacaoView
        carregando={carregando}
        itens={itens}
        destaqueUnidadeId={destaqueUnidadeId}
        headerActions={topoAcoes}
        periodo={appliedPeriodo}
        onPeriodoChange={escolherPeriodo}
        semRetorno={appliedSemRetorno}
        onAbrirFiltros={abrirFiltros}
        filtrosExtrasAtivos={filtrosExtrasAtivos}
        onLimparFiltros={limparFiltros}
        acoesLinha={acoesLinha}
        onSalvoAtendimento={() => void recarregar()}
        onRegistrarCompleto={registrarAtendimento}
      />

      <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <SheetContent aria-labelledby="fila-filtros-title" aria-describedby="fila-filtros-desc">
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon>
                <Icon icon={SlidersHorizontal} size="md" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id="fila-filtros-title">Filtros</SheetTitle>
                <SheetDescription id="fila-filtros-desc">
                  Período do retorno, condomínio, situação e responsável.
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>
          <SheetBody>
            <FilterBar
              searchId="fila-filtro-busca"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Condomínio, unidade ou RE"
              desktopCols={2}
              onApply={aplicarFiltros}
              onClear={limparFiltros}
              fields={[
                {
                  id: "fila-filtro-retorno",
                  label: "Período do retorno",
                  type: "period",
                  value: periodo,
                  onChange: (value) => {
                    setPeriodo(value);
                    setSemRetorno(false);
                  },
                },
                {
                  id: "fila-filtro-condominio",
                  label: "Condomínio",
                  value: condominioId,
                  onChange: setCondominioId,
                  options: [
                    { value: "todos", label: "Todos" },
                    ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome })),
                  ],
                },
                {
                  id: "fila-filtro-situacao",
                  label: "Situação",
                  value: situacao,
                  onChange: setSituacao,
                  options: [
                    { value: "todos", label: "Todas" },
                    ...situacoesFila.map((item) => ({ value: item, label: item })),
                  ],
                },
                ...(visaoGeral
                  ? [
                      {
                        id: "fila-filtro-re",
                        label: "RE responsável",
                        value: filtroRe,
                        onChange: setFiltroRe,
                        options: [
                          { value: "todos", label: "Todos" },
                          { value: "sem", label: "Sem responsável" },
                          ...atendentes.map((item) => ({ value: item.codigoRe, label: item.codigoRe })),
                        ],
                      },
                    ]
                  : []),
              ]}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <HistoricoUnidadeSheet
        unidadeId={historicoUnidadeId}
        tituloUnidade={historicoRotulo?.unidade}
        tituloCondominio={historicoRotulo?.condominio}
        onClose={() => {
          setHistoricoUnidadeId(null);
          setHistoricoRotulo(null);
        }}
      />
      <PropostaNegociacaoSheet
        unidadeId={propostaContexto?.unidadeId ?? null}
        condominioId={propostaContexto?.condominioId ?? null}
        tituloUnidade={propostaContexto?.unidade}
        tituloCondominio={propostaContexto?.condominio}
        onClose={() => setPropostaContexto(null)}
      />
      <EncaminhamentoJuridicoSheet
        unidadeId={juridicoContexto?.unidadeId ?? null}
        condominioId={juridicoContexto?.condominioId ?? null}
        tituloUnidade={juridicoContexto?.unidade}
        tituloCondominio={juridicoContexto?.condominio}
        onClose={() => setJuridicoContexto(null)}
      />

      <ConfirmDialog
        open={concluirAtendimentoId !== null}
        onOpenChange={(open) => {
          if (!open) setConcluirAtendimentoId(null);
        }}
        title="Concluir retorno agendado?"
        description="O retorno será marcado como realizado. A data prevista permanece no histórico."
        confirmLabel="Concluir"
        cancelLabel="Cancelar"
        onConfirm={() => void confirmarConcluirRetorno()}
      />

      {podeImportar ? (
        <ImportacaoWizardSheet
          ref={importacaoWizardRef}
          moduloInicial="debitos"
          moduloTravado
          onConcluida={() => void recarregar()}
        />
      ) : null}
    </div>
  );
}