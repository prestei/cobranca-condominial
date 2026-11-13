"use client";

import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/alert";
import { Icon } from "@/components/icon";
import { formatarMoeda } from "@/data/catalogo";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import { ROTULO_MODULO_IMPORTACAO } from "@/components/importacao-pre-visualizacao/config-modulos";

export type ImportacaoAprovacaoProps = {
  resumo: ResumoAprovacaoImportacao;
  usuarioResponsavel: string;
  confirmacaoMarcada: boolean;
  onConfirmacaoMarcadaChange: (valor: boolean) => void;
  cienciaParcial: boolean;
  onCienciaParcialChange: (valor: boolean) => void;
  confirmacaoJaEnviada?: boolean;
};

export function ImportacaoAprovacao({
  resumo,
  usuarioResponsavel,
  confirmacaoMarcada,
  onConfirmacaoMarcadaChange,
  cienciaParcial,
  onCienciaParcialChange,
  confirmacaoJaEnviada = false,
}: ImportacaoAprovacaoProps) {
  const baseId = useId();
  const moduloRotulo = ROTULO_MODULO_IMPORTACAO[resumo.moduloDestino] ?? resumo.moduloDestino;

  return (
    <div className="flex flex-col gap-md">
      {resumo.errosBloqueantes.length > 0 ? (
        <Alert variant="error" title="Confirmação bloqueada">
          {resumo.motivoBloqueio ?? resumo.errosBloqueantes.join(" ")}
        </Alert>
      ) : null}

      {resumo.arquivoJaImportado ? (
        <Alert variant="warning" title="Arquivo já importado">
          Este arquivo já foi gravado. Uma nova confirmação não duplicará registros.
        </Alert>
      ) : null}

      <section className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card">
        <h3 className="mb-sm text-headline-sm text-on-surface">Resumo da conferência nesta importação</h3>
        <dl className="grid gap-sm text-body-sm min-[480px]:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">Módulo de destino</dt>
            <dd className="font-medium text-on-surface">{moduloRotulo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Arquivo</dt>
            <dd className="font-medium text-on-surface">{resumo.arquivo}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Origem</dt>
            <dd className="font-medium text-on-surface">{resumo.origem}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Total de registros</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.quantidadeTotal}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Válidos</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.registrosValidos}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Com atenção</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.registrosAtencao}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Erros</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.registrosErro}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Serão ignorados</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.seraoIgnorados}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Novos</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.seraoNovos}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Atualizações</dt>
            <dd className="font-medium tabular-nums text-on-surface">{resumo.seraoAtualizados}</dd>
          </div>
          {resumo.totalFinanceiro ? (
            <div className="min-[480px]:col-span-2">
              <dt className="text-on-surface-variant">Total financeiro (registros a gravar)</dt>
              <dd className="font-medium tabular-nums text-on-surface">
                {formatarMoeda(resumo.totalFinanceiro.valor)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {!resumo.arquivoJaImportado ? (
        <p className="flex items-start gap-sm rounded-md bg-surface-subtle px-md py-sm text-body-sm text-on-surface">
          <Icon icon={AlertTriangle} size="sm" className="mt-0.5 shrink-0 text-brass" aria-hidden />
          <span>{resumo.mensagemImpacto}</span>
        </p>
      ) : null}

      <p className="text-body-sm text-on-surface-variant">
        Responsável pela conferência: <span className="font-medium text-on-surface">{usuarioResponsavel}</span>. O
        sistema registrará usuário e horário ao confirmar a gravação.
      </p>

      <div className="flex flex-col gap-sm rounded-lg border border-border-subtle p-md">
        <label className="flex cursor-pointer items-start gap-sm text-body-sm" htmlFor={`${baseId}-confirmar`}>
          <input
            id={`${baseId}-confirmar`}
            type="checkbox"
            className="mt-0.5"
            checked={confirmacaoMarcada}
            disabled={!resumo.podeConfirmar || confirmacaoJaEnviada}
            onChange={(event) => onConfirmacaoMarcadaChange(event.target.checked)}
          />
          <span>
            Confirmei a conferência dos registros nesta importação e autorizo a gravação.
          </span>
        </label>

        {resumo.importacaoParcial ? (
          <label className="flex cursor-pointer items-start gap-sm text-body-sm" htmlFor={`${baseId}-parcial`}>
            <input
              id={`${baseId}-parcial`}
              type="checkbox"
              className="mt-0.5"
              checked={cienciaParcial}
              disabled={!resumo.podeConfirmar || confirmacaoJaEnviada}
              onChange={(event) => onCienciaParcialChange(event.target.checked)}
            />
            <span>
              Estou ciente de que parte dos registros do arquivo não será gravada nesta importação (
              {resumo.registrosErro + resumo.seraoIgnorados} ficarão de fora).
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function podeEnviarAprovacaoImportacao(
  resumo: ResumoAprovacaoImportacao,
  confirmacaoMarcada: boolean,
  cienciaParcial: boolean,
  extras?: { processando?: boolean; confirmacaoJaEnviada?: boolean; permissaoAprovar?: boolean },
): boolean {
  if (extras?.processando || extras?.confirmacaoJaEnviada || extras?.permissaoAprovar === false) return false;
  if (!resumo.podeConfirmar) return false;
  if (!confirmacaoMarcada) return false;
  if (resumo.importacaoParcial && !cienciaParcial) return false;
  return true;
}
