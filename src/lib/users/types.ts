import type { Usuario } from "@/lib/catalog";

export type UsuarioPublico = Omit<Usuario, "senha">;

export type UsuarioInput = {
  codigo: string;
  cargoId: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  senha?: string;
};

export type UsuarioFieldErrors = Partial<
  Record<"nome" | "codigo" | "cargoId" | "cpf" | "dataNascimento" | "email" | "senha", string>
>;
