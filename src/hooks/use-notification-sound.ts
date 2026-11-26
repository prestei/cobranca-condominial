"use client";

import { playNotificationSound, unlockNotificationSound } from "@/lib/notificacoes/notification-sound";
import { useEffect, useRef } from "react";

/**
 * Toca alerta quando a contagem de não lidas sobe (após a primeira carga).
 * Desbloqueia áudio no primeiro gesto do usuário na página.
 */
export function useNotificationSound(unreadCount: number, loading: boolean) {
  const previousUnread = useRef<number | null>(null);
  const skipInitial = useRef(true);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (skipInitial.current) {
      skipInitial.current = false;
      previousUnread.current = unreadCount;
      return;
    }
    const prev = previousUnread.current ?? unreadCount;
    if (unreadCount > prev) {
      playNotificationSound();
    }
    previousUnread.current = unreadCount;
  }, [unreadCount, loading]);
}