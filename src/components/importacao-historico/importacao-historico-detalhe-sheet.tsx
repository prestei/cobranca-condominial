"use client";

import { History } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { SkeletonPanel } from "@/components/skeleton";
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
import { formatarData, nomeUsuario } from "@/data/catalogo";
import type { ImportacaoConsulta } from "@/lib/importacao-centro/historico-auditoria";
import type { RetomadaImportacaoHistorico } from "@/lib/importacoes/historico-service";
import {
  badgeVariantSituacaoImportacao,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importacao: ImportacaoConsulta | null;
  carregando?: boolean;
  retomada?: RetomadaImportacaoHistorico | null;
  podeExcluir?: boolean;
  onRetomar: () => void;
  onExcluir: () => void;
  retomando?: boolean;
};

export function ImportacaoHistoricoDetalheSheet({
  open,
  onOpenChange,
  importacao,
  carregando = false,
  retomada,
  podeExcluir = false,
  onRetomar,
  onExcluir,
  retomando = false,
}: Props) {
  const titulo = importacao?.arquivo ?? "Detalhe da importação";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby="importacao-historico-title" aria-describedby="importacao-historico-desc">
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={History} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id="importacao-historico-title">{titulo}</SheetTitle>
              <SheetDescription id="importacao-historico-desc">
                Histórico do arquivo importado, contagens e trilha de ações.
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          {carregando ? <SkeletonPanel /> : null}
          {!carregando && importacao ? (
            <div className="flex flex-col gap-md">
              <div className="flex flex-wrap items-center gap-sm">
                <Badge variant={badgeVariantSituacaoImportacao(importacao.status)}>
                  {rotuloSituacaoImportacao(importacao.status)}
                </Badge>
                <span className="text-body-sm text-on-surface-variant">{importacao.tipo}</span>
              </div>
              <dl className="grid gap-sm text-body-sm min-[480px]:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">Origem</dt>
                  <dd className="font-medium text-on-surface">{importacao.origem || "—"}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Quem importou</dt>
                  <dd className="font-medium text-on-surface">{nomeUsuario(importacao.usuarioId)}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Data</dt>
                  <dd className="font-medium text-on-surface">
                    {importacao.dataImportacao ? formatarData(importacao.dataImportacao.slice(0, 10)) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Processo</dt>
                  <dd className="font-medium text-on-surface">{importacao.processoId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Registros</dt>
                  <dd className="font-medium tabular-nums text-on-surface">{importacao.quantidadeRegistros}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Importados</dt>
                  <dd className="font-medium tabular-nums text-on-surface">{importacao.quantidadeImportados}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Atualizados</dt>
                  <dd className="font-medium tabular-nums text-on-surface">{importacao.quantidadeAtualizados}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Erros</dt>
                  <dd className="font-medium tabular-nums text-on-surface">{importacao.quantidadeErros}</dd>
                </div>
              </dl>
              {importacao.hashArquivoMascarado ? (
                <p className="text-body-sm text-on-surface-variant">Hash: {importacao.hashArquivoMascarado}</p>
              ) : null}
              {importacao.resumoInconsistencias ? (
                <p className="text-body-sm text-on-surface-variant">
                  Inconsistências: {importacao.resumoInconsistencias.erros} erro(s),{" "}
                  {importacao.resumoInconsistencias.atencao} atenção.
                </p>
              ) : null}
              {importacao.acoes && importacao.acoes.length > 0 ? (
                <section className="flex flex-col gap-xs">
                  <h3 className="text-label-lg text-on-surface">Trilha</h3>
                  <ul className="flex flex-col gap-xs text-body-sm">
                    {importacao.acoes.map((acao, indice) => (
                      <li key={`${acao.acao}-${acao.em}-${indice}`} className="text-on-surface">
                        {acao.acao} · {nomeUsuario(acao.usuarioId)} · {acao.em.slice(0, 16).replace("T", " ")}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {retomada && !retomada.disponivel ? (
                <p className="text-body-sm text-on-surface-variant">{retomada.motivo}</p>
              ) : null}
            </div>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {podeExcluir ? (
            <Button type="button" variant="critical" onClick={onExcluir}>
              Excluir histórico
            </Button>
          ) : null}
          {retomada?.disponivel ? (
            <Button type="button" onClick={onRetomar} disabled={retomando}>
              {retomando ? "Retomando…" : "Retomar conferência"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
