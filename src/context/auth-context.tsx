"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth/types";
import { setUsuarioLogadoId } from "@/lib/auth/logged-in-user";
import { carregarCargosDaApi } from "@/lib/roles/client";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (!response.ok) return null;
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") return null;
  const user = (data as { user?: SessionUser | null }).user;
  if (!user || typeof user.userId !== "number") return null;
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sessionUser = await fetchSession();
    setUser(sessionUser);
    setUsuarioLogadoId(sessionUser?.userId ?? null);
    if (sessionUser) {
      try {
        await carregarCargosDaApi();
      } catch {
        // Cargos serão recarregados ao abrir telas que dependem da lista.
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    setUsuarioLogadoId(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
    }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
