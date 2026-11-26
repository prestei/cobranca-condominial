"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { NotificationDetailSheet } from "@/components/notificacoes/notification-detail-sheet";
import { NotificationListCard } from "@/components/notificacoes/notification-list-card";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonCardList } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useNotificacoes, type NotificacaoUi } from "@/hooks/use-notificacoes";

export default function NotificacoesPage() {
  const { toast } = useToast();
  const { itens, naoLidas, carregando, recarregar, marcarTodasLidas, abrirNotificacao } = useNotificacoes();
  const [listaCompleta, setListaCompleta] = useState<NotificacaoUi[]>([]);
  const [selecionada, setSelecionada] = useState<NotificacaoUi | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);

  const carregarLista = useCallback(async () => {
    const response = await fetch("/api/notificacoes?limit=50", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { notificacoes?: NotificacaoUi[] };
    setListaCompleta(payload.notificacoes ?? []);
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista, itens.length, naoLidas]);

  function handleSelecionar(item: NotificacaoUi) {
    setSelecionada(item);
    setSheetAberto(true);
  }

  const consultarNotificacao = useCallback(
    async (id: number) => {
      const resultado = await abrirNotificacao(id);
      if (!resultado.ok) {
        toast({ variant: "error", title: "Notificação", description: resultado.error });
      }
      return resultado;
    },
    [abrirNotificacao, toast],
  );

  return (
    <WorkspaceShell>
      <PageHeader
        icon={Bell}
        title="Notificações internas"
        description="Alertas de retornos, prazo de inadimplência e distribuição de cobrança. Canais externos (e-mail, SMS, WhatsApp) permanecem desativados."
        actions={
          <Button type="button" size="md" variant="secondary" disabled={naoLidas === 0} onClick={() => void marcarTodasLidas().then(() => carregarLista())}>
            Marcar todas como lidas
          </Button>
        }
      />
      <PageContent>
        {carregando && listaCompleta.length === 0 ? (
          <SkeletonCardList rows={6} label="Carregando notificações" />
        ) : listaCompleta.length === 0 ? (
          <EmptyState
            icon={<Icon icon={Bell} size="lg" />}
            title="Nenhuma notificação"
            description="Quando houver retornos, prazos de inadimplência ou redistribuições, os alertas aparecem aqui."
          />
        ) : (
          <ul className="flex flex-col gap-sm">
            {listaCompleta.map((item) => (
              <NotificationListCard
                key={item.id}
                titulo={item.titulo}
                descricao={item.descricao}
                evento={item.evento}
                criadoEm={item.criadoEm}
                relativo={item.relativo}
                lida={Boolean(item.lidaEm)}
                onClick={() => handleSelecionar(item)}
              />
            ))}
          </ul>
        )}
      </PageContent>

      <NotificationDetailSheet
        open={sheetAberto}
        onOpenChange={setSheetAberto}
        notificacao={selecionada}
        onConsultar={consultarNotificacao}
        onAtualizado={() => {
          void carregarLista();
          void recarregar();
        }}
      />
    </WorkspaceShell>
  );
}