"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { ClipboardList, ListOrdered } from "lucide-react";
import { FilaCobrancasPanel } from "@/components/atendimentos/fila-cobrancas-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Textarea } from "@/components/input";
import { PageContent, PageHeader } from "@/components/page-header";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  canaisAtendimento,
  condominioAtivo,
  debitoEmAberto,
  diasDeAtraso,
  formatarMoeda,
  getCadastros,
  motivosPendencia,
  statusAtendimento,
  type Atendimento,
} from "@/data/catalogo";
import { aplicarAtendimentoSalvo } from "@/lib/atendimentos/sync-cliente";
import { useCadastros } from "@/hooks/use-cadastros";

const etapas = ["Registro", "Retorno"] as const;
const formularioVazio = {
  condominioId: "",
  unidadeId: "",
  responsavelId: "",
  canal: "",
  respondeu: "",
  motivo: "",
  assunto: "",
  descricao: "",
  status: "",
  dataProximaAcao: "",
  proximaAcao: "",
};

export default function AtendimentosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const cadastros = useCadastros();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(formularioVazio);
  const [errors, setErrors] = useState<
    Partial<Record<"condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo", string>>
  >({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!searchParams || searchParams.get("novo") !== "1") return;
    const cadastrosAtuais = getCadastros();
    const unidadeQuery = searchParams.get("unidade");
    let condominioId = "";
    let unidadeId = "";
    if (unidadeQuery) {
      const unidade = cadastrosAtuais.unidades.find((item) => String(item.id) === unidadeQuery);
      if (unidade) {
        unidadeId = unidadeQuery;
        condominioId = String(unidade.condominioId);
      }
    }
    setForm({ ...formularioVazio, condominioId, unidadeId });
    setErrors({});
    setStep(0);
    setSheetOpen(true);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("novo");
    params.delete("unidade");
    params.delete("aba");
    const qs = params.toString();
    router.replace(qs ? `/atendimentos?${qs}` : "/atendimentos");
  }, [router, searchParams]);

  useEffect(() => {
    const abaLegada = searchParams?.get("aba");
    if (!abaLegada || abaLegada === "fila") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("aba");
    if (abaLegada === "retornos") params.set("retorno", "hoje");
    const qs = params.toString();
    router.replace(qs ? `/atendimentos?${qs}` : "/atendimentos");
  }, [router, searchParams]);

  const debitosDaUnidade = cadastros.debitos.filter(
    (item) => String(item.unidadeId) === form.unidadeId && debitoEmAberto(item),
  );
  const condominiosOrdenados = [...cadastros.condominios]
    .filter((item) => condominioAtivo(item))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const unidadesDoCondominio = cadastros.unidades.filter((item) => String(item.condominioId) === form.condominioId);

  function closeSheet() {
    const preenchido = Object.values(form).some((value) => value.trim() !== "");
    if (preenchido) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
  }

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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    const nextErrors: Partial<Record<"condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo", string>> = {};
    if (!form.condominioId) nextErrors.condominioId = "Selecione o condomínio.";
    if (!form.unidadeId) nextErrors.unidadeId = "Selecione a unidade.";
    if (!form.canal) nextErrors.canal = "Selecione o canal.";
    if (!form.respondeu) nextErrors.respondeu = "Informe se o condômino respondeu.";
    if (form.respondeu === "Sim" && !form.motivo) nextErrors.motivo = "Selecione o motivo.";
    if (!form.status) nextErrors.status = "Selecione a situação.";

    if (step === 0) {
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
      setStep(1);
      return;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStep(0);
      return;
    }

    const body = {
      condominioId: Number(form.condominioId),
      unidadeId: Number(form.unidadeId),
      responsavelId: form.responsavelId ? Number(form.responsavelId) : null,
      canal: form.canal,
      respondeu: form.respondeu,
      motivo: form.respondeu === "Sim" ? form.motivo : "",
      assunto: form.assunto.trim(),
      descricao: form.descricao.trim(),
      status: form.status,
      dataProximaAcao: form.dataProximaAcao,
      proximaAcao: form.proximaAcao.trim(),
    };

    setSalvando(true);
    try {
      const response = await fetch("/api/atendimentos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string; atendimento?: Atendimento };
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível salvar o atendimento.");
      }
      if (payload.atendimento) {
        aplicarAtendimentoSalvo(payload.atendimento, "INSERT");
      }
      toast({ variant: "success", title: "Atendimento registrado" });
      setForm(formularioVazio);
      setStep(0);
      setSheetOpen(false);
    } catch (error) {
      toast({
        variant: "error",
        title: "Falha ao salvar",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title="Fila de cobranças"
        description="Acompanhe, distribua e gerencie as cobranças em um só lugar."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Atendimentos" }]}
      />
      <PageContent>
        <Tabs defaultValue="fila" value="fila" className="flex flex-col gap-lg">
          <TabsList className="mb-0 shrink-0">
            <TabsTrigger value="fila">
              <Icon icon={ListOrdered} size="sm" className="mr-xs shrink-0" aria-hidden />
              Fila de cobranças
            </TabsTrigger>
          </TabsList>
          <TabsContent value="fila" className="!rounded-none !bg-transparent !p-0 text-inherit shadow-none">
            <FilaCobrancasPanel />
          </TabsContent>
        </Tabs>
      </PageContent>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (open) setSheetOpen(true);
          else closeSheet();
        }}
      >
        <SheetContent aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-desc`}>
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={ClipboardList} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>Registrar contato</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    Tentativa de cobrança da unidade. Quem registra é o login atual.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <FormSteps steps={etapas} current={step} />
              {step === 0 ? (
                <>
                  <FormField label="Condomínio" htmlFor={`${formId}-condominio`} required error={errors.condominioId}>
                    <Select
                      id={`${formId}-condominio`}
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
                  {form.unidadeId ? (
                    <Alert variant={debitosDaUnidade.length > 0 ? "warning" : "success"} title="Débitos em aberto">
                      {debitosDaUnidade.length === 0
                        ? "Esta unidade não tem débito em aberto."
                        : debitosDaUnidade
                            .map(
                              (item) =>
                                `${item.descricao || item.referencia}: ${formatarMoeda(item.valorAtualizado)} · ${diasDeAtraso(item.dataVencimento)} dias`,
                            )
                            .join(" · ")}
                    </Alert>
                  ) : null}
                  <FormField label="Canal" htmlFor={`${formId}-canal`} required error={errors.canal}>
                    <Select
                      id={`${formId}-canal`}
                      value={form.canal}
                      invalid={Boolean(errors.canal)}
                      onChange={(event) => setForm((current) => ({ ...current, canal: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {canaisAtendimento.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="O condômino respondeu?" htmlFor={`${formId}-respondeu`} required error={errors.respondeu}>
                    <Select
                      id={`${formId}-respondeu`}
                      value={form.respondeu}
                      invalid={Boolean(errors.respondeu)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          respondeu: event.target.value,
                          motivo: event.target.value === "Sim" ? current.motivo : "",
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </Select>
                  </FormField>
                  {form.respondeu === "Sim" ? (
                    <FormField label="Motivo da pendência" htmlFor={`${formId}-motivo`} required error={errors.motivo}>
                      <Select
                        id={`${formId}-motivo`}
                        value={form.motivo}
                        invalid={Boolean(errors.motivo)}
                        onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
                      >
                        <option value="">Selecione</option>
                        {motivosPendencia.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  ) : null}
                  {form.motivo === "Doença / problema de saúde" ? (
                    <SheetHelpText>
                      Registre só a categoria. Não anote diagnóstico nem detalhes de saúde.
                    </SheetHelpText>
                  ) : null}
                  <FormField label="Situação" htmlFor={`${formId}-status`} required error={errors.status}>
                    <Select
                      id={`${formId}-status`}
                      value={form.status}
                      invalid={Boolean(errors.status)}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {statusAtendimento.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Assunto" htmlFor={`${formId}-assunto`}>
                    <Input
                      id={`${formId}-assunto`}
                      value={form.assunto}
                      onChange={(event) => setForm((current) => ({ ...current, assunto: event.target.value }))}
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
                    <Textarea
                      id={`${formId}-descricao`}
                      value={form.descricao}
                      onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Data da próxima ação" htmlFor={`${formId}-proxima-data`}>
                    <Input
                      id={`${formId}-proxima-data`}
                      type="datetime-local"
                      value={form.dataProximaAcao.includes("T") ? form.dataProximaAcao.slice(0, 16) : form.dataProximaAcao}
                      onChange={(event) => setForm((current) => ({ ...current, dataProximaAcao: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Próxima ação" htmlFor={`${formId}-proxima`}>
                    <Input
                      id={`${formId}-proxima`}
                      value={form.proximaAcao}
                      onChange={(event) => setForm((current) => ({ ...current, proximaAcao: event.target.value }))}
                    />
                  </FormField>
                </>
              )}
            </SheetBody>
            <SheetFooterForm
              onClose={closeSheet}
              onBack={step > 0 ? () => setStep(0) : undefined}
              saveLabel={step === 0 ? "Continuar" : salvando ? "Salvando…" : "Salvar"}
              saveDisabled={salvando}
            />
          </SheetForm>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Tem certeza que quer sair?"
        description="As informações preenchidas serão perdidas."
        confirmLabel="Sair"
        cancelLabel="Permanecer"
        confirmVariant="critical"
        onConfirm={confirmLeave}
      />
    </WorkspaceShell>
  );
}
