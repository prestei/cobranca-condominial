"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  History,
  Pencil,
  Receipt,
} from "lucide-react";
import { AtendimentoSituacaoRetornoSheet } from "@/components/atendimentos/atendimento-situacao-retorno-sheet";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { FormField, Select } from "@/components/input";
import { Pagination } from "@/components/pagination";
import { SkeletonTable } from "@/components/skeleton";
import { SecaoBloco } from "@/components/dashboard/dashboard-shared";
import {
  Table,
  TableActionsCell,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { HistoricoUnidadeSheet } from "@/components/unidades/historico-unidade-sheet";
import { UnidadeDetalheSheet } from "@/components/unidade-detalhe-sheet";
import { formatarData, getCadastros } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  CATEGORIAS_PENDENCIA,
  ROTULO_TIPO_PENDENCIA,
  type CategoriaPendenciaId,
  type CentralPendenciaRegistro,
  type CentralPendenciasResultado,
  type PendenciaOrdenacao,
  type TipoPendenciaId,
} from "@/lib/dashboard/central-pendencias-atendente";

const TIPOS_FILTRO: { value: string; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  ...(
    Object.entries(ROTULO_TIPO_PENDENCIA) as [TipoPendenciaId, string][]
  ).map(([value, label]) => ({ value, label })),
];

const ORDENACAO_OPCOES: { value: PendenciaOrdenacao; label: string }[] = [
  { value: "prioridade", label: "Prioridade" },
  { value: "data_retorno", label: "Data de retorno" },
  { value: "ultima_movimentacao", label: "Última movimentação" },
];

const PAGE_PENDENCIAS = 10;

type Props = {
  filtrosQuery?: string;
};

