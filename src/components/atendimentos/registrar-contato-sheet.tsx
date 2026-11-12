"use client";

import { useId, useMemo, type FormEvent } from "react";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  FileText,
  LayoutGrid,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { IconChoiceGroup } from "@/components/icon-choice-group";
import { Checkbox, CheckboxField, FormField, Input, Select, Textarea } from "@/components/input";
import { canalPalitagemOptions, respondeuPalitagemOptions } from "@/lib/atendimentos/palitagem-choice-options";
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
import {
  condominioAtivo,
  debitoEmAberto,
  diasDeAtraso,
  formatarMoeda,
  motivosPendencia,
  nomeCondominio,
  type Cadastros,
} from "@/data/catalogo";
import { contatoResponsavelDaUnidade } from "@/lib/contato-responsavel";

export type RegistrarContatoForm = {
  condominioId: string;
  unidadeId: string;
  responsavelId: string;
  canais: string[];
  respondeu: string;
  motivo: string;
  motivoOutro: string;
  assunto: string;
  descricao: string;
  status: string;
  dataProximaAcao: string;
  proximaAcao: string;
};

export const registrarContatoFormVazio = (): RegistrarContatoForm => ({
  condominioId: "",
  unidadeId: "",
  responsavelId: "",
  canais: ["WhatsApp"],
  respondeu: "",
  motivo: "",
  motivoOutro: "",
  assunto: "",
  descricao: "",
  status: "Pendente",
  dataProximaAcao: "",
  proximaAcao: "",
});

type FieldErrors = Partial<
  Record<
    "condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo" | "motivoOutro",
    string
  >
>;

