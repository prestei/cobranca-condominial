"use client";

import { FileUp } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
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
import type { RetomadaImportacaoHistorico } from "@/lib/importacoes/historico-service";
import { normalizarSituacaoImportacao } from "@/lib/importacao-centro/situacao-importacao";
import { formatarData, nomeUsuario } from "@/data/catalogo";
import type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-auditoria";
import {
  badgeVariantSituacaoImportacao,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";

const ROTULO_ACAO: Record<string, string> = {
  arquivo_recebido: "Arquivo recebido",
  previa_gerada: "Prévia gerada",
  aprovacao_solicitada: "Aguardando aprovação",
  confirmacao_gravada: "Confirmação gravada",
  confirmacao_idempotente: "Reconfirmação (idempotente)",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importacao: ImportacaoConsulta | null;
  carregando?: boolean;
  retomada?: RetomadaImportacaoHistorico | null;
  podeExcluir?: boolean;
  onRetomar?: () => void;
  onExcluir?: () => void;
  retomando?: boolean;
};

function linhaMetrica(rotulo: string, valor: string) {
  return (
    <div className="min-w-0">
      <p className="text-label-sm uppercase text-on-surface-variant">{rotulo}</p>
      <p className="text-body-md font-medium tabular-nums text-on-surface">{valor}</p>
    </div>
  );
}

export function ImportacaoHistoricoDetalheSheet({
  open,
  onOpenChange,
  importacao,
  carregando,
  retomada,
  podeExcluir,
  onRetomar,
  onExcluir,
  retomando,
}: Props) {
  const titulo = importacao?.arquivo?.trim() || "Detalhes da importação";
  const pendente =
    importacao &&
    ["Aguardando conferencia", "Aguardando aprovacao", "Em processamento"].includes(
      normalizarSituacaoImportacao(importacao.status),
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby="importacao-historico-detalhe-title">
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={FileUp} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id="importacao-historico-detalhe-title">{titulo}</SheetTitle>
              <SheetDescription>
                Rastreabilidade do envio, conferência, aprovação e resultado da importação.
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          {carregando ? (
            <p className="text-body-sm text-on-surface-variant">Carregando detalhes…</p>
          ) : !importacao ? (
            <p className="text-body-sm text-on-surface-variant">Nenhum registro selecionado.</p>
          ) : (
            <div className="flex flex-col gap-lg">
              <div className="flex flex-wrap items-center gap-sm">
                <Badge variant={badgeVariantSituacaoImportacao(importacao.status)}>
                  {rotuloSituacaoImportacao(importacao.status)}
                </Badge>
                {importacao.processoId ? (
                  <span className="text-body-sm text-on-surface-variant">ID: {importacao.processoId}</span>
                ) : (
                  <span className="text-body-sm text-on-surface-variant">Registro #{importacao.id}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-md min-[480px]:grid-cols-3">
                {linhaMetrica("Módulo", ROTULO_MODULO_IMPORTACAO[importacao.tipo] ?? importacao.tipo)}
                {linhaMetrica("Origem", importacao.origem || "—")}
                {linhaMetrica("Processados", importacao.quantidadeRegistros || "0")}
                {linhaMetrica("Importados", importacao.quantidadeImportados || "0")}
                {linhaMetrica("Atualizados", importacao.quantidadeAtualizados || "0")}
                {linhaMetrica("Ignorados", importacao.quantidadeIgnorados ?? "0")}
                {linhaMetrica("Erros", importacao.quantidadeErros || "0")}
              </div>

              <div className="grid grid-cols-1 gap-sm border-t border-border-subtle/40 pt-md text-body-sm">
                <p>
                  <span className="text-on-surface-variant">Iniciado por:</span>{" "}
                  <span className="font-medium text-on-surface">{nomeUsuario(importacao.usuarioId)}</span>
                  {importacao.iniciadoEm ? (
                    <span className="text-on-surface-variant"> — {formatarData(importacao.iniciadoEm)}</span>
                  ) : null}
                </p>
                <p>
                  <span className="text-on-surface-variant">Aprovado por:</span>{" "}
                  <span className="font-medium text-on-surface">
                    {importacao.usuarioAprovacaoId ? nomeUsuario(importacao.usuarioAprovacaoId) : "—"}
                  </span>
                  {importacao.aprovadoEm ? (
                    <span className="text-on-surface-variant"> — {formatarData(importacao.aprovadoEm)}</span>
                  ) : null}
                </p>
                {importacao.resultadoFinanceiro ? (
                  <p>
                    <span className="text-on-surface-variant">Resultado financeiro (prévia):</span>{" "}
                    <span className="font-medium tabular-nums text-on-surface">
                      R$ {importacao.resultadoFinanceiro.valor.replace(".", ",")}
                    </span>
                  </p>
                ) : null}
                {importacao.hashArquivoMascarado ? (
                  <p className="text-on-surface-variant">Hash do arquivo: {importacao.hashArquivoMascarado}</p>
                ) : null}
              </div>

              {importacao.resumoInconsistencias ? (
                <section aria-labelledby="resumo-inconsistencias-titulo">
                  <h3 id="resumo-inconsistencias-titulo" className="text-title-sm text-on-surface">
                    Resumo de inconsistências
                  </h3>
                  <ul className="mt-sm list-disc space-y-xs pl-md text-body-sm text-on-surface-variant">
                    <li>Erros: {importacao.resumoInconsistencias.erros}</li>
                    <li>Atenção: {importacao.resumoInconsistencias.atencao}</li>
                    <li>Duplicados: {importacao.resumoInconsistencias.duplicados}</li>
                    <li>Revisões: {importacao.resumoInconsistencias.revisoes}</li>
                    <li>Manuais protegidos: {importacao.resumoInconsistencias.manualProtegido}</li>
                    <li>Ignorados: {importacao.resumoInconsistencias.ignorados}</li>
                  </ul>
                  {importacao.resumoInconsistencias.amostra.length > 0 ? (
                    <ul className="mt-sm max-h-40 overflow-y-auto rounded-md border border-border-subtle/50 p-sm text-body-sm">
                      {importacao.resumoInconsistencias.amostra.map((item) => (
                        <li key={`${item.linha}-${item.mensagem}`} className="text-on-surface-variant">
                          Linha {item.linha}: {item.mensagem}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              {importacao.acoes && importacao.acoes.length > 0 ? (
                <section aria-labelledby="acoes-importacao-titulo">
                  <h3 id="acoes-importacao-titulo" className="text-title-sm text-on-surface">
                    Ações registradas
                  </h3>
                  <ul className="mt-sm space-y-xs text-body-sm">
                    {importacao.acoes.map((item, index) => (
                      <li key={`${item.acao}-${item.em}-${index}`} className="text-on-surface-variant">
                        <span className="font-medium text-on-surface">
                          {ROTULO_ACAO[item.acao] ?? item.acao}
                        </span>
                        {" — "}
                        {nomeUsuario(item.usuarioId)}, {formatarData(item.em)}
                        {item.detalhe ? ` (${item.detalhe})` : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {pendente && retomada && !retomada.disponivel ? (
                <Alert variant="warning" title="Conferência pendente">
                  {retomada.motivo}
                </Alert>
              ) : null}
            </div>
          )}
        </SheetBody>
        {!carregando && importacao ? (
          <SheetFooter className="flex flex-wrap justify-end gap-sm">
            {retomada?.disponivel && onRetomar ? (
              <Button type="button" onClick={onRetomar} disabled={retomando}>
                {retomando ? "Abrindo…" : "Retomar conferência"}
              </Button>
            ) : null}
            {podeExcluir && onExcluir ? (
              <Button type="button" variant="outline" onClick={onExcluir}>
                Excluir registro
              </Button>
            ) : null}
            <Button type="button" variant={retomada?.disponivel ? "outline" : "primary"} onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
