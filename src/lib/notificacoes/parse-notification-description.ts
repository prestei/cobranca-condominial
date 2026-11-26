import type { NotificacaoInterna } from "@/data/catalogo";

export type NotificationField = { label: string; value: string };

export function parseNotificationDescription(descricao: string): {
  fields: NotificationField[];
  plainParts: string[];
} {
  const fields: NotificationField[] = [];
  const plainParts: string[] = [];
  for (const segment of descricao.split(/\s*·\s*/)) {
    const part = segment.trim();
    if (!part) continue;
    const match = /^([^:]+):\s*(.+)$/.exec(part);
    if (match) {
      fields.push({ label: match[1]!.trim(), value: match[2]!.trim() });
    } else {
      plainParts.push(part);
    }
  }
  return { fields, plainParts };
}

export function notificationCardSummary(descricao: string, evento: NotificacaoInterna["evento"]): string {
  const isDelinquencyDeadline =
    evento === "inadimplencia_prazo_antecedencia" ||
    evento === "inadimplencia_prazo_atingido" ||
    evento === "inadimplencia_prazo_ultrapassado";

  const { fields, plainParts } = parseNotificationDescription(descricao);

  if (isDelinquencyDeadline && fields.length > 0) {
    const byLabel = new Map(fields.map((f) => [f.label, f.value]));
    const local = [byLabel.get("Condomínio"), byLabel.get("Unidade")].filter(Boolean).join(" · ");
    const status = byLabel.get("Status");
    return [local, status].filter(Boolean).join(" · ") || descricao;
  }

  if (fields.length > 0) {
    const prefer = ["Unidade", "Condomínio", "Inadimplência", "Status"];
    const picked: string[] = [];
    for (const key of prefer) {
      const value = fields.find((f) => f.label === key)?.value;
      if (value) picked.push(value);
      if (picked.length >= 2) break;
    }
    if (picked.length > 0) return picked.join(" · ");
    return fields
      .slice(0, 2)
      .map((f) => f.value)
      .join(" · ");
  }

  const texto = plainParts.join(" · ") || descricao;
  const partes = texto.split(/\s*·\s*/).filter(Boolean);
  if (partes.length <= 2) return texto;
  return `${partes[0]} · ${partes[1]}`;
}