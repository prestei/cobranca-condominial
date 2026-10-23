"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import type { AcaoPermissao, ModuloPermissao } from "@/lib/permissions/modulos";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export function usePermissao() {
  const { user } = useAuth();
  const cadastros = useCadastros();

  const permissoes = useMemo(() => {
    if (!user) return permissoesDoUsuarioId(-1, cadastros);
    return permissoesDoUsuarioId(user.userId, cadastros);
  }, [user, cadastros]);

  const pode = useCallback(
    (modulo: ModuloPermissao, acao: AcaoPermissao) => temPermissao(permissoes, modulo, acao),
    [permissoes],
  );

  return { permissoes, pode };
}
