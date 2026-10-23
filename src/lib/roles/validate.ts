import { cargoTemAlgumaPermissao } from "@/lib/permissions/parse";
import type { CargoFieldErrors, CargoInput } from "@/lib/roles/types";
import { buscarCargoPorNome } from "@/lib/roles/repository";

export async function validarCargoInput(
  input: CargoInput,
  options: { editingId: number | null },
): Promise<CargoFieldErrors> {
  const nome = input.nome.trim();
  const errors: CargoFieldErrors = {};

  if (!nome) {
    errors.nome = "Informe o nome do cargo.";
  } else {
    const duplicado = await buscarCargoPorNome(nome, options.editingId);
    if (duplicado) {
      errors.nome = "Já existe um cargo com este nome.";
    }
  }

  if (!cargoTemAlgumaPermissao(input.permissoes)) {
    // validação de negócio tratada também no service; não há campo no form
  }

  return errors;
}
