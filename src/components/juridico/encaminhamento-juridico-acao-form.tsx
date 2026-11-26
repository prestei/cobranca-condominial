"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FileText, Flag } from "lucide-react";
import { Button } from "@/components/button";
import { FormField, Select, Textarea } from "@/components/input";
import { SheetHelpText } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { statusEncaminhamentoJuridico } from "@/data/catalogo";

const opcoesStatusAdvogado = statusEncaminhamentoJuridico.filter(
  (status) => status !== "Aguardando aprovação" && status !== "Rejeitado",
);

export type EncaminhamentoJuridicoAcaoFormHandle = {
  submit: () => Promise<void>;
};

type Props = {
  encaminhamentoId: string;
  statusInicial: string;
  /** Próximo status sugerido (ex.: ao abrir pelo botão do card). */
  statusSugerido?: string;
  observacoesIniciais?: string;
  onSalvo?: () => void;
  /** Campos sem botão — submit via rodapé do sheet. */
  somenteCampos?: boolean;
  onSalvandoChange?: (salvando: boolean) => void;
};

/** Formulário único para o advogado avançar o caso (status + observações). */
export const EncaminhamentoJuridicoAcaoForm = forwardRef<EncaminhamentoJuridicoAcaoFormHandle, Props>(
  function EncaminhamentoJuridicoAcaoForm(
    {
      encaminhamentoId,
      statusInicial,
      statusSugerido,
      observacoesIniciais = "",
      onSalvo,
      somenteCampos = false,
      onSalvandoChange,
    },
    ref,
  ) {
    const { toast } = useToast();
    const statusPadrao = statusSugerido ?? statusInicial;
    const [status, setStatus] = useState(statusPadrao);
    const [observacoes, setObservacoes] = useState(observacoesIniciais);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
      setStatus(statusSugerido ?? statusInicial);
      setObservacoes(observacoesIniciais);
    }, [encaminhamentoId, statusInicial, statusSugerido, observacoesIniciais]);

    async function salvar() {
      setSalvando(true);
      onSalvandoChange?.(true);
      try {
        const response = await fetch(`/api/juridico/encaminhamentos/${encaminhamentoId}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, observacoes }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast({ variant: "error", title: "Não foi possível salvar", description: payload.error });
          return;
        }
        toast({
        variant: "success",
        title: "Ação registrada",
        description: `O caso passou para: ${status}.`,
      });
        onSalvo?.();
      } finally {
        setSalvando(false);
        onSalvandoChange?.(false);
      }
    }

    useImperativeHandle(ref, () => ({ submit: salvar }), [encaminhamentoId, observacoes, onSalvo, onSalvandoChange, status]);

    return (
      <div className="flex flex-col gap-md">
        <SheetHelpText>
          {statusSugerido && statusSugerido !== statusInicial
            ? `Status atual: ${statusInicial}. Confirme ou ajuste o próximo passo (${statusSugerido}) e registre observações antes de salvar.`
            : "Escolha o próximo status do fluxo jurídico. Use observações para estratégia, pendências ou decisão — não repita o contexto do resumo."}
        </SheetHelpText>
        <FormField label="Próximo status">
          <Select icon={Flag} value={status} onChange={(event) => setStatus(event.target.value)}>
            {opcoesStatusAdvogado.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Observações internas">
          <Textarea
            icon={FileText}
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            rows={4}
            placeholder="Estratégia, pendências ou decisão tomada (opcional)."
          />
        </FormField>
        {!somenteCampos ? (
          <Button type="button" variant="primary" disabled={salvando} onClick={() => void salvar()}>
            {salvando ? "Salvando…" : "Salvar ação"}
          </Button>
        ) : null}
      </div>
    );
  },
);