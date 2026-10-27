"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Handshake, History } from "lucide-react";
import { Button } from "@/components/button";
import { PropostaNegociacaoSheet } from "@/components/negociacoes/proposta-negociacao-sheet";
import { Icon } from "@/components/icon";
import { usePermissao } from "@/hooks/use-permissao";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
import { HistoricoLinhaTempo } from "@/components/unidades/historico-linha-tempo";
import type { EventoHistoricoUnidade, HistoricoUnidadeReferencia } from "@/lib/historico-unidade/service";

type Props = {
  unidadeId: number | null;
  tituloUnidade?: string;
  tituloCondominio?: string;
  onClose: () => void;
};

export function HistoricoUnidadeSheet({ unidadeId, tituloUnidade, tituloCondominio, onClose }: Props) {
  const formId = useId();
  const { pode } = usePermissao();
  const [referencia, setReferencia] = useState<HistoricoUnidadeReferencia | null>(null);
  const [propostaAberta, setPropostaAberta] = useState(false);
  const [eventos, setEventos] = useState<EventoHistoricoUnidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (unidadeId === null) return;
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch(`/api/unidades/${unidadeId}/historico`, { credentials: "same-origin" });
      const payload = (await response.json()) as {
        error?: string;
        referencia?: HistoricoUnidadeReferencia;
        eventos?: EventoHistoricoUnidade[];
      };
      if (!response.ok) {
        setReferencia(null);
        setEventos([]);
        setErro(payload.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      setReferencia(payload.referencia ?? null);
      setEventos(payload.eventos ?? []);
    } finally {
      setLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    if (unidadeId === null) {
      setReferencia(null);
      setEventos([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [carregar, unidadeId]);

  const aberto = unidadeId !== null;
  const titulo = tituloUnidade ?? referencia?.unidade.identificacao ?? "Unidade";
  const condominio = tituloCondominio ?? referencia?.condominio.nome ?? "";

  return (
    <Sheet
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent aria-labelledby={`${formId}-historico-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={History} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-historico-title`}>{titulo}</SheetTitle>
              <SheetDescription>
                {condominio ? `${condominio} — linha do tempo da cobrança` : "Linha do tempo da cobrança"}
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
          {pode("atendimentos", "criar") && referencia ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setPropostaAberta(true)}>
              <Handshake className="size-4" aria-hidden />
              Proposta
            </Button>
          ) : null}
        </SheetHeader>
        <SheetBody>
          <SheetPanel className="max-h-[min(32rem,70vh)] overflow-y-auto">
            {referencia ? (
              <HistoricoLinhaTempo referencia={referencia} eventos={eventos} loading={loading} erro={erro} />
            ) : (
              <HistoricoLinhaTempo
                referencia={{
                  unidade: {
                    id: unidadeId ?? 0,
                    condominioId: 0,
                    identificacao: titulo,
                    bloco: "",
                    tipo: "",
                    status: "",
                    situacao: "",
                  },
                  condominio: { id: 0, nome: condominio || "—" },
                  cobranca: {
                    situacao: "—",
                    reResponsavel: null,
                    totalTentativas: 0,
                    ultimoContato: null,
                    debitosAbertos: 0,
                    valorAberto: 0,
                  },
                  debitos: [],
                }}
                eventos={[]}
                loading={loading}
                erro={erro}
              />
            )}
          </SheetPanel>
        </SheetBody>
      </SheetContent>
      <PropostaNegociacaoSheet
        unidadeId={propostaAberta ? unidadeId : null}
        condominioId={propostaAberta && referencia ? referencia.unidade.condominioId : null}
        tituloUnidade={titulo}
        tituloCondominio={condominio}
        onClose={() => setPropostaAberta(false)}
        onSalvo={() => void carregar()}
      />
    </Sheet>
  );
}
