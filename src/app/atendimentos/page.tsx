"use client";

import { SkeletonAtendimentosOperacao } from "@/components/skeleton";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { FilaCobrancasPanel } from "@/components/atendimentos/fila-cobrancas-panel";
import { OperacionalAtendimentosPanel } from "@/components/atendimentos/operacional-atendimentos-panel";
import {
  RegistrarContatoSheet,
  registrarContatoFormVazio,
  registrarContatoTemAlteracao,
  statusRegistrarContato,
  validarRegistrarContato,
} from "@/components/atendimentos/registrar-contato-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { canaisAtendimento, montarMotivoPendencia, type Atendimento } from "@/data/catalogo";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { ClipboardList } from "lucide-react";
function AtendimentosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const visaoGestao = pode("usuarios", "criar");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [form, setForm] = useState(() => registrarContatoFormVazio());
  const [errors, setErrors] = useState<
    Partial<
      Record<
        "condominioId" | "unidadeId" | "status" | "canal" | "respondeu" | "motivo" | "motivoOutro",
        string
      >
    >
  >({});
  const [salvando, setSalvando] = useState(false);
  /** Unidade já definida ao abrir pela fila — oculta condomínio/unidade no sheet. */
  const [unidadeContextoFixo, setUnidadeContextoFixo] = useState(false);

  useEffect(() => {
    if (!searchParams || searchParams.get("novo") !== "1") return;
    const cadastrosAtuais = cadastros;
    const unidadeQuery = searchParams.get("unidade");
    const canalQuery = searchParams.get("canal")?.trim() ?? "";
    const canal =
      canalQuery && (canaisAtendimento as readonly string[]).includes(canalQuery) ? canalQuery : "";
    let condominioId = "";
    let unidadeId = "";
    let responsavelId = "";
    if (unidadeQuery) {
      const unidade = cadastrosAtuais.unidades.find((item) => String(item.id) === unidadeQuery);
      if (unidade) {
        unidadeId = unidadeQuery;
        condominioId = String(unidade.condominioId);
        const vinculo =
          cadastrosAtuais.vinculos.find((item) => item.unidadeId === unidade.id && item.principal) ??
          cadastrosAtuais.vinculos.find((item) => item.unidadeId === unidade.id);
        responsavelId = vinculo ? String(vinculo.responsavelId) : "";
      }
    }
    setForm({
      ...registrarContatoFormVazio(),
      condominioId,
      unidadeId,
      responsavelId,
      canais: canal ? [canal] : ["WhatsApp"],
    });
    setUnidadeContextoFixo(Boolean(unidadeId));
    setErrors({});
    setSheetOpen(true);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("novo");
    params.delete("unidade");
    params.delete("canal");
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

  function closeSheet() {
    if (registrarContatoTemAlteracao(form, unidadeContextoFixo)) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
    setUnidadeContextoFixo(false);
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    setSheetOpen(false);
    setUnidadeContextoFixo(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    const nextErrors = validarRegistrarContato(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const base = {
      condominioId: Number(form.condominioId),
      unidadeId: Number(form.unidadeId),
      responsavelId: form.responsavelId ? Number(form.responsavelId) : null,
      respondeu: form.respondeu,
      motivo:
        form.respondeu === "Sim" ? montarMotivoPendencia(form.motivo, form.motivoOutro) : "",
      assunto: form.assunto.trim(),
      descricao: form.descricao.trim(),
      status: statusRegistrarContato(form),
      dataProximaAcao: form.dataProximaAcao,
      proximaAcao: form.proximaAcao.trim(),
    };

    setSalvando(true);
    try {
      let salvos = 0;
      for (const canal of form.canais) {
        const response = await fetch("/api/atendimentos", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, canal }),
        });
        const payload = (await response.json()) as { error?: string; atendimento?: Atendimento };
        if (!response.ok) {
          throw new Error(payload.error ?? "Não foi possível salvar o atendimento.");
        }
        if (payload.atendimento) salvos += 1;
      }
      if (salvos > 0) void refetch();
      toast({
        variant: "success",
        title: salvos > 1 ? `${salvos} tentativas registradas` : "Atendimento registrado",
      });
      setForm(registrarContatoFormVazio());
      setUnidadeContextoFixo(false);
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

  const corpoFila = (
    <div
      className={`flex w-full flex-col bg-surface-card ${
        visaoGestao ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 w-full flex-1 overflow-hidden"
      }`}
    >
      <OperacionalAtendimentosPanel />
      <FilaCobrancasPanel className={visaoGestao ? "w-full" : "min-h-0 w-full flex-1 overflow-hidden"} />
    </div>
  );

  return (
    <WorkspaceShell>
      {visaoGestao ? (
        <>
          <PageHeader
            icon={ClipboardList}
            title="Atendimentos"
            description="Fila de cobrança da carteira: retornos, distribuição por RE e visão por condomínio ou atendente."
            className="shrink-0 bg-surface-card max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
          />
          {corpoFila}
        </>
      ) : (
        corpoFila
      )}

      <RegistrarContatoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        form={form}
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        salvando={salvando}
        unidadeContextoFixo={unidadeContextoFixo}
        cadastros={cadastros}
        onSubmit={handleSave}
        onClose={closeSheet}
      />

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

export default function AtendimentosPageRoute() {
  return (
    <Suspense fallback={<SkeletonAtendimentosOperacao label="Carregando atendimentos" />}>
      <AtendimentosPage />
    </Suspense>
  );
}