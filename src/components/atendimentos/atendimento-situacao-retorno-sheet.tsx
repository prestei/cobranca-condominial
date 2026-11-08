"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/button";
import { FormField, Input, Select, Textarea } from "@/components/input";
import { Icon } from "@/components/icon";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import { getCadastros, statusAtendimento, type Atendimento } from "@/data/catalogo";
import { aplicarAtendimentoSalvo } from "@/lib/atendimentos/sync-cliente";

type Props = {
  atendimentoId: string | null;
  tituloUnidade?: string;
  modo: "situacao" | "retorno";
  onClose: () => void;
  onSalvo?: () => void;
};

export function AtendimentoSituacaoRetornoSheet({
  atendimentoId,
  tituloUnidade,
  modo,
  onClose,
  onSalvo,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [status, setStatus] = useState("Pendente");
  const [dataProximaAcao, setDataProximaAcao] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!atendimentoId) {
      setAtendimento(null);
      return;
    }
    const item = getCadastros().atendimentos.find((a) => a.id === atendimentoId) ?? null;
    setAtendimento(item);
    if (item) {
      setStatus(item.status);
      setDataProximaAcao(item.dataProximaAcao?.slice(0, 10) ?? "");
      setProximaAcao(item.proximaAcao ?? "");
    }
  }, [atendimentoId]);

  const aberto = atendimentoId !== null;

  const salvar = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!atendimento || salvando) return;
      const unidadeId = Number(atendimento.unidadeId);
      const unidade = getCadastros().unidades.find((u) => u.id === unidadeId);
      if (!unidade) {
        toast({ variant: "error", title: "Unidade não encontrada." });
        return;
      }
      setSalvando(true);
      try {
        const body = {
          condominioId: unidade.condominioId,
          unidadeId,
          responsavelId: atendimento.responsavelId || null,
          canal: atendimento.canal,
          respondeu: atendimento.respondeu,
          motivo: atendimento.motivo,
          assunto: atendimento.assunto,
          descricao: atendimento.descricao,
          status,
          dataProximaAcao: modo === "retorno" ? dataProximaAcao : atendimento.dataProximaAcao,
          proximaAcao: modo === "retorno" ? proximaAcao : atendimento.proximaAcao,
        };
        const response = await fetch(`/api/atendimentos/${encodeURIComponent(atendimento.id)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as { error?: string; atendimento?: Atendimento };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");
        if (payload.atendimento) {
          aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
        }
        toast({ variant: "success", title: modo === "retorno" ? "Retorno atualizado" : "Situação atualizada" });
        onSalvo?.();
        onClose();
      } catch (error) {
        toast({
          variant: "error",
          title: "Falha ao salvar",
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSalvando(false);
      }
    },
    [atendimento, dataProximaAcao, modo, onClose, onSalvo, proximaAcao, salvando, status, toast],
  );

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-labelledby={`${formId}-titulo`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={CalendarClock} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-titulo`}>
                {modo === "retorno" ? "Programar retorno" : "Atualizar situação"}
              </SheetTitle>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetForm id={formId} onSubmit={(e) => void salvar(e)}>
          <SheetBody className="flex flex-col gap-md">
            {tituloUnidade ? (
              <p className="text-body-sm text-on-surface-variant">{tituloUnidade}</p>
            ) : null}
            {modo === "situacao" ? (
              <FormField label="Situação" htmlFor={`${formId}-status`} required>
                <Select
                  id={`${formId}-status`}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {statusAtendimento.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <>
                <FormField label="Data do retorno" htmlFor={`${formId}-data`} required>
                  <Input
                    id={`${formId}-data`}
                    type="date"
                    value={dataProximaAcao}
                    onChange={(event) => setDataProximaAcao(event.target.value)}
                  />
                </FormField>
                <FormField label="Próxima ação" htmlFor={`${formId}-acao`}>
                  <Textarea
                    id={`${formId}-acao`}
                    rows={3}
                    value={proximaAcao}
                    onChange={(event) => setProximaAcao(event.target.value)}
                  />
                </FormField>
              </>
            )}
          </SheetBody>
          <SheetFooterForm
            onClose={onClose}
            saveLabel={salvando ? "Salvando…" : "Salvar"}
            saveDisabled={salvando || !atendimento}
          />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}
