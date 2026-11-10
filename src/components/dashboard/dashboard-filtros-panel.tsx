"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Star, X } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { FormField, Input } from "@/components/input";
import { FAIXAS_ATRASO_DASHBOARD_ATENDENTE } from "@/lib/dashboard/faixas-atraso";
import { ROTULO_TIPO_PENDENCIA, type TipoPendenciaId } from "@/lib/dashboard/pendencias-labels";
import {
  filtrosDashboardPadrao,
  rotulosFiltrosAtivos,
  serializarFiltrosDashboard,
  situacoesFiltroDashboard,
  type DashboardFiltros,
  type DashboardFiltrosNorm,
} from "@/lib/dashboard/filtros-shared";
import {
  listarFavoritosDashboard,
  removerFavoritoDashboard,
  salvarFavoritoDashboard,
  type FiltroFavoritoDashboard,
} from "@/lib/dashboard/filtros-favoritos";
import { hojeIso, LIMITE_AMIGAVEL_DIAS, origensDebito, escopoCondominios, escopoUnidades } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import type { PeriodValue } from "@/lib/periodo";

type Props = {
  userId: number;
  aplicados: DashboardFiltrosNorm;
  onAplicar: (filtros: DashboardFiltros) => void;
  onRestaurarPadrao: () => void;
};

function estadoDeNorm(norm: DashboardFiltrosNorm): DashboardFiltros & { buscaLocal: string; periodo: PeriodValue } {
  return {
    periodo: norm.periodo ?? { preset: "7", de: "", ate: "" },
    dataBase: norm.dataBase,
    limiteDias: norm.limiteDias,
    condominioId: norm.condominioId,
    unidadeId: norm.unidadeId,
    situacao: norm.situacao,
    tipoPendencia: norm.tipoPendencia,
    faixaAtraso: norm.faixaAtraso,
    origem: norm.origem,
    retornoDe: norm.retornoDe,
    retornoAte: norm.retornoAte,
    busca: norm.busca,
    buscaLocal: norm.busca ?? "",
  };
}

