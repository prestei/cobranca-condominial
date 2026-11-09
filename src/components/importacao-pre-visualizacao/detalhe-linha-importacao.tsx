"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import { SheetPanel } from "@/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import type { ColunaPreVisualizacao, LinhaPreVisualizacaoImportacaoUi } from "@/components/importacao-pre-visualizacao/types";
import { CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS } from "@/lib/importacao-centro/correcao-previa/modulos/debitos";
import { ConflitoLinhaImportacao } from "@/components/importacao-pre-visualizacao/conflito-linha-importacao";
import { mensagensLinhaPreVisualizacao } from "@/lib/importacao-centro/pre-visualizacao";
import type { AcaoConflitoImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linha: LinhaPreVisualizacaoImportacaoUi | null;
  colunas: ColunaPreVisualizacao[];
  origem: string;
  nomeArquivo: string;
  onSalvarEdicoes: (linha: number, valores: Record<string, string>) => void;
  salvando?: boolean;
  permissaoCorrigir?: boolean;
  decisaoConflito?: AcaoConflitoImportacao;
  onDecisaoConflitoChange?: (linha: number, acao: AcaoConflitoImportacao) => void;
  permissaoDecidirConflito?: boolean;
};

const CAMPOS_COMPONENTES_CONFERENCIA = [
  { campo: "valorOriginal", rotulo: "Valor original" },
  { campo: "juros", rotulo: "Juros" },
  { campo: "multa", rotulo: "Multa" },
  { campo: "correcao", rotulo: "Correção" },
] as const;

const CAMPO_TOTAL_CONFERENCIA = { campo: "valorAtualizado", rotulo: "Total" } as const;

const CAMPOS_IDENTIDADE = [
  { campo: "condominio", rotulo: "Condomínio" },
  { campo: "unidade", rotulo: "Unidade" },
  { campo: "responsavel", rotulo: "Responsável" },
  { campo: "categoria", rotulo: "Categoria" },
  { campo: "referencia", rotulo: "Referência" },
  { campo: "vencimento", rotulo: "Vencimento" },
] as const;

const ROTULO_INDICADOR: Record<LinhaPreVisualizacaoImportacaoUi["indicador"], string> = {
  valido: "Válido",
  atencao: "Atenção",
  erro: "Erro",
};

const ROTULO_CAMPO: Record<string, string> = {
  condominio: "Condomínio",
  unidade: "Unidade",
  responsavel: "Responsável",
  categoria: "Categoria",
  referencia: "Referência",
  vencimento: "Vencimento",
  dataVencimento: "Data de vencimento",
  valorOriginal: "Valor original",
  juros: "Juros",
  multa: "Multa",
  correcao: "Correção",
  valorAtualizado: "Total",
  total: "Total",
};

function rotuloCampo(campo: string): string {
  if (ROTULO_CAMPO[campo]) return ROTULO_CAMPO[campo];
  const comEspacos = campo.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return comEspacos.charAt(0).toUpperCase() + comEspacos.slice(1);
}

function tituloDetalheLinha(linha: LinhaPreVisualizacaoImportacaoUi): string {
  const partes: string[] = [`Linha ${linha.linha}`];
  const condominio = linha.resumo?.condominio?.trim();
  const unidade = linha.resumo?.unidade?.trim();

  if (condominio && condominio !== "—") partes.push(condominio);
  if (unidade && unidade !== "—") {
    if (unidade.includes("·")) {
      for (const trecho of unidade.split("·")) {
        const limpo = trecho.trim();
        if (limpo) partes.push(limpo);
      }
    } else {
      partes.push(unidade);
    }
  }

  return partes.join(" · ");
}

function valorCampo(linha: LinhaPreVisualizacaoImportacaoUi, campo: string): string {
  if (campo === "valorAtualizado") {
    return (
      linha.valoresEditados?.valorAtualizado ??
      linha.valoresEditados?.total ??
      linha.resumo?.total ??
      linha.resumo?.valorAtualizado ??
      ""
    );
  }
  return linha.valoresEditados?.[campo] ?? linha.resumo?.[campo] ?? "";
}

function situacaoNormalizacao(resultado: {
  erro?: string;
  ambiguo?: boolean;
  vazio: boolean;
}): "nao_interpretado" | "ambiguo" | "vazio" | "ok" {
  if (resultado.erro) return "nao_interpretado";
  if (resultado.ambiguo) return "ambiguo";
  if (resultado.vazio) return "vazio";
  return "ok";
}

function badgeSituacaoNormalizacao(situacao: ReturnType<typeof situacaoNormalizacao>) {
  if (situacao === "ok") return <Badge variant="success">Ok</Badge>;
  if (situacao === "ambiguo") return <Badge variant="secondary">Ambíguo</Badge>;
  if (situacao === "nao_interpretado") return <Badge variant="error">Não interpretado</Badge>;
  return <Badge variant="neutral">Vazio</Badge>;
}

