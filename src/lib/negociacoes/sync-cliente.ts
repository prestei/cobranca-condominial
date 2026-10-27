import { escopoCondominios, getCadastros, setPropostasNegociacao, type PropostaNegociacao } from "@/data/catalogo";

export function sincronizarPropostasDoServidor(propostas: PropostaNegociacao[], userId?: number) {
  const scopeUnidadeIds = new Set(
    getCadastros()
      .unidades.filter((u) => escopoCondominios(getCadastros(), userId).some((c) => c.id === u.condominioId))
      .map((u) => u.id),
  );
  const idsServidor = new Set(propostas.map((item) => item.id));
  setPropostasNegociacao((current) => {
    const foraEscopo = current.filter((item) => !scopeUnidadeIds.has(item.unidadeId) && !idsServidor.has(item.id));
    const mapa = new Map<string, PropostaNegociacao>();
    for (const item of foraEscopo) mapa.set(item.id, item);
    for (const item of propostas) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  });
}

export function aplicarPropostaSalva(proposta: PropostaNegociacao, acao: "INSERT" | "UPDATE") {
  if (acao === "INSERT") {
    setPropostasNegociacao((current) => {
      if (current.some((item) => item.id === proposta.id)) {
        return current.map((item) => (item.id === proposta.id ? proposta : item));
      }
      return [...current, proposta];
    });
  } else {
    setPropostasNegociacao((current) => current.map((item) => (item.id === proposta.id ? proposta : item)));
  }
}
