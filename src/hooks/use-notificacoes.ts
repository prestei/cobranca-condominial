"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import type { NotificacaoInterna } from "@/data/catalogo";
import {
  aplicarNotificacaoAtualizada,
  sincronizarNotificacoesDoServidor,
} from "@/lib/notificacoes/sync-cliente";

export type NotificacaoUi = NotificacaoInterna & {
  urlRegistro: string | null;
  relativo: string;
  criadoEmFormatado: string;
};

const INTERVALO_SINCRONIZACAO_MS = 45_000;

export function useNotificacoes() {
  const { user } = useAuth();
  const [itens, setItens] = useState<NotificacaoUi[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!user?.userId) {
      setItens([]);
      setNaoLidas(0);
      return;
    }
    setCarregando(true);
    try {
      const [listaRes, contagemRes] = await Promise.all([
        fetch("/api/notificacoes?limit=8", { credentials: "same-origin" }),
        fetch("/api/notificacoes/contagem", { credentials: "same-origin" }),
      ]);
      if (listaRes.ok) {
        const payload = (await listaRes.json()) as { notificacoes?: NotificacaoUi[] };
        const lista = payload.notificacoes ?? [];
        setItens(lista);
        sincronizarNotificacoesDoServidor(lista, user.userId);
      }
      if (contagemRes.ok) {
        const payload = (await contagemRes.json()) as { total?: number };
        setNaoLidas(payload.total ?? 0);
      }
    } finally {
      setCarregando(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  useEffect(() => {
    if (!user?.userId) return;

    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") void recarregar();
    }, INTERVALO_SINCRONIZACAO_MS);

    const aoVisivel = () => {
      if (document.visibilityState === "visible") void recarregar();
    };
    document.addEventListener("visibilitychange", aoVisivel);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVisivel);
    };
  }, [recarregar, user?.userId]);

  const marcarTodasLidas = useCallback(async () => {
    const response = await fetch("/api/notificacoes/marcar-todas-lidas", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) return;
    setNaoLidas(0);
    setItens((current) => current.map((item) => ({ ...item, lidaEm: item.lidaEm ?? new Date().toISOString() })));
    void recarregar();
  }, [recarregar]);

  const marcarLida = useCallback(
    async (id: number) => {
      const response = await fetch(`/api/notificacoes/${id}/lida`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { notificacao?: NotificacaoUi };
      if (payload.notificacao) {
        aplicarNotificacaoAtualizada(payload.notificacao);
        setItens((current) => current.map((item) => (item.id === id ? payload.notificacao! : item)));
        setNaoLidas((n) => Math.max(0, n - 1));
      }
      return true;
    },
    [],
  );

  const abrirNotificacao = useCallback(
    async (id: number) => {
      const response = await fetch(`/api/notificacoes/${id}/abrir`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; notificacao?: NotificacaoUi };
      if (!response.ok) {
        return { ok: false as const, error: payload.error ?? "Não foi possível abrir." };
      }
      if (payload.notificacao) {
        aplicarNotificacaoAtualizada(payload.notificacao);
        setItens((current) => current.map((item) => (item.id === id ? payload.notificacao! : item)));
        setNaoLidas((n) => Math.max(0, n - (payload.notificacao?.lidaEm ? 1 : 0)));
      }
      return { ok: true as const, notificacao: payload.notificacao };
    },
    [],
  );

  return {
    itens,
    naoLidas,
    carregando,
    recarregar,
    marcarTodasLidas,
    marcarLida,
    abrirNotificacao,
  };
}
