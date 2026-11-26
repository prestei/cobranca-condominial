"use client";

import { ArrowLeft, Gavel, Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  ETAPAS_JURIDICO_ADVOGADO,
  etapaDoEncaminhamento,
} from "@/lib/juridico/etapas-advogado";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import {
  formatarData,
  formatarMoeda,
  nomeCondominio,
  nomeUnidade,
  type Cadastros,
} from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  Encaminhado: "secondary",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

const orientacaoPorStatus: Record<string, string> = {
  Encaminhado: "Caso encaminhado à carteira jurídica. Inicie a análise e registre o contexto no acompanhamento.",
  "Em análise": "Análise em andamento. Atualize o status conforme documentação e estratégia definidas.",
  "Documentação pendente": "Há pendências documentais. Registre referências internas nos documentos do caso.",
  "Aguardando decisão": "Defina a ação jurídica: ajuizamento, retorno à cobrança ou arquivamento.",
  "Pronto para ajuizamento": "Caso apto para ajuizamento. O sistema não envia automaticamente a tribunais.",
  "Retornado à cobrança amigável": "Caso devolvido à cobrança extrajudicial.",
  Arquivado: "Encaminhamento encerrado e arquivado.",
};

type Props = {
  item: EncaminhamentoJuridicoDetalhe | null;
  cadastros: Cadastros;
  podeEditar: boolean;
  onAbrirAcompanhamento: () => void;
  onVoltar?: () => void;
};

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros) {
  return cadastros.unidades.find((u) => u.id === unidadeId)?.identificacao?.trim() || nomeUnidade(unidadeId, cadastros);
}

export function EncaminhamentoJuridicoPainelDetalhe({
  item,
  cadastros,
  podeEditar,
  onAbrirAcompanhamento,
  onVoltar,
}: Props) {
  if (!item) {
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <EmptyState
          icon={<Icon icon={Scale} size="lg" className="text-on-surface-variant" />}
          title="Selecione um caso"
          description="Escolha um encaminhamento na lista para ver o resumo e abrir o acompanhamento completo."
          className="min-h-[16rem] flex-1"
        />
      </div>
    );
  }

  const etapa = etapaDoEncaminhamento(item.status);
  const etapaConfig = ETAPAS_JURIDICO_ADVOGADO.find((e) => e.id === etapa);
  const valorTotal = valorDebitosEncaminhamento(item, cadastros);
  const unidade = identificacaoUnidade(item.unidadeId, cadastros);
  const condominio = nomeCondominio(item.condominioId, cadastros);
  const qtdDocumentos = item.documentos?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-surface-card">
      <div className="flex shrink-0 items-start gap-sm border-b border-border-subtle px-md py-md min-[1024px]:px-lg">
        {onVoltar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 min-[1024px]:hidden"
            onClick={onVoltar}
            aria-label="Voltar à lista"
          >
            <Icon icon={ArrowLeft} size="sm" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-lg font-semibold text-on-surface">{condominio}</p>
          <p className="text-body-sm text-on-surface-variant">
            Unidade {unidade} · {formatarMoeda(String(valorTotal))}
          </p>
        </div>
        <Badge variant={badgeStatus[item.status] ?? "secondary"} className="shrink-0">
          {item.status}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-md min-[1024px]:p-lg">
        {etapaConfig ? (
          <p className="mb-md text-label-sm text-on-surface-variant">
            Etapa: <span className="font-medium text-on-surface">{etapaConfig.rotulo}</span>
          </p>
        ) : null}

        <p className="mb-lg text-body-sm text-on-surface">
          {orientacaoPorStatus[item.status] ?? etapaConfig?.descricaoCurta ?? "Acompanhe o caso no painel jurídico."}
        </p>

        <dl className="grid gap-sm text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">Condomínio</dt>
            <dd className="font-medium text-on-surface">{condominio}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Unidade</dt>
            <dd className="font-medium text-on-surface">{unidade}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Encaminhado em</dt>
            <dd className="font-medium text-on-surface">{formatarData(item.encaminhadoEm)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Documentos registrados</dt>
            <dd className="font-medium tabular-nums text-on-surface">{qtdDocumentos}</dd>
          </div>
        </dl>

        {item.resumoContexto ? (
          <div className="mt-lg border-t border-border-subtle pt-lg">
            <p className="text-label-md text-on-surface">Contexto</p>
            <p className="mt-sm whitespace-pre-wrap text-body-sm text-on-surface-variant">{item.resumoContexto}</p>
          </div>
        ) : null}

        {item.observacoes ? (
          <div className="mt-lg border-t border-border-subtle pt-lg">
            <p className="text-label-md text-on-surface">Observações</p>
            <p className="mt-sm whitespace-pre-wrap text-body-sm text-on-surface-variant">{item.observacoes}</p>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-sm border-t border-border-subtle p-md min-[1024px]:px-lg">
        <Button type="button" variant="primary" className="w-full min-[480px]:w-auto" onClick={onAbrirAcompanhamento}>
          {podeEditar ? (
            <>
              <Icon icon={Gavel} size="sm" className="shrink-0" aria-hidden />
              Abrir acompanhamento
            </>
          ) : (
            "Ver acompanhamento"
          )}
        </Button>
      </div>
    </div>
  );
}