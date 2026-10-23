import type { Usuario } from "@/data/catalogo";

export type UsuarioPublico = Omit<Usuario, "senha">;

export type UsuarioInput = {
  codigo: string;
  cargoId: number;
  nome: string;
  telefone: string;
  email: string;
  senha?: string;
};

export type UsuarioFieldErrors = Partial<Record<"nome" | "codigo" | "cargoId" | "email" | "senha", string>>;
