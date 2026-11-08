"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, CalendarDays, Check, LayoutList, ClipboardList } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { SkeletonCalendar, SkeletonTable } from "@/components/skeleton";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { RetornoDetalheSheet } from "@/components/atendimentos/retorno-detalhe-sheet";
import { RetornosCalendarioMes } from "@/components/atendimentos/retornos-calendario-mes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
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
} from "@/components/table";
import { escopoCondominios, formatarData } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { RetornoAgendaItem } from "@/lib/retornos/service";

type ResumoAgenda = {
  atrasados: number;
  hoje: number;
  proximos: number;
  futuros: number;
  concluidos: number;
};

const situacaoOpcoes = [
  { value: "todos", label: "Todas as situações" },
  { value: "atrasado", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "agendado", label: "Compromissos futuros" },
] as const;

const estadoOpcoes = [
  { value: "pendente", label: "Pendentes" },
  { value: "concluido", label: "Realizados" },
  { value: "cancelado", label: "Cancelados" },
  { value: "todos", label: "Todos" },
] as const;

const badgeSituacao: Record<string, "error" | "secondary" | "primary" | "success"> = {
  atrasado: "error",
  hoje: "secondary",
  semana: "primary",
  agendado: "secondary",
  concluido: "success",
  cancelado: "secondary",
};

const rotuloSituacao: Record<string, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos dias",
  agendado: "Futuro",
  concluido: "Realizado",
  cancelado: "Cancelado",
};

