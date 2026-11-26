"use client";

import { useEffect, useState, type RefObject } from "react";
import { Scale } from "lucide-react";
import { Alert } from "@/components/alert";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import {
  EncaminhamentoJuridicoAcaoForm,
  type EncaminhamentoJuridicoAcaoFormHandle,
} from "@/components/juridico/encaminhamento-juridico-acao-form";
import { EncaminhamentoJuridicoDocumentosTab } from "@/components/juridico/encaminhamento-juridico-documentos-tab";
import { HistoricoLinhaTempo } from "@/components/unidades/historico-linha-tempo";
import {
  indicePassoKanban,
  PASSOS_FLUXO_KANBAN_JURIDICO,
} from "@/lib/juridico/kanban-colunas";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import type {
  EventoHistoricoUnidade,
  HistoricoUnidadeReferencia,
} from "@/lib/historico-unidade/service";
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
  Encaminhado:
    "Esta demanda está aguardando sua análise para definir a próxima ação.",
  "Em análise": "Análise em andamento. Atualize o status conforme documentação e estratégia definidas.",
  "Documentação pendente": "Há pendências documentais. Registre referências internas nos documentos do caso.",
  "Aguardando decisão": "Ação jurídica definida. Execute ou atualize o acompanhamento conforme o plano.",
  "Pronto para ajuizamento": "Caso em processo. O sistema não envia automaticamente a tribunais.",
  "Retornado à cobrança amigável": "Caso devolvido à cobrança extrajudicial.",
  Arquivado: "Encaminhamento encerrado e arquivado.",
};

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros) {
  return (
    cadastros.unidades.find((u) => u.id === unidadeId)?.identificacao?.trim() ||
    nomeUnidade(unidadeId, cadastros)
  );
}

function formatarDataHoraDetalhe(iso: string): string {
  const formatado = formatarData(iso);
  if (formatado === "—") return formatado;
  if (/\d{1,2}:\d{2}/.test(formatado)) return formatado;
  const hora = iso.includes("T") ? iso.slice(11, 16) : "";
  return hora && hora !== "00:00" ? `${formatado} às ${hora}` : formatado;
}

type Props = {
  item: EncaminhamentoJuridicoDetalhe | null;
  cadastros: Cadastros;
  podeEditar: boolean;
  onAbrirAcompanhamento?: () => void;
  onSalvo?: () => void;
  /** Recarrega dados do caso sem fechar o sheet (ex.: após novo documento). */
  onAtualizado?: () => void;
  /** Aba ao abrir o sheet (ex.: `acao` para casos novos). */
  abaInicial?: string;
  statusSugerido?: string;
  abaAtiva?: string;
  onAbaChange?: (aba: string) => void;
  acaoFormRef?: RefObject<EncaminhamentoJuridicoAcaoFormHandle | null>;
  onSalvandoAcaoChange?: (salvando: boolean) => void;
  /** Só abas (passos ficam no sheet pai). */
  somenteAbas?: boolean;
  modoSheet?: boolean;
  tituloId?: string;
};

