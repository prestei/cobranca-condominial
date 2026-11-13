"use client";

import { useId } from "react";
import { Handshake } from "lucide-react";
import { Icon } from "@/components/icon";
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
  SheetTitle,
} from "@/components/sheet";
import { PropostaNegociacaoDetalheConteudo } from "@/components/negociacoes/proposta-negociacao-detalhe-conteudo";
import { useCadastros } from "@/hooks/use-cadastros";
import { nomeCondominio, nomeUnidade } from "@/data/catalogo";

type Props = {
  propostaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
};

/** Mobile: detalhe em sheet. Desktop usa o painel fixo em `/negociacoes`. */
export function PropostaDetalheSheet({ propostaId, open, onOpenChange, onChanged }: Props) {
  const formId = useId();
  const cadastros = useCadastros();
  const proposta = propostaId ? cadastros.propostasNegociacao.find((item) => item.id === propostaId) : undefined;
  const titulo = proposta
    ? `${nomeUnidade(proposta.unidadeId, cadastros)} · ${nomeCondominio(proposta.condominioId, cadastros)}`
    : "Proposta de negociação";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${formId}-detalhe-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Handshake} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-detalhe-title`}>Tratativa</SheetTitle>
              <SheetDescription>{titulo}</SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          <PropostaNegociacaoDetalheConteudo
            propostaId={propostaId}
            ativo={open}
            onChanged={onChanged}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