export function DashboardCentralPendencias({ filtrosQuery = "" }: Props) {
  const router = useRouter();
  const { pode } = usePermissao();
  const cadastros = useCadastros();
  const syncKey = useMemo(
    () =>
      `${cadastros.atendimentos.length}|${cadastros.atribuicoesCobranca.map((a) => `${a.id}:${a.encerradoEm ?? ""}`).join(",")}`,
    [cadastros.atendimentos.length, cadastros.atribuicoesCobranca],
  );

  const [categoria, setCategoria] = useState<CategoriaPendenciaId | "todas">("todas");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [ordenacao, setOrdenacao] = useState<PendenciaOrdenacao>("prioridade");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<CentralPendenciasResultado | null>(null);

  const [historicoUnidadeId, setHistoricoUnidadeId] = useState<number | null>(null);
  const [historicoRotulo, setHistoricoRotulo] = useState<{ unidade: string; condominio: string } | null>(null);
  const [detalheUnidadeId, setDetalheUnidadeId] = useState<number | null>(null);
  const [edicaoAtendimento, setEdicaoAtendimento] = useState<{
    id: string;
    unidadeLabel: string;
    modo: "situacao" | "retorno";
  } | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("categoria", categoria);
      if (tipoFiltro) params.set("tipo", tipoFiltro);
      params.set("ordenacao", ordenacao);
      params.set("ordem", ordem);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_PENDENCIAS));
      const contexto = filtrosQuery ? `${filtrosQuery}&` : "";
      const response = await fetch(`/api/dashboard/pendencias?${contexto}${params}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; pendencias?: CentralPendenciasResultado };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar as pendências.");
      setDados(payload.pendencias ?? null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar.");
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, [categoria, filtrosQuery, ordem, ordenacao, page, tipoFiltro]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, syncKey]);

  useEffect(() => {
    setPage(1);
  }, [categoria, tipoFiltro, ordenacao, ordem]);

  function abrirHistorico(item: CentralPendenciaRegistro) {
    setHistoricoRotulo({ unidade: item.unidadeLabel, condominio: item.condominioNome });
    setHistoricoUnidadeId(item.unidadeId);
  }

  function acoesLinha(item: CentralPendenciaRegistro) {
    const lista: Array<{ label: string; icon: typeof History; onSelect: () => void }> = [];
    if (pode("atendimentos", "ler")) {
      lista.push({
        label: "Consultar histórico",
        icon: History,
        onSelect: () => abrirHistorico(item),
      });
    }
    if (item.atendimentoId && pode("atendimentos", "ler")) {
      lista.push({
        label: "Abrir atendimento",
        icon: ClipboardList,
        onSelect: () => abrirHistorico(item),
      });
    }
    if (pode("atendimentos", "criar")) {
      lista.push({
        label: "Registrar nova interação",
        icon: ClipboardList,
        onSelect: () => router.push(`/atendimentos?novo=1&unidade=${item.unidadeId}`),
      });
    }
    if (pode("atendimentos", "editar") && item.atendimentoId) {
      lista.push({
        label: "Programar retorno",
        icon: CalendarClock,
        onSelect: () =>
          setEdicaoAtendimento({ id: item.atendimentoId!, unidadeLabel: item.unidadeLabel, modo: "retorno" }),
      });
      lista.push({
        label: "Atualizar situação",
        icon: Pencil,
        onSelect: () =>
          setEdicaoAtendimento({ id: item.atendimentoId!, unidadeLabel: item.unidadeLabel, modo: "situacao" }),
      });
    }
    if (pode("unidades", "ler")) {
      lista.push({
        label: "Consultar informações da unidade",
        icon: DoorOpen,
        onSelect: () => setDetalheUnidadeId(item.unidadeId),
      });
    }
    if (pode("debitos", "ler")) {
      lista.push({
        label: "Histórico de cobranças",
        icon: Receipt,
        onSelect: () => router.push(`/debitos?unidade=${item.unidadeId}`),
      });
    }
    return lista;
  }

  const resumo = dados?.resumo;

  return (
    <>
      <SecaoBloco
        selo="Pendências"
        titulo="Central de pendências e prioridades"
        descricao={
          dados
            ? `Carteira vigente · referência ${formatarData(dados.hoje)} (${dados.fuso}).`
            : "Registros que exigem acompanhamento na sua carteira."
        }
        linkLabel="Abrir fila"
        onLink={() => router.push(filtrosQuery ? `/atendimentos?${filtrosQuery}` : "/atendimentos")}
      >
        <div className="flex flex-col gap-md">
          <div
            className="flex gap-xs overflow-x-auto pb-xs"
            role="tablist"
            aria-label="Categorias de pendência"
          >
            {CATEGORIAS_PENDENCIA.map((cat) => {
              const ativo = categoria === cat.id;
              const contagem =
                cat.id === "todas"
                  ? resumo
                    ? Object.values(resumo).reduce((s, n) => s + n, 0)
                    : null
                  : resumo?.[cat.id as CategoriaPendenciaId];
              return (
                <Button
                  key={cat.id}
                  type="button"
                  size="sm"
                  variant={ativo ? "primary" : "secondary"}
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setCategoria(cat.id)}
                >
                  {cat.rotulo}
                  {contagem !== null && contagem !== undefined ? ` (${contagem})` : ""}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-3">
            <FormField label="Tipo de pendência" htmlFor="pendencias-tipo">
              <Select
                id="pendencias-tipo"
                value={tipoFiltro}
                onChange={(event) => setTipoFiltro(event.target.value)}
              >
                {TIPOS_FILTRO.map((opcao) => (
                  <option key={opcao.value || "todos"} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Ordenar por" htmlFor="pendencias-ordenacao">
              <Select
                id="pendencias-ordenacao"
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value as PendenciaOrdenacao)}
              >
                {ORDENACAO_OPCOES.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Direção" htmlFor="pendencias-ordem">
              <Select
                id="pendencias-ordem"
                value={ordem}
                onChange={(event) => setOrdem(event.target.value as "asc" | "desc")}
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </Select>
            </FormField>
          </div>

          {carregando ? <SkeletonTable rows={6} cols={7} label="Carregando pendências" /> : null}

          {!carregando && erro ? (
            <Alert variant="error" title="Erro ao carregar pendências">
              {erro}
              <div className="mt-md">
                <Button size="sm" variant="secondary" onClick={() => void recarregar()}>
                  Tentar novamente
                </Button>
              </div>
            </Alert>
          ) : null}

          {!carregando && !erro && dados && dados.total === 0 ? (
            <EmptyState
              icon={<Icon icon={ClipboardList} size="lg" />}
              title="Nenhuma pendência"
              description="Não há registros nesta categoria com os filtros atuais do dashboard."
            />
          ) : null}

          {!carregando && !erro && dados && dados.total > 0 ? (
            <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border-subtle">
              <Table aria-label="Central de pendências" className="min-w-[56rem]">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>RE</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Última mov.</TableHead>
                    <TableHead>Próximo retorno</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead actions />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.itens.map((item) => (
                      <TableRow
                        key={`${item.unidadeId}-${item.tipoPendencia}`}
                        className={item.destaqueAtrasado ? "bg-error-container/20" : undefined}
                      >
                        <TableCell className="font-medium tabular-nums">{item.codigoRe ?? "—"}</TableCell>
                        <TableCell>{item.condominioNome}</TableCell>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-xs">
                            {item.destaqueAtrasado ? (
                              <Icon icon={AlertTriangle} size="sm" className="shrink-0 text-status-critical" />
                            ) : null}
                            {item.unidadeLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.tipoPendencia === "atrasadas" ? "error" : "secondary"}>
                            {ROTULO_TIPO_PENDENCIA[item.tipoPendencia]}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.situacaoAtual}</TableCell>
                        <TableCell>
                          {item.dataUltimaMovimentacao
                            ? formatarData(item.dataUltimaMovimentacao.slice(0, 10))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {item.dataProximoRetorno ? formatarData(item.dataProximoRetorno) : "—"}
                        </TableCell>
                        <TableCell>{item.responsavelRe ?? "—"}</TableCell>
                        <TableCell className="text-on-surface-variant">{item.tempoDesdeUltimaMovimentacao}</TableCell>
                        <TableActionsCell
                          label={`Ações — ${item.unidadeLabel}`}
                          actions={acoesLinha(item).map((acao) => ({
                            label: acao.label,
                            icon: acao.icon,
                            onSelect: acao.onSelect,
                          }))}
                        />
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div className="border-t border-border-subtle px-md py-md">
                <Pagination
                  page={dados.page}
                  total={dados.total}
                  pageSize={dados.pageSize}
                  onPageChange={setPage}
                />
              </div>
            </div>
          ) : null}
        </div>
      </SecaoBloco>

      <HistoricoUnidadeSheet
        unidadeId={historicoUnidadeId}
        tituloUnidade={historicoRotulo?.unidade}
        tituloCondominio={historicoRotulo?.condominio}
        onClose={() => {
          setHistoricoUnidadeId(null);
          setHistoricoRotulo(null);
        }}
      />

      <UnidadeDetalheSheet
        unidadeId={detalheUnidadeId}
        onClose={() => setDetalheUnidadeId(null)}
        responsaveisDisponiveis={getCadastros().responsaveis}
        onMutacao={() => void recarregar()}
      />

      <AtendimentoSituacaoRetornoSheet
        atendimentoId={edicaoAtendimento?.id ?? null}
        tituloUnidade={edicaoAtendimento?.unidadeLabel}
        modo={edicaoAtendimento?.modo ?? "situacao"}
        onClose={() => setEdicaoAtendimento(null)}
        onSalvo={() => void recarregar()}
      />
    </>
  );
}
