"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { tituloInicio, usuarioSessaoApp, hojeIso } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import type { DashboardPayload } from "@/lib/dashboard/service";
import { DashboardAdministradoraView } from "@/components/dashboard/dashboard-administradora-view";
import { DashboardAtendenteView } from "@/components/dashboard/dashboard-atendente-view";
import { DashboardAdvogadoView } from "@/components/dashboard/dashboard-advogado-view";
import { MetaPainelIndicadores } from "@/components/indicadores/meta-painel";
import {
  DashboardFiltrosPanel,
  filtrosDashboardQueryDeNorm,
} from "@/components/dashboard/dashboard-filtros-panel";
import { DashboardBuscaGlobal } from "@/components/dashboard/dashboard-busca-global";
import { DashboardExportacaoCarteira } from "@/components/dashboard/dashboard-exportacao-carteira";
import { parseFiltrosDashboard, type DashboardFiltros } from "@/lib/dashboard/filtros";
import { persistirFiltrosSessao } from "@/lib/dashboard/filtros-favoritos";

const descricaoPorPerfil = {
  administradora: "Visão da carteira, operação da equipe e retornos.",
  atendente: "Sua carteira, contatos da semana e agenda de retornos.",
  advogado: "Condomínios sob sua responsabilidade e indicadores de inadimplência.",
} as const;

export function DashboardHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const usuario = usuarioSessaoApp(cadastros, sessao?.userId);
  const [dados, setDados] = useState<DashboardPayload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const filtrosAplicados = useMemo(() => {
    const params = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
    return parseFiltrosDashboard(params, hojeIso());
  }, [searchParams]);

  const filtrosQuery = useMemo(() => filtrosDashboardQueryDeNorm(filtrosAplicados), [filtrosAplicados]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const qs = filtrosQuery ? `?${filtrosQuery}` : "";
      const response = await fetch(`/api/dashboard${qs}`, { credentials: "same-origin" });
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
  }, [filtrosQuery]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    persistirFiltrosSessao(filtrosQuery);
  }, [filtrosQuery]);

  function aplicarFiltros(filtros: DashboardFiltros) {
    const params = new URLSearchParams();
    const periodo = filtros.periodo ?? { preset: "7" as const, de: "", ate: "" };
    params.set("periodo", periodo.preset);
    if (periodo.preset === "personalizado") {
      if (periodo.de) params.set("de", periodo.de);
      if (periodo.ate) params.set("ate", periodo.ate);
    }
    if (filtros.dataBase && filtros.dataBase !== hojeIso()) params.set("dataBase", filtros.dataBase);
    if (filtros.limiteDias) params.set("limiteDias", String(filtros.limiteDias));
    if (filtros.condominioId) params.set("condominioId", String(filtros.condominioId));
    if (filtros.unidadeId) params.set("unidadeId", String(filtros.unidadeId));
    if (filtros.situacao) params.set("situacao", filtros.situacao);
    if (filtros.tipoPendencia) params.set("tipoPendencia", filtros.tipoPendencia);
    if (filtros.faixaAtraso) params.set("faixaAtraso", filtros.faixaAtraso);
    if (filtros.origem) params.set("origem", filtros.origem);
    if (filtros.retornoDe) params.set("retornoDe", filtros.retornoDe);
    if (filtros.retornoAte) params.set("retornoAte", filtros.retornoAte);
    if (filtros.busca?.trim()) params.set("q", filtros.busca.trim());
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  function restaurarPadrao() {
    router.replace("/");
  }

  const chaveGrafico = dados ? `dash|${dados.perfil}|${dados.dataBase}|${filtrosQuery}` : "dash";

  return (
    <WorkspaceShell>
      <PageHeader
        title={tituloInicio(usuario.name)}
        description={dados ? descricaoPorPerfil[dados.perfil] : "Carregando indicadores…"}
      />
      <PageContent className="flex flex-col gap-xl">
        <DashboardBuscaGlobal />

        {sessao?.userId ? (
          <DashboardFiltrosPanel
            userId={sessao.userId}
            aplicados={dados?.filtrosAplicados ?? filtrosAplicados}
            onAplicar={aplicarFiltros}
            onRestaurarPadrao={restaurarPadrao}
          />
        ) : null}

        <DashboardExportacaoCarteira filtrosQuery={filtrosQuery} />

        {carregando ? (
          <EmptyState
            icon={<Icon icon={Loader2} size="lg" className="animate-spin" />}
            title="Carregando dashboard"
            description="Consultando dados no servidor…"
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

        {!carregando && !erro && dados ? <MetaPainelIndicadores meta={dados.meta} /> : null}

        {!carregando && !erro && dados?.perfil === "administradora" ? (
          <DashboardAdministradoraView dados={dados} chaveGrafico={chaveGrafico} filtrosQuery={filtrosQuery} />
        ) : null}

        {!carregando && !erro && dados?.perfil === "atendente" ? (
          <DashboardAtendenteView dados={dados} chaveGrafico={chaveGrafico} filtrosQuery={filtrosQuery} />
        ) : null}

        {!carregando && !erro && dados?.perfil === "advogado" ? (
          <DashboardAdvogadoView dados={dados} chaveGrafico={chaveGrafico} filtrosQuery={filtrosQuery} />
        ) : null}
      </PageContent>
    </WorkspaceShell>
  );
}
