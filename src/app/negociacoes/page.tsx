"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { PAGE_SIZE } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonListPage } from "@/components/skeleton";
import { WorkspaceShell } from "@/components/workspace-shell";
import { NegociacaoNovaPropostaSheet } from "@/components/negociacoes/negociacao-nova-proposta-sheet";
import { NegociacoesPainel } from "@/components/negociacoes/negociacoes-painel";
import {
  escopoCondominios,
  nomeCondominio,
  nomeUnidade,
  opcoesAdvogadosResponsaveis,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros, useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import { calcularResumoAcordo } from "@/lib/acordos/resumo";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re";
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

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [condominio, setCondominio] = useState("todos");
  const [advogado, setAdvogado] = useState(perfil === "advogado" ? "minhas" : "todos");
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

  const condominiosOpcoes = useMemo(() => escopoCondominios(cadastros, sessao?.userId), [cadastros, sessao?.userId]);
  const advogadosFiltro = useMemo(() => opcoesAdvogadosResponsaveis(cadastros), [cadastros]);

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
    const termo = search.trim().toLocaleLowerCase("pt-BR");
    return propostas.filter((item) => {
      if (condominio !== "todos" && String(item.condominioId) !== condominio) return false;
      if (advogado === "minhas" && sessao?.userId && item.advogadoResponsavelId !== sessao.userId) return false;
      if (advogado !== "todos" && advogado !== "minhas") {
        const usuarioAdv = cadastros.usuarios.find((usuario) => usuario.nome === advogado);
        if (!usuarioAdv || item.advogadoResponsavelId !== usuarioAdv.id) return false;
      }
      if (!termo) return true;
      const condominioNome = nomeCondominio(item.condominioId, cadastros).toLocaleLowerCase("pt-BR");
      const unidadeNome = nomeUnidade(item.unidadeId, cadastros).toLocaleLowerCase("pt-BR");
      const advogadoNome =
        item.advogadoResponsavelId != null
          ? identificadorColaboradorPorId(item.advogadoResponsavelId, cadastros).toLocaleLowerCase("pt-BR")
          : "";
      return (
        condominioNome.includes(termo) ||
        unidadeNome.includes(termo) ||
        advogadoNome.includes(termo) ||
        item.id.toLocaleLowerCase("pt-BR").includes(termo)
      );
    });
  }, [propostas, search, condominio, advogado, sessao?.userId, cadastros]);

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

  function aplicarFiltros() {
    setSearch(searchDraft);
    setPage(1);
  }

  function limparFiltros() {
    setSearchDraft("");
    setSearch("");
    setStatus("todos");
    setCondominio("todos");
    setAdvogado(perfil === "advogado" ? "minhas" : "todos");
    setPage(1);
  }

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
      {!selecionadaId ? (
        <PageHeader
          title="Negociações"
          description="Centro exclusivo de propostas, alçada e acompanhamento de parcelas."
          actions={
            podeCriar ? (
              <Button type="button" onClick={() => setNovaOpen(true)}>
                <Plus className="size-icon-sm" aria-hidden />
                Novo
              </Button>
            ) : undefined
          }
        />
      ) : null}
      <PageContent>
        {carregando ? (
          <SkeletonListPage />
        ) : (
          <NegociacoesPainel
            cadastros={cadastros}
            perfil={perfil}
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
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onAplicarFiltros={aplicarFiltros}
            onLimparFiltros={limparFiltros}
            status={status}
            onStatusChange={setStatus}
            condominio={condominio}
            onCondominioChange={setCondominio}
            condominiosOpcoes={condominiosOpcoes}
            advogado={advogado}
            onAdvogadoChange={setAdvogado}
            advogadosFiltro={advogadosFiltro}
          />
        )}
      </PageContent>

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
