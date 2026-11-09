"use client";

import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { FormField, Select } from "@/components/input";
import { SheetPanel } from "@/components/sheet";
import type { ConflitoImportacaoLinha } from "@/lib/importacao-centro/detecao-duplicidades/types";
import type { AcaoConflitoImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import {
  ROTULO_ACAO_CONFLITO,
  ROTULO_CORRESPONDENCIA,
  rotuloCriterioConflito,
} from "@/components/importacao-pre-visualizacao/rotulos-acao-conflito";

type Props = {
  conflito: ConflitoImportacaoLinha;
  linha: number;
  registroExistenteId?: number;
  decisaoAtual?: AcaoConflitoImportacao;
  onDecisaoChange?: (linha: number, acao: AcaoConflitoImportacao) => void;
  formIdPrefix: string;
  somenteLeitura?: boolean;
};

export function ConflitoLinhaImportacao({
  conflito,
  linha,
  registroExistenteId,
  decisaoAtual,
  onDecisaoChange,
  formIdPrefix,
  somenteLeitura = false,
}: Props) {
  const acoes = conflito.acoesPermitidas;
  if (acoes.length === 0) return null;

  const valorSelect = decisaoAtual ?? conflito.acaoPadrao;
  const exigeDecisaoExplicita =
    conflito.correspondencia === "possivel" && acoes.includes("atualizar_existente");

  return (
    <section className="flex flex-col gap-sm" aria-labelledby={`${formIdPrefix}-conflito-titulo`}>
      <h2 id={`${formIdPrefix}-conflito-titulo`} className="text-label-lg text-on-surface">
        Duplicidade e conflito com a base
      </h2>
      <Alert variant="warning" title={ROTULO_CORRESPONDENCIA[conflito.correspondencia]}>
        {registroExistenteId ?? conflito.registroExistenteId ? (
          <span className="block text-body-sm">
            Registro existente no sistema: ID{" "}
            <strong>{registroExistenteId ?? conflito.registroExistenteId}</strong>.
          </span>
        ) : null}
        {exigeDecisaoExplicita ? (
          <span className="mt-xs block text-body-sm">
            Atualizações exigem uma ação explícita antes da gravação.
          </span>
        ) : null}
      </Alert>

      <SheetPanel variant="tint" className="flex flex-col gap-md">
        {conflito.criteriosCoincidentes?.length ? (
          <div>
            <p className="text-label-sm text-on-surface-variant">Campos coincidentes</p>
            <div className="mt-xs flex flex-wrap gap-xs">
              {conflito.criteriosCoincidentes.map((c) => (
                <Badge key={c} variant="success">
                  {rotuloCriterioConflito(c)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        {conflito.criteriosDivergentes?.length ? (
          <div>
            <p className="text-label-sm text-on-surface-variant">Campos divergentes</p>
            <div className="mt-xs flex flex-wrap gap-xs">
              {conflito.criteriosDivergentes.map((c) => (
                <Badge key={c} variant="secondary">
                  {rotuloCriterioConflito(c)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {acoes.length > 1 && !somenteLeitura && onDecisaoChange ? (
          <FormField label="Ação para esta linha" htmlFor={`${formIdPrefix}-acao-conflito`}>
            <p className="mb-sm text-body-sm text-on-surface-variant">
              A decisão será registrada no histórico da importação.
            </p>
            <Select
              id={`${formIdPrefix}-acao-conflito`}
              value={valorSelect}
              onChange={(event) => onDecisaoChange(linha, event.target.value as AcaoConflitoImportacao)}
            >
              {acoes.map((acao) => (
                <option key={acao} value={acao}>
                  {ROTULO_ACAO_CONFLITO[acao]}
                  {acao === conflito.acaoPadrao ? " (padrão)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <p className="text-body-sm text-on-surface">
            Ação prevista:{" "}
            <span className="font-medium">{ROTULO_ACAO_CONFLITO[valorSelect]}</span>
          </p>
        )}
      </SheetPanel>
    </section>
  );
}
