"use client";

import { useEffect, useId, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Alert, type AlertVariant } from "@/components/alert";
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
import { FormField, Input, Textarea } from "@/components/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { SheetPanel } from "@/components/sheet";
import type { ColunaPreVisualizacaoImportacao, LinhaPreVisualizacaoImportacaoUi } from "@/components/importacao-pre-visualizacao/types";
import type { CategoriaValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import { montarResumoDebitoDeDadosOriginais } from "@/lib/importacao-centro/adaptadores/debitos";
import { mensagensLinhaPreVisualizacao, situacaoPermiteIgnorarNaPrevia } from "@/lib/importacao-centro/pre-visualizacao";

const rotuloCategoria: Record<CategoriaValidacaoImportacao, string> = {
  estrutural: "Estrutural",
  cadastral: "Cadastral",
  relacional: "Relacional",
  financeira: "Financeira",
  negocio: "Negócio",
};

const rotuloIndicador = {
  valido: "Válido",
  atencao: "Atenção",
  erro: "Erro",
} as const;

const badgeIndicador = {
  valido: "success",
  atencao: "neutral",
  erro: "error",
} as const;

const alertPorIndicador: Record<LinhaPreVisualizacaoImportacaoUi["indicador"], AlertVariant> = {
  valido: "success",
  atencao: "warning",
  erro: "error",
};

const COLUNAS_IDENTIDADE_DESTAQUE = ["condominio", "unidade"] as const;

function montarCamposCorrecao(
  colunasEditaveis: ColunaPreVisualizacaoImportacao[],
  rascunho: Record<string, string>,
): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const coluna of colunasEditaveis) {
    const campo = coluna.campoNormalizado;
    if (!campo) continue;
    const valor = rascunho[campo];
    if (typeof valor === "string") {
      campos[campo] = valor.trim();
    }
  }
  return campos;
}

