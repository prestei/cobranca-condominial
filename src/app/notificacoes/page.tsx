"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonCardList } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useNotificacoes, type NotificacaoUi } from "@/hooks/use-notificacoes";

export default function NotificacoesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { itens, naoLidas, carregando, recarregar, marcarTodasLidas, abrirNotificacao } = useNotificacoes();
  const [listaCompleta, setListaCompleta] = useState<NotificacaoUi[]>([]);

  const carregarLista = useCallback(async () => {
    const response = await fetch("/api/notificacoes?limit=100", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = (await response.json()) as { notificacoes?: NotificacaoUi[] };
    setListaCompleta(payload.notificacoes ?? []);
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista, itens.length, naoLidas]);

  async function handleAbrir(item: NotificacaoUi) {
    const resultado = await abrirNotificacao(item.id);
    if (!resultado.ok) {
      toast({ variant: "error", title: "Não foi possível abrir", description: resultado.error });
      return;
    }
    await carregarLista();
    void recarregar();
    const url = resultado.notificacao?.urlRegistro;
    if (url) router.push(url);
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title="Central de notificações"
        description="Alertas da sua carteira: atendimentos, retornos, pendências e distribuição. Canais externos (e-mail, SMS, WhatsApp) permanecem desativados."
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
            description="Quando houver movimentação na carteira, retornos ou pendências, os alertas aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
            {listaCompleta.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleAbrir(item)}
                  className="flex w-full flex-col gap-xs px-md py-sm text-left hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-md">
                    <p className={`text-body-lg ${item.lidaEm ? "font-medium text-on-surface-variant" : "font-bold text-on-surface"}`}>
                      {item.titulo}
                    </p>
                    <span className="shrink-0 text-right text-body-sm text-on-surface-variant">
                      <span className="block">{item.criadoEmFormatado}</span>
                      <span className="block text-body-xs opacity-80">{item.relativo}</span>
                    </span>
                  </div>
                  <p className="text-body-md text-on-surface-variant">{item.descricao}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageContent>
    </WorkspaceShell>
  );
}