/** Campos preenchidos além do padrão de abertura rápida. */
export function registrarContatoTemAlteracao(form: RegistrarContatoForm, unidadeFixa: boolean) {
  if (!unidadeFixa && (form.condominioId || form.unidadeId)) return true;
  if (form.respondeu) return true;
  if (form.motivo || form.motivoOutro.trim()) return true;
  if (form.status === "Resolvido") return true;
  const canaisPadrao = form.canais.length === 1 && form.canais[0] === "WhatsApp";
  if (!canaisPadrao) return true;
  if (form.assunto.trim() || form.descricao.trim() || form.dataProximaAcao || form.proximaAcao.trim()) {
    return true;
  }
  return false;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RegistrarContatoForm;
  setForm: React.Dispatch<React.SetStateAction<RegistrarContatoForm>>;
  errors: FieldErrors;
  setErrors: React.Dispatch<React.SetStateAction<FieldErrors>>;
  salvando: boolean;
  unidadeContextoFixo: boolean;
  cadastros: Cadastros;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function RegistrarContatoSheet({
  open,
  onOpenChange,
  form,
  setForm,
  errors,
  setErrors,
  salvando,
  unidadeContextoFixo,
  cadastros,
  onSubmit,
  onClose,
}: Props) {
  const formId = useId();

  const debitosDaUnidade = cadastros.debitos.filter(
    (item) => String(item.unidadeId) === form.unidadeId && debitoEmAberto(item),
  );
  function rotuloDebitoAberto(item: (typeof debitosDaUnidade)[number]) {
    return `${item.descricao || item.referencia}: ${formatarMoeda(item.valorAtualizado)} · ${diasDeAtraso(item.dataVencimento)} dias`;
  }
  const condominiosOrdenados = [...cadastros.condominios]
    .filter((item) => condominioAtivo(item))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const unidadesDoCondominio = cadastros.unidades.filter((item) => String(item.condominioId) === form.condominioId);

  function escolherCondominio(condominioId: string) {
    setForm((current) => ({ ...current, condominioId, unidadeId: "", responsavelId: "" }));
  }

  function escolherUnidade(unidadeId: string) {
    const vinculo = cadastros.vinculos.find((item) => String(item.unidadeId) === unidadeId && item.principal);
    setForm((current) => ({
      ...current,
      unidadeId,
      responsavelId: vinculo ? String(vinculo.responsavelId) : "",
    }));
  }

  function escolherCanais(canais: string | string[]) {
    setForm((current) => ({ ...current, canais: Array.isArray(canais) ? canais : [canais] }));
    if (errors.canal) setErrors((current) => ({ ...current, canal: undefined }));
  }

  const descricaoContexto = useMemo(() => {
    const unidadeId = Number(form.unidadeId);
    const condominioId = Number(form.condominioId);
    if (!Number.isFinite(unidadeId) || unidadeId <= 0) {
      return "Selecione condomínio, unidade e responsável.";
    }
    const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
    const condominio = nomeCondominio(
      Number.isFinite(condominioId) && condominioId > 0 ? condominioId : (unidade?.condominioId ?? 0),
      cadastros,
    );
    const rotuloUnidade = unidade
      ? unidade.bloco
        ? `${unidade.identificacao} · ${unidade.bloco}`
        : unidade.identificacao
      : "—";
    const responsavel = contatoResponsavelDaUnidade(cadastros, unidadeId).nome.trim() || "Responsável não cadastrado";
    return `Condomínio ${condominio} · Unidade ${rotuloUnidade} · ${responsavel}`;
  }, [cadastros, form.condominioId, form.unidadeId]);

  function escolherRespondeu(respondeu: string) {
    setForm((current) => ({
      ...current,
      respondeu,
      status: respondeu === "Não" ? "Pendente" : current.status === "Resolvido" ? "Resolvido" : "Pendente",
      motivo: respondeu === "Sim" ? current.motivo : "",
      motivoOutro: respondeu === "Sim" ? current.motivoOutro : "",
    }));
    if (errors.respondeu) setErrors((current) => ({ ...current, respondeu: undefined }));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else onClose();
      }}
    >
      <SheetContent aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-desc`}>
        <SheetForm onSubmit={onSubmit}>
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon>
                <Icon icon={ClipboardList} size="md" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id={`${formId}-title`}>Registrar contato</SheetTitle>
                <SheetDescription id={`${formId}-desc`} title={descricaoContexto}>
                  {descricaoContexto}
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>
          <SheetBody>
            {!unidadeContextoFixo ? (
              <>
                <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                  <Select
                    id={`${formId}-condominio`}
                    icon={Building2}
                    value={form.condominioId}
                    invalid={Boolean(errors.condominioId)}
                    onChange={(event) => escolherCondominio(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {condominiosOrdenados.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Unidade" htmlFor={`${formId}-unidade`} required error={errors.unidadeId}>
                  <Select
                    id={`${formId}-unidade`}
                    icon={DoorOpen}
                    value={form.unidadeId}
                    invalid={Boolean(errors.unidadeId)}
                    disabled={!form.condominioId}
                    onChange={(event) => escolherUnidade(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {unidadesDoCondominio.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.identificacao}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            ) : null}

            {form.unidadeId ? (
              <div
                role="alert"
                className={[
                  "flex w-full items-start gap-sm rounded-lg border px-sm py-sm",
                  debitosDaUnidade.length > 0
                    ? "border-status-pending/30 bg-status-pending/10"
                    : "border-status-settled/25 bg-status-settled/10",
                ].join(" ")}
              >
                <Icon
                  icon={debitosDaUnidade.length > 0 ? TriangleAlert : CheckCircle2}
                  size="sm"
                  className={[
                    "mt-0.5",
                    debitosDaUnidade.length > 0 ? "shrink-0 text-status-pending" : "shrink-0 text-status-settled",
                  ].join(" ")}
                />
                <div className="min-w-0 flex-1 text-[11px] leading-snug text-on-surface-variant">
                  <p className="font-semibold text-on-surface">Débitos em aberto</p>
                  {debitosDaUnidade.length === 0 ? (
                    <p className="mt-xs">Esta unidade não tem débito em aberto.</p>
                  ) : (
                    <ul className="mt-xs flex flex-col gap-xs">
                      {debitosDaUnidade.map((item) => (
                        <li key={item.id}>{rotuloDebitoAberto(item)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            <FormField label="Assunto" htmlFor={`${formId}-assunto`}>
              <Input
                id={`${formId}-assunto`}
                icon={FileText}
                value={form.assunto}
                onChange={(event) => setForm((current) => ({ ...current, assunto: event.target.value }))}
              />
            </FormField>
            <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
              <Textarea
                icon={FileText}
                id={`${formId}-descricao`}
                value={form.descricao}
                rows={3}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
              />
            </FormField>

            <FormField
              label="O condômino respondeu?"
              labelId={`${formId}-respondeu-label`}
              required
              error={errors.respondeu}
            >
              <IconChoiceGroup
                id={`${formId}-respondeu`}
                labelledBy={`${formId}-respondeu-label`}
                layout="segmented"
                value={form.respondeu}
                invalid={Boolean(errors.respondeu)}
                options={respondeuPalitagemOptions}
                onChange={escolherRespondeu}
              />
            </FormField>

            {form.respondeu === "Sim" ? (
              <>
                <FormField label="Motivo da pendência" htmlFor={`${formId}-motivo`} required error={errors.motivo}>
                  <Select
                    id={`${formId}-motivo`}
                    icon={LayoutGrid}
                    value={form.motivo}
                    invalid={Boolean(errors.motivo)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        motivo: event.target.value,
                        motivoOutro: event.target.value === "Outro" ? current.motivoOutro : "",
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {motivosPendencia.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {form.motivo === "Outro" ? (
                  <FormField
                    label="Descreva o motivo"
                    htmlFor={`${formId}-motivo-outro`}
                    required
                    error={errors.motivoOutro}
                  >
                    <Input
                      id={`${formId}-motivo-outro`}
                      icon={FileText}
                      value={form.motivoOutro}
                      invalid={Boolean(errors.motivoOutro)}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, motivoOutro: event.target.value }))
                      }
                    />
                  </FormField>
                ) : null}
                {form.motivo === "Doença / problema de saúde" ? (
                  <SheetHelpText>
                    Registre só a categoria. Não anote diagnóstico nem detalhes de saúde.
                  </SheetHelpText>
                ) : null}
                <CheckboxField label="Resolvido neste contato" htmlFor={`${formId}-resolvido`}>
                  <Checkbox
                    id={`${formId}-resolvido`}
                    checked={form.status === "Resolvido"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.checked ? "Resolvido" : "Pendente",
                      }))
                    }
                  />
                </CheckboxField>
              </>
            ) : null}

            <FormField label="Canal" labelId={`${formId}-canal-label`} required error={errors.canal}>
              <IconChoiceGroup
                id={`${formId}-canal`}
                labelledBy={`${formId}-canal-label`}
                layout="row"
                multiple
                value={form.canais}
                invalid={Boolean(errors.canal)}
                options={canalPalitagemOptions}
                onChange={escolherCanais}
              />
            </FormField>

            <div className="flex items-end gap-md">
              <FormField
                label="Data da próxima ação"
                htmlFor={`${formId}-proxima-data`}
                className="w-[min(100%,11.25rem)] shrink-0"
              >
                <Input
                  id={`${formId}-proxima-data`}
                  icon={CalendarClock}
                  type="datetime-local"
                  className="min-w-0"
                  value={
                    form.dataProximaAcao.includes("T")
                      ? form.dataProximaAcao.slice(0, 16)
                      : form.dataProximaAcao
                  }
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dataProximaAcao: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Próxima ação" htmlFor={`${formId}-proxima`} className="min-w-0 flex-1">
                <Input
                  id={`${formId}-proxima`}
                  icon={FileText}
                  value={form.proximaAcao}
                  onChange={(event) => setForm((current) => ({ ...current, proximaAcao: event.target.value }))}
                />
              </FormField>
            </div>
          </SheetBody>
          <SheetFooterForm
            onClose={onClose}
            saveLabel={salvando ? "Salvando…" : "Registrar"}
            saveDisabled={salvando}
          />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}

export function validarRegistrarContato(form: RegistrarContatoForm): FieldErrors {
  const nextErrors: FieldErrors = {};
  if (!form.condominioId) nextErrors.condominioId = "Selecione o condomínio.";
  if (!form.unidadeId) nextErrors.unidadeId = "Selecione a unidade.";
  if (!form.canais.length) nextErrors.canal = "Selecione ao menos um canal.";
  if (!form.respondeu) nextErrors.respondeu = "Informe se o condômino respondeu.";
  if (form.respondeu === "Sim" && !form.motivo) nextErrors.motivo = "Selecione o motivo.";
  if (form.respondeu === "Sim" && form.motivo === "Outro" && !form.motivoOutro.trim()) {
    nextErrors.motivoOutro = "Descreva o motivo.";
  }
  return nextErrors;
}

export function statusRegistrarContato(form: RegistrarContatoForm) {
  if (form.respondeu === "Não") return "Pendente";
  return form.status === "Resolvido" ? "Resolvido" : "Pendente";
}