function CelulaIdentidade({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-label-sm text-on-surface-variant">{rotulo}</p>
      <p
        className={`truncate text-on-surface ${destaque ? "text-headline-sm font-semibold" : "text-body-md font-medium"}`}
        title={valor !== "—" ? valor : undefined}
      >
        {valor}
      </p>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linha: LinhaPreVisualizacaoImportacaoUi | null;
  colunas: ColunaPreVisualizacaoImportacao[];
  origem: string;
  nomeArquivo: string;
  onSalvarEdicoes: (linha: number, valores: Record<string, string>) => void;
  onAlternarIgnorar: (linha: number) => void;
  salvando?: boolean;
  permissaoCorrigir?: boolean;
};

export function DetalheLinhaImportacao({
  open,
  onOpenChange,
  linha,
  colunas,
  origem,
  nomeArquivo,
  onSalvarEdicoes,
  onAlternarIgnorar,
  salvando,
  permissaoCorrigir = true,
}: Props) {
  const formId = useId();
  const titleId = useId();
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!linha) {
      setRascunho({});
      return;
    }
    const resumoExibicao =
      linha.resumo && Object.values(linha.resumo).some((v) => v?.trim() && v !== "—")
        ? linha.resumo
        : linha.validacao?.dadosOriginais
          ? montarResumoDebitoDeDadosOriginais(linha.validacao.dadosOriginais)
          : {};
    const inicial: Record<string, string> = { ...(linha.valoresEditados ?? {}) };
    for (const coluna of colunas) {
      if (!coluna.editavel || !coluna.campoNormalizado) continue;
      if (inicial[coluna.campoNormalizado]) continue;
      const doResumo =
        coluna.campoNormalizado === "valorAtualizado"
          ? resumoExibicao.total ?? resumoExibicao.valorAtualizado
          : resumoExibicao[coluna.id as keyof typeof resumoExibicao];
      if (doResumo && doResumo !== "—") inicial[coluna.campoNormalizado] = doResumo;
    }
    setRascunho(inicial);
  }, [linha, colunas]);

  if (!linha) return null;

  const mensagens = mensagensLinhaPreVisualizacao(linha);
  const dadosOriginais = linha.validacao?.dadosOriginais ?? {};
  const dadosNormalizados =
    linha.validacao?.dadosNormalizados && typeof linha.validacao.dadosNormalizados === "object"
      ? (linha.validacao.dadosNormalizados as Record<string, unknown>)
      : {};

  const podeIgnorar = situacaoPermiteIgnorarNaPrevia(linha.situacao, linha.ignoradoPeloUsuario);
  const colunasEditaveis = colunas.filter((c) => c.editavel && c.campoNormalizado);
  const colunasIdentidade = colunas.filter((c) => !c.editavel);
  const identidadeDestaque = colunasIdentidade.filter((c) =>
    (COLUNAS_IDENTIDADE_DESTAQUE as readonly string[]).includes(c.id),
  );
  const identidadeDemais = colunasIdentidade.filter(
    (c) => !(COLUNAS_IDENTIDADE_DESTAQUE as readonly string[]).includes(c.id),
  );
  const camposParaCorrecao = montarCamposCorrecao(colunasEditaveis, rascunho);
  const identidadeUnica =
    identidadeDestaque.length === 0 ? colunasIdentidade : [...identidadeDestaque, ...identidadeDemais];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="open:w-[min(44rem,calc(100%-var(--spacing-xl)))] max-h-[min(90vh,52rem)] overflow-hidden sm:max-w-none"
        aria-labelledby={titleId}
      >
        <DialogHeader className="gap-xs pb-0">
          <div className="flex items-start gap-md">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-primary-container"
              aria-hidden
            >
              <Icon icon={ClipboardCheck} size="md" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <div className="flex flex-wrap items-center gap-sm">
                <DialogTitle id={titleId} className="text-headline-sm">
                  Linha {linha.linha}
                </DialogTitle>
                <Badge variant={badgeIndicador[linha.indicador]}>{rotuloIndicador[linha.indicador]}</Badge>
                {linha.ignoradoPeloUsuario ? <Badge variant="secondary">Ignorado na prévia</Badge> : null}
              </div>
              <DialogDescription className="line-clamp-2">
                <span className="font-medium text-on-surface">{origem}</span>
                <span aria-hidden> · </span>
                <span title={nomeArquivo}>{nomeArquivo}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex max-h-[calc(90vh-10.5rem)] flex-col gap-md overflow-y-auto py-md">
          {mensagens.length > 0 ? (
            <Alert variant={alertPorIndicador[linha.indicador]} title="Observações desta linha">
              <ul className="list-inside list-disc space-y-xs">
                {mensagens.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {linha.correcoes && linha.correcoes.length > 0 ? (
            <SheetPanel variant="tint" className="py-sm">
              <p className="mb-xs text-label-lg text-on-surface">Correções já aplicadas na prévia</p>
              <ul className="space-y-xs text-body-sm text-on-surface-variant">
                {linha.correcoes.map((item) => (
                  <li key={`${item.campo}-${item.valorCorrigido}`}>
                    <span className="font-medium text-on-surface">{item.campo}</span>
                    <span className="tabular-nums">
                      {": "}
                      {item.valorOriginal} → {item.valorCorrigido}
                    </span>
                  </li>
                ))}
              </ul>
            </SheetPanel>
          ) : null}

          <SheetPanel className="flex flex-col gap-0 overflow-hidden p-0 shadow-card">
            {colunasIdentidade.length > 0 ? (
              <div className="flex flex-col gap-md bg-surface-subtle px-md py-md" aria-label="Dados do registro">
                {identidadeDestaque.length > 0 ? (
                  <div className="grid grid-cols-1 gap-md min-[400px]:grid-cols-2">
                    {identidadeDestaque.map((coluna) => (
                      <CelulaIdentidade
                        key={coluna.id}
                        rotulo={coluna.rotulo}
                        valor={coluna.valor(linha)}
                        destaque
                      />
                    ))}
                  </div>
                ) : null}

                {identidadeDemais.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-lg gap-y-md border-t border-border-subtle/50 pt-md min-[520px]:grid-cols-4">
                    {identidadeDemais.map((coluna) => (
                      <CelulaIdentidade key={coluna.id} rotulo={coluna.rotulo} valor={coluna.valor(linha)} />
                    ))}
                  </div>
                ) : identidadeDestaque.length === 0 ? (
                  <div className="grid grid-cols-2 gap-x-lg gap-y-md min-[520px]:grid-cols-3">
                    {identidadeUnica.map((coluna) => (
                      <CelulaIdentidade key={coluna.id} rotulo={coluna.rotulo} valor={coluna.valor(linha)} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Tabs defaultValue="conferencia" className="min-h-0">
              <TabsList className="w-full gap-0 bg-surface-card px-md">
                <TabsTrigger value="conferencia" className="flex-1 justify-center px-sm min-[480px]:px-md">
                  Conferência
                </TabsTrigger>
                <TabsTrigger value="originais" className="flex-1 justify-center px-sm min-[480px]:px-md">
                  Dados originais
                </TabsTrigger>
                <TabsTrigger value="normalizados" className="flex-1 justify-center px-sm min-[480px]:px-md">
                  Dados normalizados
                </TabsTrigger>
              </TabsList>

              <div className="border-t border-border-subtle bg-surface-card p-md">
                <TabsContent key="conferencia" value="conferencia" className="flex flex-col gap-md !bg-transparent !p-0">
                  {colunasEditaveis.length > 0 ? (
                    <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                      {colunasEditaveis.map((coluna) => {
                        const ehTotal = coluna.id === "total" || coluna.campoNormalizado === "valorAtualizado";
                        const alinhamentoDireita = coluna.alinhamento === "right";

                        if (ehTotal) {
                          return (
                            <div
                              key={coluna.id}
                              className="min-[480px]:col-span-2 rounded-lg border border-primary-fixed-dim/50 bg-primary-fixed/25 px-md py-sm"
                            >
                              <FormField label={coluna.rotulo} htmlFor={`${formId}-${coluna.id}`}>
                                <Input
                                  id={`${formId}-${coluna.id}`}
                                  value={rascunho[coluna.campoNormalizado!] ?? ""}
                                  readOnly={!permissaoCorrigir}
                                  className="border-border-subtle bg-surface-card text-right text-headline-sm font-semibold tabular-nums"
                                  onChange={(event) =>
                                    setRascunho((atual) => ({
                                      ...atual,
                                      [coluna.campoNormalizado!]: event.target.value,
                                    }))
                                  }
                                />
                              </FormField>
                            </div>
                          );
                        }

                        return (
                          <FormField key={coluna.id} label={coluna.rotulo} htmlFor={`${formId}-${coluna.id}`}>
                            <Input
                              id={`${formId}-${coluna.id}`}
                              value={rascunho[coluna.campoNormalizado!] ?? ""}
                              readOnly={!permissaoCorrigir}
                              className={alinhamentoDireita ? "text-right tabular-nums" : undefined}
                              onChange={(event) =>
                                setRascunho((atual) => ({
                                  ...atual,
                                  [coluna.campoNormalizado!]: event.target.value,
                                }))
                              }
                            />
                          </FormField>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-body-sm text-on-surface-variant">
                      Não há campos editáveis para este módulo nesta linha.
                    </p>
                  )}
                </TabsContent>

                <TabsContent key="originais" value="originais" className="flex flex-col gap-sm !bg-transparent !p-0">
                  <Textarea
                    readOnly
                    className="min-h-44 font-mono text-body-sm"
                    value={JSON.stringify(dadosOriginais, null, 2)}
                    aria-label="Dados originais do arquivo"
                  />
                </TabsContent>

                <TabsContent key="normalizados" value="normalizados" className="flex flex-col gap-md !bg-transparent !p-0">
                  <Textarea
                    readOnly
                    className="min-h-44 font-mono text-body-sm"
                    value={JSON.stringify(dadosNormalizados, null, 2)}
                    aria-label="Dados normalizados"
                  />
                  {linha.validacao?.inconsistencias.length ? (
                    <div className="rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm">
                      <p className="mb-sm text-label-lg text-on-surface">Inconsistências</p>
                      <ul className="space-y-xs text-body-sm">
                        {linha.validacao.inconsistencias.map((item) => (
                          <li key={`${item.codigo}-${item.mensagem}`}>
                            <span className="text-on-surface-variant">{rotuloCategoria[item.categoria]}:</span>{" "}
                            {item.mensagem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </TabsContent>
              </div>
            </Tabs>
          </SheetPanel>
        </DialogBody>

        <DialogFooter className="justify-between min-[480px]:justify-end">
          {permissaoCorrigir && podeIgnorar ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onAlternarIgnorar(linha.linha)}>
              {linha.ignoradoPeloUsuario ? "Desfazer ignorar" : "Ignorar registro"}
            </Button>
          ) : (
            <span className="hidden min-[480px]:inline" aria-hidden />
          )}
          <div className="flex w-full flex-wrap gap-sm min-[480px]:w-auto min-[480px]:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {permissaoCorrigir ? (
              <Button
                type="button"
                size="sm"
                disabled={salvando || Object.keys(camposParaCorrecao).length === 0}
                onClick={() => onSalvarEdicoes(linha.linha, camposParaCorrecao)}
              >
                {salvando ? "Revalidando…" : "Aplicar correções na prévia"}
              </Button>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Sem permissão para corrigir registros nesta importação.</p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
