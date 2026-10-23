"use client";

import type { FormEvent } from "react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { FormField, Input } from "@/components/input";
import { useAuthOptional } from "@/context/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthOptional();
  const [codigo, setCodigo] = useState("12345");
  const [password, setPassword] = useState("12345");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destino = searchParams?.get("from") ?? null;
  const redirectTo = destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";

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

      await auth?.refresh();
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Falha de conexão. Verifique a rede e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FB]">
      <div className="flex flex-1 flex-col items-center justify-center px-md py-xl">
        <div className="w-full max-w-[420px] rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <div className="mb-lg flex flex-col gap-xs border-b border-border-subtle pb-md">
            <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-brass">Lex Condominial</p>
            <h1 className="text-headline-sm text-on-surface">Entrar no sistema</h1>
            <p className="text-body-sm text-on-surface-variant">
              Por enquanto: código 12345 e senha 12345 (admin de teste). Demais colaboradores usam o próprio código com senha 12345.
            </p>
          </div>

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <FormField label="Código" required>
              <Input
                type="text"
                name="codigo"
                autoComplete="username"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                invalid={Boolean(error)}
                disabled={submitting}
                placeholder="Ex.: MILENA"
              />
            </FormField>
            <FormField label="Senha" required>
              <Input
                type="password"
                name="password"
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] text-body-md text-on-surface-variant">
          Carregando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
