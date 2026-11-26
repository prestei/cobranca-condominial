"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { notificationEventVisual } from "@/components/notificacoes/notification-event-visual";
import type { NotificacaoUi } from "@/hooks/use-notificacoes";
import { parseNotificationDescription } from "@/lib/notificacoes/parse-notification-description";
import { formatReceivedNotificationPhrase } from "@/lib/notificacoes/relative-time";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";

export type NotificationDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificacao: NotificacaoUi | null;
  onConsultar: (id: number) => Promise<{ ok: boolean; notificacao?: NotificacaoUi; error?: string }>;
  onAtualizado?: () => void;
};

export function NotificationDetailSheet({
  open,
  onOpenChange,
  notificacao,
  onConsultar,
  onAtualizado,
}: NotificationDetailSheetProps) {
  const [detalhe, setDetalhe] = useState<NotificacaoUi | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !notificacao) {
      setDetalhe(null);
      setErro(null);
      return;
    }
    setDetalhe(notificacao);
    let cancelado = false;
    void (async () => {
      setCarregando(true);
      setErro(null);
      const resultado = await onConsultar(notificacao.id);
      if (cancelado) return;
      setCarregando(false);
      if (resultado.ok && resultado.notificacao) {
        setDetalhe(resultado.notificacao);
        onAtualizado?.();
      } else if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível carregar a notificação.");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, notificacao?.id, onConsultar, onAtualizado]);

  const atual = detalhe ?? notificacao;
  if (!atual) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent size="default" />
      </Sheet>
    );
  }

  const visual = notificationEventVisual(atual.evento);
  const { fields, plainParts } = parseNotificationDescription(atual.descricao);
  const lida = Boolean(atual.lidaEm);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="default" aria-labelledby="notificacao-detalhe-titulo">
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon className={visual.iconClassName}>
              <Icon icon={visual.icon} size="md" className="text-current" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id="notificacao-detalhe-titulo">{atual.titulo}</SheetTitle>
              <div className="flex flex-wrap items-center gap-xs">
                <SheetDescription>{formatReceivedNotificationPhrase(atual.relativo)}</SheetDescription>
                <Badge variant={lida ? "secondary" : "primary"}>{lida ? "Lida" : "Não lida"}</Badge>
              </div>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>

        <SheetBody className="gap-md">
          {erro ? (
            <p className="rounded-lg border border-status-critical/30 bg-status-critical/10 px-md py-sm text-body-sm text-status-critical">
              {erro}
            </p>
          ) : null}

          <SheetPanel className="flex flex-col gap-md">
            {fields.length > 0 ? (
              <dl className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.label} className="min-w-0">
                    <dt className="text-label-sm uppercase text-on-surface-variant">{field.label}</dt>
                    <dd className="mt-0.5 text-body-md text-on-surface">{field.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {plainParts.length > 0 ? (
              <div className="flex flex-col gap-xs">
                {plainParts.map((parte) => (
                  <p key={parte} className="text-body-md text-on-surface">
                    {parte}
                  </p>
                ))}
              </div>
            ) : null}
            {fields.length === 0 && plainParts.length === 0 ? (
              <p className="text-body-md text-on-surface">{atual.descricao}</p>
            ) : null}
          </SheetPanel>
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="primary" size="md" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}