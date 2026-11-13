import type { NotificacaoInterna } from "@/data/catalogo";

export function resolverUrlRegistroNotificacao(item: NotificacaoInterna): string | null {
  if (item.entidadeTipo === "service_ticket") {
    return `/atendimentos?retorno=todos&atendimento=${encodeURIComponent(item.registroId)}`;
  }
  if (item.entidadeTipo === "collection_assignment") {
    return `/atendimentos?unidade=${item.unidadeId}`;
  }
  if (item.entidadeTipo === "debt" && item.condominioId) {
    return `/debitos?condominio=${item.condominioId}`;
  }
  return null;
}
