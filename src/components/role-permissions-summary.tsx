import { Badge } from "@/components/badge";
import { listarModulosPermitidos, parsePermissoesJson, resumoPermissoes } from "@/lib/permissions/parse";

type ResumoPermissoesCargoProps = {
  permissaoJson: string;
};

export function ResumoPermissoesCargo({ permissaoJson }: ResumoPermissoesCargoProps) {
  const permissoes = parsePermissoesJson(permissaoJson);
  const modulos = listarModulosPermitidos(permissoes);

  if (modulos.length === 0) {
    return <span className="text-on-surface-variant">—</span>;
  }

  const detalhe = resumoPermissoes(permissoes);

  return (
    <div className="flex flex-wrap gap-xs" title={detalhe}>
      {modulos.map((item) => (
        <Badge key={item.modulo} variant="primary" className="font-normal">
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
