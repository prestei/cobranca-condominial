"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { formatarData, tituloInicio, usuarioSessaoApp } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import type { DashboardPayload } from "@/lib/dashboard/service";
import { DashboardAdministradoraView } from "@/components/dashboard/dashboard-administradora-view";
import { DashboardAtendenteView } from "@/components/dashboard/dashboard-atendente-view";
import { DashboardAdvogadoView } from "@/components/dashboard/dashboard-advogado-view";

function contextoDashboard(dados: DashboardPayload | null, carregando: boolean): string | undefined {
  if (!dados) {
    return carregando ? "Carregando…" : undefined;
  }
  return `Base ${formatarData(dados.dataBase)} · amigável até ${dados.limiteDias} dias`;
}

export function DashboardHome() {
  const { user: sessao, loading: sessaoCarregando } = useAuth();
  const cadastros = useCadastros();
  const [tituloPagina, setTituloPagina] = useState("Carregando…");
  const [dados, setDados] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (sessaoCarregando || !sessao?.userId) {
      setTituloPagina("Carregando…");
      return;
    }
    const usuario = usuarioSessaoApp(cadastros, sessao.userId);
    setTituloPagina(tituloInicio(usuario.name));
  }, [cadastros, sessao?.userId, sessaoCarregando]);

  const descricaoPagina = useMemo(
    () => contextoDashboard(dados, carregando),
    [dados, carregando],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch("/api/dashboard", { credentials: "same-origin" });
      const body = (await response.json()) as { dashboard?: DashboardPayload; error?: string };
      if (!response.ok) {
        setDados(null);
        setErro(body.error ?? "Não foi possível carregar o dashboard.");
        return;
      }
      if (!body.dashboard) {
        setErro("Resposta inválida do servidor.");
        setDados(null);
        return;
      }
      setDados(body.dashboard);
    } catch {
      setErro("Falha de comunicação ao carregar o dashboard.");
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const chaveGrafico = dados ? `dash|${dados.perfil}|${dados.dataBase}` : "dash";

  return (
    <WorkspaceShell>
      <PageHeader title={tituloPagina} description={descricaoPagina} />
      <PageContent className="flex flex-col gap-xl">
        {carregando ? (
          <EmptyState
            icon={<Icon icon={Loader2} size="lg" className="animate-spin" />}
            title="Carregando"
            description="Consultando o servidor…"
          />
        ) : null}

        {!carregando && erro ? (
          <Alert variant="error" title="Erro ao carregar">
            {erro}
            <div className="mt-md">
              <Button size="sm" variant="secondary" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
            </div>
          </Alert>
        ) : null}

        {!carregando && !erro && dados?.perfil === "administradora" ? (
          <DashboardAdministradoraView dados={dados} chaveGrafico={chaveGrafico} />
        ) : null}

        {!carregando && !erro && dados?.perfil === "atendente" ? (
          <DashboardAtendenteView dados={dados} chaveGrafico={chaveGrafico} />
        ) : null}

        {!carregando && !erro && dados?.perfil === "advogado" ? (
          <DashboardAdvogadoView dados={dados} chaveGrafico={chaveGrafico} />
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}
