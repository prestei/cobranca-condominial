"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ClipboardList } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  ResponsiveTable,
  Table,
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
  TableExport,
  TableImport,
  type TableExportFormat,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { escopoCondominios, formatarData, type Atendimento } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { aplicarAtendimentoSalvo } from "@/lib/atendimentos/sync-cliente";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import {
  colunasRetornosExport,
  exportarListagem,
  linhasRetornosExport,
} from "@/lib/atendimentos/exportar-listagem";
import type { RetornoAgendaItem } from "@/lib/retornos/service";

const situacaoOpcoes = [
  { value: "todos", label: "Todas as situações" },
  { value: "atrasado", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "agendado", label: "Agendados (depois)" },
] as const;

const estadoOpcoes = [
  { value: "pendente", label: "Pendentes" },
  { value: "concluido", label: "Realizados" },
  { value: "todos", label: "Todos" },
] as const;

const badgeSituacao: Record<string, "error" | "secondary" | "primary" | "success"> = {
  atrasado: "error",
  hoje: "secondary",
  semana: "primary",
  agendado: "secondary",
  concluido: "success",
};

const rotuloSituacao: Record<string, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Esta semana",
  agendado: "Agendado",
  concluido: "Realizado",
};

type ResumoAgenda = {
  atrasados: number;
  hoje: number;
  proximos: number;
  concluidos: number;
};

