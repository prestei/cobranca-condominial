"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Building2, DoorOpen, FileText, Handshake, Wallet } from "lucide-react";
import { Icon } from "@/components/icon";
import { FormField, Input, Switch, Textarea } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import {
  debitoEmAberto,
  formatarData,
  formatarMoeda,
  type Cadastros,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { useCadastrosStatus } from "@/hooks/use-cadastros";
import { aplicarMascaraMoedaPtBr } from "@/lib/moeda-input";
import type { PropostaNegociacaoDetalhe } from "@/lib/negociacoes/detalhe";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detalhe: PropostaNegociacaoDetalhe | null;
  cadastros: Cadastros;
  onSalvo?: () => void;
};

export function PropostaEdicaoSheet({ open, onOpenChange, detalhe, cadastros, onSalvo }: Props) {
  const formId = useId();
  const { refetch } = useCadastrosStatus();
  const { toast } = useToast();

  const [valorProposto, setValorProposto] = useState("");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [debitoIds, setDebitoIds] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);

  const proposta = detalhe?.proposta ?? null;

  const debitosSelecionaveis = useMemo(() => {
    if (!proposta) return [];
    return cadastros.debitos.filter((item) => item.unidadeId === proposta.unidadeId && debitoEmAberto(item));
  }, [cadastros.debitos, proposta]);

  useEffect(() => {
    if (!open || !proposta) return;
    setValorProposto(proposta.valorProposto);
    setQuantidadeParcelas(proposta.quantidadeParcelas != null ? String(proposta.quantidadeParcelas) : "");
    setObservacoes(proposta.observacoes ?? "");
    const permitidos = new Set(debitosSelecionaveis.map((item) => item.id));
    const vinculados = (proposta.debitoIds ?? []).filter((id) => permitidos.has(id));
    setDebitoIds(vinculados.length > 0 ? vinculados : [...permitidos]);
  }, [open, proposta, debitosSelecionaveis]);

  function toggleDebito(id: number) {
    setDebitoIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposta) return;
    if (debitoIds.length === 0) {
      toast({ variant: "error", title: "Proposta", description: "Selecione ao menos um débito." });
      return;
    }
    setSalvando(true);
    try {
      const response = await fetch(`/api/propostas/${proposta.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorProposto,
          observacoes,
          debitoIds,
          quantidadeParcelas: quantidadeParcelas.trim() ? Number(quantidadeParcelas) : null,
        }),
      });
      const payload = (await response.json()) as { error?: string; proposta?: PropostaNegociacao };
      if (!response.ok || !payload.proposta) {
        toast({ variant: "error", title: "Não foi possível salvar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Proposta atualizada" });
      void refetch();
      onSalvo?.();
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  }

  const invalido = !valorProposto.trim() || debitoIds.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${formId}-edicao-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Handshake} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-edicao-title`}>Editar proposta</SheetTitle>
              <SheetDescription>
                Ajuste valor, parcelas, débitos vinculados e observações — sujeito à alçada do advogado.
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        {proposta && detalhe ? (
          <SheetForm onSubmit={(event) => void handleSubmit(event)}>
            <SheetBody className="flex flex-col gap-md">
              <div className="rounded-md border border-border-subtle bg-surface-container px-md py-sm text-body-sm">
                <p className="flex items-center gap-sm text-on-surface">
                  <Icon icon={Building2} size="sm" aria-hidden />
                  {detalhe.condominioNome}
                </p>
                <p className="mt-xs flex items-center gap-sm text-on-surface-variant">
                  <Icon icon={DoorOpen} size="sm" aria-hidden />
                  {detalhe.unidadeIdentificacao} · criada em {formatarData(proposta.criadoEm)}
                </p>
              </div>
              <FormField label="Valor proposto (R$)" required>
                <Input
                  icon={Wallet}
                  value={valorProposto}
                  onChange={(event) => setValorProposto(aplicarMascaraMoedaPtBr(event.target.value))}
                  inputMode="numeric"
                  placeholder="0,00"
                  required
                />
              </FormField>
              <FormField label="Quantidade de parcelas">
                <Input
                  value={quantidadeParcelas}
                  onChange={(event) => setQuantidadeParcelas(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="Ex.: 12"
                />
              </FormField>
              <FormField label="Observações">
                <Textarea
                  icon={FileText}
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  rows={3}
                />
              </FormField>
              <FormField label="Débitos vinculados" labelId={`${formId}-debitos`} required>
                <div className="flex flex-col gap-sm" role="group" aria-labelledby={`${formId}-debitos`}>
                  {debitosSelecionaveis.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">Não há débitos em aberto nesta unidade.</p>
                  ) : (
                    debitosSelecionaveis.map((debito) => {
                      const debitoInputId = `${formId}-debito-${debito.id}`;
                      return (
                        <label
                          key={debito.id}
                          htmlFor={debitoInputId}
                          className="flex cursor-pointer items-center justify-between gap-sm rounded-sm border border-border-subtle px-sm py-xs"
                        >
                          <span className="text-body-sm">
                            {debito.referencia} · venc. {formatarData(debito.dataVencimento)} ·{" "}
                            {formatarMoeda(debito.valorAtualizado)}
                          </span>
                          <Switch
                            id={debitoInputId}
                            className="shrink-0"
                            checked={debitoIds.includes(debito.id)}
                            onChange={() => toggleDebito(debito.id)}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </FormField>
            </SheetBody>
            <SheetFooterForm
              onClose={() => onOpenChange(false)}
              saveLabel={salvando ? "Salvando…" : "Salvar alterações"}
              saveDisabled={salvando || invalido}
            />
          </SheetForm>
        ) : (
          <SheetBody>
            <p className="text-body-sm text-on-surface-variant">Carregue a proposta para editar.</p>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}