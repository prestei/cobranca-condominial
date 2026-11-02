"use client";

import type { MetaPainelIndicadores } from "@/lib/indicadores/meta";

export function MetaPainelIndicadores({ meta }: { meta: MetaPainelIndicadores }) {
  return (
    <p className="text-body-sm text-on-surface-variant">
      Gerado em {meta.geradoEm}. {meta.filtros.join(" · ")}
    </p>
  );
}