export function RetornosAgendaPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");
  const podeImportar = pode("importacoes", "criar");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<RetornoAgendaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<ResumoAgenda>({ atrasados: 0, hoje: 0, proximos: 0, concluidos: 0 });
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("pendente");
  const [situacao, setSituacao] = useState("todos");
  const [condominioId, setCondominioId] = useState("todos");
  const [filtroRe, setFiltroRe] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedEstado, setAppliedEstado] = useState("pendente");
  const [appliedSituacao, setAppliedSituacao] = useState("todos");
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedFiltroRe, setAppliedFiltroRe] = useState("todos");
  const [appliedDe, setAppliedDe] = useState("");
  const [appliedAte, setAppliedAte] = useState("");

  const [concluirAlvo, setConcluirAlvo] = useState<RetornoAgendaItem | null>(null);
  const [concluindo, setConcluindo] = useState(false);

  const atendentesKey = snapshotAtendentesComRe();
  const atendentes = useMemo(() => listarAtendentesComRe(), [atendentesKey]);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, user?.userId).filter((item) => item.status === "Ativo"),
    [cadastros, user?.userId],
  );

  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedEstado !== "pendente") params.set("estado", appliedEstado);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (visaoGeral && appliedFiltroRe !== "todos") params.set("codigoRe", appliedFiltroRe);
      if (appliedDe) params.set("de", appliedDe);
      if (appliedAte) params.set("ate", appliedAte);

      const response = await fetch(`/api/retornos?${params.toString()}`, { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        itens?: RetornoAgendaItem[];
        total?: number;
        resumo?: ResumoAgenda;
      };
      if (!response.ok) {
        setErro(payload.error ?? "Não foi possível carregar os retornos.");
        setItens([]);
        setTotal(0);
        return;
      }
      setItens(payload.itens ?? []);
      setTotal(payload.total ?? 0);
      if (payload.resumo) setResumo(payload.resumo);
    } catch {
      setErro("Falha de comunicação ao carregar a agenda.");
      setItens([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [
    appliedAte,
    appliedCondominioId,
    appliedDe,
    appliedEstado,
    appliedFiltroRe,
    appliedSearch,
    appliedSituacao,
    page,
    visaoGeral,
  ]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, atribuicoesKey]);

  function aplicarFiltros() {
    setAppliedSearch(search);
    setAppliedEstado(estado);
    setAppliedSituacao(situacao);
    setAppliedCondominioId(condominioId);
    setAppliedFiltroRe(filtroRe);
    setAppliedDe(de);
    setAppliedAte(ate);
    setPage(1);
  }

  function montarParamsRetornos(pageSize: number) {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
    if (appliedEstado !== "pendente") params.set("estado", appliedEstado);
    if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
    if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
    if (visaoGeral && appliedFiltroRe !== "todos") params.set("codigoRe", appliedFiltroRe);
    if (appliedDe) params.set("de", appliedDe);
    if (appliedAte) params.set("ate", appliedAte);
    return params;
  }

  async function aoExportar(formato: TableExportFormat) {
    try {
      const response = await fetch(`/api/retornos?${montarParamsRetornos(10_000)}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; itens?: RetornoAgendaItem[]; total?: number };
      if (!response.ok) {
        toast({ variant: "error", title: "Exportação falhou", description: payload.error });
        return;
      }
      const linhas = linhasRetornosExport(payload.itens ?? [], formatarData, rotuloSituacao);
      const base = `retornos-${new Date().toISOString().slice(0, 10)}`;
      exportarListagem(toast, formato, "Agenda de retornos", base, colunasRetornosExport, linhas);
      if ((payload.total ?? 0) > linhas.length) {
        toast({
          variant: "info",
          title: "Exportação parcial",
          description: `Foram exportadas ${linhas.length} de ${payload.total} linhas.`,
        });
      }
    } catch {
      toast({ variant: "error", title: "Erro ao exportar", description: "Tente novamente." });
    }
  }

  function abrirImportacao() {
    router.push("/importacoes");
  }

  function limparFiltros() {
    setSearch("");
    setEstado("pendente");
    setSituacao("todos");
    setCondominioId("todos");
    setFiltroRe("todos");
    setDe("");
    setAte("");
    setAppliedSearch("");
    setAppliedEstado("pendente");
    setAppliedSituacao("todos");
    setAppliedCondominioId("todos");
    setAppliedFiltroRe("todos");
    setAppliedDe("");
    setAppliedAte("");
    setPage(1);
  }

  async function confirmarConclusao() {
    if (!concluirAlvo) return;
    setConcluindo(true);
    try {
      const response = await fetch(`/api/atendimentos/${concluirAlvo.atendimentoId}/concluir-retorno`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; atendimento?: Atendimento };
      if (!response.ok) {
        toast({ title: "Não foi possível concluir", description: payload.error ?? "Tente novamente.", variant: "error" });
        return;
      }
      if (payload.atendimento) aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
      toast({ title: "Retorno marcado como realizado", variant: "success" });
      setConcluirAlvo(null);
      await recarregar();
    } catch {
      toast({ title: "Erro de comunicação", description: "Verifique a conexão e tente de novo.", variant: "error" });
    } finally {
      setConcluindo(false);
    }
  }

  function registrarProximoPasso(unidadeId: number) {
    router.push(`/atendimentos?aba=fila&novo=1&unidade=${unidadeId}`);
  }

  function renderAcoes(item: RetornoAgendaItem) {
    const podeConcluir = pode("atendimentos", "editar") && item.situacaoAgenda !== "concluido";
    const podeRegistrar = pode("atendimentos", "criar");
    if (!podeConcluir && !podeRegistrar) return "—";
    return (
      <span className="inline-flex flex-wrap gap-xs">
        {podeConcluir ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConcluirAlvo(item)}>
            <Icon icon={Check} size="sm" />
            Realizado
          </Button>
        ) : null}
        {podeRegistrar ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => registrarProximoPasso(item.unidadeId)}>
            <Icon icon={ClipboardList} size="sm" />
            Nova tentativa
          </Button>
        ) : null}
      </span>
    );
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
    <div className="flex flex-col gap-lg">
      <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
        <CardMetric
          iconClassName="bg-error-subtle text-error"
          icon={<Icon icon={CalendarClock} size="md" className="text-error" />}
        >
          <p className="text-metric text-on-surface tabular-nums">{String(resumo.atrasados).padStart(2, "0")}</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">atrasados</p>
        </CardMetric>
        <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}>
          <p className="text-metric text-on-surface tabular-nums">{String(resumo.hoje).padStart(2, "0")}</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">para hoje</p>
        </CardMetric>
        <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={CalendarClock} size="md" />}>
          <p className="text-metric text-on-surface tabular-nums">{String(resumo.proximos).padStart(2, "0")}</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">próximos</p>
        </CardMetric>
        <CardMetric iconClassName="bg-success-subtle text-success" icon={<Icon icon={Check} size="md" className="text-success" />}>
          <p className="text-metric text-on-surface tabular-nums">{String(resumo.concluidos).padStart(2, "0")}</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">realizados</p>
        </CardMetric>
      </div>

      {resumo.atrasados > 0 && appliedEstado !== "concluido" ? (
        <Alert variant="error" title="Retornos atrasados">
          Há {resumo.atrasados} retorno{resumo.atrasados === 1 ? "" : "s"} com data prevista no passado. Priorize o contato ou marque como realizado após executar.
        </Alert>
      ) : null}

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar condomínio, unidade ou ação..."
        onApply={aplicarFiltros}
        onClear={limparFiltros}
        fields={[
          {
            id: "estado",
            label: "Estado",
            value: estado,
            onChange: setEstado,
            options: estadoOpcoes.map((item) => ({ value: item.value, label: item.label })),
          },
          {
            id: "situacao",
            label: "Situação",
            value: situacao,
            onChange: setSituacao,
            options: situacaoOpcoes.map((item) => ({ value: item.value, label: item.label })),
          },
          {
            id: "condominio",
            label: "Condomínio",
            value: condominioId,
            onChange: setCondominioId,
            options: [
              { value: "todos", label: "Todos" },
              ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome })),
            ],
          },
          ...(visaoGeral
            ? [
                {
                  id: "re",
                  label: "RE responsável",
                  value: filtroRe,
                  onChange: setFiltroRe,
                  options: [
                    { value: "todos", label: "Todos" },
                    ...atendentes.map((item) => ({ value: item.codigoRe, label: item.codigoRe })),
                  ],
                },
              ]
            : []),
          { id: "de", label: "Período — de", value: de, onChange: setDe, type: "date" as const },
          { id: "ate", label: "Período — até", value: ate, onChange: setAte, type: "date" as const },
        ]}
      />

      {carregando ? (
        <p className="text-body-md text-on-surface-variant">Carregando agenda de retornos…</p>
      ) : total === 0 ? (
        <>
          <div className="flex flex-wrap justify-end gap-sm">
            {podeImportar ? <TableImport onImport={abrirImportacao} /> : null}
            <TableExport onExport={(formato) => void aoExportar(formato)} />
          </div>
          <EmptyState
            icon={<Icon icon={CalendarClock} size="lg" className="text-on-surface-variant" />}
            title="Nenhum retorno encontrado"
            description={
              appliedEstado === "concluido"
                ? "Não há retornos realizados com os filtros aplicados."
                : "Não há retornos pendentes com os filtros aplicados. Registre uma nova tentativa com data de retorno na palitagem."
            }
          />
        </>
      ) : (
        <>
          <ResponsiveTable
            onExport={(formato) => void aoExportar(formato)}
            onImport={abrirImportacao}
            showImport={podeImportar}
            desktop={
              <Table aria-label="Agenda de retornos" showExport={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Previsto</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>RE</TableHead>
                    <TableHead>Origem do atendimento</TableHead>
                    <TableHead>Próxima ação / observação</TableHead>
                    <TableHead>Conclusão</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.atendimentoId}>
                      <TableCell>{formatarData(item.dataPrevista)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeSituacao[item.situacaoAgenda] ?? "secondary"}>
                          {rotuloSituacao[item.situacaoAgenda] ?? item.situacaoAgenda}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.condominioNome}</TableCell>
                      <TableCell>{item.unidadeLabel}</TableCell>
                      <TableCell>{item.codigoRe ?? "—"}</TableCell>
                      <TableCell>
                        <span className="block">{formatarData(item.dataHoraAtendimento)}</span>
                        <span className="text-body-sm text-on-surface-variant">{item.atendimentoAutorNome}</span>
                      </TableCell>
                      <TableCell>
                        <span className="block">{item.proximaAcao || "—"}</span>
                        {item.observacao ? (
                          <span className="text-body-sm text-on-surface-variant line-clamp-2">{item.observacao}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {item.retornoConcluidoEm ? (
                          <span className="inline-flex flex-col gap-xs">
                            <span>{formatarData(item.retornoConcluidoEm)}</span>
                            <span className="text-body-sm text-on-surface-variant">{item.retornoConcluidoPorNome}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{renderAcoes(item)}</TableCell>
                    </TableRow>
                  ))}
                  {itens.length === 0 ? <TableEmpty colSpan={9}>Nenhum item nesta página.</TableEmpty> : null}
                </TableBody>
              </Table>
            }
            mobile={
              <TableMobileList aria-label="Agenda de retornos">
                {itens.map((item) => (
                  <TableMobileCard key={item.atendimentoId}>
                    <TableMobileCardHeader>
                      <TableMobileTitle>
                        {item.condominioNome} · {item.unidadeLabel}
                      </TableMobileTitle>
                      <Badge variant={badgeSituacao[item.situacaoAgenda] ?? "secondary"}>
                        {rotuloSituacao[item.situacaoAgenda]}
                      </Badge>
                    </TableMobileCardHeader>
                    <TableMobileFields>
                      <TableMobileField label="Previsto">{formatarData(item.dataPrevista)}</TableMobileField>
                      <TableMobileField label="RE">{item.codigoRe ?? "—"}</TableMobileField>
                      <TableMobileField label="Atendimento origem">
                        {formatarData(item.dataHoraAtendimento)} · {item.atendimentoAutorNome}
                      </TableMobileField>
                      <TableMobileField label="Ação">{item.proximaAcao || "—"}</TableMobileField>
                      {item.retornoConcluidoEm ? (
                        <TableMobileField label="Realizado em">
                          {formatarData(item.retornoConcluidoEm)} · {item.retornoConcluidoPorNome}
                        </TableMobileField>
                      ) : null}
                    </TableMobileFields>
                    <div className="mt-sm flex flex-col gap-xs">{renderAcoes(item)}</div>
                  </TableMobileCard>
                ))}
                {itens.length === 0 ? <TableMobileEmpty>Nenhum item nesta página.</TableMobileEmpty> : null}
              </TableMobileList>
            }
          />
          <Pagination page={page} total={total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={concluirAlvo !== null}
        onOpenChange={(open) => {
          if (!open) setConcluirAlvo(null);
        }}
        title="Marcar retorno como realizado?"
        description={
          concluirAlvo
            ? `Confirma que o retorno previsto para ${formatarData(concluirAlvo.dataPrevista)} em ${concluirAlvo.unidadeLabel} foi executado? A data agendada e o atendimento original permanecem no histórico.`
            : ""
        }
        confirmLabel={concluindo ? "Salvando…" : "Marcar como realizado"}
        onConfirm={() => {
          if (!concluindo) void confirmarConclusao();
        }}
      />
    </div>
  );
}
