"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ContaProfileSheet } from "@/components/conta-profile-sheet";

type ContaProfileContextValue = {
  openContaProfile: () => void;
};

const ContaProfileContext = createContext<ContaProfileContextValue | null>(null);

export function ContaProfileProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openContaProfile = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openContaProfile }), [openContaProfile]);

  return (
    <ContaProfileContext.Provider value={value}>
      {children}
      <ContaProfileSheet open={open} onOpenChange={setOpen} />
    </ContaProfileContext.Provider>
  );
}

export function useContaProfile() {
  const ctx = useContext(ContaProfileContext);
  if (!ctx) {
    throw new Error("useContaProfile deve ser usado dentro de ContaProfileProvider.");
  }
  return ctx;
}
