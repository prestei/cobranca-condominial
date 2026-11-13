"use client";

import { Bot, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Textarea } from "@/components/input";
import { useToast } from "@/components/toast";
import { useAuth } from "@/context/auth-context";
import { captureScreenContext } from "@/lib/ajuda/capture-screen-context";
import type { MensagemHistorico } from "@/lib/ajuda/assistant-prompt";

const ROTAS_SEM_ASSISTENTE = ["/login", "/design-system"];

type ChatItem = MensagemHistorico & { id: string };

function novaId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AssistenteFlutuante() {
  const pathname = usePathname() ?? "/";
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagens, setMensagens] = useState<ChatItem[]>([]);
  const listaRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const visivel = useMemo(() => {
    if (loading || !user) return false;
    return !ROTAS_SEM_ASSISTENTE.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
  }, [loading, user, pathname]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, aberto, enviando]);

  const enviar = useCallback(async () => {
    const texto = pergunta.trim();
    if (!texto || enviando) return;

    const userMsg: ChatItem = { id: novaId(), role: "user", content: texto };
    const historico: MensagemHistorico[] = [...mensagens, userMsg].map(({ role, content }) => ({ role, content }));

    setMensagens((prev) => [...prev, userMsg]);
    setPergunta("");
    setEnviando(true);

    try {
      const contextoTela = captureScreenContext();
      const response = await fetch("/api/ajuda/assistente", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: texto,
          pathname,
          contextoTela,
          historico: historico.slice(0, -1),
        }),
      });

      const data: unknown = await response.json();
      const record = data && typeof data === "object" ? (data as { resposta?: string; error?: string }) : {};
      if (!response.ok) {
        toast({
          variant: "error",
          title: "Assistente",
          description: record.error ?? "Não foi possível obter resposta.",
        });
        return;
      }

      const resposta = typeof record.resposta === "string" ? record.resposta.trim() : "";
      if (!resposta) {
        toast({ variant: "error", title: "Assistente", description: "Resposta vazia do assistente." });
        return;
      }

      setMensagens((prev) => [...prev, { id: novaId(), role: "assistant", content: resposta }]);
    } catch {
      toast({ variant: "error", title: "Assistente", description: "Falha de rede ao consultar o assistente." });
    } finally {
      setEnviando(false);
    }
  }, [pergunta, enviando, mensagens, pathname, toast]);

  if (!visivel || !portalReady) return null;

  const painel = (
    <div
      data-assistente-ajuda
      className="pointer-events-none fixed bottom-[5.5rem] right-md z-[60] flex flex-col items-end gap-sm min-[768px]:bottom-[4.5rem]"
    >
      {aberto ? (
        <div
          className="pointer-events-auto flex max-h-[min(70vh,32rem)] w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-modal"
          role="dialog"
          aria-label="Assistente de ajuda"
        >
          <header className="flex items-start gap-sm bg-gradient-to-br from-primary-container to-tertiary-container px-md py-md text-on-primary">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-on-primary/25 bg-on-primary/10"
              aria-hidden
            >
              <Icon icon={Bot} size="lg" className="text-on-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-xs">
                <p className="text-label-md font-semibold">Assistente</p>
                <Icon icon={Sparkles} size="sm" className="text-brass" aria-hidden />
              </div>
              <p className="text-body-sm text-on-primary/85">
                Dúvidas desta tela, no seu perfil.{" "}
                <Link
                  href="/ajuda"
                  className="font-medium text-brass underline-offset-2 hover:underline"
                >
                  Manual
                </Link>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-on-primary hover:bg-on-primary/15 hover:text-on-primary"
              aria-label="Fechar assistente"
              onClick={() => setAberto(false)}
            >
              <Icon icon={X} size="sm" />
            </Button>
          </header>

          <div ref={listaRef} className="flex flex-1 flex-col gap-sm overflow-y-auto px-md py-sm">
            {mensagens.length === 0 ? (
              <div className="flex gap-sm rounded-lg border border-dashed border-border-subtle bg-surface-subtle px-sm py-sm">
                <Icon icon={Bot} size="md" className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
                <p className="text-body-sm text-on-surface-variant">
                  Olá! Pergunte como usar filtros, botões ou fluxos desta página. Não oriento configurações técnicas nem
                  telas fora das suas permissões.
                </p>
              </div>
            ) : null}
            {mensagens.map((msg) =>
              msg.role === "user" ? (
                <div
                  key={msg.id}
                  className="ml-lg rounded-lg rounded-br-sm bg-primary-container/12 px-sm py-xs text-body-sm text-on-surface"
                >
                  {msg.content}
                </div>
              ) : (
                <div key={msg.id} className="flex gap-sm">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container/15 to-tertiary-container/20"
                    aria-hidden
                  >
                    <Icon icon={Bot} size="sm" className="text-primary-container" />
                  </div>
                  <div className="max-w-[calc(100%-2.5rem)] rounded-lg rounded-tl-sm border border-border-subtle bg-background px-sm py-xs text-body-sm text-on-surface">
                    {msg.content}
                  </div>
                </div>
              ),
            )}
            {enviando ? <p className="text-body-sm text-on-surface-variant">Pensando…</p> : null}
          </div>

          <footer className="border-t border-border-subtle p-sm">
            <form
              className="flex flex-col gap-sm"
              onSubmit={(e) => {
                e.preventDefault();
                void enviar();
              }}
            >
              <Textarea
                rows={2}
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Ex.: Como registro um retorno nesta tela?"
                disabled={enviando}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar();
                  }
                }}
              />
              <Button type="submit" size="sm" disabled={enviando || !pergunta.trim()} className="self-end">
                <Icon icon={Send} size="sm" className="mr-xs" />
                Enviar
              </Button>
            </form>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        className={`pointer-events-auto group flex items-center gap-sm rounded-full border-2 border-on-primary/20 bg-gradient-to-br from-primary-container to-tertiary-container text-on-primary shadow-popover transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-button-hover focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] ${
          aberto ? "h-12 w-12 justify-center p-0" : "h-12 min-w-12 pl-3 pr-4"
        }`}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente de ajuda"}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? (
          <Icon icon={X} size="lg" />
        ) : (
          <>
            <span className="relative flex size-9 items-center justify-center rounded-full bg-on-primary/15">
              <Icon icon={Bot} size="lg" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-primary-container bg-brass" />
            </span>
            <span className="hidden text-label-md font-semibold min-[480px]:inline">Ajuda</span>
          </>
        )}
      </button>
    </div>
  );

  return createPortal(painel, document.body);
}
