export type ResultadoSyncCondominios = { ok: true } | { ok: false; error: string };

/** Garante que a lista de condomínios no servidor está acessível (sem catálogo em memória). */
export async function garantirCondominiosPersistidosNoServidor(): Promise<ResultadoSyncCondominios> {
  const response = await fetch("/api/condominios", { credentials: "same-origin" });
  if (!response.ok) {
    return { ok: false, error: "Não foi possível carregar os condomínios do servidor." };
  }
  return { ok: true };
}
