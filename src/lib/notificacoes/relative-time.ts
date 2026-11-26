/** Texto compacto e legível para “quando” a notificação chegou. */
export function formatRelativeNotificationTime(iso: string): string {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return "";

  const diffMin = Math.floor((Date.now() - instant) / 60_000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) {
    return diffMin === 1 ? "há 1 min" : `há ${diffMin} min`;
  }

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return diffH === 1 ? "há 1 hora" : `há ${diffH} horas`;
  }

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  if (diffD < 30) {
    const semanas = Math.floor(diffD / 7);
    return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
  }
  return `há ${diffD} dias`;
}

/** Rótulo curto para coluna de data na listagem (sem “há”, largura estável). */
export function formatNotificationTimeCompact(iso: string): string {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return "";

  const diffMin = Math.floor((Date.now() - instant) / 60_000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH === 1 ? "1 hora" : `${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Ontem";
  if (diffD < 7) return diffD === 1 ? "1 dia" : `${diffD} dias`;
  if (diffD < 30) {
    const semanas = Math.floor(diffD / 7);
    return semanas === 1 ? "1 sem." : `${semanas} sem.`;
  }
  return `${diffD} dias`;
}

/** Frase para o cabeçalho do detalhe (“Recebida …”). */
export function formatReceivedNotificationPhrase(relativo: string): string {
  if (!relativo.trim()) return "Notificação interna";
  if (relativo === "Agora") return "Recebida agora";
  if (relativo === "Ontem") return "Recebida ontem";
  return `Recebida ${relativo}`;
}