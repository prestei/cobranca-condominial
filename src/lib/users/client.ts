import { setUsuarios, type Usuario } from "@/lib/catalog";
import type { UsuarioPublico } from "@/lib/users/types";

type ApiError = {
  error: string;
  fields?: Partial<
    Record<"nome" | "codigo" | "cargoId" | "cpf" | "dataNascimento" | "email" | "senha", string>
  >;
};

async function parseJson<T>(response: Response): Promise<T | ApiError> {
  try {
    return (await response.json()) as T | ApiError;
  } catch {
    return { error: "Resposta inválida do servidor." };
  }
}

function mergeUsuarioPublico(item: UsuarioPublico, senhaAnterior = ""): Usuario {
  return {
    ...item,
    cpf: item.cpf ?? "",
    dataNascimento: item.dataNascimento ?? "",
    senha: senhaAnterior,
  };
}

export async function carregarUsuariosDaApi() {
  const response = await fetch("/api/users", { credentials: "same-origin" });
  const data = await parseJson<{ usuarios: UsuarioPublico[] }>(response);
  if (!response.ok || !("usuarios" in data)) {
    throw new Error("error" in data ? data.error : "Não foi possível carregar colaboradores.");
  }

  setUsuarios((current) => {
    const senhas = new Map(current.map((item) => [item.id, item.senha]));
    return data.usuarios.map((item) => mergeUsuarioPublico(item, senhas.get(item.id) ?? ""));
  });
}

export async function salvarUsuarioNaApi(payload: {
  editingId: number | null;
  codigo: string;
  cargoId: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  senha?: string;
}) {
  const body = {
    codigo: payload.codigo,
    cargoId: payload.cargoId,
    nome: payload.nome,
    cpf: payload.cpf,
    dataNascimento: payload.dataNascimento,
    telefone: payload.telefone,
    email: payload.email,
    senha: payload.senha,
  };

  const response =
    payload.editingId === null
      ? await fetch("/api/users", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`/api/users/${payload.editingId}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

  const data = await parseJson<{ usuario: UsuarioPublico }>(response);
  if (!response.ok || !("usuario" in data)) {
    const message = "error" in data ? data.error : "Não foi possível salvar o colaborador.";
    return { ok: false as const, error: message, fields: "fields" in data ? data.fields : undefined };
  }

  setUsuarios((current) => {
    const senhaAnterior = current.find((item) => item.id === data.usuario.id)?.senha ?? "";
    const merged = mergeUsuarioPublico(data.usuario, senhaAnterior);
    if (payload.editingId === null) {
      return [...current, merged];
    }
    return current.map((item) => (item.id === data.usuario.id ? merged : item));
  });

  return { ok: true as const, usuario: data.usuario };
}

export async function excluirUsuarioNaApi(id: number) {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = await parseJson<{ ok: boolean }>(response);
  if (!response.ok) {
    const message = "error" in data ? data.error : "Não foi possível excluir o colaborador.";
    return { ok: false as const, error: message };
  }

  setUsuarios((current) => current.filter((item) => item.id !== id));
  return { ok: true as const };
}
