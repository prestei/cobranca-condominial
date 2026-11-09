"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FileSearch } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import type { ColunaPreVisualizacao, LinhaPreVisualizacaoImportacaoUi } from "@/components/importacao-pre-visualizacao/types";
import { CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS } from "@/lib/importacao-centro/correcao-previa/modulos/debitos";
import { mensagensLinhaPreVisualizacao, situacaoPermiteIgnorarNaPrevia } from "@/lib/importacao-centro/pre-visualizacao";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linha: LinhaPreVisualizacaoImportacaoUi | null;
  colunas: ColunaPreVisualizacao[];
  origem: string;
  nomeArquivo: string;
  onSalvarEdicoes: (linha: number, valores: Record<string, string>) => void;
  onAlternarIgnorar: (linha: number) => void;
  salvando?: boolean;
  permissaoCorrigir?: boolean;
};

function valorCampo(linha: LinhaPreVisualizacaoImportacaoUi, campo: string): string {
  return linha.valoresEditados?.[campo] ?? linha.resumo?.[campo] ?? "";
}

export function DetalheLinhaImportacao({
  open,
  onOpenChange,
  linha,
  colunas,
  origem,
  nomeArquivo,
  onSalvarEdicoes,
  onAlternarIgnorar,
  salvando = false,
  permissaoCorrigir = false,
}: Props) {
  const formId = useId();
  const camposCorrigiveis = useMemo(
    () =>
      colunas.filter((coluna) => {
        const campo = coluna.id === "total" ? "valorAtualizado" : coluna.id;
        return CAMPOS_CORRIGIVEIS_PREVIA_DEBITOS.has(campo);
      }),
    [colunas],
  );
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!linha) {
      setEdicoes({});
      return;
    }
    const inicial: Record<string, string> = {};
    for (const coluna of camposCorrigiveis) {
      const campo = coluna.id === "total" ? "valorAtualizado" : coluna.id;
      inicial[campo] = valorCampo(linha, coluna.id === "total" ? "total" : campo) || valorCampo(linha, campo);
    }
    setEdicoes(inicial);
  }, [linha, camposCorrigiveis]);

  if (!linha) return null;

  const mensagens = mensagensLinhaPreVisualizacao(linha);
  const originais = linha.validacao?.dadosOriginais ?? {};
  const camposNormalizados = linha.validacao?.camposNormalizados ?? {};
  const rastreioCampos = Object.entries(camposNormalizados);
  const podeIgnorar = situacaoPermiteIgnorarNaPrevia(linha.situacao, linha.ignoradoPeloUsuario);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-desc`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={FileSearch} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-title`}>Linha {linha.linha}</SheetTitle>
              <SheetDescription id={`${formId}-desc`}>
                {nomeArquivo} · {origem}
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          <div className="flex flex-wrap items-center gap-sm">
            <Badge variant={linha.indicador === "erro" ? "error" : linha.indicador === "atencao" ? "secondary" : "success"}>
              {linha.situacao}
            </Badge>
            {linha.ignoradoPeloUsuario ? <Badge variant="secondary">Ignorada na prévia</Badge> : null}
          </div>

          {mensagens.length > 0 ? (
            <Alert variant={linha.indicador === "erro" ? "error" : "warning"} title="Inconsistências">
              {mensagens.join(" ")}
            </Alert>
          ) : null}

          <dl className="grid gap-sm text-body-sm">
            {colunas.map((coluna) => (
              <div key={coluna.id}>
                <dt className="text-on-surface-variant">{coluna.rotulo}</dt>
                <dd className="font-medium text-on-surface">{coluna.valor(linha)}</dd>
              </div>
            ))}
          </dl>

          {rastreioCampos.length > 0 ? (
            <section className="flex flex-col gap-xs">
              <h3 className="text-label-lg text-on-surface">Original e normalizado</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="text-left text-on-surface-variant">
                      <th className="pr-sm font-medium">Campo</th>
                      <th className="pr-sm font-medium">Original</th>
                      <th className="pr-sm font-medium">Normalizado</th>
                      <th className="font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rastreioCampos.map(([campo, resultado]) => {
                      const situacao = resultado.erro
                        ? "não interpretado"
                        : resultado.ambiguo
                          ? "ambíguo"
                          : resultado.vazio
                            ? "vazio"
                            : "ok";
                      return (
                        <tr key={campo} className="align-top">
                          <td className="pr-sm text-on-surface-variant">{campo}</td>
                          <td className="pr-sm text-on-surface">{resultado.original || "—"}</td>
                          <td className="pr-sm font-medium text-on-surface">{resultado.normalizado || "—"}</td>
                          <td className="text-on-surface-variant">{situacao}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : Object.keys(originais).length > 0 ? (
            <section className="flex flex-col gap-xs">
              <h3 className="text-label-lg text-on-surface">Valores originais do arquivo</h3>
              <dl className="grid gap-xs text-body-sm min-[480px]:grid-cols-2">
                {Object.entries(originais).map(([campo, valor]) => (
                  <div key={campo}>
                    <dt className="text-on-surface-variant">{campo}</dt>
                    <dd className="text-on-surface">{valor || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {permissaoCorrigir && camposCorrigiveis.length > 0 ? (
            <section className="flex flex-col gap-sm">
              <h3 className="text-label-lg text-on-surface">Corrigir valores</h3>
              {camposCorrigiveis.map((coluna) => {
                const campo = coluna.id === "total" ? "valorAtualizado" : coluna.id;
                return (
                  <FormField key={campo} label={coluna.rotulo} htmlFor={`${formId}-${campo}`}>
                    <Input
                      id={`${formId}-${campo}`}
                      value={edicoes[campo] ?? ""}
                      onChange={(event) =>
                        setEdicoes((atual) => ({ ...atual, [campo]: event.target.value }))
                      }
                    />
                  </FormField>
                );
              })}
            </section>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {podeIgnorar ? (
            <Button type="button" variant="secondary" onClick={() => onAlternarIgnorar(linha.linha)}>
              {linha.ignoradoPeloUsuario ? "Restaurar linha" : "Ignorar na prévia"}
            </Button>
          ) : null}
          {permissaoCorrigir && camposCorrigiveis.length > 0 ? (
            <Button type="button" onClick={handleSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar correção"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