export function EncaminhamentoJuridicoPainelDetalhe({
  item,
  cadastros,
  podeEditar,
  onAbrirAcompanhamento,
  onSalvo,
  onAtualizado,
  abaInicial = "resumo",
  statusSugerido,
  abaAtiva,
  onAbaChange,
  acaoFormRef,
  onSalvandoAcaoChange,
  somenteAbas = false,
  modoSheet = false,
  tituloId,
}: Props) {
  const [abaLocal, setAbaLocal] = useState(abaInicial);
  const aba = abaAtiva ?? abaLocal;

  function mudarAba(next: string) {
    onAbaChange?.(next);
    if (abaAtiva === undefined) {
      setAbaLocal(next);
    }
  }
  const [historicoReferencia, setHistoricoReferencia] = useState<HistoricoUnidadeReferencia | null>(null);
  const [historico, setHistorico] = useState<EventoHistoricoUnidade[]>([]);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);
  const [historicoErro, setHistoricoErro] = useState("");

  useEffect(() => {
    mudarAba(abaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reabre aba quando o caso ou aba inicial mudam
  }, [item?.id, abaInicial]);

  useEffect(() => {
    if (!item || aba !== "historico") return;
    let cancelado = false;
    setHistoricoCarregando(true);
    setHistoricoErro("");
    void (async () => {
      try {
        const response = await fetch(`/api/unidades/${item.unidadeId}/historico`, {
          credentials: "same-origin",
        });
        if (!response.ok) {
          if (!cancelado) setHistoricoErro("Não foi possível carregar o histórico.");
          return;
        }
        const payload = (await response.json()) as {
          eventos?: EventoHistoricoUnidade[];
          referencia?: HistoricoUnidadeReferencia;
        };
        if (!cancelado) {
          setHistorico(payload.eventos ?? []);
          setHistoricoReferencia(payload.referencia ?? null);
        }
      } catch {
        if (!cancelado) setHistoricoErro("Não foi possível carregar o histórico.");
      } finally {
        if (!cancelado) setHistoricoCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [item, aba]);

  if (!item) {
    return (
      <EmptyState
        icon={<Icon icon={Scale} size="lg" className="text-on-surface-variant" />}
        title="Selecione um caso"
        description="Escolha um caso na lista para ver o resumo e definir a próxima ação."
        className="min-h-[12rem]"
      />
    );
  }

  const valorTotal = valorDebitosEncaminhamento(item, cadastros);
  const unidade = identificacaoUnidade(item.unidadeId, cadastros);
  const condominio = nomeCondominio(item.condominioId, cadastros);
  const passoAtual = indicePassoKanban(item.status);
  const podeRegistrarAcao =
    podeEditar && item.status !== "Aguardando aprovação" && item.status !== "Rejeitado";
  const podeRegistrarDocumento = podeRegistrarAcao;

  const abas = (
    <Tabs value={aba} onValueChange={mudarAba} className="flex w-full min-w-0 flex-col gap-md">
      <TabsList className="w-full">
        <TabsTrigger value="resumo">Resumo</TabsTrigger>
        {podeRegistrarAcao ? <TabsTrigger value="acao">Ação</TabsTrigger> : null}
        <TabsTrigger value="historico">Histórico</TabsTrigger>
        <TabsTrigger value="documentos">Documentos</TabsTrigger>
      </TabsList>

      <TabsContent value="resumo" className="flex flex-col gap-md !bg-transparent !p-0">
        <Alert variant="info">
          {orientacaoPorStatus[item.status] ?? "Acompanhe o caso no painel jurídico."}
        </Alert>

        <p className="text-label-md text-on-surface">Informações do caso</p>
        <dl className="grid gap-md rounded-lg border border-border-subtle bg-surface-subtle/50 p-md text-body-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-on-surface-variant">Condomínio</dt>
            <dd className="break-words font-medium text-on-surface">{condominio}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Unidade</dt>
            <dd className="font-medium text-on-surface">{unidade}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Total do débito</dt>
            <dd className="font-medium tabular-nums text-on-surface">{formatarMoeda(String(valorTotal))}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Encaminhado em</dt>
            <dd className="font-medium text-on-surface">{formatarDataHoraDetalhe(item.encaminhadoEm)}</dd>
          </div>
        </dl>

        {item.resumoContexto ? (
          <div className="border-t border-border-subtle pt-md">
            <p className="text-label-md text-on-surface">Contexto</p>
            <p className="mt-sm break-words whitespace-pre-wrap text-body-sm text-on-surface-variant">
              {item.resumoContexto}
            </p>
          </div>
        ) : null}
      </TabsContent>

      {podeRegistrarAcao ? (
        <TabsContent value="acao" className="flex flex-col gap-md !bg-transparent !p-0">
          <Alert variant="info">{orientacaoPorStatus[item.status] ?? "Registre a próxima ação do caso."}</Alert>
          <EncaminhamentoJuridicoAcaoForm
            ref={acaoFormRef}
            encaminhamentoId={item.id}
            statusInicial={item.status}
            statusSugerido={statusSugerido}
            observacoesIniciais={item.observacoes ?? ""}
            onSalvo={onSalvo}
            somenteCampos={modoSheet}
            onSalvandoChange={onSalvandoAcaoChange}
          />
        </TabsContent>
      ) : null}

      <TabsContent value="historico" className="!bg-transparent !p-0">
        {historicoReferencia ? (
          <HistoricoLinhaTempo
            referencia={historicoReferencia}
            eventos={historico}
            loading={historicoCarregando}
            erro={historicoErro}
          />
        ) : historicoCarregando ? (
          <p className="text-body-sm text-on-surface-variant">Carregando histórico…</p>
        ) : historicoErro ? (
          <p className="text-body-sm text-error">{historicoErro}</p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Nenhum evento registrado ainda.</p>
        )}
      </TabsContent>

      <TabsContent value="documentos" className="!bg-transparent !p-0">
        <EncaminhamentoJuridicoDocumentosTab
          encaminhamentoId={item.id}
          documentos={item.documentos}
          podeEditar={podeRegistrarDocumento}
          onRegistrado={onAtualizado ?? onSalvo}
        />
      </TabsContent>
    </Tabs>
  );

  if (somenteAbas) {
    return abas;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-md">
      {!modoSheet ? (
        <div className="flex flex-wrap items-start justify-between gap-md border-b border-border-subtle pb-md">
          <div className="min-w-0 flex-1">
            <p id={tituloId} className="truncate text-headline-sm font-semibold text-on-surface">
              {condominio}
            </p>
            <p className="mt-xs text-body-md text-on-surface-variant">
              Unidade <span className="font-semibold text-on-surface">{unidade}</span>
              <span> · </span>
              <span className="font-semibold tabular-nums text-on-surface">
                {formatarMoeda(String(valorTotal))}
              </span>
            </p>
          </div>
          <Badge variant={badgeStatus[item.status] ?? "secondary"} className="shrink-0">
            {item.status}
          </Badge>
        </div>
      ) : null}

      {!somenteAbas && !modoSheet ? (
        <div className="rounded-lg border border-border-subtle bg-surface-card px-sm py-md">
          <FormSteps steps={PASSOS_FLUXO_KANBAN_JURIDICO} current={passoAtual} />
        </div>
      ) : null}

      {abas}

      {!modoSheet && onAbrirAcompanhamento ? (
        <div className="flex shrink-0 gap-sm border-t border-border-subtle pt-md">
          <Button type="button" variant="secondary" className="w-full min-[480px]:w-auto" onClick={onAbrirAcompanhamento}>
            Acompanhamento completo
          </Button>
        </div>
      ) : null}
    </div>
  );
}