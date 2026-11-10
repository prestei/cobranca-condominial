"use client";

import { Fragment, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
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
import { colunasPreVisualizacaoPorModulo } from "@/components/importacao-pre-visualizacao/config-modulos";
import type {
  DadosCabecalhoPreVisualizacao,
  LinhaPreVisualizacaoImportacaoUi,
} from "@/components/importacao-pre-visualizacao/types";
import type { LinhaPreVisualizacaoSerializada } from "@/lib/importacao-centro/pre-visualizacao";
import {
  indicadorLinhaPreVisualizacao,
  situacaoPermiteIgnorarNaPrevia,
  valoresEditadosDaLinha,
} from "@/lib/importacao-centro/pre-visualizacao";
import type { PreviewImportacaoModulo } from "@/lib/importacoes/preview-importacao-modulo.types";
import type { PreviewImportacaoDebitos, ResultadoCorrecaoPreviewDebitos } from "@/lib/importacoes/debitos-service.types";
import { useToast } from "@/components/toast";

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

/** Fundos opacos nas sticky — `bg-inherit` + zebra translúcida deixava referência/unidade atravessarem “Linha”. */
const stickyCellBg =
  "bg-surface-card group-even/row:bg-surface-container-low group-hover/row:bg-primary-subtle";
const stickyStatusClass = `sticky left-0 z-[3] w-10 min-w-10! max-w-10! ${stickyCellBg}`;
const stickyLinhaClass = `sticky left-10 z-[3] w-14 min-w-14! max-w-14! tabular-nums font-medium ${stickyCellBg} shadow-[4px_0_8px_-4px_rgba(18,33,58,0.18)]`;
const stickyHeadStatusClass = "sticky left-0 z-[4] w-10 min-w-10! max-w-10! bg-surface-card";
const stickyHeadLinhaClass =
  "sticky left-10 z-[4] w-14 min-w-14! max-w-14! bg-surface-card shadow-[4px_0_8px_-4px_rgba(18,33,58,0.18)]";

/** Código da unidade para agrupamento (aceita legado "Condomínio · MB-0102"). */
function chaveUnidadeGrupo(linha: LinhaPreVisualizacaoImportacaoUi): string {
  const bruto = linha.resumo?.unidade?.trim();
  if (!bruto || bruto === "—") return "—";
  const separador = bruto.lastIndexOf(" · ");
  if (separador >= 0) {
    const codigo = bruto.slice(separador + 3).trim();
    if (codigo) return codigo;
  }
  return bruto;
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
  /** Linhas que o usuário marcou para ignorar (somente conferência até suporte na confirmação). */
  onLinhasIgnoradasChange?: (linhas: number[]) => void;
  /** Sem `importacoes.editar` o usuário só consulta a prévia. */
  permissaoCorrigir?: boolean;
  podeContinuarAprovacao?: boolean;
  motivoBloqueioContinuar?: string;
};

export function ImportacaoPreVisualizacao({
  cabecalho,
  linhas,
  sessaoPreviaId,
  hashArquivo,
  onPreviewAtualizado,
  onLinhasIgnoradasChange,
  permissaoCorrigir = true,
  podeContinuarAprovacao = true,
  motivoBloqueioContinuar,
}: ImportacaoPreVisualizacaoProps) {
  const { toast } = useToast();
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

  const agruparPorUnidade = cabecalho.moduloDestino === "debitos";

  const linhasOrdenadas = useMemo(
    () => (agruparPorUnidade ? ordenarLinhasAgrupadasPorUnidade(linhasUi) : linhasUi),
    [linhasUi, agruparPorUnidade],
  );

  const contagemPorUnidade = useMemo(() => {
    if (!agruparPorUnidade) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const item of linhasOrdenadas) {
      const chave = chaveUnidadeGrupo(item);
      map.set(chave, (map.get(chave) ?? 0) + 1);
    }
    return map;
  }, [linhasOrdenadas, agruparPorUnidade]);

  const pageCount = Math.max(1, Math.ceil(linhasOrdenadas.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = linhasOrdenadas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function unidadeLinhaAnteriorNoIndice(indiceNaPagina: number): string | null {
    if (indiceNaPagina > 0) return chaveUnidadeGrupo(pageRows[indiceNaPagina - 1]!);
    if (currentPage <= 1) return null;
    const indiceGlobal = (currentPage - 1) * PAGE_SIZE - 1;
    if (indiceGlobal < 0 || indiceGlobal >= linhasOrdenadas.length) return null;
    return chaveUnidadeGrupo(linhasOrdenadas[indiceGlobal]!);
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

  return (
    <div className="flex flex-col gap-lg">
      {cabecalho.arquivoJaImportado ? (
        <Alert variant="warning" title="Arquivo já importado">
          Este arquivo já foi gravado anteriormente. A confirmação não duplicará registros já existentes.
        </Alert>
      ) : null}

      <section className="flex flex-col gap-md">
        <Table className="min-w-[72rem] text-body-sm" showExport={false}>
            <TableHeader className="sticky top-0 z-[2] bg-surface-card">
              <TableRow className="border-b border-border-subtle">
                <TableHead className={stickyHeadStatusClass} />
                <TableHead className={stickyHeadLinhaClass}>Linha</TableHead>
                {colunas.map((coluna) => (
                  <TableHead
                    key={coluna.id}
                    className={[
                      coluna.className,
                      coluna.alinhamento === "right" ? "text-right" : undefined,
                      "bg-surface-card text-label text-on-surface-variant",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {coluna.rotulo}
                  </TableHead>
                ))}
                <TableHead className="min-w-[7rem] bg-surface-card">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableEmpty colSpan={colunas.length + 3}>
                  Nenhum registro na prévia.
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
                          "align-top even:bg-surface-container-low hover:bg-primary-subtle",
                          item.ignoradoPeloUsuario ? "opacity-60" : undefined,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <TableCell className={stickyStatusClass}>
                          <span
                            className={`inline-block size-2.5 rounded-full shadow-sm ${indicadorDotClass[item.indicador]}`}
                            title={item.indicador}
                            aria-hidden
                          />
                        </TableCell>
                        <TableCell className={stickyLinhaClass}>{item.linha}</TableCell>
                        {colunas.map((coluna) => {
                          const valor =
                            agruparPorUnidade && coluna.id === "unidade"
                              ? unidadeAtual
                              : coluna.valor(item);
                          const titulo = typeof valor === "string" ? valor : undefined;
                          return (
                          <TableCell
                            key={coluna.id}
                            className={[
                              coluna.className,
                              coluna.alinhamento === "right" ? "text-right tabular-nums" : undefined,
                              "relative z-0 max-w-[12rem] truncate",
                              agruparPorUnidade && coluna.id === "unidade" ? "text-on-surface-variant" : undefined,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={titulo}
                          >
                            {valor}
                          </TableCell>
                          );
                        })}
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
        {linhasOrdenadas.length > 0 ? (
          <Pagination page={currentPage} total={linhasOrdenadas.length} onPageChange={setPage} />
        ) : null}
      </section>

      {!podeContinuarAprovacao && motivoBloqueioContinuar ? (
        <Alert variant="warning" title="Conferência concluída — próximo passo bloqueado">
          {motivoBloqueioContinuar}
        </Alert>
      ) : null}

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
