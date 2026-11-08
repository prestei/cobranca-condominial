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
  importacaoGravacaoSemExclusaoPorProblema,
  normalizarSituacaoImportacao,
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
  const situacao = normalizarSituacaoImportacao(status);
  const parcialRegistro = situacao === "Concluida parcialmente";
  const falhou = situacao === "Falhou" || situacao === "Rejeitada";
  const gravacaoLimpa = importacaoGravacaoSemExclusaoPorProblema({
    novos: resultado.novos,
    atualizados: resultado.atualizados,
    erros: resultado.erros,
    manualProtegido: resultado.manualProtegido,
  });
  const parcial = parcialRegistro && !gravacaoLimpa;
  const sucesso =
    importacaoConcluidaOuParcial(status) && !falhou && (situacao === "Concluida" || gravacaoLimpa);
  const situacaoBadge =
    sucesso && parcialRegistro ? "Concluida" : status;
  const moduloRotulo = ROTULO_MODULO_IMPORTACAO[moduloDestino] ?? moduloDestino;
  const gravados = resultado.novos + resultado.atualizados;
  const temDuplicados = resultado.duplicados > 0;

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
          ? "Nenhum registro válido foi gravado ou a operação falhou. Revise o arquivo e tente novamente."
          : sucesso
            ? temDuplicados
              ? `${gravados} registro(s) gravado(s). ${resultado.duplicados} duplicado(s) já existente(s) foram ignorados — isso é esperado em reimportações ou linhas repetidas no arquivo.`
              : "Todos os registros previstos foram gravados. Você pode concluir este assistente e consultar o histórico quando quiser."
            : parcial
              ? `${gravados} registro(s) foram gravados, mas parte do arquivo não pôde ser importada. Use «Ver detalhes» no histórico para revisar linhas com erro ou ignoradas.`
              : "Confira o resumo abaixo e o histórico para mais detalhes."}
      </Alert>

      <section className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card">
        <div className="mb-md flex flex-wrap items-center gap-sm">
          <h3 className="text-headline-sm text-on-surface">Relatório da importação</h3>
          <Badge variant={badgeVariantSituacaoImportacao(situacaoBadge)}>
            {rotuloSituacaoImportacao(situacaoBadge)}
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
          <div className="min-[480px]:col-span-2">
            <dt className="text-on-surface-variant">Total gravado nesta operação</dt>
            <dd className="font-semibold tabular-nums text-on-surface">
              {gravados} registro(s) ({resultado.novos} novo(s), {resultado.atualizados} atualizado(s))
            </dd>
          </div>
        </dl>
      </section>

      <CardMetricRow aria-label="Resultado da gravação" desktopCols={exibirManualProtegido ? 5 : 4}>
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
          rotulo="Duplicados"
          valor={String(resultado.duplicados)}
          detalhe="Já existiam na base"
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
