"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import type { AcaoPermissao, ModuloPermissao } from "@/lib/permissions/modulos";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesVazias } from "@/lib/permissions/parse";

/** Permissões da sessão (PostgreSQL via login/session). Sem fallback para seed/catálogo local. */
export function usePermissao() {
  const { permissoes: permissoesSessao } = useAuth();

  const permissoes = useMemo(
    () => (permissoesSessao && typeof permissoesSessao === "object" ? permissoesSessao : permissoesVazias()),
    [permissoesSessao],
  );

  const pode = useCallback(
    (modulo: ModuloPermissao, acao: AcaoPermissao) => temPermissao(permissoes, modulo, acao),
    [permissoes],
  );

  return { permissoes, pode };
}
