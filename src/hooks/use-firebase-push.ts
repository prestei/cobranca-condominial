"use client";

import { useAuth } from "@/context/auth-context";
import { useEffect, useRef } from "react";

type PushRegistrarPayload = {
  token: string;
  userAgent?: string;
};

let tokenAtivo: string | null = null;

async function removerTokenServidor(token: string) {
  await fetch("/api/notificacoes/push/registrar", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

/** Registra FCM no workspace (todos os perfis com dashboard.ler). */
export function useFirebasePush(onForeground?: () => void) {
  const { user, loading } = useAuth();
  const iniciado = useRef(false);

  useEffect(() => {
    if (loading || !user?.userId || iniciado.current) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    let cancelado = false;

    void (async () => {
      const configRes = await fetch("/api/notificacoes/push/config", { credentials: "same-origin" });
      if (!configRes.ok || cancelado) return;
      const config = (await configRes.json()) as {
        enabled?: boolean;
        firebase?: Record<string, string>;
        vapidKey?: string;
      };
      if (!config.enabled || !config.firebase || !config.vapidKey) return;

      const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported, onMessage }] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);

      const suportado = await isSupported();
      if (!suportado || cancelado) return;

      await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      if (cancelado) return;

      const app = getApps().length > 0 ? getApps()[0]! : initializeApp(config.firebase);
      const messaging = getMessaging(app);

      if (Notification.permission === "denied") return;
      if (Notification.permission === "default") {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted" || cancelado) return;
      }

      const token = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token || cancelado) return;

      if (tokenAtivo && tokenAtivo !== token) {
        await removerTokenServidor(tokenAtivo);
      }

      const corpo: PushRegistrarPayload = { token, userAgent: navigator.userAgent };
      const registro = await fetch("/api/notificacoes/push/registrar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!registro.ok) return;

      tokenAtivo = token;
      iniciado.current = true;

      onMessage(messaging, () => {
        onForeground?.();
      });
    })().catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [loading, onForeground, user?.userId]);
}
