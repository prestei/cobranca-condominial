import { escopoCondominios, getCadastros, setAtendimentos, type Atendimento } from "@/data/catalogo";

/** Mescla atendimentos retornados pela API no catálogo do cliente (escopo do usuário). */
export function sincronizarAtendimentosDoServidor(atendimentos: Atendimento[], userId?: number) {
  const scopeUnidadeIds = new Set(
    getCadastros()
      .unidades.filter((u) => escopoCondominios(getCadastros(), userId).some((c) => c.id === u.condominioId))
      .map((u) => String(u.id)),
  );
  const idsServidor = new Set(atendimentos.map((item) => item.id));
  setAtendimentos((current) => {
    const foraEscopo = current.filter(
      (item) => !scopeUnidadeIds.has(item.unidadeId) && !idsServidor.has(item.id),
    );
    const mapa = new Map<string, Atendimento>();
    for (const item of foraEscopo) mapa.set(item.id, item);
    for (const item of atendimentos) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  });
}

export function aplicarAtendimentoSalvo(atendimento: Atendimento, acao: "INSERT" | "UPDATE") {
  if (acao === "INSERT") {
    setAtendimentos((current) => {
      if (current.some((item) => item.id === atendimento.id)) {
        return current.map((item) => (item.id === atendimento.id ? atendimento : item));
      }
      return [...current, atendimento];
    });
  } else {
    setAtendimentos((current) => current.map((item) => (item.id === atendimento.id ? atendimento : item)));
  }
}

export function aplicarAtendimentoExcluido(id: string) {
  setAtendimentos((current) => current.filter((item) => item.id !== id));
}
