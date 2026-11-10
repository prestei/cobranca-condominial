"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AgendarAtendimentoSheet } from "@/components/atendimentos/agendar-atendimento-sheet";

export type AgendarAtendimentoParams = {
  unidadeId?: number | null;
  condominioId?: number | null;
  dataPreferida?: string;
  tituloUnidade?: string;
};

type AgendarAtendimentoContextValue = {
  abrir: (params?: AgendarAtendimentoParams) => void;
  fechar: () => void;
};

const AgendarAtendimentoContext = createContext<AgendarAtendimentoContextValue | null>(null);

export function AgendarAtendimentoProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [params, setParams] = useState<AgendarAtendimentoParams>({});

  const abrir = useCallback((next?: AgendarAtendimentoParams) => {
    setParams(next ?? {});
    setAberto(true);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
  }, []);

  const value = useMemo(() => ({ abrir, fechar }), [abrir, fechar]);

  return (
    <AgendarAtendimentoContext.Provider value={value}>
      {children}
      <AgendarAtendimentoSheet
        open={aberto}
        unidadeId={params.unidadeId ?? null}
        condominioId={params.condominioId ?? null}
        dataPreferida={params.dataPreferida}
        tituloUnidade={params.tituloUnidade}
        onClose={fechar}
      />
    </AgendarAtendimentoContext.Provider>
  );
}

export function useAgendarAtendimento() {
  const ctx = useContext(AgendarAtendimentoContext);
  if (!ctx) {
    throw new Error("useAgendarAtendimento deve ser usado dentro de AgendarAtendimentoProvider.");
  }
  return ctx;
}
