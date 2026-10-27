import { getCadastros, setUsuarios } from "@/data/catalogo";
import { usuarioPublicoParaCatalogo, type UsuarioPublico } from "@/lib/usuarios/apresentacao";

export type ResultadoSyncUsuarios = { ok: true } | { ok: false; error: string };

function senhaLocal(usuarioId: number) {
  return getCadastros().usuarios.find((item) => item.id === usuarioId)?.senha ?? "";
}

/** Mescla colaboradores retornados pela API no catálogo do cliente. */
export function sincronizarUsuariosDoServidor(usuarios: UsuarioPublico[]) {
  const idsServidor = new Set(usuarios.map((item) => item.id));
  setUsuarios((current) => {
    const legado = current.filter((item) => !idsServidor.has(item.id));
    const porId = new Map(legado.map((item) => [item.id, item]));
    for (const publico of usuarios) {
      porId.set(publico.id, usuarioPublicoParaCatalogo(publico, senhaLocal(publico.id)));
    }
    return [...porId.values()].sort((a, b) => a.id - b.id);
  });
}

export function aplicarUsuarioExcluido(usuarioId: number) {
  setUsuarios((current) => current.filter((item) => item.id !== usuarioId));
}

export function aplicarUsuarioSalvo(publico: UsuarioPublico, acao: "INSERT" | "UPDATE") {
  const usuario = usuarioPublicoParaCatalogo(publico, senhaLocal(publico.id));
  if (acao === "INSERT") {
    setUsuarios((current) => {
      if (current.some((item) => item.id === usuario.id)) {
        return current.map((item) => (item.id === usuario.id ? usuario : item));
      }
      return [...current, usuario];
    });
  } else {
    setUsuarios((current) => current.map((item) => (item.id === usuario.id ? usuario : item)));
  }
}

/**
 * Colaboradores cadastrados só no navegador não existem na memória do servidor.
 * Sincroniza a lista do servidor e envia via POST os que existem localmente mas ainda não estão no servidor.
 */
export async function garantirUsuariosPersistidosNoServidor(): Promise<ResultadoSyncUsuarios> {
  const response = await fetch("/api/usuarios", { credentials: "same-origin" });
  if (!response.ok) {
    return { ok: false, error: "Não foi possível carregar os colaboradores do servidor." };
  }
  const payload = (await response.json()) as { usuarios?: UsuarioPublico[] };
  let noServidor = payload.usuarios ?? [];
  sincronizarUsuariosDoServidor(noServidor);

  const idsServidor = new Set(noServidor.map((item) => item.id));
  const faltando = getCadastros().usuarios.filter((item) => !idsServidor.has(item.id));

  for (const item of faltando) {
    const criar = await fetch("/api/usuarios", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        codigo: item.codigo,
        cargoId: item.cargoId,
        nome: item.nome,
        telefone: item.telefone,
        email: item.email,
        codigoRe: item.codigoRe,
        senha: item.senha || undefined,
      }),
    });
    let body: { usuario?: UsuarioPublico; error?: string } = {};
    try {
      body = (await criar.json()) as typeof body;
    } catch {
      body = {};
    }
    if (!criar.ok || !body.usuario) {
      const msg =
        body.error ??
        (criar.status === 403
          ? "Colaborador ainda não está no servidor. Peça à administradora para cadastrá-lo em Colaboradores."
          : "Não foi possível sincronizar o colaborador com o servidor.");
      return { ok: false, error: msg };
    }
    aplicarUsuarioSalvo(body.usuario, "INSERT");
    idsServidor.add(body.usuario.id);
    noServidor = [...noServidor, body.usuario];
  }

  if (faltando.length > 0) {
    const recarregar = await fetch("/api/usuarios", { credentials: "same-origin" });
    if (recarregar.ok) {
      const atualizado = (await recarregar.json()) as { usuarios?: UsuarioPublico[] };
      if (atualizado.usuarios) sincronizarUsuariosDoServidor(atualizado.usuarios);
    }
  }

  return { ok: true };
}