export function DetalheLinhaImportacao({
  open,
  onOpenChange,
  linha,
  colunas,
  origem,
  nomeArquivo,
  onSalvarEdicoes,
  salvando = false,
  permissaoCorrigir = false,
  decisaoConflito,
  onDecisaoConflitoChange,
  permissaoDecidirConflito = false,
}: Props) {
  const formId = useId();
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});

  const temCamposConferencia = useMemo(
    () => colunas.some((coluna) => coluna.id === "valorOriginal" || coluna.id === "total"),
    [colunas],
  );

  const camposCorrigiveis = useMemo(() => {
    if (temCamposConferencia) {
      const conferencia = [...CAMPOS_COMPONENTES_CONFERENCIA, CAMPO_TOTAL_CONFERENCIA];
      return conferencia.filter((item) => CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS.has(item.campo)).map(
        (item) => item.campo,
      );
    }
    return colunas
      .map((coluna) => (coluna.id === "total" ? "valorAtualizado" : coluna.id))
      .filter((campo) => CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS.has(campo));
  }, [colunas, temCamposConferencia]);

  useEffect(() => {
    if (!linha) {
      setEdicoes({});
      return;
    }
    const inicial: Record<string, string> = {};
    for (const campo of camposCorrigiveis) {
      inicial[campo] = valorCampo(linha, campo);
    }
    setEdicoes(inicial);
  }, [linha, camposCorrigiveis]);

  if (!linha) return null;

  const mensagens = mensagensLinhaPreVisualizacao(linha);
  const originais = linha.validacao?.dadosOriginais ?? {};
  const camposNormalizados = linha.validacao?.camposNormalizados ?? {};
  const rastreioCampos = Object.entries(camposNormalizados);
  const podeEditar = permissaoCorrigir && camposCorrigiveis.length > 0;
  const varianteBadge =
    linha.indicador === "erro" ? "error" : linha.indicador === "atencao" ? "secondary" : "success";
  const titulo = tituloDetalheLinha(linha);
  const metadadosArquivo = `Origem: ${origem} · Arquivo: ${nomeArquivo}`;
  const camposIdentidade =
    temCamposConferencia
      ? CAMPOS_IDENTIDADE
      : CAMPOS_IDENTIDADE.filter((item) => {
          const valor = linha.resumo?.[item.campo]?.trim();
          return Boolean(valor) && valor !== "—";
        });

  function handleSalvar() {
    if (!linha || !permissaoCorrigir) return;
    const mudancas: Record<string, string> = {};
    for (const [campo, valor] of Object.entries(edicoes)) {
      if (valor.trim() !== valorCampo(linha, campo).trim()) {
        mudancas[campo] = valor;
      }
    }
    onSalvarEdicoes(linha.linha, mudancas);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby={`${formId}-title`}
        aria-describedby={`${formId}-desc`}
        className="open:!w-[min(52rem,calc(100%-var(--spacing-xl)))]"
      >
        <DialogHeader className="gap-sm">
          <div className="flex items-start gap-md">
            <div className="flex min-w-0 flex-1 items-start gap-md">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary-fixed-dim/30 bg-primary-fixed/35 text-primary-container">
                <Icon icon={ClipboardList} size="md" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-sm">
                <DialogTitle id={`${formId}-title`} className="truncate text-headline-sm leading-snug" title={titulo}>
                  {titulo}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-sm">
                  <Badge variant={varianteBadge}>{ROTULO_INDICADOR[linha.indicador]}</Badge>
                  <Badge variant="secondary">Linha {linha.linha}</Badge>
                </div>
                <DialogDescription
                  id={`${formId}-desc`}
                  className="truncate text-body-sm text-on-surface-variant"
                  title={metadadosArquivo}
                >
                  {metadadosArquivo}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              aria-label="Fechar"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </DialogHeader>

        <DialogBody className="max-h-[min(70vh,38rem)] overflow-y-auto py-md">
          <div className="flex flex-col gap-lg">
            {camposIdentidade.length > 0 ? (
              <section className="flex flex-col gap-sm" aria-labelledby={`${formId}-identidade`}>
                <h2 id={`${formId}-identidade`} className="text-label-lg text-on-surface">
                  Identificação do registro
                </h2>
                <SheetPanel variant="tint" className="grid grid-cols-1 gap-x-lg gap-y-md min-[36rem]:grid-cols-3">
                  {camposIdentidade.map((item) => {
                    const valor = linha.resumo?.[item.campo]?.trim() || "—";
                    return (
                      <div key={item.campo} className="min-w-0 py-xs">
                        <p className="text-label-sm text-on-surface-variant">{item.rotulo}</p>
                        <p className="truncate text-body-md font-medium text-on-surface" title={valor}>
                          {valor}
                        </p>
                      </div>
                    );
                  })}
                </SheetPanel>
              </section>
            ) : null}

            <Tabs key={linha.linha} defaultValue="conferencia" className="flex flex-col gap-md">
              <TabsList>
                <TabsTrigger value="conferencia">Conferência</TabsTrigger>
                <TabsTrigger value="originais">Dados originais</TabsTrigger>
                <TabsTrigger value="normalizados">Dados normalizados</TabsTrigger>
              </TabsList>

              <TabsContent value="conferencia" className="mt-0 bg-transparent p-0">
                <div className="flex flex-col gap-md">
                  {linha.conflito ? (
                    <ConflitoLinhaImportacao
                      conflito={linha.conflito}
                      linha={linha.linha}
                      decisaoAtual={decisaoConflito}
                      onDecisaoChange={onDecisaoConflitoChange}
                      formIdPrefix={formId}
                      somenteLeitura={!permissaoDecidirConflito}
                    />
                  ) : null}
                  {mensagens.length > 0 ? (
                    <Alert variant={linha.indicador === "erro" ? "error" : "warning"} title="Inconsistências">
                      {mensagens.length === 1 ? (
                        mensagens[0]
                      ) : (
                        <ul className="flex list-disc flex-col gap-xs pl-md">
                          {mensagens.map((mensagem, indice) => (
                            <li key={`${indice}-${mensagem}`}>{mensagem}</li>
                          ))}
                        </ul>
                      )}
                    </Alert>
                  ) : null}

                  {temCamposConferencia ? (
                    <div className="flex flex-col gap-md">
                      <h3 className="text-label-lg text-on-surface">Valores para conferência</h3>
                      <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                        {CAMPOS_COMPONENTES_CONFERENCIA.map((item) => (
                          <FormField
                            key={item.campo}
                            label={item.rotulo}
                            htmlFor={`${formId}-${item.campo}`}
                          >
                            <Input
                              id={`${formId}-${item.campo}`}
                              value={edicoes[item.campo] ?? ""}
                              onChange={(event) =>
                                setEdicoes((atual) => ({ ...atual, [item.campo]: event.target.value }))
                              }
                              disabled={!podeEditar || salvando}
                              inputMode="decimal"
                              className="text-right tabular-nums"
                            />
                          </FormField>
                        ))}
                      </div>
                      <SheetPanel variant="tint" className="flex flex-col gap-sm">
                        <FormField label={CAMPO_TOTAL_CONFERENCIA.rotulo} htmlFor={`${formId}-valorAtualizado`}>
                          <Input
                            id={`${formId}-valorAtualizado`}
                            value={edicoes.valorAtualizado ?? ""}
                            onChange={(event) =>
                              setEdicoes((atual) => ({ ...atual, valorAtualizado: event.target.value }))
                            }
                            disabled={!podeEditar || salvando}
                            inputMode="decimal"
                            className="text-right text-body-lg font-semibold tabular-nums"
                          />
                        </FormField>
                        <p className="text-body-sm text-on-surface-variant">
                          Ajuste os valores acima ou o total consolidado, conforme a regra do módulo.
                        </p>
                      </SheetPanel>
                    </div>
                  ) : (
                    <ListaCampos
                      itens={colunas.map((coluna) => ({
                        rotulo: coluna.rotulo,
                        valor: coluna.valor(linha),
                      }))}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="originais" className="mt-0 bg-transparent p-0">
                {Object.keys(originais).length > 0 ? (
                  <ListaCampos
                    itens={Object.entries(originais).map(([campo, valor]) => ({
                      rotulo: rotuloCampo(campo),
                      valor: valor || "—",
                    }))}
                  />
                ) : (
                  <p className="text-body-sm text-on-surface-variant">
                    Não há valores originais do arquivo para esta linha.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="normalizados" className="mt-0 bg-transparent p-0">
                {rastreioCampos.length > 0 ? (
                  <Table showExport={false} className="min-w-[32rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead>Original</TableHead>
                        <TableHead>Normalizado</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rastreioCampos.map(([campo, resultado]) => (
                        <TableRow key={campo}>
                          <TableCell className="text-on-surface-variant">{rotuloCampo(campo)}</TableCell>
                          <TableCell>{resultado.original || "—"}</TableCell>
                          <TableCell className="font-medium">{resultado.normalizado || "—"}</TableCell>
                          <TableCell>{badgeSituacaoNormalizacao(situacaoNormalizacao(resultado))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-body-sm text-on-surface-variant">
                    Não há dados normalizados para esta linha.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-border-subtle">
          {podeEditar ? (
            <Button type="button" onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Aplicar correções na prévia"}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListaCampos({ itens }: { itens: Array<{ rotulo: string; valor: string }> }) {
  return (
    <dl className="grid gap-sm min-[480px]:grid-cols-2">
      {itens.map((item) => (
        <div key={item.rotulo} className="min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm">
          <dt className="text-label-sm uppercase tracking-wide text-on-surface-variant">{item.rotulo}</dt>
          <dd className="break-words text-body-md font-medium text-on-surface">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
