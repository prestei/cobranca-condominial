import { setCargos } from "@/lib/catalog";
import type { CargoPublico } from "@/lib/roles/types";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import { parsePermissoesJson, serializarPermissoes } from "@/lib/permissions/parse";

type ApiError = {
  error: string;
  fields?: Partial<Record<"nome", string>>;
};

async function parseJson<T>(response: Response): Promise<T | ApiError> {
  try {
    return (await response.json()) as T | ApiError;
  } catch {
    return { error: "Resposta inválida do servidor." };
  }
}

export async function carregarCargosDaApi() {
  const response = await fetch("/api/roles", { credentials: "same-origin" });
  const data = await parseJson<{ cargos: CargoPublico[] }>(response);
  if (!response.ok || !("cargos" in data)) {
    throw new Error("error" in data ? data.error : "Não foi possível carregar cargos.");
  }

  setCargos(data.cargos);
}

export async function salvarCargoNaApi(payload: {
  editingId: number | null;
  nome: string;
  descricao: string;
  permissoes: PermissoesCargo;
}) {
  const body = {
    nome: payload.nome,
    descricao: payload.descricao,
    permissaoJson: serializarPermissoes(payload.permissoes),
  };

  const response =
    payload.editingId === null
      ? await fetch("/api/roles", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`/api/roles/${payload.editingId}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

  const data = await parseJson<{ cargo: CargoPublico }>(response);
  if (!response.ok || !("cargo" in data)) {
    const message = "error" in data ? data.error : "Não foi possível salvar o cargo.";
    return { ok: false as const, error: message, fields: "fields" in data ? data.fields : undefined };
  }

  setCargos((current) => {
    if (payload.editingId === null) {
      return [...current, data.cargo];
    }
    return current.map((item) => (item.id === data.cargo.id ? data.cargo : item));
  });

  return { ok: true as const, cargo: data.cargo };
}

export async function excluirCargoNaApi(id: number) {
  const response = await fetch(`/api/roles/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = await parseJson<{ ok: boolean }>(response);
  if (!response.ok) {
    const message = "error" in data ? data.error : "Não foi possível excluir o cargo.";
    return { ok: false as const, error: message };
  }

  setCargos((current) => current.filter((item) => item.id !== id));
  return { ok: true as const };
}

/** Sincroniza permissões no cliente após carregar cargos (uso interno). */
export function permissaoJsonDoCargo(cargo: CargoPublico) {
  return parsePermissoesJson(cargo.permissaoJson);
}
