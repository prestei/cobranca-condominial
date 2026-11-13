"use client";

import type { ReactNode } from "react";
import { AssistenteFlutuante } from "@/components/ajuda/assistente-flutuante";
import { ToastProvider } from "@/components/toast";
import { AgendarAtendimentoProvider } from "@/context/agendar-atendimento-context";
import { AuthProvider } from "@/context/auth-context";
import { CadastrosProvider } from "@/hooks/use-cadastros";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CadastrosProvider>
        <ToastProvider>
          <AgendarAtendimentoProvider>
            {children}
            <AssistenteFlutuante />
          </AgendarAtendimentoProvider>
        </ToastProvider>
      </CadastrosProvider>
    </AuthProvider>
  );
}
