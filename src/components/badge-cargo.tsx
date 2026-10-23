import { Badge } from "@/components/badge";
import { nomeCargo } from "@/data/catalogo";

type BadgeCargoProps = {
  cargoId: number;
  className?: string;
};

/** Etiqueta de cargo — mesmo padrão visual dos badges em `/cargos` (`ResumoPermissoesCargo`). */
export function BadgeCargo({ cargoId, className }: BadgeCargoProps) {
  return (
    <Badge variant="primary" className={`font-normal ${className ?? ""}`.trim()}>
      {nomeCargo(cargoId)}
    </Badge>
  );
}
