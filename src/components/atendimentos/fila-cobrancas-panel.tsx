"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Handshake, History, ListOrdered } from "lucide-react";
import { PropostaNegociacaoSheet } from "@/components/negociacoes/proposta-negociacao-sheet";
import { HistoricoUnidadeSheet } from "@/components/unidades/historico-unidade-sheet";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
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
import { escopoCondominios, formatarData, nomeCondominio, situacoesUnidade } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import {
  colunasFilaExport,
  exportarListagem,
  linhasFilaExport,
} from "@/lib/atendimentos/exportar-listagem";
import type { FilaCobrancaItem } from "@/lib/fila/service";

const retornoOpcoes = [
  { value: "todos", label: "Todos os retornos" },
  { value: "atrasado", label: "Atrasados" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "sem", label: "Sem retorno agendado" },
] as const;

const badgeRetorno: Record<string, "error" | "secondary" | "primary"> = {
  atrasado: "error",
  hoje: "secondary",
  semana: "primary",
  agendado: "secondary",
};

const rotuloRetorno: Record<string, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Esta semana",
  agendado: "Agendado",
};

export function FilaCobrancasPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const visaoGeral = pode("usuarios", "criar");
  const podeImportar = pode("importacoes", "criar");
  const atribuicoesKey = cadastros.atribuicoesCobranca
    .map((item) => `${item.id}:${item.encerradoEm ?? ""}:${item.atendenteId}`)
    .join("|");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<FilaCobrancaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [condominioId, setCondominioId] = useState("todos");
  const [situacao, setSituacao] = useState("todos");
  const [filtroRe, setFiltroRe] = useState("todos");
  const [retorno, setRetorno] = useState("todos");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCondominioId, setAppliedCondominioId] = useState("todos");
  const [appliedSituacao, setAppliedSituacao] = useState("todos");
  const [appliedFiltroRe, setAppliedFiltroRe] = useState("todos");
  const [appliedRetorno, setAppliedRetorno] = useState("todos");
  const [historicoUnidadeId, setHistoricoUnidadeId] = useState<number | null>(null);
  const [historicoRotulo, setHistoricoRotulo] = useState<{ unidade: string; condominio: string } | null>(null);
  const [propostaContexto, setPropostaContexto] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);

  const atendentesKey = snapshotAtendentesComRe();
  const atendentes = useMemo(() => listarAtendentesComRe(), [atendentesKey]);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, user?.userId).filter((item) => item.status === "Ativo"),
    [cadastros, user?.userId],
  );

  const situacoesFila = useMemo(
    () => situacoesUnidade.filter((item) => item !== "Sem cobrança" && item !== "Quitada"),
    [],
  );

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
      if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
      if (appliedRetorno !== "todos") params.set("retorno", appliedRetorno);
      if (visaoGeral && appliedFiltroRe !== "todos") {
        const atendente = listarAtendentesComRe().find((item) => item.codigoRe === appliedFiltroRe);
        if (atendente) params.set("atendente", String(atendente.id));
      }

      const response = await fetch(`/api/fila?${params}`, { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        itens?: FilaCobrancaItem[];
        total?: number;
      };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar a fila.");
      setItens(payload.itens ?? []);
      setTotal(payload.total ?? 0);
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
    appliedRetorno,
    appliedSearch,
    appliedSituacao,
    atendentesKey,
    atribuicoesKey,
    page,
    visaoGeral,
  ]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, user?.userId]);

  function aplicarFiltros() {
    setAppliedSearch(search);
    setAppliedCondominioId(condominioId);
    setAppliedSituacao(situacao);
    setAppliedFiltroRe(filtroRe);
    setAppliedRetorno(retorno);
    setPage(1);
  }

  function limparFiltros() {
    setSearch("");
    setCondominioId("todos");
    setSituacao("todos");
    setFiltroRe("todos");
    setRetorno("todos");
    setAppliedSearch("");
    setAppliedCondominioId("todos");
    setAppliedSituacao("todos");
    setAppliedFiltroRe("todos");
    setAppliedRetorno("todos");
    setPage(1);
  }

  function registrarAtendimento(unidadeId: number) {
    router.push(`/atendimentos?aba=fila&novo=1&unidade=${unidadeId}`);
  }

  function abrirHistorico(item: FilaCobrancaItem) {
    setHistoricoRotulo({
      unidade: item.bloco ? `${item.identificacao} · ${item.bloco}` : item.identificacao,
      condominio: nomeCondominio(item.condominioId),
    });
    setHistoricoUnidadeId(item.unidadeId);
  }

  function abrirProposta(item: FilaCobrancaItem) {
    setPropostaContexto({
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: item.bloco ? `${item.identificacao} · ${item.bloco}` : item.identificacao,
      condominio: nomeCondominio(item.condominioId),
    });
  }

  function montarParamsFila(pageSize: number) {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", String(pageSize));
    if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
    if (appliedCondominioId !== "todos") params.set("condominioId", appliedCondominioId);
    if (appliedSituacao !== "todos") params.set("situacao", appliedSituacao);
    if (appliedRetorno !== "todos") params.set("retorno", appliedRetorno);
    if (visaoGeral && appliedFiltroRe !== "todos") {
      const atendente = listarAtendentesComRe().find((item) => item.codigoRe === appliedFiltroRe);
      if (atendente) params.set("atendente", String(atendente.id));
    }
    return params;
  }

  async function aoExportar(formato: TableExportFormat) {
    try {
      const response = await fetch(`/api/fila?${montarParamsFila(10_000)}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; itens?: FilaCobrancaItem[]; total?: number };
      if (!response.ok) {
        toast({ variant: "error", title: "Exportação falhou", description: payload.error });
        return;
      }
      const linhas = linhasFilaExport(payload.itens ?? [], nomeCondominio, formatarData);
      const base = `fila-cobrancas-${new Date().toISOString().slice(0, 10)}`;
      exportarListagem(toast, formato, "Fila de cobranças", base, colunasFilaExport, linhas);
      if ((payload.total ?? 0) > linhas.length) {
        toast({
          variant: "info",
          title: "Exportação parcial",
          description: `Foram exportadas ${linhas.length} de ${payload.total} linhas. Refine os filtros se necessário.`,
        });
      }
    } catch {
      toast({ variant: "error", title: "Erro ao exportar", description: "Tente novamente." });
    }
  }

  function abrirImportacao() {
    router.push("/importacoes");
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

  if (carregando) {
    return <p className="text-body-md text-on-surface-variant">Carregando fila de cobranças…</p>;
  }

  return (
    <div className="flex flex-col gap-lg">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar condomínio, unidade ou RE..."
        onApply={aplicarFiltros}
        onClear={limparFiltros}
        fields={[
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
          {
            id: "situacao",
            label: "Situação da cobrança",
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
                  id: "re",
                  label: "Responsável (RE)",
                  value: filtroRe,
                  onChange: setFiltroRe,
                  options: [
                    { value: "todos", label: "Todos" },
                    ...atendentes.map((item) => ({ value: item.codigoRe, label: item.codigoRe })),
                  ],
                },
              ]
            : []),
          {
            id: "retorno",
            label: "Retorno",
            value: retorno,
            onChange: setRetorno,
            options: retornoOpcoes.map((item) => ({ value: item.value, label: item.label })),
          },
        ]}
      />

      {total === 0 ? (
        <>
          <div className="flex flex-wrap justify-end gap-sm">
            {podeImportar ? <TableImport onImport={abrirImportacao} /> : null}
            <TableExport onExport={(formato) => void aoExportar(formato)} />
          </div>
          <EmptyState
            icon={<Icon icon={ListOrdered} size="lg" className="text-on-surface-variant" />}
            title="Fila vazia"
            description="Não há unidades em cobrança ativa com os filtros aplicados."
          />
        </>
      ) : (
        <>
          <ResponsiveTable
            onExport={(formato) => void aoExportar(formato)}
            onImport={abrirImportacao}
            showImport={podeImportar}
            desktop={
              <Table aria-label="Fila de cobranças ativas" showExport={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Inadimplência</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>RE responsável</TableHead>
                    <TableHead>Último atendimento</TableHead>
                    <TableHead>Próximo retorno</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.unidadeId}>
                      <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
                      <TableCell>
                        {item.identificacao}
                        {item.bloco ? ` · ${item.bloco}` : ""}
                      </TableCell>
                      <TableCell>
                        {item.valorInadimplencia ?? "—"}
                        {item.diasAtrasoMax > 0 ? (
                          <span className="block text-body-sm text-on-surface-variant">
                            {item.diasAtrasoMax} dia(s) de atraso
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <BadgeSituacaoCobranca situacao={item.situacao} />
                      </TableCell>
                      <TableCell>{item.codigoRe ?? "—"}</TableCell>
                      <TableCell>{item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—"}</TableCell>
                      <TableCell>
                        {item.proximoRetorno ? (
                          <span className="inline-flex flex-col gap-xs">
                            <span>{formatarData(item.proximoRetorno)}</span>
                            {item.retornoSituacao ? (
                              <Badge variant={badgeRetorno[item.retornoSituacao] ?? "secondary"}>
                                {rotuloRetorno[item.retornoSituacao] ?? item.retornoSituacao}
                              </Badge>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-xs">
                          {pode("atendimentos", "ler") ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => abrirHistorico(item)}>
                              <History className="size-4" aria-hidden />
                              Histórico
                            </Button>
                          ) : null}
                          {pode("atendimentos", "criar") ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => registrarAtendimento(item.unidadeId)}>
                              <ClipboardList className="size-4" aria-hidden />
                              Registrar
                            </Button>
                          ) : null}
                          {pode("atendimentos", "criar") ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => abrirProposta(item)}>
                              <Handshake className="size-4" aria-hidden />
                              Proposta
                            </Button>
                          ) : null}
                          {!pode("atendimentos", "ler") && !pode("atendimentos", "criar") ? "—" : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {itens.length === 0 ? <TableEmpty colSpan={8}>Nenhum item nesta página.</TableEmpty> : null}
                </TableBody>
              </Table>
            }
            mobile={
              <TableMobileList aria-label="Fila de cobranças">
                {itens.map((item) => (
                  <TableMobileCard key={item.unidadeId}>
                    <TableMobileCardHeader>
                      <TableMobileTitle>
                        {nomeCondominio(item.condominioId)} · {item.identificacao}
                      </TableMobileTitle>
                    </TableMobileCardHeader>
                    <TableMobileFields>
                      <TableMobileField label="Inadimplência">{item.valorInadimplencia ?? "—"}</TableMobileField>
                      <TableMobileField label="Situação">
                        <BadgeSituacaoCobranca situacao={item.situacao} />
                      </TableMobileField>
                      <TableMobileField label="RE">{item.codigoRe ?? "—"}</TableMobileField>
                      <TableMobileField label="Retorno">
                        {item.proximoRetorno ? formatarData(item.proximoRetorno) : "—"}
                      </TableMobileField>
                    </TableMobileFields>
                    <div className="mt-sm flex flex-col gap-xs">
                      {pode("atendimentos", "ler") ? (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => abrirHistorico(item)}>
                          Ver histórico
                        </Button>
                      ) : null}
                      {pode("atendimentos", "criar") ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => registrarAtendimento(item.unidadeId)}
                        >
                          Registrar atendimento
                        </Button>
                      ) : null}
                      {pode("atendimentos", "criar") ? (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => abrirProposta(item)}>
                          Proposta de negociação
                        </Button>
                      ) : null}
                    </div>
                  </TableMobileCard>
                ))}
                {itens.length === 0 ? <TableMobileEmpty>Nenhum item nesta página.</TableMobileEmpty> : null}
              </TableMobileList>
            }
          />
          <Pagination page={page} total={total} onPageChange={setPage} />
        </>
      )}
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
    </div>
  );
}
