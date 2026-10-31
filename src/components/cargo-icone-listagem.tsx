import type { LucideIcon } from "lucide-react";
import { Lock, Settings, Shield, UserRound } from "lucide-react";
import { Icon } from "@/components/icon";

export function iconeCargoListagem(nome: string): LucideIcon {
  const chave = nome.trim().toLocaleLowerCase("pt-BR");
  if (chave === "administrador") return Settings;
  if (chave === "advogado") return UserRound;
  if (chave === "atendente") return Lock;
  return Shield;
}

type CargoIconeListagemProps = {
  nome: string;
};

export function CargoIconeListagem({ nome }: CargoIconeListagemProps) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary-fixed-dim/35 bg-primary-fixed/45 text-primary-container"
      aria-hidden
    >
      <Icon icon={iconeCargoListagem(nome)} size="sm" />
    </span>
  );
}
