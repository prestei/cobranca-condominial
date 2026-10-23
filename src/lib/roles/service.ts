import { registrarAuditoria } from "@/lib/catalog";
import { countUsuariosPorCargo } from "@/lib/users/repository";
import {
  atualizarCargo,
  buscarCargoPorId,
  excluirCargo,
  inserirCargo,
  listarCargos,
} from "@/lib/roles/repository";
import type { CargoInput, CargoPublico } from "@/lib/roles/types";
import { validarCargoInput } from "@/lib/roles/validate";
import { cargoTemAlgumaPermissao, serializarPermissoes } from "@/lib/permissions/parse";

async function cargoEmUsoPorColaboradores(cargoId: number) {
  return (await countUsuariosPorCargo(cargoId)) > 0;
}

export async function listarCargosPublicos(): Promise<CargoPublico[]> {
  return listarCargos();
}

export async function criarCargo(input: CargoInput, actorUserId: number) {
  if (!cargoTemAlgumaPermissao(input.permissoes)) {
    return {
      ok: false as const,
      error: "Escolha pelo menos uma opção em alguma área do sistema.",
    };
  }

  const errors = await validarCargoInput(input, { editingId: null });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  const permissaoJson = serializarPermissoes(input.permissoes);
  const salvo = await inserirCargo(input.nome.trim(), input.descricao.trim(), permissaoJson);

  registrarAuditoria({
    entidade: "role",
    registroId: String(salvo.id),
    acao: "INSERT",
    dadosAnteriores: "",
    dadosNovos: salvo.nome,
    camposAlterados: "nome, descricao, permissao_json",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const, cargo: salvo };
}

export async function atualizarCargoPorId(id: number, input: CargoInput, actorUserId: number) {
  const anterior = await buscarCargoPorId(id);
  if (!anterior) {
    return { ok: false as const, notFound: true };
  }

  if (!cargoTemAlgumaPermissao(input.permissoes)) {
    return {
      ok: false as const,
      error: "Escolha pelo menos uma opção em alguma área do sistema.",
    };
  }

  const errors = await validarCargoInput(input, { editingId: id });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  const permissaoJson = serializarPermissoes(input.permissoes);
  const salvo = await atualizarCargo(id, input.nome.trim(), input.descricao.trim(), permissaoJson);
  if (!salvo) {
    return { ok: false as const, notFound: true };
  }

  registrarAuditoria({
    entidade: "role",
    registroId: String(id),
    acao: "UPDATE",
    dadosAnteriores: anterior.nome,
    dadosNovos: salvo.nome,
    camposAlterados: "nome, descricao, permissao_json",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const, cargo: salvo };
}

export async function excluirCargoPorId(id: number, actorUserId: number) {
  const alvo = await buscarCargoPorId(id);
  if (!alvo) {
    return { ok: false as const, notFound: true };
  }

  if (await cargoEmUsoPorColaboradores(id)) {
    return {
      ok: false as const,
      error: "Existem colaboradores com este cargo.",
    };
  }

  const removido = await excluirCargo(id);
  if (!removido) {
    return { ok: false as const, notFound: true };
  }

  registrarAuditoria({
    entidade: "role",
    registroId: String(id),
    acao: "DELETE",
    dadosAnteriores: alvo.nome,
    dadosNovos: "",
    camposAlterados: "nome",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const };
}
