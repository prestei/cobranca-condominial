"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Building2, CalendarClock, ClipboardList, DoorOpen, FileText, Phone } from "lucide-react";
import { FormField, Input, Select, Textarea } from "@/components/input";
import { Icon } from "@/components/icon";
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
  SheetHelpText,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import {
  canaisAtendimento,
  condominioAtivo,
  escopoCondominios,
  escopoUnidades,
  nomeCondominio,
  type Atendimento,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";

type Props = {
  open: boolean;
  onClose: () => void;
  unidadeId?: number | null;
  condominioId?: number | null;
  dataPreferida?: string;
  tituloUnidade?: string;
  onSalvo?: (atendimento: Atendimento) => void;
};

function agoraDatetimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function dataPreferidaParaInput(valor?: string) {
  if (!valor?.trim()) return agoraDatetimeLocal();
  if (valor.includes("T")) return valor.slice(0, 16);
  return `${valor.slice(0, 10)}T09:00`;
}

export function AgendarAtendimentoSheet({
  open,
  onClose,
  unidadeId: unidadeInicial,
  condominioId: condominioInicial,
  dataPreferida,
  tituloUnidade,
  onSalvo,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const { user } = useAuth();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const podeCriar = pode("atendimentos", "criar");

  const condominios = useMemo(
    () =>
      escopoCondominios(cadastros, user?.userId)
        .filter((item) => condominioAtivo(item))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [cadastros, user?.userId],
  );

  const [condominioId, setCondominioId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [canal, setCanal] = useState("Telefone");
  const [dataProximaAcao, setDataProximaAcao] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"condominioId" | "unidadeId" | "dataProximaAcao" | "proximaAcao" | "canal", string>>>({});

  const unidades = useMemo(() => {
    const escopo = escopoUnidades(cadastros, user?.userId);
    if (!condominioId) return [];
    return escopo
      .filter((item) => String(item.condominioId) === condominioId)
      .sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR"));
  }, [cadastros, condominioId, user?.userId]);

  const unidadeTravada = unidadeInicial != null && unidadeInicial > 0;

  useEffect(() => {
    if (!open) return;
    const unidade =
      unidadeInicial != null
        ? cadastros.unidades.find((item) => item.id === unidadeInicial)
        : undefined;
    const condoId =
      condominioInicial != null
        ? String(condominioInicial)
        : unidade
          ? String(unidade.condominioId)
          : "";
    setCondominioId(condoId);
    setUnidadeId(unidadeInicial != null ? String(unidadeInicial) : "");
    setCanal("Telefone");
    setDataProximaAcao(dataPreferidaParaInput(dataPreferida));
    setProximaAcao("");
    setObservacao("");
    setErrors({});
  }, [open, unidadeInicial, condominioInicial, dataPreferida, cadastros.unidades]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando || !podeCriar) return;

    const nextErrors: typeof errors = {};
    if (!condominioId) nextErrors.condominioId = "Selecione o condomínio.";
    if (!unidadeId) nextErrors.unidadeId = "Selecione a unidade.";
    if (!canal) nextErrors.canal = "Selecione o canal.";
    if (!dataProximaAcao.trim()) nextErrors.dataProximaAcao = "Informe data e horário.";
    if (!proximaAcao.trim()) nextErrors.proximaAcao = "Descreva a próxima ação.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const unidadeNum = Number(unidadeId);
    const vinculo =
      cadastros.vinculos.find((item) => item.unidadeId === unidadeNum && item.principal) ??
      cadastros.vinculos.find((item) => item.unidadeId === unidadeNum);

    setSalvando(true);
    try {
      const response = await fetch("/api/atendimentos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominioId: Number(condominioId),
          unidadeId: unidadeNum,
          responsavelId: vinculo?.responsavelId ?? null,
          canal,
          respondeu: "Não",
          status: "Pendente",
          assunto: "Agendamento de atendimento",
          descricao: observacao.trim(),
          dataProximaAcao: dataProximaAcao.trim(),
          proximaAcao: proximaAcao.trim(),
        }),
      });
      const payload = (await response.json()) as { error?: string; atendimento?: Atendimento };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível agendar.");
      if (payload.atendimento) {
        void refetch()
        onSalvo?.(payload.atendimento);
      }
      toast({
        variant: "success",
        title: "Atendimento agendado",
        description: "O compromisso entrou na agenda e na fila de retornos.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "error",
        title: "Falha ao agendar",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  const rotuloUnidade =
    tituloUnidade ||
    (unidadeId
      ? (() => {
          const u = cadastros.unidades.find((item) => String(item.id) === unidadeId);
          return u ? `${u.identificacao}${u.bloco ? ` - ${u.bloco}` : ""}` : "";
        })()
      : "");

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent aria-labelledby={`${formId}-titulo`}>
        <SheetForm id={formId} onSubmit={(event) => void handleSave(event)}>
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon>
                <Icon icon={CalendarClock} size="md" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id={`${formId}-titulo`}>Agendar atendimento</SheetTitle>
                <SheetDescription>
                  {rotuloUnidade
                    ? `${rotuloUnidade}${condominioId ? ` · ${nomeCondominio(Number(condominioId))}` : ""}`
                    : "Defina unidade, data e o que será feito no retorno."}
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>
          <SheetBody className="flex flex-col gap-md">
            {!podeCriar ? (
              <p className="text-body-md text-status-critical">Sem permissão para agendar atendimento.</p>
            ) : (
              <>
                <FormField label="Condomínio" htmlFor={`${formId}-condo`} required error={errors.condominioId}>
                  <Select
                    id={`${formId}-condo`}
                    icon={Building2}
                    value={condominioId}
                    disabled={unidadeTravada}
                    invalid={Boolean(errors.condominioId)}
                    onChange={(event) => {
                      setCondominioId(event.target.value);
                      if (!unidadeTravada) setUnidadeId("");
                    }}
                  >
                    <option value="">Selecione</option>
                    {condominios.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.nome}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Unidade" htmlFor={`${formId}-unidade`} required error={errors.unidadeId}>
                  <Select
                    id={`${formId}-unidade`}
                    icon={DoorOpen}
                    value={unidadeId}
                    disabled={unidadeTravada || !condominioId}
                    invalid={Boolean(errors.unidadeId)}
                    onChange={(event) => setUnidadeId(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {unidades.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.identificacao}
                        {item.bloco ? ` - ${item.bloco}` : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Canal previsto" htmlFor={`${formId}-canal`} required error={errors.canal}>
                  <Select
                    id={`${formId}-canal`}
                    icon={Phone}
                    value={canal}
                    invalid={Boolean(errors.canal)}
                    onChange={(event) => setCanal(event.target.value)}
                  >
                    {canaisAtendimento.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  label="Data e horário"
                  htmlFor={`${formId}-data`}
                  required
                  error={errors.dataProximaAcao}
                >
                  <Input
                    id={`${formId}-data`}
                    type="datetime-local"
                    icon={CalendarClock}
                    value={dataProximaAcao}
                    invalid={Boolean(errors.dataProximaAcao)}
                    onChange={(event) => setDataProximaAcao(event.target.value)}
                  />
                </FormField>
                <FormField label="Próxima ação" htmlFor={`${formId}-acao`} required error={errors.proximaAcao}>
                  <Input
                    id={`${formId}-acao`}
                    icon={ClipboardList}
                    value={proximaAcao}
                    placeholder="Ex.: Ligar para negociar acordo"
                    invalid={Boolean(errors.proximaAcao)}
                    onChange={(event) => setProximaAcao(event.target.value)}
                  />
                </FormField>
                <FormField label="Observação" htmlFor={`${formId}-obs`}>
                  <Textarea
                    id={`${formId}-obs`}
                    icon={FileText}
                    value={observacao}
                    rows={3}
                    placeholder="Opcional"
                    onChange={(event) => setObservacao(event.target.value)}
                  />
                </FormField>
                <SheetHelpText>
                  O agendamento cria um registro de palitagem pendente e aparece na agenda e nos retornos da
                  fila.
                </SheetHelpText>
              </>
            )}
          </SheetBody>
          <SheetFooterForm
            onClose={onClose}
            saveLabel={salvando ? "Agendando…" : "Agendar"}
            saveDisabled={salvando || !podeCriar}
          />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}