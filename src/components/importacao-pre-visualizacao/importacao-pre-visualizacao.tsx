"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, XCircle } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetricRow } from "@/components/card-metric-row";
import { CardMetric } from "@/components/card-metric";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { DetalheLinhaImportacao } from "@/components/importacao-pre-visualizacao/detalhe-linha-importacao";
import { colunasPreVisualizacaoPorModulo, ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";
import type {
  DadosCabecalhoPreVisualizacao,
  FiltroInconsistenciaPreVisualizacao,
  FiltroSituacaoPreVisualizacao,
  LinhaPreVisualizacaoImportacaoUi,
} from "@/components/importacao-pre-visualizacao/types";
import type { LinhaPreVisualizacaoSerializada } from "@/lib/importacao-centro/pre-visualizacao";
import {
  contarPreVisualizacao,
  indicadorLinhaPreVisualizacao,
  linhaSeraGravada,
  situacaoPermiteIgnorarNaPrevia,
  valoresEditadosDaLinha,
} from "@/lib/importacao-centro/pre-visualizacao";
import type { PreviewImportacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";
import type { PreviewImportacaoDebitos, ResultadoCorrecaoPreviewDebitos } from "@/lib/importacoes/debitos-service";
import { useToast } from "@/components/toast";
import { formatarData } from "@/data/catalogo";
import type { CategoriaValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

function mapLinhasUi(
  linhas: LinhaPreVisualizacaoSerializada[],
  ignoradas: ReadonlySet<number>,
): LinhaPreVisualizacaoImportacaoUi[] {
  return linhas.map((item) => ({
    ...item,
    indicador: indicadorLinhaPreVisualizacao(item),
    ignoradoPeloUsuario: ignoradas.has(item.linha),
    valoresEditados: valoresEditadosDaLinha(item),
  }));
}

const indicadorDotClass: Record<string, string> = {
  valido: "bg-status-success",
  atencao: "bg-brass",
  erro: "bg-status-critical",
};

const opcoesSituacao: { value: FiltroSituacaoPreVisualizacao; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "valido", label: "Válidas (verde)" },
  { value: "atencao", label: "Atenção (amarelo)" },
  { value: "erro", label: "Erro (vermelho)" },
  { value: "gravacao", label: "Serão gravadas" },
  { value: "ignorado", label: "Ignoradas na prévia" },
];

const opcoesInconsistencia: { value: FiltroInconsistenciaPreVisualizacao; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: "estrutural", label: "Estrutural" },
  { value: "cadastral", label: "Cadastral" },
  { value: "relacional", label: "Relacional" },
  { value: "financeira", label: "Financeira" },
  { value: "negocio", label: "Negócio" },
];

function chaveUnidadeGrupo(linha: LinhaPreVisualizacaoImportacaoUi): string {
  const bruto = linha.resumo?.unidade?.trim();
  return bruto && bruto.length > 0 ? bruto : "—";
}

/** Mantém a ordem de aparição das unidades no arquivo e agrupa as linhas de cada uma. */
function ordenarLinhasAgrupadasPorUnidade(
  linhas: LinhaPreVisualizacaoImportacaoUi[],
): LinhaPreVisualizacaoImportacaoUi[] {
  const ordemUnidades: string[] = [];
  const porUnidade = new Map<string, LinhaPreVisualizacaoImportacaoUi[]>();
  for (const item of linhas) {
    const chave = chaveUnidadeGrupo(item);
    if (!porUnidade.has(chave)) {
      ordemUnidades.push(chave);
      porUnidade.set(chave, []);
    }
    porUnidade.get(chave)!.push(item);
  }
  return ordemUnidades.flatMap((chave) => porUnidade.get(chave)!);
}

export type ImportacaoPreVisualizacaoProps = {
  cabecalho: DadosCabecalhoPreVisualizacao;
  linhas: LinhaPreVisualizacaoSerializada[];
  sessaoPreviaId?: string;
  hashArquivo: string;
  onPreviewAtualizado?: (preview: PreviewImportacaoModulo) => void;
  onVoltarArquivo: () => void;
  onCancelar: () => void;
  /** Linhas que o usuário marcou para ignorar (somente conferência até suporte na confirmação). */
  onLinhasIgnoradasChange?: (linhas: number[]) => void;
  /** Sem `importacoes.editar` o usuário só consulta a prévia. */
  permissaoCorrigir?: boolean;
  gravacaoPrevista?: number;
  podeContinuarAprovacao?: boolean;
  motivoBloqueioContinuar?: string;
  processandoContinuar?: boolean;
  wizardFormId?: string;
};

export function ImportacaoPreVisualizacao({
  cabecalho,
  linhas,
  sessaoPreviaId,
  hashArquivo,
  onPreviewAtualizado,
  onVoltarArquivo,
  onCancelar,
  onLinhasIgnoradasChange,
  permissaoCorrigir = true,
  podeContinuarAprovacao = true,
  motivoBloqueioContinuar,
}: ImportacaoPreVisualizacaoProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacaoPreVisualizacao>("todos");
  const [appliedSituacao, setAppliedSituacao] = useState<FiltroSituacaoPreVisualizacao>("todos");
  const [filtroInconsistencia, setFiltroInconsistencia] = useState<FiltroInconsistenciaPreVisualizacao>("todos");
  const [appliedInconsistencia, setAppliedInconsistencia] =
    useState<FiltroInconsistenciaPreVisualizacao>("todos");
  const [page, setPage] = useState(1);
  const [ignoradas, setIgnoradas] = useState<Set<number>>(() => new Set());
  const [detalheLinha, setDetalheLinha] = useState<LinhaPreVisualizacaoImportacaoUi | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);

  const colunas = useMemo(
    () => colunasPreVisualizacaoPorModulo(cabecalho.moduloDestino),
    [cabecalho.moduloDestino],
  );

  const linhasUi = useMemo(() => mapLinhasUi(linhas, ignoradas), [linhas, ignoradas]);

  const contagensDinamicas = useMemo(() => contarPreVisualizacao(linhas, ignoradas), [linhas, ignoradas]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");

  const filtradas = useMemo(() => {
    return linhasUi.filter((item) => {
      if (appliedSituacao === "valido" && item.indicador !== "valido") return false;
      if (appliedSituacao === "atencao" && item.indicador !== "atencao") return false;
      if (appliedSituacao === "erro" && item.indicador !== "erro") return false;
      if (appliedSituacao === "gravacao" && !linhaSeraGravada(item, ignoradas)) return false;
      if (appliedSituacao === "ignorado" && !item.ignoradoPeloUsuario) return false;

      if (appliedInconsistencia !== "todos") {
        const cats = item.validacao?.inconsistencias.map((i) => i.categoria) ?? [];
        if (!cats.includes(appliedInconsistencia as CategoriaValidacaoImportacao)) return false;
      }

      if (!query) return true;
      const haystack = [
        String(item.linha),
        item.situacao,
        item.mensagem ?? "",
        JSON.stringify(item.resumo ?? {}),
        JSON.stringify(item.validacao?.dadosOriginais ?? {}),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return haystack.includes(query);
    });
  }, [linhasUi, appliedSituacao, appliedInconsistencia, query, ignoradas]);

  const agruparPorUnidade = cabecalho.moduloDestino === "debitos";

  const filtradasOrdenadas = useMemo(
    () => (agruparPorUnidade ? ordenarLinhasAgrupadasPorUnidade(filtradas) : filtradas),
    [filtradas, agruparPorUnidade],
  );

  const contagemPorUnidade = useMemo(() => {
    if (!agruparPorUnidade) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const item of filtradasOrdenadas) {
      const chave = chaveUnidadeGrupo(item);
      map.set(chave, (map.get(chave) ?? 0) + 1);
    }
    return map;
  }, [filtradasOrdenadas, agruparPorUnidade]);

  const pageCount = Math.max(1, Math.ceil(filtradasOrdenadas.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtradasOrdenadas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function unidadeLinhaAnteriorNoIndice(indiceNaPagina: number): string | null {
    if (indiceNaPagina > 0) return chaveUnidadeGrupo(pageRows[indiceNaPagina - 1]!);
    if (currentPage <= 1) return null;
    const indiceGlobal = (currentPage - 1) * PAGE_SIZE - 1;
    if (indiceGlobal < 0 || indiceGlobal >= filtradasOrdenadas.length) return null;
    return chaveUnidadeGrupo(filtradasOrdenadas[indiceGlobal]!);
  }

  const gravacaoCount = linhasUi.filter((item) => linhaSeraGravada(item, ignoradas)).length;

  function handleApplyFilters() {
    setAppliedSearch(search);
    setAppliedSituacao(filtroSituacao);
    setAppliedInconsistencia(filtroInconsistencia);
    setPage(1);
  }

  function handleClearFilters() {
    setSearch("");
    setFiltroSituacao("todos");
    setFiltroInconsistencia("todos");
    setAppliedSearch("");
    setAppliedSituacao("todos");
    setAppliedInconsistencia("todos");
    setPage(1);
  }

  function alternarIgnorar(linha: number) {
    setIgnoradas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(linha)) proximo.delete(linha);
      else proximo.add(linha);
      onLinhasIgnoradasChange?.([...proximo].sort((a, b) => a - b));
      return proximo;
    });
    setDetalheLinha((atual) => (atual?.linha === linha ? { ...atual, ignoradoPeloUsuario: !ignoradas.has(linha) } : atual));
  }

  async function salvarEdicoes(linha: number, valores: Record<string, string>) {
    if (!permissaoCorrigir) return;
    if (!sessaoPreviaId?.trim()) {
      toast({
        variant: "error",
        title: "Sessão indisponível",
        description: "Valide o arquivo novamente para corrigir linhas na prévia.",
      });
      return;
    }
    if (!hashArquivo?.trim()) {
      toast({
        variant: "error",
        title: "Arquivo sem identificação",
        description: "Valide o arquivo novamente para corrigir linhas na prévia.",
      });
      return;
    }
    if (Object.keys(valores).length === 0) {
      toast({
        variant: "error",
        title: "Nada para corrigir",
        description: "Informe ao menos um valor antes de aplicar a correção.",
      });
      return;
    }
    setSalvandoCorrecao(true);
    try {
      const response = await fetch("/api/importacoes/debitos/preview/corrigir", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessaoPreviaId,
          hashArquivo,
          linha,
          campos: valores,
        }),
      });
      const body = (await response.json()) as ResultadoCorrecaoPreviewDebitos & { error?: string };
      if (!response.ok || !body.preview) {
        toast({
          variant: "error",
          title: "Correção não aplicada",
          description: body.error ?? "Verifique os valores informados.",
        });
        return;
      }
      onPreviewAtualizado?.(body.preview);
      const linhaAtualizada = body.linha;
      setDetalheLinha({
        ...linhaAtualizada,
        indicador: indicadorLinhaPreVisualizacao(linhaAtualizada),
        ignoradoPeloUsuario: ignoradas.has(linha),
        valoresEditados: valoresEditadosDaLinha(linhaAtualizada),
      });
      toast({
        variant: body.correcaoAceita ? "success" : "warning",
        title: body.correcaoAceita ? "Linha revalidada" : "Correção parcial",
        description: body.correcaoAceita
          ? "Os totais e a validação foram atualizados."
          : "Ainda há inconsistências nesta linha.",
      });
      setDetalheOpen(false);
    } catch {
      toast({ variant: "error", title: "Erro de rede", description: "Não foi possível salvar a correção." });
    } finally {
      setSalvandoCorrecao(false);
    }
  }

  const dataHora =
    cabecalho.dataHoraImportacao.length >= 10
      ? formatarData(cabecalho.dataHoraImportacao.slice(0, 10)) +
        (cabecalho.dataHoraImportacao.includes("T")
          ? ` ${cabecalho.dataHoraImportacao.slice(11, 16)}`
          : "")
      : cabecalho.dataHoraImportacao;

  const moduloRotulo =
    cabecalho.moduloRotulo || ROTULO_MODULO_IMPORTACAO[cabecalho.moduloDestino] || cabecalho.moduloDestino;

  return (
    <div className="flex flex-col gap-lg">
      {cabecalho.arquivoJaImportado ? (
        <Alert variant="warning" title="Arquivo já importado">
          Este arquivo já foi gravado anteriormente. A confirmação não duplicará registros já existentes.
        </Alert>
      ) : null}

      <section className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card">
        <dl className="grid gap-sm text-body-sm min-[640px]:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">Arquivo</dt>
            <dd className="font-medium text-on-surface">{cabecalho.nomeArquivo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Módulo de destino</dt>
            <dd className="font-medium text-on-surface">{moduloRotulo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Usuário responsável</dt>
            <dd className="font-medium text-on-surface">{cabecalho.usuarioResponsavel}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Data e hora</dt>
            <dd className="font-medium text-on-surface">{dataHora}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Origem da informação</dt>
            <dd className="font-medium text-on-surface">{cabecalho.origem}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Registros na prévia</dt>
            <dd className="font-medium text-on-surface">{cabecalho.quantidadeRegistros}</dd>
          </div>
        </dl>
      </section>

      <CardMetricRow desktopCols={4}>
        <CardMetric
          className="border-l-[3px] border-l-primary-container"
          rotulo="Válidos"
          valor={String(contagensDinamicas.validos).padStart(2, "0")}
          detalhe="Prontos para gravação"
          icon={<Icon icon={CheckCircle2} size="md" className="text-status-success" />}
          iconClassName="bg-success-subtle text-status-success"
        />
        <CardMetric
          className="border-l-[3px] border-l-brass"
          rotulo="Atenção"
          valor={String(contagensDinamicas.atencao).padStart(2, "0")}
          detalhe="Exigem conferência"
          icon={<Icon icon={AlertTriangle} size="md" className="text-brass" />}
          iconClassName="bg-gold-subtle text-brass"
        />
        <CardMetric
          className="border-l-[3px] border-l-status-critical"
          rotulo="Erros"
          valor={String(contagensDinamicas.erros).padStart(2, "0")}
          detalhe="Não serão gravados"
          icon={<Icon icon={XCircle} size="md" className="text-status-critical" />}
          iconClassName="bg-error-container text-status-critical"
        />
        <CardMetric
          className="border-l-[3px] border-l-outline-variant"
          rotulo="Duplicidades"
          valor={String(contagensDinamicas.duplicidades).padStart(2, "0")}
          detalhe="Possível repetição no arquivo ou base"
          icon={<Icon icon={AlertTriangle} size="md" />}
          iconClassName="bg-surface-dim text-on-surface-variant"
        />
      </CardMetricRow>

      <div className="grid grid-cols-2 gap-sm min-[480px]:hidden">
        <KpiMobileCard rotulo="Serão gravados" valor={String(gravacaoCount)} icon={CheckCircle2} />
        <KpiMobileCard rotulo="Total lidos" valor={String(cabecalho.quantidadeRegistros)} icon={AlertTriangle} />
      </div>

      <section className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h3 className="text-headline-sm text-on-surface">Tabela de conferência</h3>
          <p className="text-body-sm text-on-surface-variant">
            {gravacaoCount} registro(s) representam o que seguirá para gravação após aprovação.
          </p>
        </div>

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por linha, unidade, condomínio"
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          defaultMobile="grid"
          useFormElement={false}
          fields={[
            {
              id: "situacao",
              label: "Situação",
              value: filtroSituacao,
              onChange: (v) => setFiltroSituacao(v as FiltroSituacaoPreVisualizacao),
              options: opcoesSituacao,
            },
            {
              id: "inconsistencia",
              label: "Inconsistência",
              value: filtroInconsistencia,
              onChange: (v) => setFiltroInconsistencia(v as FiltroInconsistenciaPreVisualizacao),
              options: opcoesInconsistencia,
            },
          ]}
        />

        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-card shadow-card">
          <Table className="min-w-[72rem] text-body-sm">
            <TableHeader className="sticky top-0 z-[1] bg-surface-card">
              <TableRow className="border-b border-border-subtle">
                <TableHead className="sticky left-0 z-[2] w-10 bg-surface-card" />
                <TableHead className="sticky left-10 z-[2] w-14 bg-surface-card">Linha</TableHead>
                {colunas.map((coluna) => (
                  <TableHead
                    key={coluna.id}
                    className={[
                      coluna.className,
                      coluna.alinhamento === "right" ? "text-right" : undefined,
                      "text-label text-on-surface-variant",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {coluna.rotulo}
                  </TableHead>
                ))}
                <TableHead className="min-w-[7rem]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableEmpty colSpan={colunas.length + 3}>
                  Nenhum registro encontrado com os filtros atuais.
                </TableEmpty>
              ) : (
                pageRows.map((item, indiceNaPagina) => {
                  const unidadeAtual = chaveUnidadeGrupo(item);
                  const unidadeAnterior = unidadeLinhaAnteriorNoIndice(indiceNaPagina);
                  const exibirCabecalhoGrupo = agruparPorUnidade && unidadeAtual !== unidadeAnterior;
                  const condominioGrupo = item.resumo?.condominio?.trim();
                  const qtdGrupo = contagemPorUnidade.get(unidadeAtual) ?? 0;
                  const colSpanTotal = colunas.length + 3;

                  return (
                    <Fragment key={item.linha}>
                      {exibirCabecalhoGrupo ? (
                        <TableRow
                          key={`grupo-${unidadeAtual}-${indiceNaPagina}`}
                          className="border-t-2 border-border-default bg-surface-dim"
                        >
                          <TableCell colSpan={colSpanTotal} className="py-sm">
                            <div className="flex flex-wrap items-baseline gap-x-sm gap-y-xs">
                              <span className="text-label font-semibold text-on-surface">
                                Unidade {unidadeAtual}
                              </span>
                              {condominioGrupo && condominioGrupo !== "—" ? (
                                <span className="text-body-sm text-on-surface-variant">· {condominioGrupo}</span>
                              ) : null}
                              <span className="text-body-sm text-on-surface-variant">
                                ({qtdGrupo} registro{qtdGrupo === 1 ? "" : "s"})
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                      <TableRow
                        className={[
                          "align-top even:bg-surface-dim/40 hover:bg-primary-subtle/30",
                          item.ignoradoPeloUsuario ? "opacity-60" : undefined,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <TableCell className="sticky left-0 z-[1] bg-inherit">
                          <span
                            className={`inline-block size-2.5 rounded-full shadow-sm ${indicadorDotClass[item.indicador]}`}
                            title={item.indicador}
                            aria-hidden
                          />
                        </TableCell>
                        <TableCell className="sticky left-10 z-[1] bg-inherit tabular-nums font-medium">
                          {item.linha}
                        </TableCell>
                        {colunas.map((coluna) => (
                          <TableCell
                            key={coluna.id}
                            className={[
                              coluna.className,
                              coluna.alinhamento === "right" ? "text-right tabular-nums" : undefined,
                              "max-w-[12rem] truncate",
                              agruparPorUnidade && coluna.id === "unidade" ? "text-on-surface-variant" : undefined,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={typeof coluna.valor(item) === "string" ? coluna.valor(item) : undefined}
                          >
                            {agruparPorUnidade && coluna.id === "unidade" ? "—" : coluna.valor(item)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex flex-col gap-xs min-[640px]:flex-row">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetalheLinha(item);
                                setDetalheOpen(true);
                              }}
                            >
                              <Icon icon={Eye} size="sm" />
                              Detalhes
                            </Button>
                            {situacaoPermiteIgnorarNaPrevia(item.situacao) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => alternarIgnorar(item.linha)}
                              >
                                {item.ignoradoPeloUsuario ? "Restaurar" : "Ignorar"}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {filtradas.length > 0 ? (
          <Pagination page={currentPage} total={filtradas.length} onPageChange={setPage} />
        ) : null}
      </section>

      {!podeContinuarAprovacao && motivoBloqueioContinuar ? (
        <Alert variant="warning" title="Conferência concluída — próximo passo bloqueado">
          {motivoBloqueioContinuar}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-sm border-t border-border-subtle pt-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex flex-wrap gap-sm">
            <Button type="button" variant="secondary" onClick={onVoltarArquivo}>
              Voltar e substituir arquivo
            </Button>
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar importação
            </Button>
          </div>
          {ignoradas.size > 0 ? (
            <Badge variant="secondary">{ignoradas.size} ignorado(s) só na conferência</Badge>
          ) : null}
        </div>
      </div>

      <DetalheLinhaImportacao
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        linha={detalheLinha}
        colunas={colunas}
        origem={cabecalho.origem}
        nomeArquivo={cabecalho.nomeArquivo}
        onSalvarEdicoes={(numeroLinha, valores) => void salvarEdicoes(numeroLinha, valores)}
        onAlternarIgnorar={alternarIgnorar}
        salvando={salvandoCorrecao}
        permissaoCorrigir={permissaoCorrigir}
      />
    </div>
  );
}
