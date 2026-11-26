"use client";

import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/button";
import { FormField, Input } from "@/components/input";
import { SkeletonLogin } from "@/components/skeleton";
import { useAuthOptional } from "@/context/auth-context";
import { destinoSeguroAposLogin } from "@/lib/auth/destino-pos-login";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthOptional();
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [montado, setMontado] = useState(false);
  const [ambienteLocal, setAmbienteLocal] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setAmbienteLocal(host === "localhost" || host === "127.0.0.1");
    setMontado(true);
  }, []);

  const destino = searchParams?.get("from") ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ codigo: codigo.trim(), password }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data && typeof data === "object" && typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Não foi possível entrar. Tente novamente.";
        setError(message);
        return;
      }

      const permissoes =
        data &&
        typeof data === "object" &&
        (data as { permissoes?: PermissoesCargo }).permissoes &&
        typeof (data as { permissoes?: PermissoesCargo }).permissoes === "object"
          ? (data as { permissoes: PermissoesCargo }).permissoes
          : {};
      const redirectTo = destinoSeguroAposLogin(destino, permissoes);

      await auth?.refresh();
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Falha de conexão. Verifique a rede e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!montado) {
    return <SkeletonLogin />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FB]">
      <div className="flex flex-1 flex-col items-center justify-center px-md py-xl">
        <div className="w-full max-w-[420px] rounded-xl border border-border-subtle bg-primary-container p-lg shadow-card">
          <div className="mb-lg flex flex-col items-center gap-md border-b border-white/15 pb-md text-center">
            <img
              src="/logo-daniel-jorge.webp"
              alt="Daniel Jorge Advocacia"
              className="h-12 w-auto max-w-full rounded-md object-contain object-center"
            />
            <h1 className="text-headline-sm text-on-primary">Entrar no sistema</h1>
          </div>

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <FormField label="Código RE" className="[&>label]:!text-on-primary">
              <Input
                icon={KeyRound}
                type="text"
                name="codigo"
                autoComplete="username"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                invalid={Boolean(error)}
                disabled={submitting}
                placeholder="Ex.: 10000 ou RE-10000"
              />
            </FormField>
            <FormField label="Senha" className="[&>label]:!text-on-primary">
              <Input
                icon={Lock}
                type="password"
                name="password"
                placeholder="Sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                invalid={Boolean(error)}
                disabled={submitting}
              />
            </FormField>
            {error ? (
              <p className="text-body-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="secondary"
              className="w-full hover:!translate-y-0 hover:!from-brass hover:!to-secondary-container hover:!text-primary-container hover:!shadow-button-hover"
              disabled={submitting}
            >
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
            {ambienteLocal ? (
              <p className="text-center text-body-xs leading-relaxed text-on-primary/80">
                Demonstração: MILENA (administradora), RAQUEL ou TASSIA (atendente), ADRYELLE (advogada). Senha
                padrão: 12345.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<SkeletonLogin />}>
      <LoginForm />
    </Suspense>
  );
}