export function DashboardFiltrosPanel({ userId, aplicados, onAplicar, onRestaurarPadrao }: Props) {
  const cadastros = useCadastros();
  const padrao = useMemo(() => filtrosDashboardPadrao(hojeIso()), []);
  const inicial = useMemo(() => estadoDeNorm(aplicados), [aplicados]);

  const [busca, setBusca] = useState(inicial.buscaLocal);
  const [periodo, setPeriodo] = useState<PeriodValue>(inicial.periodo ?? { preset: "7", de: "", ate: "" });
  const [dataBase, setDataBase] = useState(inicial.dataBase ?? hojeIso());
  const [limiteDias, setLimiteDias] = useState(String(inicial.limiteDias ?? LIMITE_AMIGAVEL_DIAS));
  const [condominioId, setCondominioId] = useState(inicial.condominioId ? String(inicial.condominioId) : "");
  const [unidadeId, setUnidadeId] = useState(inicial.unidadeId ? String(inicial.unidadeId) : "");
  const [situacao, setSituacao] = useState(inicial.situacao ?? "");
  const [tipoPendencia, setTipoPendencia] = useState(inicial.tipoPendencia ?? "");
  const [faixaAtraso, setFaixaAtraso] = useState(inicial.faixaAtraso ?? "");
  const [origem, setOrigem] = useState(inicial.origem ?? "");
  const [retornoDe, setRetornoDe] = useState(inicial.retornoDe ?? "");
  const [retornoAte, setRetornoAte] = useState(inicial.retornoAte ?? "");

  const [favoritos, setFavoritos] = useState<FiltroFavoritoDashboard[]>(() => listarFavoritosDashboard(userId));
  const [nomeFavorito, setNomeFavorito] = useState("");

  useEffect(() => {
    const sync = estadoDeNorm(aplicados);
    setBusca(sync.buscaLocal);
    setPeriodo(sync.periodo ?? { preset: "7", de: "", ate: "" });
    setDataBase(sync.dataBase ?? hojeIso());
    setLimiteDias(String(sync.limiteDias ?? LIMITE_AMIGAVEL_DIAS));
    setCondominioId(sync.condominioId ? String(sync.condominioId) : "");
    setUnidadeId(sync.unidadeId ? String(sync.unidadeId) : "");
    setSituacao(sync.situacao ?? "");
    setTipoPendencia(sync.tipoPendencia ?? "");
    setFaixaAtraso(sync.faixaAtraso ?? "");
    setOrigem(sync.origem ?? "");
    setRetornoDe(sync.retornoDe ?? "");
    setRetornoAte(sync.retornoAte ?? "");
  }, [aplicados]);

  const condominios = escopoCondominios(cadastros, userId);
  const unidades = escopoUnidades(cadastros, userId).filter(
    (item) => !condominioId || String(item.condominioId) === condominioId,
  );
  const situacoes = situacoesFiltroDashboard(unidades);

  const ativos = rotulosFiltrosAtivos(aplicados, cadastros);

  function montarFiltros(): DashboardFiltros {
    const limite = Number(limiteDias);
    return {
      periodo,
      dataBase: dataBase.trim() || hojeIso(),
      limiteDias: Number.isFinite(limite) && limite >= 1 ? limite : LIMITE_AMIGAVEL_DIAS,
      condominioId: condominioId ? Number(condominioId) : undefined,
      unidadeId: unidadeId ? Number(unidadeId) : undefined,
      situacao: situacao || undefined,
      tipoPendencia: (tipoPendencia || undefined) as TipoPendenciaId | undefined,
      faixaAtraso: (faixaAtraso || undefined) as DashboardFiltros["faixaAtraso"],
      origem: origem || undefined,
      retornoDe: retornoDe || undefined,
      retornoAte: retornoAte || undefined,
      busca: busca.trim() || undefined,
    };
  }

  function aplicar() {
    onAplicar(montarFiltros());
  }

  function limpar() {
    const reset = padrao;
    setBusca("");
    setPeriodo(reset.periodo ?? { preset: "7", de: "", ate: "" });
    setDataBase(reset.dataBase);
    setLimiteDias(String(reset.limiteDias));
    setCondominioId("");
    setUnidadeId("");
    setSituacao("");
    setTipoPendencia("");
    setFaixaAtraso("");
    setOrigem("");
    setRetornoDe("");
    setRetornoAte("");
    onRestaurarPadrao();
  }

  function carregarFavorito(item: FiltroFavoritoDashboard) {
    const f = item.filtros;
    setBusca(f.busca ?? "");
    setPeriodo(f.periodo ?? { preset: "7", de: "", ate: "" });
    setDataBase(f.dataBase ?? hojeIso());
    setLimiteDias(String(f.limiteDias ?? LIMITE_AMIGAVEL_DIAS));
    setCondominioId(f.condominioId ? String(f.condominioId) : "");
    setUnidadeId(f.unidadeId ? String(f.unidadeId) : "");
    setSituacao(f.situacao ?? "");
    setTipoPendencia(f.tipoPendencia ?? "");
    setFaixaAtraso(f.faixaAtraso ?? "");
    setOrigem(f.origem ?? "");
    setRetornoDe(f.retornoDe ?? "");
    setRetornoAte(f.retornoAte ?? "");
    onAplicar(f);
  }

  return (
    <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-headline-sm text-on-surface">Filtros do dashboard</h2>
        <div className="flex flex-wrap items-center gap-sm">
          <Button type="button" size="sm" variant="outline" onClick={() => onRestaurarPadrao()}>
            Restaurar padrão
          </Button>
        </div>
      </div>

      <FilterBar
        searchId="dashboard-busca"
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="RE, condomínio, unidade, proprietário…"
        defaultMobile="grid"
        fields={[
          {
            id: "periodo",
            label: "Período",
            type: "period",
            value: periodo,
            onChange: setPeriodo,
          },
          {
            id: "data-base",
            label: "Data-base",
            type: "date",
            value: dataBase,
            onChange: setDataBase,
          },
          {
            id: "limite",
            label: "Limite (dias)",
            type: "number",
            min: 1,
            value: limiteDias,
            onChange: setLimiteDias,
          },
          {
            id: "condominio",
            label: "Condomínio",
            value: condominioId,
            onChange: (value) => {
              setCondominioId(value);
              setUnidadeId("");
            },
            options: [
              { value: "", label: "Todos" },
              ...condominios.map((item) => ({ value: String(item.id), label: item.nome })),
            ],
          },
          {
            id: "unidade",
            label: "Unidade",
            value: unidadeId,
            onChange: setUnidadeId,
            options: [
              { value: "", label: "Todas" },
              ...unidades.map((item) => ({
                value: String(item.id),
                label: item.bloco ? `${item.identificacao} - ${item.bloco}` : item.identificacao,
              })),
            ],
          },
          {
            id: "situacao",
            label: "Situação",
            value: situacao,
            onChange: setSituacao,
            options: [{ value: "", label: "Todas" }, ...situacoes.map((item) => ({ value: item, label: item }))],
          },
          {
            id: "tipo-pendencia",
            label: "Tipo de pendência",
            value: tipoPendencia,
            onChange: setTipoPendencia,
            options: [
              { value: "", label: "Todos" },
              ...(Object.entries(ROTULO_TIPO_PENDENCIA) as [TipoPendenciaId, string][]).map(([value, label]) => ({
                value,
                label,
              })),
            ],
          },
          {
            id: "faixa-atraso",
            label: "Faixa de atraso",
            value: faixaAtraso,
            onChange: setFaixaAtraso,
            options: [
              { value: "", label: "Todas" },
              ...FAIXAS_ATRASO_DASHBOARD_ATENDENTE.map((item) => ({ value: item.id, label: item.label })),
            ],
          },
          {
            id: "origem",
            label: "Origem dos dados",
            value: origem,
            onChange: setOrigem,
            options: [{ value: "", label: "Todas" }, ...origensDebito.map((item) => ({ value: item, label: item }))],
          },
          {
            id: "retorno-de",
            label: "Retorno de",
            type: "date",
            value: retornoDe,
            onChange: setRetornoDe,
          },
          {
            id: "retorno-ate",
            label: "Retorno até",
            type: "date",
            value: retornoAte,
            onChange: setRetornoAte,
          },
        ]}
        onApply={aplicar}
        onClear={limpar}
      />

      {ativos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-xs" aria-label="Filtros ativos">
          {ativos.map((item) => (
            <Badge key={item.chave} variant="neutral">
              {item.rotulo}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Nenhum filtro além do período padrão (últimos 7 dias).</p>
      )}

      <div className="flex flex-col gap-sm border-t border-border-subtle pt-md">
        <div className="flex items-center gap-xs text-label-lg text-on-surface">
          <Icon icon={Star} size="sm" aria-hidden />
          Combinações favoritas
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Salvas neste navegador (não há persistência no servidor para filtros do dashboard).
        </p>
        <div className="flex flex-col gap-sm min-[640px]:flex-row min-[640px]:items-end">
          <div className="min-w-0 flex-1">
            <FormField label="Nome do favorito" htmlFor="dashboard-favorito-nome">
              <Input
                id="dashboard-favorito-nome"
                value={nomeFavorito}
                onChange={(event) => setNomeFavorito(event.target.value)}
                placeholder="Ex.: Carteira com retorno atrasado"
              />
            </FormField>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const next = salvarFavoritoDashboard(userId, nomeFavorito, montarFiltros());
              setFavoritos(next);
              setNomeFavorito("");
            }}
          >
            <Icon icon={Bookmark} size="sm" />
            Salvar combinação
          </Button>
        </div>
        {favoritos.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {favoritos.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-sm rounded-lg bg-surface-subtle px-md py-sm">
                <button
                  type="button"
                  className="text-left text-body-md text-primary-container hover:underline"
                  onClick={() => carregarFavorito(item)}
                >
                  {item.nome}
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remover favorito ${item.nome}`}
                  onClick={() => setFavoritos(removerFavoritoDashboard(userId, item.id))}
                >
                  <Icon icon={X} size="sm" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function filtrosDashboardQueryDeNorm(norm: DashboardFiltrosNorm) {
  return serializarFiltrosDashboard(norm).toString();
}
