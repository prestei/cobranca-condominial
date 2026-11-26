"use client";

import { MapaLogicoView } from "@/components/ajuda/mapa-logico-view";
import type { ModuloPermissao } from "@/lib/permissions/modulos";

type MapaProcessoViewProps = {
  podeAcessarModulo: (modulo: ModuloPermissao) => boolean;
};

export function MapaProcessoView(_props: MapaProcessoViewProps) {
  return (
    <div className="flex w-full min-w-0 flex-col">
      <MapaLogicoView />
    </div>
  );
}