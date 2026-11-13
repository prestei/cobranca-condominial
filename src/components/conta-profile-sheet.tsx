"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Camera, IdCard, Loader2, Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetHelpText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import { useAuth } from "@/context/auth-context";
import { iniciaisNome } from "@/data/catalogo";
import { useCadastrosStatus } from "@/hooks/use-cadastros";
import { CompressAvatarError, compressAvatarImage } from "@/lib/avatar/compress-avatar-image";
import { digitosTelefone, formatarTelefone } from "@/lib/telefone";
import type { PerfilMinhaConta } from "@/lib/usuarios/service";

type FormConta = {
  nome: string;
  email: string;
  telefone: string;
};

type ContaProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContaProfileSheet({ open, onOpenChange }: ContaProfileSheetProps) {
  const formId = useId();
  const { refresh: refreshSessao } = useAuth();
  const { refetch: refetchCadastros } = useCadastrosStatus();
  const { toast } = useToast();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilMinhaConta | null>(null);
  const [form, setForm] = useState<FormConta>({ nome: "", email: "", telefone: "" });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPatch, setAvatarPatch] = useState<string | null | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormConta, string>>>({});

  const aplicarPerfil = useCallback((next: PerfilMinhaConta) => {
    setPerfil(next);
    setForm({
      nome: next.nome,
      email: next.email,
      telefone: formatarTelefone(next.telefone),
    });
    setAvatarPreview(next.avatar?.trim() ? next.avatar : null);
    setAvatarPatch(undefined);
    setFieldErrors({});
    setErroCarregar(null);
  }, []);

  const carregarPerfil = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    const response = await fetch("/api/conta", { credentials: "same-origin" });
    if (!response.ok) {
      let mensagem = "Não foi possível carregar os dados da conta.";
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) mensagem = body.error;
      } catch {
        /* ignore */
      }
      setPerfil(null);
      setErroCarregar(mensagem);
      setCarregando(false);
      return;
    }
    const payload = (await response.json()) as { perfil?: PerfilMinhaConta };
    if (payload.perfil) aplicarPerfil(payload.perfil);
    else setErroCarregar("Colaborador não encontrado.");
    setCarregando(false);
  }, [aplicarPerfil]);

  useEffect(() => {
    if (!open) return;
    void carregarPerfil();
  }, [open, carregarPerfil]);

  async function handleFotoChange(file: File | undefined) {
    if (!file) return;
    setProcessandoFoto(true);
    try {
      const dataUrl = await compressAvatarImage(file);
      setAvatarPreview(dataUrl);
      setAvatarPatch(dataUrl);
      toast({
        variant: "success",
        title: "Foto pronta",
        description: "Salve para aplicar o novo avatar.",
      });
    } catch (error) {
      const description =
        error instanceof CompressAvatarError
          ? error.message
          : "Não foi possível processar a imagem.";
      toast({ variant: "error", title: "Foto não aceita", description });
    } finally {
      setProcessandoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  }

  function removerFoto() {
    setAvatarPreview(null);
    setAvatarPatch(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nome = form.nome.trim();
    const email = form.email.trim();
    const nextErrors: Partial<Record<keyof FormConta, string>> = {};
    if (!nome) nextErrors.nome = "Informe o nome.";
    if (!email) nextErrors.email = "Informe o e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Informe um e-mail válido.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSalvando(true);
    try {
      const response = await fetch("/api/conta", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone: digitosTelefone(form.telefone),
          ...(avatarPatch !== undefined ? { avatar: avatarPatch } : {}),
        }),
      });
      const body = (await response.json()) as { perfil?: PerfilMinhaConta; error?: string };
      if (!response.ok || !body.perfil) {
        toast({
          variant: "error",
          title: "Não foi possível salvar",
          description: body.error ?? "Tente novamente em instantes.",
        });
        const msg = body.error ?? "";
        if (msg.toLocaleLowerCase("pt-BR").includes("e-mail")) {
          setFieldErrors({ email: msg });
        } else if (msg.toLocaleLowerCase("pt-BR").includes("nome")) {
          setFieldErrors({ nome: msg });
        }
        return;
      }
      aplicarPerfil(body.perfil);
      await Promise.all([refreshSessao(), refetchCadastros()]);
      toast({ variant: "success", title: "Conta atualizada" });
      onOpenChange(false);
    } catch {
      toast({
        variant: "error",
        title: "Erro de rede",
        description: "Não foi possível salvar suas alterações.",
      });
    } finally {
      setSalvando(false);
    }
  }

  const initials = perfil ? iniciaisNome(perfil.nome || form.nome) : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-desc`}>
        {carregando ? (
          <>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={UserRound} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>Minha conta</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>Carregando seus dados…</SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody className="items-center justify-center py-xl">
              <Loader2 className="size-8 animate-spin text-primary-container" aria-hidden />
            </SheetBody>
          </>
        ) : erroCarregar ? (
          <>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={UserRound} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>Minha conta</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>Não foi possível carregar</SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <p className="text-body-md text-on-surface-variant">{erroCarregar}</p>
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button type="button" onClick={() => void carregarPerfil()}>
                Tentar de novo
              </Button>
            </SheetFooter>
          </>
        ) : perfil ? (
          <SheetForm onSubmit={(event) => void handleSubmit(event)}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon>
                  <Icon icon={UserRound} size="md" />
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id={`${formId}-title`}>Minha conta</SheetTitle>
                  <SheetDescription id={`${formId}-desc`}>
                    {`${perfil.cargoNome}${perfil.codigoRe ? ` · ${perfil.codigoRe}` : ""}`}
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              <SheetPanel>
                <div className="flex flex-col gap-md min-[480px]:flex-row min-[480px]:items-center">
                  <div className="relative inline-flex size-16 shrink-0">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL local
                      <img
                        src={avatarPreview}
                        alt=""
                        className="size-16 rounded-full border border-border-subtle object-cover"
                      />
                    ) : (
                      <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary-container text-label-lg font-bold text-on-primary">
                        {initials}
                      </span>
                    )}
                    {processandoFoto ? (
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-on-surface/40">
                        <Loader2 className="size-5 animate-spin text-surface-card" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-sm">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={processandoFoto || salvando}
                        onClick={() => inputFotoRef.current?.click()}
                      >
                        <Icon icon={Camera} size="sm" />
                        {avatarPreview ? "Trocar foto" : "Enviar foto"}
                      </Button>
                      {avatarPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={processandoFoto || salvando}
                          onClick={removerFoto}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>
                    <SheetHelpText className="mt-sm">
                      Imagens pesadas são compactadas automaticamente antes do envio.
                    </SheetHelpText>
                    <input
                      ref={inputFotoRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => void handleFotoChange(event.target.files?.[0])}
                    />
                  </div>
                </div>
              </SheetPanel>

              {perfil.codigoRe ? (
                <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                  <Icon icon={IdCard} size="sm" className="shrink-0" />
                  <span>
                    Login <span className="font-semibold text-on-surface">{perfil.codigoRe}</span>
                  </span>
                </div>
              ) : null}

              <FormField label="Nome" htmlFor={`${formId}-nome`} required error={fieldErrors.nome}>
                <Input
                  id={`${formId}-nome`}
                  icon={UserRound}
                  value={form.nome}
                  autoComplete="name"
                  invalid={Boolean(fieldErrors.nome)}
                  disabled={salvando}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                <FormField label="Contato" htmlFor={`${formId}-telefone`}>
                  <Input
                    id={`${formId}-telefone`}
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.telefone}
                    disabled={salvando}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }))
                    }
                  />
                </FormField>
                <FormField label="E-mail" htmlFor={`${formId}-email`} required error={fieldErrors.email}>
                  <Input
                    id={`${formId}-email`}
                    icon={Mail}
                    type="email"
                    value={form.email}
                    autoComplete="email"
                    invalid={Boolean(fieldErrors.email)}
                    disabled={salvando}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </FormField>
              </div>
            </SheetBody>
            <SheetFooterForm
              onClose={() => onOpenChange(false)}
              saveDisabled={salvando || processandoFoto}
              saveLabel={salvando ? "Salvando…" : "Salvar"}
            />
          </SheetForm>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
