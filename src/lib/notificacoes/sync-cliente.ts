import { setNotificacoesInternas, type NotificacaoInterna } from "@/data/catalogo";

/** Mescla notificações do usuário logado retornadas pela API. */
export function sincronizarNotificacoesDoServidor(notificacoes: NotificacaoInterna[], userId?: number) {
  if (!userId) return;
  setNotificacoesInternas((current) => {
    const foraDoUsuario = current.filter((item) => item.destinatarioId !== userId);
    const mapa = new Map<number, NotificacaoInterna>();
    for (const item of foraDoUsuario) mapa.set(item.id, item);
    for (const item of notificacoes) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  });
}

export function aplicarNotificacaoAtualizada(notificacao: NotificacaoInterna) {
  setNotificacoesInternas((current) => {
    const idx = current.findIndex((item) => item.id === notificacao.id);
    if (idx < 0) return [notificacao, ...current];
    const next = [...current];
    next[idx] = notificacao;
    return next;
  });
}
