"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Share2, Users } from "lucide-react";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { Checkbox, FormField, Select, Textarea } from "@/components/input";
import { Pagination } from "@/components/pagination";
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
  type TableExportFormat,
} from "@/components/table";
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
import { useToast } from "@/components/toast";
import { formatarData, nomeCondominio, type AtribuicaoCobranca } from "@/data/catalogo";
import { listarAtendentesComRe, snapshotAtendentesComRe } from "@/lib/colaboradores/re";
import { aplicarSnapshotAtribuicoes } from "@/lib/distribuicao/sync-cliente";
import type { CarteiraReResumo, HistoricoAtribuicaoItem } from "@/lib/distribuicao/service";
import {
  colunasFilaExport,
  exportarListagem,
  linhasFilaExport,
} from "@/lib/atendimentos/exportar-listagem";
import { usePermissao } from "@/hooks/use-permissao";
import type { FilaCobrancaItem } from "@/lib/fila/service";

const PAGE_FILA = 50;

const colunasHistoricoDistrib = ["Quando", "Condomínio · Unidade", "RE anterior", "RE novo", "Autor", "Motivo"];

export function DistribuicaoPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const { pode } = usePermissao();
  const podeImportar = pode("importacoes", "criar");
  const atendentesKey = snapshotAtendentesComRe();
  const atendentes = useMemo(() => listarAtendentesComRe(), [atendentesKey]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [carteiras, setCarteiras] = useState<CarteiraReResumo[]>([]);
  const [historico, setHistorico] = useState<HistoricoAtribuicaoItem[]>([]);
  const [filaItens, setFilaItens] = useState<FilaCobrancaItem[]>([]);
  const [filaTotal, setFilaTotal] = useState(0);
  const [filaPage, setFilaPage] = useState(1);

  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [codigoRe, setCodigoRe] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [carteiraRes, historicoRes, filaRes] = await Promise.all([
        fetch("/api/distribuicao/carteira", { credentials: "same-origin" }),
        fetch("/api/distribuicao/historico?limit=30", { credentials: "same-origin" }),
        fetch(`/api/fila?page=${filaPage}&pageSize=${PAGE_FILA}`, { credentials: "same-origin" }),
      ]);

      const carteiraPayload = (await carteiraRes.json()) as { error?: string; carteiras?: CarteiraReResumo[] };
      const historicoPayload = (await historicoRes.json()) as { error?: string; historico?: HistoricoAtribuicaoItem[] };
      const filaPayload = (await filaRes.json()) as {
        error?: string;
        itens?: FilaCobrancaItem[];
        total?: number;
      };

      if (!carteiraRes.ok) throw new Error(carteiraPayload.error ?? "Falha ao carregar carteiras.");
      if (!historicoRes.ok) throw new Error(historicoPayload.error ?? "Falha ao carregar histórico.");
      if (!filaRes.ok) throw new Error(filaPayload.error ?? "Falha ao carregar fila.");

      setCarteiras(carteiraPayload.carteiras ?? []);
      setHistorico(historicoPayload.historico ?? []);
      setFilaItens(filaPayload.itens ?? []);
      setFilaTotal(filaPayload.total ?? 0);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [filaPage]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const idsPagina = filaItens.map((item) => item.unidadeId);
  const allSelected = idsPagina.length > 0 && idsPagina.every((id) => selecionadas.has(id));
  const someSelected = idsPagina.some((id) => selecionadas.has(id)) && !allSelected;

  function toggleAll(checked: boolean) {
    setSelecionadas((current) => {
      const next = new Set(current);
      if (checked) idsPagina.forEach((id) => next.add(id));
      else idsPagina.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleUnidade(unidadeId: number, checked: boolean) {
    setSelecionadas((current) => {
      const next = new Set(current);
      if (checked) next.add(unidadeId);
      else next.delete(unidadeId);
      return next;
    });
  }

  async function confirmarDistribuicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selecionadas.size === 0) {
      toast({ variant: "error", title: "Selecione ao menos uma unidade." });
      return;
    }
    if (!codigoRe) {
      toast({ variant: "error", title: "Selecione o RE do atendente." });
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch("/api/distribuicao/atribuicoes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeIds: [...selecionadas],
          codigoRe,
          motivo: motivo.trim(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        detalhes?: string[];
        atribuidas?: number;
        ignoradasMesmoResponsavel?: number;
        atribuicoesCobranca?: AtribuicaoCobranca[];
      };
      if (!response.ok) {
        const detalhe = payload.detalhes?.length ? ` ${payload.detalhes.join(" ")}` : "";
        throw new Error((payload.error ?? "Falha na distribuição.") + detalhe);
      }

      if (payload.atribuicoesCobranca) {
        aplicarSnapshotAtribuicoes(payload.atribuicoesCobranca);
      }

      const atribuidas = payload.atribuidas ?? 0;
      const ignoradas = payload.ignoradasMesmoResponsavel ?? 0;
      toast({
        variant: "success",
        title: atribuidas > 0 ? `${atribuidas} cobrança(s) atribuída(s)` : "Nenhuma alteração necessária",
        description: ignoradas > 0 ? `${ignoradas} já estavam com o mesmo RE.` : undefined,
      });

      setSheetOpen(false);
      setSelecionadas(new Set());
      setMotivo("");
      void recarregar();
    } catch (error) {
      toast({
        variant: "error",
        title: "Não foi possível distribuir",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvando(false);
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

  if (carregando) {
    return <p className="text-body-md text-on-surface-variant">Carregando distribuição…</p>;
  }

  async function aoExportarFila(formato: TableExportFormat) {
    try {
      const response = await fetch(`/api/fila?page=1&pageSize=10000`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; itens?: FilaCobrancaItem[] };
      if (!response.ok) {
        toast({ variant: "error", title: "Exportação falhou", description: payload.error });
        return;
      }
      const linhas = linhasFilaExport(payload.itens ?? [], nomeCondominio, formatarData);
      exportarListagem(
        toast,
        formato,
        "Unidades para distribuição",
        `distribuicao-fila-${new Date().toISOString().slice(0, 10)}`,
        colunasFilaExport,
        linhas,
      );
    } catch {
      toast({ variant: "error", title: "Erro ao exportar", description: "Tente novamente." });
    }
  }

  function aoExportarHistorico(formato: TableExportFormat) {
    const linhas = historico.map((item) => [
      formatarData(item.atribuidoEm),
      `${item.condominioNome} · ${item.identificacaoUnidade}`,
      item.codigoReAnterior ?? "—",
      item.codigoReAtual,
      item.codigoReAutor ?? "—",
      item.motivo.trim() || "—",
    ]);
    exportarListagem(
      toast,
      formato,
      "Histórico de atribuições",
      `distribuicao-historico-${new Date().toISOString().slice(0, 10)}`,
      colunasHistoricoDistrib,
      linhas,
    );
  }

  function abrirImportacao() {
    router.push("/importacoes");
  }

  return (
    <div className="flex flex-col gap-xl">
      <section aria-labelledby="carteira-re-titulo">
        <h2 id="carteira-re-titulo" className="mb-md text-title-sm text-on-surface">
          Carteira por RE
        </h2>
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          {carteiras.map((item) => (
            <CardMetric
              key={item.atendenteId}
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Users} size="md" />}
            >
              <p className="text-metric text-on-surface tabular-nums">{String(item.totalUnidades).padStart(2, "0")}</p>
              <p className="mt-sm text-body-sm text-on-surface-variant">
                unidades · <span className="font-medium text-on-surface">{item.codigoRe}</span>
              </p>
            </CardMetric>
          ))}
        </div>
      </section>

      <section aria-labelledby="distribuir-titulo" className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h2 id="distribuir-titulo" className="text-title-sm text-on-surface">
            Distribuir cobranças
          </h2>
          <Button
            type="button"
            size="sm"
            disabled={selecionadas.size === 0}
            onClick={() => {
              setCodigoRe("");
              setSheetOpen(true);
            }}
          >
            <Icon icon={Share2} size="sm" />
            Atribuir {selecionadas.size > 0 ? `(${selecionadas.size})` : ""}
          </Button>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Selecione unidades da fila ativa e atribua a um atendente pelo RE. Redistribuições preservam o histórico;
          atendimentos anteriores continuam com o autor original.
        </p>

        <ResponsiveTable
          onExport={(formato) => void aoExportarFila(formato)}
          onImport={abrirImportacao}
          showImport={podeImportar}
          desktop={
            <Table aria-label="Unidades disponíveis para distribuição" showExport={false}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Selecionar todas nesta página"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Condomínio</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>RE atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filaItens.length === 0 ? (
                  <TableEmpty colSpan={5}>Nenhuma unidade em cobrança ativa.</TableEmpty>
                ) : (
                  filaItens.map((item) => (
                    <TableRow key={item.unidadeId}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Selecionar ${item.identificacao}`}
                          checked={selecionadas.has(item.unidadeId)}
                          onChange={(event) => toggleUnidade(item.unidadeId, event.target.checked)}
                        />
                      </TableCell>
                      <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
                      <TableCell>{item.identificacao}</TableCell>
                      <TableCell>
                        <BadgeSituacaoCobranca situacao={item.situacao} />
                      </TableCell>
                      <TableCell>{item.codigoRe ?? "Sem RE"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          }
          mobile={
            <TableMobileList aria-label="Unidades para distribuição">
              {filaItens.map((item) => (
                <TableMobileCard key={item.unidadeId}>
                  <TableMobileCardHeader>
                    <Checkbox
                      aria-label={`Selecionar ${item.identificacao}`}
                      checked={selecionadas.has(item.unidadeId)}
                      onChange={(event) => toggleUnidade(item.unidadeId, event.target.checked)}
                    />
                    <TableMobileTitle>
                      {nomeCondominio(item.condominioId)} · {item.identificacao}
                    </TableMobileTitle>
                  </TableMobileCardHeader>
                  <TableMobileFields>
                    <TableMobileField label="RE">{item.codigoRe ?? "Sem RE"}</TableMobileField>
                    <TableMobileField label="Situação">
                      <BadgeSituacaoCobranca situacao={item.situacao} />
                    </TableMobileField>
                  </TableMobileFields>
                </TableMobileCard>
              ))}
              {filaItens.length === 0 ? <TableMobileEmpty>Nenhuma unidade na fila.</TableMobileEmpty> : null}
            </TableMobileList>
          }
        />
        {filaTotal > PAGE_FILA ? (
          <Pagination page={filaPage} total={filaTotal} onPageChange={setFilaPage} />
        ) : null}
      </section>

      <section aria-labelledby="historico-titulo">
        <h2 id="historico-titulo" className="mb-md text-title-sm text-on-surface">
          Histórico de atribuições
        </h2>
        <Table
          aria-label="Histórico de distribuição"
          onExport={aoExportarHistorico}
          onImport={abrirImportacao}
          showImport={podeImportar}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>RE anterior</TableHead>
              <TableHead>RE novo</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.length === 0 ? (
              <TableEmpty colSpan={6}>Nenhuma atribuição registrada.</TableEmpty>
            ) : (
              historico.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatarData(item.atribuidoEm)}</TableCell>
                  <TableCell>
                    {item.condominioNome} · {item.identificacaoUnidade}
                  </TableCell>
                  <TableCell>{item.codigoReAnterior ?? "—"}</TableCell>
                  <TableCell>{item.codigoReAtual}</TableCell>
                  <TableCell>{item.codigoReAutor ?? "—"}</TableCell>
                  <TableCell>{item.motivo.trim() || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent aria-labelledby="distribuir-sheet-title">
          <SheetForm onSubmit={confirmarDistribuicao}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={Share2} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id="distribuir-sheet-title">Atribuir cobranças</SheetTitle>
                  <SheetDescription>
                    {selecionadas.size} unidade(s) selecionada(s). Informe o RE do atendente responsável.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormField label="RE do atendente" htmlFor="distribuir-re" required>
                <Select id="distribuir-re" value={codigoRe} onChange={(event) => setCodigoRe(event.target.value)}>
                  <option value="">Selecione</option>
                  {atendentes.map((item) => (
                    <option key={item.id} value={item.codigoRe}>
                      {item.codigoRe}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Motivo (opcional)" htmlFor="distribuir-motivo">
                <Textarea
                  id="distribuir-motivo"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Ex.: balanceamento de carteira, férias do RE anterior..."
                />
              </FormField>
            </SheetBody>
            <SheetFooterForm onClose={() => setSheetOpen(false)} saveLabel={salvando ? "Salvando…" : "Confirmar"} />
          </SheetForm>
        </SheetContent>
      </Sheet>
    </div>
  );
}
