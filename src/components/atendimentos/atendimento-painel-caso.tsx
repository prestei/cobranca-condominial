"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ClipboardList, Handshake, Scale } from "lucide-react";
import { AtendimentoLinhaTempoOperacao } from "@/components/atendimentos/atendimento-linha-tempo-operacao";
import { UnidadeIdentificacaoCirculo } from "@/components/atendimentos/unidade-identificacao-circulo";
import { AtalhosContatoAtendente } from "@/components/atendimentos/atalhos-contato-atendente";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { nomeCondominio } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { contatoResponsavelDaUnidade } from "@/lib/contato-responsavel";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { FilaCobrancaItem } from "@/lib/fila/service";

type Props = {
  item: FilaCobrancaItem | null;
  onNovaProposta?: () => void;
  onEncaminharJuridico?: () => void;
  onConcluirRetorno?: () => void;
  onSalvo?: () => void;
  onRegistrarCompleto?: (unidadeId: number, canal?: "WhatsApp" | "E-mail" | "Telefone") => void;
  /** Volta para a fila no layout mobile (estilo conversa). */
  onVoltar?: () => void;
};

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} · ${item.bloco}`;
  return item.identificacao;
}

function ChipSituacao({ situacao }: { situacao: string }) {
  if (situacao === "Em cobrança") {
    return (
      <span className="inline-flex shrink-0 rounded-full bg-secondary-fixed px-2.5 py-0.5 text-body-sm font-semibold text-on-secondary-fixed-variant">
        {situacao}
      </span>
    );
  }
  return (
    <span className="shrink-0">
      <BadgeSituacaoCobranca situacao={situacao} />
    </span>
  );
}

export function AtendimentoPainelCaso({
  item,
  onNovaProposta,
  onEncaminharJuridico,
  onConcluirRetorno,
  onSalvo,
  onRegistrarCompleto,
  onVoltar,
}: Props) {
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const podeProposta = pode("atendimentos", "criar");
  const podeRegistrar = pode("atendimentos", "criar");
  const podeJuridico = pode("juridico", "ler");
  const [canalPreferido, setCanalPreferido] = useState<"WhatsApp" | "E-mail" | "Telefone">("WhatsApp");
  const [refreshLinhaTempo, setRefreshLinhaTempo] = useState(0);

  const contato = useMemo(() => {
    if (!item) return contatoResponsavelDaUnidade(cadastros, 0);
    return contatoResponsavelDaUnidade(cadastros, item.unidadeId);
  }, [cadastros, item]);

  const marcasAtendimentoUnidade = useMemo(() => {
    if (!item) return "";
    return cadastros.atendimentos
      .filter((registro) => Number(registro.unidadeId) === item.unidadeId)
      .map((registro) => `${registro.id}:${registro.dataHora}`)
      .join("|");
  }, [cadastros.atendimentos, item]);

  useEffect(() => {
    setCanalPreferido("WhatsApp");
  }, [item?.unidadeId]);

  useEffect(() => {
    if (!item) return;
    setRefreshLinhaTempo((n) => n + 1);
  }, [item?.unidadeId, marcasAtendimentoUnidade]);

  if (!item) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-surface-container-low p-lg text-center">
        <p className="max-w-sm text-body-md text-on-surface-variant">
          Escolha uma unidade na fila para ver a linha do tempo e registrar contato.
        </p>
      </div>
    );
  }

  const rotulo = rotuloUnidade(item);
  const condominio = nomeCondominio(item.condominioId, cadastros);
  const nomeResponsavel = contato.nome.trim();
  const proximoRetorno = formatarProximoRetorno(item.proximoRetorno);
  const temRetorno = proximoRetorno !== "—" && item.retornoSituacao !== "concluido";

  const condominioVisivel = condominio.trim() && condominio !== "—" ? condominio : null;
  const partesContexto = [
    condominioVisivel,
    item.valorInadimplencia?.trim() ? item.valorInadimplencia : null,
    item.diasAtrasoMax > 0 ? `${item.diasAtrasoMax}d` : null,
    temRetorno ? `Retorno ${proximoRetorno}` : null,
  ].filter((parte): parte is string => Boolean(parte));
  const partesSubtitulo = [rotulo, ...partesContexto];

  return (
    <article className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-card">
      <header className="flex shrink-0 items-center gap-sm border-b border-border-subtle bg-surface-container-low px-sm py-2 min-[1024px]:px-md">
        {onVoltar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="!size-10 shrink-0 !p-0 max-[1023px]:inline-flex min-[1024px]:hidden"
            onClick={onVoltar}
            aria-label="Voltar para a fila"
          >
            <Icon icon={ChevronLeft} size="md" />
          </Button>
        ) : null}
        <UnidadeIdentificacaoCirculo identificacao={item.identificacao} className="max-[1023px]:size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 max-[1023px]:flex-col max-[1023px]:items-start max-[1023px]:gap-1">
            <h2
              className="min-w-0 text-label-lg text-on-surface max-[1023px]:line-clamp-2 min-[1024px]:truncate"
              title={nomeResponsavel || undefined}
            >
              {nomeResponsavel || "Responsável não cadastrado"}
            </h2>
            <ChipSituacao situacao={item.situacao} />
          </div>
          <p
            className="text-body-sm text-on-surface-variant max-[1023px]:line-clamp-2 min-[1024px]:truncate"
            title={partesSubtitulo.join(" · ")}
          >
            <span className="min-[1024px]:hidden">{partesContexto.join(" · ")}</span>
            <span className="hidden min-[1024px]:inline">{partesSubtitulo.join(" · ")}</span>
          </p>
        </div>
        {podeRegistrar ? (
          <AtalhosContatoAtendente
            operacao
            unidadeId={item.unidadeId}
            condominioId={item.condominioId}
            identificacao={item.identificacao}
            bloco={item.bloco}
            onIniciar={(canal) => {
              setCanalPreferido(canal);
            }}
          />
        ) : null}
      </header>

      <AtendimentoLinhaTempoOperacao
        unidadeId={item.unidadeId}
        refreshNonce={refreshLinhaTempo}
        acaoTopo={
          onConcluirRetorno ? (
            <div className="mb-md flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={onConcluirRetorno}>
                <Icon icon={Check} size="sm" aria-hidden />
                Concluir retorno
              </Button>
            </div>
          ) : null
        }
      />

      <footer className="shrink-0 border-t border-border-subtle bg-surface-container-low px-md py-sm">
        {podeProposta || podeJuridico || podeRegistrar ? (
          <div className="flex flex-col gap-1.5 min-[480px]:flex-row min-[480px]:items-stretch">
            {podeProposta ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="!h-10 min-w-0 w-full min-[480px]:flex-1 !px-2"
                disabled={!onNovaProposta}
                onClick={onNovaProposta}
              >
                <Icon icon={Handshake} size="sm" className="shrink-0" aria-hidden />
                <span className="truncate">Nova proposta</span>
              </Button>
            ) : null}
            {podeJuridico ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="!h-10 min-w-0 w-full min-[480px]:flex-1 !px-2"
                disabled={!onEncaminharJuridico}
                onClick={onEncaminharJuridico}
              >
                <Icon icon={Scale} size="sm" className="shrink-0" aria-hidden />
                <span className="truncate">Encaminhar p/ jurídico</span>
              </Button>
            ) : null}
            {podeRegistrar ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="!h-10 min-w-0 w-full min-[480px]:flex-1 !px-2"
                onClick={() => onRegistrarCompleto?.(item.unidadeId, canalPreferido)}
              >
                <Icon icon={ClipboardList} size="sm" className="shrink-0" aria-hidden />
                <span className="truncate">Registrar contato</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Sem permissão para ações nesta unidade.</p>
        )}
      </footer>
    </article>
  );
}
