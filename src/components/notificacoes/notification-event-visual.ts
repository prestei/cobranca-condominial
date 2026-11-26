import type { NotificacaoInterna } from "@/data/catalogo";
import { AlertTriangle, CalendarClock, Wallet, type LucideIcon } from "lucide-react";

export type NotificationEventVisual = {
  icon: LucideIcon;
  iconClassName: string;
  unreadAccentClassName: string;
};

export function notificationEventVisual(evento: NotificacaoInterna["evento"]): NotificationEventVisual {
  if (evento === "retorno_agendado" || evento === "retorno_lembrete_hoje") {
    return {
      icon: CalendarClock,
      iconClassName: "bg-[#FFF4E5] text-brass",
      unreadAccentClassName: "border-l-brass",
    };
  }
  if (evento === "cobranca_atribuida") {
    return {
      icon: Wallet,
      iconClassName: "bg-[#E8EEF4] text-primary-container",
      unreadAccentClassName: "border-l-primary-container",
    };
  }
  if (
    evento === "inadimplencia_prazo_antecedencia" ||
    evento === "inadimplencia_prazo_atingido" ||
    evento === "inadimplencia_prazo_ultrapassado"
  ) {
    const critico = evento === "inadimplencia_prazo_ultrapassado";
    return {
      icon: AlertTriangle,
      iconClassName: critico ? "bg-[#FDECEA] text-status-critical" : "bg-[#FFF4E5] text-brass",
      unreadAccentClassName: critico ? "border-l-status-critical" : "border-l-brass",
    };
  }
  return {
    icon: CalendarClock,
    iconClassName: "bg-surface-muted text-on-surface-variant",
    unreadAccentClassName: "border-l-border-subtle",
  };
}