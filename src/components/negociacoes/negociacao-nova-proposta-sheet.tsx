"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Building2, DoorOpen, FileText, Handshake, Wallet } from "lucide-react";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Switch, Textarea } from "@/components/input";
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
  condominioAtivo,
  debitoEmAberto,
  formatarData,
  formatarMoeda,
  nomeUnidade,
} from "@/data/catalogo";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { aplicarMascaraMoedaPtBr } from "@/lib/moeda-input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo?: () => void;
};

export function NegociacaoNovaPropostaSheet({ open, onOpenChange, onSalvo }: Props) {
  const formId = useId();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { toast } = useToast();

  const [condominioId, setCondominioId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [valorProposto, setValorProposto] = useState("");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [debitoIds, setDebitoIds] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);

  const condominios = useMemo(
    () => cadastros.condominios.filter(condominioAtivo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [cadastros.condominios],
  );

  const unidades = useMemo(() => {
    if (!condominioId) return [];
    const condId = Number(condominioId);
    return cadastros.unidades
      .filter((item) => item.condominioId === condId)
      .sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR", { numeric: true }));
  }, [cadastros.unidades, condominioId]);

  const debitosSelecionaveis = useMemo(() => {
    if (!unidadeId) return [];
    const uid = Number(unidadeId);
    return cadastros.debitos.filter((item) => item.unidadeId === uid && debitoEmAberto(item));
  }, [cadastros.debitos, unidadeId]);

  useEffect(() => {
    if (!open) {
      setCondominioId("");
      setUnidadeId("");
      setValorProposto("");
      setQuantidadeParcelas("");
      setObservacoes("");
      setDebitoIds([]);
    }
  }, [open]);

  useEffect(() => {
    setUnidadeId("");
    setDebitoIds([]);
  }, [condominioId]);

  useEffect(() => {
    setDebitoIds([]);
    if (debitosSelecionaveis.length > 0) {
      setDebitoIds(debitosSelecionaveis.map((item) => item.id));
    }
  }, [unidadeId, debitosSelecionaveis]);

  function toggleDebito(id: number) {
    setDebitoIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function closeSheet() {
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!condominioId || !unidadeId) {
      toast({ variant: "error", title: "Proposta", description: "Selecione condomínio e unidade." });
      return;
    }
    if (debitoIds.length === 0) {
      toast({ variant: "error", title: "Proposta", description: "Selecione ao menos um débito." });
      return;
    }
    setSalvando(true);
    try {
      const response = await fetch("/api/propostas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominioId: Number(condominioId),
          unidadeId: Number(unidadeId),
          valorProposto,
          observacoes,
          debitoIds,
          quantidadeParcelas: quantidadeParcelas ? Number(quantidadeParcelas) : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Proposta", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Proposta registrada" });
      void refetch();
      onSalvo?.();
      closeSheet();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${formId}-nova-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Handshake} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-nova-title`}>Nova proposta</SheetTitle>
              <SheetDescription>Registro de tratativa — sujeito à alçada do advogado responsável.</SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetForm onSubmit={(event) => void handleSubmit(event)}>
          <SheetBody className="flex flex-col gap-md">
            <FormField label="Condomínio" required>
              <Select
                icon={Building2}
                value={condominioId}
                onChange={(event) => setCondominioId(event.target.value)}
                required
              >
                <option value="">Selecione</option>
                {condominios.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unidade" required>
              <Select
                icon={DoorOpen}
                value={unidadeId}
                onChange={(event) => setUnidadeId(event.target.value)}
                required
                disabled={!condominioId}
              >
                <option value="">Selecione</option>
                {unidades.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {nomeUnidade(item.id, cadastros)}
                  </option>
                ))}
              </Select>
            </FormField>
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
                {!unidadeId ? (
                  <p className="text-body-sm text-on-surface-variant">Selecione a unidade para listar débitos.</p>
                ) : debitosSelecionaveis.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">
                    Não há débitos em aberto nesta unidade.
                  </p>
                ) : (
                  debitosSelecionaveis.map((debito) => {
                    const debitoInputId = `${formId}-debito-${debito.id}`;
                    return (
                      <label key={debito.id} htmlFor={debitoInputId} className="flex cursor-pointer items-start gap-sm">
                        <Switch
                          id={debitoInputId}
                          className="mt-0.5 shrink-0"
                          checked={debitoIds.includes(debito.id)}
                          onChange={() => toggleDebito(debito.id)}
                        />
                        <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                          {debito.referencia} · {debito.descricao} · {formatarMoeda(debito.valorAtualizado)} · venc.{" "}
                          {formatarData(debito.dataVencimento)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </FormField>
          </SheetBody>
          <SheetFooterForm
            onClose={closeSheet}
            saveLabel={salvando ? "Salvando…" : "Salvar"}
            saveDisabled={salvando || !condominioId || !unidadeId || debitoIds.length === 0}
          />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}
