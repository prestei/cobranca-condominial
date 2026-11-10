"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/toast";
import { AgendarAtendimentoProvider } from "@/context/agendar-atendimento-context";
import { AuthProvider } from "@/context/auth-context";
import { CadastrosProvider } from "@/hooks/use-cadastros";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CadastrosProvider>
        <ToastProvider>
          <AgendarAtendimentoProvider>{children}</AgendarAtendimentoProvider>
        </ToastProvider>
      </CadastrosProvider>
    </AuthProvider>
  );
}
