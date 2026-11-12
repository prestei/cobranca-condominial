"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { AtendimentoLinhaTempoOperacao } from "@/components/atendimentos/atendimento-linha-tempo-operacao";
import { UnidadeIdentificacaoCirculo } from "@/components/atendimentos/unidade-identificacao-circulo";
import { AtalhosContatoAtendente } from "@/components/atendimentos/atalhos-contato-atendente";
import { BadgeSituacaoCobranca } from "@/components/badge-situacao-cobranca";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { type TableAction } from "@/components/table";
import { nomeCondominio } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  contatoResponsavelDaUnidade,
  hrefWhatsApp,
  numeroWhatsAppPreferido,
} from "@/lib/contato-responsavel";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { FilaCobrancaItem } from "@/lib/fila/service";
import { formatarTelefone } from "@/lib/telefone";

type Props = {
  item: FilaCobrancaItem | null;
  acoesExtras?: TableAction[];
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

export function AtendimentoPainelCaso({ item, acoesExtras, onSalvo, onRegistrarCompleto, onVoltar }: Props) {
  const cadastros = useCadastros();
  const { pode } = usePermissao();
  const podeRegistrar = pode("atendimentos", "criar");
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
  const whatsappNumero = numeroWhatsAppPreferido(contato);
  const whatsappFormatado = whatsappNumero ? formatarTelefone(whatsappNumero) : "";
  const linkWhatsApp = hrefWhatsApp(whatsappNumero);

  const menuAcoes: TableAction[] = acoesExtras ?? [];

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
        {linkWhatsApp && whatsappFormatado ? (
          <span className="hidden text-body-sm text-on-surface-variant min-[720px]:inline">
            <Icon icon={MessageCircle} size="sm" className="mr-1 inline text-status-settled" aria-hidden />
            {whatsappFormatado}
          </span>
        ) : null}
      </header>

      <AtendimentoLinhaTempoOperacao unidadeId={item.unidadeId} refreshNonce={refreshLinhaTempo} />

      <footer className="shrink-0 border-t border-border-subtle bg-surface-card px-md py-md">
        {podeRegistrar || menuAcoes.length > 0 ? (
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto">
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
              {menuAcoes.map((acao) => (
                <Button
                  key={acao.label}
                  type="button"
                  size="md"
                  variant={acao.destructive ? "critical" : "outline"}
                  className="!h-11 shrink-0 !px-3"
                  onClick={acao.onSelect}
                >
                  {acao.icon ? <Icon icon={acao.icon} size="sm" aria-hidden /> : null}
                  {acao.label}
                </Button>
              ))}
            </div>
            {podeRegistrar ? (
              <Button
                type="button"
                size="md"
                variant="primary"
                className="!h-11 shrink-0 !px-4"
                onClick={() => onRegistrarCompleto?.(item.unidadeId, canalPreferido)}
              >
                Registrar contato
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">Sem permissão para registrar contatos.</p>
        )}
      </footer>
    </article>
  );
}
