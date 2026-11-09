"use client";

import { CheckCircle2, Copy, FileWarning, Shield, Sparkles } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
import { Icon } from "@/components/icon";
import type { ResultadoConfirmacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";
import {
  badgeVariantSituacaoImportacao,
  normalizarSituacaoImportacao,
  rotuloSituacaoImportacao,
} from "@/lib/importacao-centro/situacao-importacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";

type Props = {
  resultado: ResultadoConfirmacaoModulo;
  moduloDestino: string;
  exibirManualProtegido?: boolean;
};

const faixaCard = {
  primary: "border-l-[3px] border-l-primary-container",
  brass: "border-l-[3px] border-l-brass",
  mist: "border-l-[3px] border-l-outline-variant",
  critical: "border-l-[3px] border-l-status-critical",
  tertiary: "border-l-[3px] border-l-tertiary-container",
} as const;

export function ImportacaoResultado({ resultado, moduloDestino, exibirManualProtegido }: Props) {
  const situacao = normalizarSituacaoImportacao(resultado.importacao.status);
  const falhou = situacao === "Falhou" || situacao === "Rejeitada";
  const parcial = situacao === "Concluida parcialmente";
  const sucesso = situacao === "Concluida" || situacao === "Aprovada";
  const moduloRotulo = ROTULO_MODULO_IMPORTACAO[moduloDestino] ?? moduloDestino;

  return (
    <div className="flex flex-col gap-md">
      <Alert
        variant={falhou ? "error" : sucesso ? "success" : parcial ? "warning" : "info"}
        title={
          falhou
            ? "Importação não concluída"
            : sucesso
              ? "Importação concluída com sucesso"
              : parcial
                ? "Importação concluída parcialmente"
                : "Importação finalizada"
        }
      >
        {falhou
          ? "Nenhum registro válido foi gravado. Revise o arquivo e tente novamente."
          : sucesso
            ? "Todos os registros previstos foram gravados."
            : parcial
              ? "Parte dos registros foi gravada. Revise duplicados e erros na listagem de importações."
              : "Confira o resumo abaixo e o histórico para mais detalhes."}
      </Alert>

      <section className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card">
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <h3 className="text-headline-sm text-on-surface">Relatório da importação</h3>
          <Badge variant={badgeVariantSituacaoImportacao(situacao)}>
            {rotuloSituacaoImportacao(situacao)}
          </Badge>
        </div>
        <dl className="grid gap-sm text-body-sm min-[480px]:grid-cols-2">
          <div className="min-w-0 min-[480px]:col-span-2">
            <dt className="text-on-surface-variant">Arquivo</dt>
            <dd className="font-medium text-on-surface break-words">{resultado.importacao.arquivo}</dd>
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
          className={faixaCard.primary}
          rotulo="Novos"
          valor={String(resultado.novos)}
          detalhe="Registros inseridos"
          icon={<Icon icon={Sparkles} size="md" className="text-primary-container" />}
          iconClassName="bg-primary-fixed/40 text-primary-container"
        />
        <CardMetric
          className={faixaCard.brass}
          rotulo="Atualizado"
          valor={String(resultado.atualizados)}
          detalhe="Registros alterados"
          icon={<Icon icon={CheckCircle2} size="md" className="text-brass" />}
          iconClassName="bg-gold-subtle text-brass"
        />
        <CardMetric
          className={faixaCard.mist}
          rotulo="Duplicados"
          valor={String(resultado.duplicados)}
          detalhe="Não gravados"
          icon={<Icon icon={Copy} size="md" className="text-on-surface-variant" />}
          iconClassName="bg-surface-dim text-on-surface-variant"
        />
        <CardMetric
          className={faixaCard.critical}
          rotulo="Erros na leitura"
          valor={String(resultado.erros)}
          detalhe="Linhas com falha"
          icon={<Icon icon={FileWarning} size="md" className="text-status-critical" />}
          iconClassName="bg-error-container text-status-critical"
        />
        {exibirManualProtegido ? (
          <CardMetric
            className={faixaCard.tertiary}
            rotulo="Manuais protegidos"
            valor={String(resultado.manualProtegido)}
            detalhe="Não sobrescritos"
            icon={<Icon icon={Shield} size="md" className="text-on-surface-variant" />}
            iconClassName="bg-surface-dim text-on-surface-variant"
          />
        ) : null}
      </CardMetricRow>
    </div>
  );
}
