import { getCadastros, setCondominios, type Condominio } from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export type ResultadoSyncCondominios = { ok: true } | { ok: false; error: string };

/**
 * Mescla condomínios retornados pela API no catálogo do cliente.
 * Inclui cadastros novos (ex.: provisionados na importação) mesmo que ainda não existam
 * no escopo local — filtrar pelo catálogo antigo descartava esses IDs.
 */
export function sincronizarCondominiosDoServidor(condominios: Condominio[], userId?: number) {
  const cadastros = getCadastros();
  const perm = permissoesDoUsuarioId(userId ?? -1, cadastros);
  const escopoAdministrativo =
    temPermissao(perm, "condominios", "criar") || temPermissao(perm, "condominios", "editar");
  setCondominios((current) => {
    if (escopoAdministrativo) {
      const idsApi = new Set(condominios.map((item) => item.id));
      const locaisAindaNaoNoServidor = current.filter((item) => !idsApi.has(item.id));
      return [...locaisAindaNaoNoServidor, ...condominios].sort((a, b) => a.id - b.id);
    }
    // Perfil restrito: a API já devolve só a carteira; não filtrar pelo catálogo local desatualizado.
    return [...condominios].sort((a, b) => a.id - b.id);
  });
}

export function aplicarCondominioExcluido(condominioId: number) {
  setCondominios((current) => current.filter((item) => item.id !== condominioId));
}

export function aplicarCondominioSalvo(condominio: Condominio, acao: "INSERT" | "UPDATE") {
  if (acao === "INSERT") {
    setCondominios((current) => {
      if (current.some((item) => item.id === condominio.id)) {
        return current.map((item) => (item.id === condominio.id ? condominio : item));
      }
      return [...current, condominio];
    });
  } else {
    setCondominios((current) => current.map((item) => (item.id === condominio.id ? condominio : item)));
  }
}

/**
 * Condomínios cadastrados só no navegador não existem na memória do servidor (API de unidades valida lá).
 * Sincroniza a lista do servidor e envia via POST os que existem localmente mas ainda não estão no servidor.
 */
export async function garantirCondominiosPersistidosNoServidor(userId?: number): Promise<ResultadoSyncCondominios> {
  const response = await fetch("/api/condominios", { credentials: "same-origin" });
  if (!response.ok) {
    return { ok: false, error: "Não foi possível carregar os condomínios do servidor." };
  }
  const payload = (await response.json()) as { condominios?: Condominio[] };
  let noServidor = payload.condominios ?? [];
  sincronizarCondominiosDoServidor(noServidor, userId);

  const idsServidor = new Set(noServidor.map((item) => item.id));
  const faltando = getCadastros().condominios.filter((item) => !idsServidor.has(item.id));

  for (const item of faltando) {
    const criar = await fetch("/api/condominios", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    let body: { condominio?: Condominio; error?: string } = {};
    try {
      body = (await criar.json()) as typeof body;
    } catch {
      body = {};
    }
    if (!criar.ok || !body.condominio) {
      const msg =
        body.error ??
        (criar.status === 403
          ? "Condomínio ainda não está no servidor. Peça à administradora para cadastrá-lo em Condomínios."
          : "Não foi possível sincronizar o condomínio com o servidor.");
      return { ok: false, error: msg };
    }
    aplicarCondominioSalvo(body.condominio, "INSERT");
    idsServidor.add(body.condominio.id);
    noServidor = [...noServidor, body.condominio];
  }

  if (faltando.length > 0) {
    const recarregar = await fetch("/api/condominios", { credentials: "same-origin" });
    if (recarregar.ok) {
      const atualizado = (await recarregar.json()) as { condominios?: Condominio[] };
      if (atualizado.condominios) sincronizarCondominiosDoServidor(atualizado.condominios, userId);
    }
  }

  return { ok: true };
}
