export type ResultadoSyncUsuarios = { ok: true } | { ok: false; error: string };

/** Confirma que a API de colaboradores responde (sem espelho local de cadastro). */
export async function garantirUsuariosPersistidosNoServidor(): Promise<ResultadoSyncUsuarios> {
  const response = await fetch("/api/usuarios", { credentials: "same-origin" });
  if (!response.ok) {
    return { ok: false, error: "Não foi possível carregar os colaboradores do servidor." };
  }
  return { ok: true };
}
