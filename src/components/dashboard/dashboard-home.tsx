"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonDashboard } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";
import { tituloInicio, usuarioSessaoApp, hojeIso } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import type { DashboardPayload } from "@/lib/dashboard/service";
import { DashboardAdministradoraView } from "@/components/dashboard/dashboard-administradora-view";
import { DashboardAtendenteView } from "@/components/dashboard/dashboard-atendente-view";
import { DashboardAdvogadoView } from "@/components/dashboard/dashboard-advogado-view";
import { filtrosDashboardQueryDeNorm } from "@/components/dashboard/dashboard-filtros-panel";
import { DashboardPeriodoPills } from "@/components/dashboard/dashboard-periodo-pills";
import { parseFiltrosDashboard, type DashboardFiltros } from "@/lib/dashboard/filtros";
import { persistirFiltrosSessao } from "@/lib/dashboard/filtros-favoritos";
import type { PeriodValue } from "@/lib/periodo";

function descricaoHome(dados: DashboardPayload) {
  if (dados.perfil === "administradora") {
    const { indicadores, fila, retornos } = dados;
    return `${indicadores.unidadesDevedoras} unidades em aberto · ${fila.emCobranca} na fila · ${retornos.resumo.atrasados} retorno${retornos.resumo.atrasados === 1 ? "" : "s"} atrasado${retornos.resumo.atrasados === 1 ? "" : "s"}.`;
  }
  if (dados.perfil === "atendente") {
    const atencao = dados.indicadoresOperacionais.itens.find((item) => item.id === "atencao")?.total ?? 0;
    return `${dados.fila.emCobranca} em cobrança · ${dados.atendimentosHoje} atendimento${dados.atendimentosHoje === 1 ? "" : "s"} hoje · ${atencao} com atenção.`;
  }
  return `${dados.condominios.total} condomínio${dados.condominios.total === 1 ? "" : "s"} no escopo · ${dados.juridico?.abertos ?? 0} jurídico em andamento.`;
}

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

  function aplicarPeriodo(periodo: PeriodValue) {
    const base = dados?.filtrosAplicados ?? filtrosAplicados;
    aplicarFiltros({
      periodo,
      dataBase: base.dataBase,
      limiteDias: base.limiteDias,
      condominioId: base.condominioId,
      unidadeId: base.unidadeId,
      situacao: base.situacao,
      tipoPendencia: base.tipoPendencia,
      faixaAtraso: base.faixaAtraso,
      origem: base.origem,
      retornoDe: base.retornoDe,
      retornoAte: base.retornoAte,
      busca: base.busca,
    });
  }

  const chaveGrafico = dados ? `dash|${dados.perfil}|${dados.dataBase}|${filtrosQuery}` : "dash";
  const periodoAtual =
    dados?.filtrosAplicados.periodo ?? filtrosAplicados.periodo ?? ({ preset: "7", de: "", ate: "" } as PeriodValue);

  return (
    <WorkspaceShell>
      <PageHeader
        title={tituloInicio(usuario.name)}
        description={dados ? descricaoHome(dados) : "Carregando indicadores…"}
      />
      <PageContent className="flex flex-col gap-xl">
        <DashboardPeriodoPills value={periodoAtual} onChange={aplicarPeriodo} />

        {carregando ? <SkeletonDashboard label="Carregando dashboard" /> : null}

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