export function MinhaAgendaPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");

  const [visualizacao, setVisualizacao] = useState<"lista" | "calendario">("lista");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<RetornoAgendaItem[]>([]);
  const [itensCalendario, setItensCalendario] = useState<RetornoAgendaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<ResumoAgenda>({ atrasados: 0, hoje: 0, proximos: 0, futuros: 0, concluidos: 0 });
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<RetornoAgendaItem | null>(null);

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

  const atendentesKey = snapshotAtendentesComRe();
  const atendentes = useMemo(() => listarAtendentesComRe(), [atendentesKey]);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, user?.userId).filter((item) => item.status === "Ativo"),
    [cadastros, user?.userId],
  );

  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const montarParams = useCallback(
    (pageSize: number, pageNum: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("pageSize", String(pageSize));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedEstado !== "pendente") params.set("estado", appliedEstado);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (visaoGeral && appliedFiltroRe !== "todos") params.set("codigoRe", appliedFiltroRe);
      if (appliedDe) params.set("de", appliedDe);
      if (appliedAte) params.set("ate", appliedAte);
      return params;
    },
    [
      appliedAte,
      appliedCondominioId,
      appliedDe,
      appliedEstado,
      appliedFiltroRe,
      appliedSearch,
      appliedSituacao,
      visaoGeral,
    ],
  );

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [resLista, resCalendario] = await Promise.all([
        fetch(`/api/retornos?${montarParams(PAGE_SIZE, page)}`, { credentials: "same-origin" }),
        fetch(`/api/retornos?${montarParams(5000, 1)}`, { credentials: "same-origin" }),
      ]);
      const payloadLista = (await resLista.json()) as {
        error?: string;
        itens?: RetornoAgendaItem[];
        total?: number;
        resumo?: ResumoAgenda;
      };
      const payloadCalendario = (await resCalendario.json()) as { itens?: RetornoAgendaItem[] };
      if (!resLista.ok) {
        setErro(payloadLista.error ?? "Não foi possível carregar os retornos.");
        setItens([]);
        setItensCalendario([]);
        setTotal(0);
        return;
      }
      setItens(payloadLista.itens ?? []);
      setTotal(payloadLista.total ?? 0);
      setItensCalendario(payloadCalendario.itens ?? []);
      if (payloadLista.resumo) {
        setResumo(payloadLista.resumo);
      }
    } catch {
      setErro("Falha de comunicação ao carregar a agenda.");
      setItens([]);
      setItensCalendario([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [montarParams, page]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, atribuicoesKey]);

  useEffect(() => {
    const atendimentoId = searchParams?.get("atendimento");
    if (atendimentoId && itens.length > 0) {
      const alvo = itens.find((item) => item.atendimentoId === atendimentoId);
      if (alvo) setDetalhe(alvo);
    }
  }, [searchParams, itens]);

  useEffect(() => {
    const secao = searchParams?.get("secao");
    if (!secao) return;
    if (secao === "concluidos") {
      setEstado("concluido");
      setAppliedEstado("concluido");
      setSituacao("todos");
      setAppliedSituacao("todos");
    } else if (secao === "futuros") {
      setEstado("pendente");
      setAppliedEstado("pendente");
      setSituacao("agendado");
      setAppliedSituacao("agendado");
    } else if (["atrasado", "hoje", "semana"].includes(secao)) {
      setEstado("pendente");
      setAppliedEstado("pendente");
      setSituacao(secao);
      setAppliedSituacao(secao);
    }
    setPage(1);
  }, [searchParams]);

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
    router.replace("/minha-agenda");
  }

  function atalhoSecao(secao: string) {
    const params = new URLSearchParams();
    params.set("secao", secao);
    router.replace(`/minha-agenda?${params.toString()}`);
  }

  function registrarProximoPasso(unidadeId: number) {
    setDetalhe(null);
    router.push(`/atendimentos?novo=1&unidade=${unidadeId}`);
  }

  function abrirDetalhe(item: RetornoAgendaItem) {
    setDetalhe(item);
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
      <div className="grid grid-cols-2 gap-md min-[768px]:grid-cols-4 min-[1100px]:grid-cols-5">
        <CardMetric
          iconClassName="bg-error-subtle text-error"
          icon={<Icon icon={CalendarClock} size="md" className="text-error" />}
          valor={String(resumo.atrasados).padStart(2, "0")}
          rotulo="Atrasados"
          onClick={() => atalhoSecao("atrasado")}
        />
        <CardMetric
          iconClassName="bg-gold-subtle text-brass"
          icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}
          valor={String(resumo.hoje).padStart(2, "0")}
          rotulo="Hoje"
          onClick={() => atalhoSecao("hoje")}
        />
        <CardMetric
          iconClassName="bg-surface-subtle text-on-surface-variant"
          icon={<Icon icon={CalendarDays} size="md" />}
          valor={String(resumo.proximos).padStart(2, "0")}
          rotulo="Próximos dias"
          onClick={() => atalhoSecao("semana")}
        />
        <CardMetric
          iconClassName="bg-surface-subtle text-on-surface-variant"
          icon={<Icon icon={CalendarDays} size="md" />}
          valor={String(resumo.futuros).padStart(2, "0")}
          rotulo="Compromissos futuros"
          onClick={() => atalhoSecao("futuros")}
        />
        <CardMetric
          iconClassName="bg-success-subtle text-success"
          icon={<Icon icon={Check} size="md" className="text-success" />}
          valor={String(resumo.concluidos).padStart(2, "0")}
          rotulo="Realizados"
          onClick={() => atalhoSecao("concluidos")}
        />
      </div>

      {resumo.atrasados > 0 && appliedEstado === "pendente" ? (
        <Alert variant="error" title="Retornos atrasados">
          Há {resumo.atrasados} retorno{resumo.atrasados === 1 ? "" : "s"} com data prevista no passado. Priorize o contato ou atualize o compromisso.
        </Alert>
      ) : null}

      <Tabs
        defaultValue="lista"
        value={visualizacao}
        onValueChange={(valor) => setVisualizacao(valor === "calendario" ? "calendario" : "lista")}
      >
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <TabsList>
            <TabsTrigger value="lista">
              <Icon icon={LayoutList} size="sm" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <Icon icon={CalendarDays} size="sm" />
              Calendário
            </TabsTrigger>
          </TabsList>
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar condomínio, unidade, RE ou descrição..."
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

        <TabsContent value="lista" className="mt-md">
          {carregando ? (
            <SkeletonTable rows={8} cols={7} label="Carregando compromissos" />
          ) : total === 0 ? (
            <EmptyState
              icon={<Icon icon={CalendarClock} size="lg" className="text-on-surface-variant" />}
              title="Nenhum retorno encontrado"
              description="Ajuste os filtros ou registre uma nova tentativa com data de retorno na palitagem."
              action={
                pode("atendimentos", "criar") ? (
                  <Button type="button" onClick={() => router.push("/atendimentos?novo=1")}>
                    <Icon icon={ClipboardList} size="sm" />
                    Registrar contato
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ResponsiveTable
                desktop={
                  <Table aria-label="Minha agenda de retornos" showExport={false}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Previsto</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>RE</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item) => (
                        <TableRow
                          key={item.atendimentoId}
                          className="cursor-pointer hover:bg-surface-subtle/60"
                          onClick={() => abrirDetalhe(item)}
                        >
                          <TableCell>{formatarProximoRetorno(item.dataPrevista)}</TableCell>
                          <TableCell>
                            <Badge variant={badgeSituacao[item.situacaoAgenda] ?? "secondary"}>
                              {rotuloSituacao[item.situacaoAgenda] ?? item.situacaoAgenda}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.condominioNome}</TableCell>
                          <TableCell>{item.unidadeLabel}</TableCell>
                          <TableCell>{item.codigoRe ?? "—"}</TableCell>
                          <TableCell>
                            <span className="block">{item.proximaAcao || "—"}</span>
                            {item.observacao ? (
                              <span className="text-body-sm text-on-surface-variant line-clamp-1">{item.observacao}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-body-sm text-on-surface-variant">
                            {formatarData(item.dataHoraAtendimento)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {itens.length === 0 ? <TableEmpty colSpan={7}>Nenhum item nesta página.</TableEmpty> : null}
                    </TableBody>
                  </Table>
                }
                mobile={
                  <TableMobileList aria-label="Minha agenda de retornos">
                    {itens.map((item) => (
                      <TableMobileCard key={item.atendimentoId} className="cursor-pointer" onClick={() => abrirDetalhe(item)}>
                        <TableMobileCardHeader>
                          <TableMobileTitle>
                            {item.condominioNome} · {item.unidadeLabel}
                          </TableMobileTitle>
                          <Badge variant={badgeSituacao[item.situacaoAgenda] ?? "secondary"}>
                            {rotuloSituacao[item.situacaoAgenda]}
                          </Badge>
                        </TableMobileCardHeader>
                        <TableMobileFields>
                          <TableMobileField label="Previsto">{formatarProximoRetorno(item.dataPrevista)}</TableMobileField>
                          <TableMobileField label="RE">{item.codigoRe ?? "—"}</TableMobileField>
                          <TableMobileField label="Descrição">{item.proximaAcao || "—"}</TableMobileField>
                        </TableMobileFields>
                      </TableMobileCard>
                    ))}
                    {itens.length === 0 ? <TableMobileEmpty>Nenhum item nesta página.</TableMobileEmpty> : null}
                  </TableMobileList>
                }
              />
              <Pagination page={page} total={total} onPageChange={setPage} />
            </>
          )}
        </TabsContent>

        <TabsContent value="calendario" className="mt-md">
          {carregando ? (
            <SkeletonCalendar label="Carregando calendário" />
          ) : (
            <RetornosCalendarioMes itens={itensCalendario} onSelecionar={abrirDetalhe} />
          )}
        </TabsContent>
      </Tabs>

      <RetornoDetalheSheet
        item={detalhe}
        onClose={() => setDetalhe(null)}
        onAtualizado={() => void recarregar()}
        onNovaTentativa={registrarProximoPasso}
      />
    </div>
  );
}
