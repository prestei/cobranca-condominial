"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Cadastros } from "@/data/catalogo";

export const cadastrosVazios: Cadastros = {
  condominios: [],
  cargos: [],
  usuarios: [],
  unidades: [],
  responsaveis: [],
  vinculos: [],
  debitos: [],
  atendimentos: [],
  propostasNegociacao: [],
  encaminhamentosJuridicos: [],
  documentosJuridicos: [],
  parcelasAcordo: [],
  pagamentosAcordo: [],
  atribuicoesCobranca: [],
  importacoes: [],
  auditoria: [],
  notificacoesInternas: [],
  notificacaoFalhas: [],
};

type CadastrosContextValue = {
  cadastros: Cadastros;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const CadastrosContext = createContext<CadastrosContextValue | null>(null);

export function CadastrosProvider({ children }: { children: ReactNode }) {
  const [cadastros, setCadastros] = useState<Cadastros>(cadastrosVazios);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/catalog", { credentials: "same-origin" });
      if (!response.ok) {
        setError("Não foi possível carregar o catálogo.");
        return;
      }
      const payload = (await response.json()) as Cadastros;
      setCadastros(payload);
    } catch {
      setError("Não foi possível carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ cadastros, loading, error, refetch }),
    [cadastros, loading, error, refetch],
  );

  return <CadastrosContext.Provider value={value}>{children}</CadastrosContext.Provider>;
}

/** Catálogo operacional carregado de `/api/catalog` (PostgreSQL). */
export function useCadastros(): Cadastros {
  const ctx = useContext(CadastrosContext);
  if (!ctx) {
    throw new Error("useCadastros deve ser usado dentro de CadastrosProvider.");
  }
  return ctx.cadastros;
}

export function useCadastrosStatus() {
  const ctx = useContext(CadastrosContext);
  if (!ctx) {
    throw new Error("useCadastrosStatus deve ser usado dentro de CadastrosProvider.");
  }
  return ctx;
}
