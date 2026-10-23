import { Badge } from "@/components/badge";
import { nomeCargo } from "@/lib/catalog";

type BadgeCargoProps = {
  cargoId: number;
  className?: string;
};

/** Etiqueta de cargo — mesmo padrão visual dos badges em `/roles` (`ResumoPermissoesCargo`). */
export function BadgeCargo({ cargoId, className }: BadgeCargoProps) {
  return (
    <Badge variant="primary" className={`font-normal ${className ?? ""}`.trim()}>
      {nomeCargo(cargoId)}
    </Badge>
  );
}
