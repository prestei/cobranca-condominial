"use client";

import type { NotificacaoInterna } from "@/data/catalogo";
import { notificationEventVisual } from "@/components/notificacoes/notification-event-visual";
import { Icon } from "@/components/icon";
import { notificationCardSummary } from "@/lib/notificacoes/parse-notification-description";
import { formatNotificationTimeCompact } from "@/lib/notificacoes/relative-time";
import { ChevronRight } from "lucide-react";

/** Altura mínima compacta para alinhar título e resumo no topo. */
export const NOTIFICATION_LIST_CARD_MIN_HEIGHT = "min-h-0";

export type NotificationListCardProps = {
  titulo: string;
  descricao: string;
  evento: NotificacaoInterna["evento"];
  criadoEm: string;
  relativo: string;
  lida: boolean;
  onClick: () => void;
};

export function NotificationListCard({
  titulo,
  descricao,
  evento,
  criadoEm,
  relativo,
  lida,
  onClick,
}: NotificationListCardProps) {
  const visual = notificationEventVisual(evento);
  const resumo = notificationCardSummary(descricao, evento);
  const quando = formatNotificationTimeCompact(criadoEm) || relativo;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        title={relativo ? `${titulo} — ${relativo}` : titulo}
        className={[
          "group grid w-full cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_1rem] grid-rows-[auto_auto] items-start gap-x-md gap-y-px rounded-xl border border-border-subtle bg-surface-card px-lg py-md text-left shadow-card",
          NOTIFICATION_LIST_CARD_MIN_HEIGHT,
          "transition-colors hover:bg-surface-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
        ].join(" ")}
      >
        <span
          className={`row-span-2 inline-flex size-9 shrink-0 items-center justify-center justify-self-start self-start rounded-lg ${visual.iconClassName}`}
          aria-hidden="true"
        >
          <Icon icon={visual.icon} size="sm" className="text-current" />
        </span>

        <span
          className={`col-start-2 row-start-1 min-w-0 truncate text-body-md leading-snug ${lida ? "font-medium text-on-surface-variant" : "font-semibold text-on-surface"}`}
        >
          {titulo}
        </span>

        {quando ? (
          <time
            dateTime={criadoEm}
            className="col-start-3 row-start-1 justify-self-end whitespace-nowrap text-right text-body-sm leading-tight text-on-surface-variant/80"
          >
            {quando}
          </time>
        ) : (
          <span className="col-start-3 row-start-1" aria-hidden="true" />
        )}

        <span
          className="col-start-4 row-span-2 flex items-center justify-center self-center text-on-surface-variant/45 transition-colors group-hover:text-on-surface-variant"
          aria-hidden="true"
        >
          <Icon icon={ChevronRight} size="sm" />
        </span>

        <span
          className="col-start-2 row-start-2 min-w-0 truncate text-body-sm leading-snug text-on-surface-variant"
          title={resumo}
        >
          {resumo}
        </span>
      </button>
    </li>
  );
}