"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/toast";
import { AgendarAtendimentoProvider } from "@/context/agendar-atendimento-context";
import { AuthProvider } from "@/context/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AgendarAtendimentoProvider>{children}</AgendarAtendimentoProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
