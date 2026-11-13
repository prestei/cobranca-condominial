"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PAGE_SIZE } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";
import { NegociacaoNovaPropostaSheet } from "@/components/negociacoes/negociacao-nova-proposta-sheet";
import { NegociacoesPainel } from "@/components/negociacoes/negociacoes-painel";
import { PropostaNegociacaoExclusiva } from "@/components/negociacoes/proposta-negociacao-exclusiva";
import { type PropostaNegociacao } from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { calcularResumoAcordo } from "@/lib/acordos/resumo";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";

export default function NegociacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const { refetch } = useCadastrosStatus();
  const { pode, permissoes } = usePermissao();

  const podeLer = pode("negociacoes", "ler") || pode("atendimentos", "ler");
  const podeCriar = pode("negociacoes", "criar") || pode("atendimentos", "criar");
  const perfil = useMemo(() => resolverPerfilOperacional(permissoes), [permissoes]);

  const [propostas, setPropostas] = useState<PropostaNegociacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [status, setStatus] = useState("todos");
  const [page, setPage] = useState(1);

  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const carregar = useCallback(async () => {
    if (!podeLer) {
      setPropostas([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (status !== "todos") params.set("status", status);
      const qs = params.toString();
      const response = await fetch(qs ? `/api/propostas?${qs}` : "/api/propostas", { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; propostas?: PropostaNegociacao[] };
      if (!response.ok) {
        setPropostas([]);
        setErro(payload.error ?? "Não foi possível carregar as propostas.");
        return;
      }
      setPropostas(payload.propostas ?? []);
    } finally {
      setCarregando(false);
    }
  }, [podeLer, status]);

  function selecionarProposta(id: string | null) {
    setSelecionadaId(id);
  }

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = searchParams?.get("proposta")?.trim();
    if (!id) return;
    selecionarProposta(id);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("proposta");
    const qs = params.toString();
    router.replace(qs ? `/negociacoes?${qs}` : "/negociacoes");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link único na montagem
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams?.get("novo") === "1" && podeCriar) {
      setNovaOpen(true);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("novo");
      const qs = params.toString();
      router.replace(qs ? `/negociacoes?${qs}` : "/negociacoes");
    }
  }, [podeCriar, router, searchParams]);

  const resumoPorProposta = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof calcularResumoAcordo>>();
    for (const proposta of propostas) {
      if (proposta.status !== "Aceita") continue;
      const parcelas = cadastros.parcelasAcordo.filter((item) => item.propostaId === proposta.id);
      const pagamentos = cadastros.pagamentosAcordo.filter((item) => item.propostaId === proposta.id);
      mapa.set(proposta.id, calcularResumoAcordo(proposta, parcelas, pagamentos));
    }
    return mapa;
  }, [propostas, cadastros.parcelasAcordo, cadastros.pagamentosAcordo]);

  const filtradas = useMemo(() => {
    if (perfil !== "advogado" || !sessao?.userId) return propostas;
    return propostas.filter((item) => item.advogadoResponsavelId === sessao.userId);
  }, [propostas, perfil, sessao?.userId]);

  const metricas = useMemo(() => {
    const emAnalise = filtradas.filter((item) => item.status === "Em análise").length;
    const aceitas = filtradas.filter((item) => item.status === "Aceita");
    let parcelasVencidas = 0;
    let acordosComDescumprimento = 0;
    for (const proposta of aceitas) {
      const resumo = resumoPorProposta.get(proposta.id);
      if (!resumo) continue;
      parcelasVencidas += resumo.parcelasVencidas;
      if (resumo.potencialDescumprimento) acordosComDescumprimento += 1;
    }
    return {
      total: filtradas.length,
      emAnalise,
      aceitas: aceitas.length,
      parcelasVencidas,
      acordosComDescumprimento,
    };
  }, [filtradas, resumoPorProposta]);

  const propostasPagina = useMemo(() => {
    const inicio = (page - 1) * PAGE_SIZE;
    return filtradas.slice(inicio, inicio + PAGE_SIZE);
  }, [filtradas, page]);

  if (!podeLer) {
    return (
      <WorkspaceShell>
        <PageHeader title="Negociações" description="Propostas de acordo e acompanhamento de parcelas." />
        <PageContent>
          <EmptyState title="Sem permissão" description="Você não pode consultar negociações." />
        </PageContent>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      {selecionadaId ? (
        <PropostaNegociacaoExclusiva
          propostaId={selecionadaId}
          cadastros={cadastros}
          onVoltar={() => selecionarProposta(null)}
          onRecarregar={() => {
            void refetch();
            void carregar();
          }}
        />
      ) : (
        <>
          <PageHeader
            title="Negociações"
            description="Centro exclusivo de propostas, alçada e acompanhamento de parcelas."
          />
          <PageContent>
            {carregando ? (
              <SkeletonListPage />
            ) : (
              <NegociacoesPainel
                cadastros={cadastros}
                metricas={metricas}
                propostasPagina={propostasPagina}
                totalFiltradas={filtradas.length}
                page={page}
                onPageChange={setPage}
                resumoPorProposta={resumoPorProposta}
                selecionadaId={selecionadaId}
                onSelecionar={selecionarProposta}
                onRecarregar={() => {
                  void refetch();
                  void carregar();
                }}
                erro={erro}
                status={status}
                onStatusChange={setStatus}
              />
            )}
          </PageContent>
        </>
      )}

      <NegociacaoNovaPropostaSheet
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onSalvo={() => {
          void refetch();
          void carregar();
        }}
      />
    </WorkspaceShell>
  );
}
