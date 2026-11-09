"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SessionUser } from "@/lib/auth/types";
import { setUsuarioLogadoId } from "@/lib/auth/usuario-logado";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

type AuthContextValue = {
  user: SessionUser | null;
  permissoes: PermissoesCargo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionPayload = {
  user: SessionUser | null;
  permissoes: PermissoesCargo | null;
};

async function fetchSession(): Promise<SessionPayload> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (!response.ok) return { user: null, permissoes: null };
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") return { user: null, permissoes: null };
  const record = data as { user?: SessionUser | null; permissoes?: PermissoesCargo | null };
  const user = record.user;
  if (!user || typeof user.userId !== "number") {
    return { user: null, permissoes: null };
  }
  const permissoes =
    record.permissoes && typeof record.permissoes === "object" ? record.permissoes : null;
  return { user, permissoes };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissoes, setPermissoes] = useState<PermissoesCargo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = await fetchSession();
    setUser(session.user);
    setPermissoes(session.permissoes);
    setUsuarioLogadoId(session.user?.userId ?? null);
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
    setPermissoes(null);
    setUsuarioLogadoId(null);
    window.location.assign("/login");
  }, []);

  const value = useMemo(
    () => ({
      user,
      permissoes,
      loading,
      refresh,
      logout,
    }),
    [user, permissoes, loading, refresh, logout],
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
