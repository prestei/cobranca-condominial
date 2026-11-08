"use client";

import { CheckCircle2, Copy, FileWarning, Sparkles } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { Icon } from "@/components/icon";
import type { ResultadoConfirmacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";
import {
  badgeVariantSituacaoImportacao,
  importacaoConcluidaOuParcial,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";

type Props = {
  resultado: ResultadoConfirmacaoModulo;
  moduloDestino: string;
  exibirManualProtegido?: boolean;
};

export function ImportacaoResultado({ resultado, moduloDestino, exibirManualProtegido }: Props) {
  const status = resultado.importacao.status;
  const situacaoRotulo = rotuloSituacaoImportacao(status);
  const parcial = situacaoRotulo.toLowerCase().includes("parcial");
  const sucesso = importacaoConcluidaOuParcial(status) && !parcial;
  const moduloRotulo = ROTULO_MODULO_IMPORTACAO[moduloDestino] ?? moduloDestino;

  return (
    <div className="flex flex-col gap-md">
      <Alert
        variant={sucesso ? "success" : parcial ? "warning" : "info"}
        title={sucesso ? "Importação concluída" : parcial ? "Importação concluída parcialmente" : "Importação finalizada"}
      >
        {sucesso
          ? "Os registros válidos foram gravados. Você pode fechar este assistente e conferir o histórico."
          : parcial
            ? "Parte dos registros foi gravada. Revise duplicados e erros na listagem de importações."
            : "Confira o resumo abaixo e o histórico para mais detalhes."}
      </Alert>

      <section className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card">
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <h3 className="text-headline-sm text-on-surface">Relatório da importação</h3>
          <Badge variant={badgeVariantSituacaoImportacao(status)}>{situacaoRotulo}</Badge>
        </div>
        <dl className="grid gap-sm text-body-sm min-[480px]:grid-cols-2">
          <div className="min-w-0 min-[480px]:col-span-2">
            <dt className="text-on-surface-variant">Arquivo</dt>
            <dd className="font-medium text-on-surface">{resultado.importacao.arquivo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Módulo</dt>
            <dd className="font-medium text-on-surface">{moduloRotulo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Origem</dt>
            <dd className="font-medium text-on-surface">{resultado.importacao.origem || "—"}</dd>
          </div>
        </dl>
      </section>

      <CardMetricRow aria-label="Resultado da gravação" desktopCols={4}>
        <CardMetric
          accent="primary"
          rotulo="Novos"
          valor={String(resultado.novos)}
          detalhe="Registros inseridos"
          icon={<Icon icon={Sparkles} size="md" className="text-primary-container" />}
        />
        <CardMetric
          accent="brass"
          rotulo="Atualizados"
          valor={String(resultado.atualizados)}
          detalhe="Registros alterados"
          icon={<Icon icon={CheckCircle2} size="md" className="text-brass" />}
        />
        <CardMetric
          accent="mist"
          rotulo="Duplicados/ignorados"
          valor={String(resultado.duplicados)}
          detalhe="Não gravados"
          icon={<Icon icon={Copy} size="md" className="text-on-surface-variant" />}
        />
        <CardMetric
          accent="critical"
          rotulo="Erros na leitura"
          valor={String(resultado.erros)}
          detalhe="Linhas com falha"
          icon={<Icon icon={FileWarning} size="md" className="text-status-critical" />}
        />
        {exibirManualProtegido ? (
          <CardMetric
            accent="tertiary"
            rotulo="Manuais protegidos"
            valor={String(resultado.manualProtegido)}
            detalhe="Não sobrescritos"
            icon={<Icon icon={FileWarning} size="md" className="text-on-surface-variant" />}
          />
        ) : null}
      </CardMetricRow>
    </div>
  );
}
