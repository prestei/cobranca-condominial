"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonDashboard } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";
import { tituloInicio, usuarioSessaoApp } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import type { DashboardPayload } from "@/lib/dashboard/service";
import { DashboardAdministradoraView } from "@/components/dashboard/dashboard-administradora-view";
import { DashboardAtendenteView } from "@/components/dashboard/dashboard-atendente-view";
import { DashboardAdvogadoView } from "@/components/dashboard/dashboard-advogado-view";

const descricaoPorPerfil = {
  administradora: "Visão da carteira, operação da equipe e retornos.",
  advogado: "Condomínios sob sua responsabilidade e indicadores de inadimplência.",
} as const;

export function DashboardHome() {
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const usuario = usuarioSessaoApp(cadastros, sessao?.userId, sessao);
  const [dados, setDados] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

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
      const payload = body.dashboard;
      if (!payload || typeof payload !== "object" || !("perfil" in payload)) {
        setErro("Resposta inválida do servidor.");
        setDados(null);
        return;
      }
      setDados(payload);
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
  const perfilAtendente = !carregando && !erro && dados?.perfil === "atendente";
  const perfilOutro =
    !carregando && !erro && dados && (dados.perfil === "administradora" || dados.perfil === "advogado");

  return (
    <WorkspaceShell>
      {perfilAtendente ? null : (
        <PageHeader
          icon={LayoutDashboard}
          title={tituloInicio(usuario.name)}
          description={
            perfilOutro
              ? descricaoPorPerfil[dados.perfil]
              : "Visão operacional da carteira."
          }
        />
      )}
      <PageContent className="flex flex-col gap-xl">
        {carregando ? <SkeletonDashboard metrics={4} panels={2} label="Carregando dashboard" /> : null}

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

        {perfilAtendente && dados?.perfil === "atendente" ? (
          <DashboardAtendenteView dados={dados} nomeUsuario={usuario.name} />
        ) : null}

        {!carregando && !erro && dados?.perfil === "advogado" ? (
          <DashboardAdvogadoView dados={dados} chaveGrafico={chaveGrafico} />
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}
