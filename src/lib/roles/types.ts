import type { PermissoesCargo } from "@/lib/permissions/modulos";

export type CargoPublico = {
  id: number;
  nome: string;
  descricao: string;
  permissaoJson: string;
};

export type CargoInput = {
  nome: string;
  descricao: string;
  permissoes: PermissoesCargo;
};

export type CargoFieldErrors = Partial<Record<"nome", string>>;
