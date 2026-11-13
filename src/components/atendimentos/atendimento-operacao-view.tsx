"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AtendimentoPainelCaso } from "@/components/atendimentos/atendimento-painel-caso";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PeriodInput, type PeriodValue } from "@/components/period-input";
import { SkeletonAtendimentosOperacao } from "@/components/skeleton";
import { hojeIso, nomeCondominio } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import { contatoResponsavelDaUnidade } from "@/lib/contato-responsavel";
import { formatarDataHoraLista } from "@/lib/fila/formatar-data-hora-lista";
import type { FilaCobrancaItem } from "@/lib/fila/service";
import { resolverPeriodo } from "@/lib/periodo";
import { CalendarClock, CalendarX2, ListOrdered } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FiltroRapidoFila = "nenhum" | "atrasados";

const filaChipBase =
  "inline-flex h-9 min-w-0 w-full cursor-pointer items-center justify-center gap-xs rounded-full border px-sm text-body-sm font-semibold transition-colors";

type Props = {
  carregando: boolean;
  itens: FilaCobrancaItem[];
  destaqueUnidadeId?: number | null;
  headerActions?: ReactNode;
  periodo: PeriodValue;
  onPeriodoChange: (periodo: PeriodValue) => void;
  /** Atalho legado `?retorno=sem`: unidades sem data de retorno. */
  semRetorno?: boolean;
  onSemRetornoChange?: (ativo: boolean) => void;
  filtroRapido?: FiltroRapidoFila;
  onFiltroRapidoChange?: (filtro: FiltroRapidoFila) => void;
  onLimparFiltros?: () => void;
  onNovaProposta?: (item: FilaCobrancaItem) => void;
  onEncaminharJuridico?: (item: FilaCobrancaItem) => void;
  onConcluirRetorno?: (item: FilaCobrancaItem) => void;
  onSalvoAtendimento: () => void;
  onRegistrarCompleto?: (unidadeId: number, canal?: "WhatsApp" | "E-mail" | "Telefone") => void;
};

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} · ${item.bloco}`;
  return item.identificacao;
}

function temRetornoAgendado(item: FilaCobrancaItem) {
  return Boolean(item.proximoRetorno?.trim()) && item.retornoSituacao !== "concluido";
}

function itemNoPeriodo(item: FilaCobrancaItem, periodo: PeriodValue, semRetorno: boolean) {
  if (semRetorno) return !item.proximoRetorno?.trim();
  const { inicio, fim } = resolverPeriodo(periodo, hojeIso());
  if (!inicio && !fim) return true;
  const dia = item.proximoRetorno?.trim().slice(0, 10) ?? "";
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}

type IndicadorStatusFila = {
  rotulo: string;
  icone: LucideIcon;
  circulo: string;
};

function indicadorStatusFila(item: FilaCobrancaItem): IndicadorStatusFila {
  if (temRetornoAgendado(item)) {
    if (item.retornoSituacao === "atrasado") {
      return {
        rotulo: "Retorno atrasado",
        icone: CalendarClock,
        circulo: "bg-error-container text-on-error-container",
      };
    }
    if (item.retornoSituacao === "hoje") {
      return {
        rotulo: "Retorno hoje",
        icone: CalendarClock,
        circulo: "bg-secondary-fixed text-on-secondary-fixed-variant",
      };
    }
    return {
      rotulo: "Retorno agendado",
      icone: CalendarClock,
      circulo: "bg-primary-fixed text-primary-container",
    };
  }
  return {
    rotulo: "Sem contato agendado",
    icone: CalendarX2,
    circulo: "bg-surface-container-high text-on-surface-variant",
  };
}

function referenciaDataHoraLista(item: FilaCobrancaItem): string | null {
  if (item.ultimoAtendimento?.trim()) return item.ultimoAtendimento;
  if (item.proximoRetorno?.trim()) return item.proximoRetorno;
  return null;
}

export function AtendimentoOperacaoView({
  carregando,
  itens,
  destaqueUnidadeId,
  headerActions,
  periodo,
  onPeriodoChange,
  semRetorno = false,
  onSemRetornoChange,
  filtroRapido = "nenhum",
  onFiltroRapidoChange,
  onLimparFiltros,
  onNovaProposta,
  onEncaminharJuridico,
  onConcluirRetorno,
  onSalvoAtendimento,
  onRegistrarCompleto,
}: Props) {
  const cadastros = useCadastros();
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [detalheMobileAberto, setDetalheMobileAberto] = useState(false);
  const ultimoDestaqueAplicadoRef = useRef<number | null>(null);

  const layoutDesktop = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const aoMudar = () => {
      if (mq.matches) setDetalheMobileAberto(false);
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  const itensFiltrados = useMemo(() => {
    let lista = itens.filter((item) => itemNoPeriodo(item, periodo, semRetorno));
    if (filtroRapido === "atrasados") {
      lista = lista.filter((item) => item.retornoSituacao === "atrasado");
    }
    return lista;
  }, [itens, periodo, semRetorno, filtroRapido]);

  useEffect(() => {
    if (!destaqueUnidadeId) {
      ultimoDestaqueAplicadoRef.current = null;
    } else if (
      destaqueUnidadeId !== ultimoDestaqueAplicadoRef.current &&
      itensFiltrados.some((item) => item.unidadeId === destaqueUnidadeId)
    ) {
      setSelecionadaId(destaqueUnidadeId);
      ultimoDestaqueAplicadoRef.current = destaqueUnidadeId;
      if (!layoutDesktop()) setDetalheMobileAberto(true);
      return;
    }

    setSelecionadaId((current) => {
      if (current && itensFiltrados.some((item) => item.unidadeId === current)) return current;
      if (layoutDesktop()) return itensFiltrados[0]?.unidadeId ?? null;
      return null;
    });
  }, [destaqueUnidadeId, itensFiltrados]);

  useEffect(() => {
    if (selecionadaId == null) setDetalheMobileAberto(false);
  }, [selecionadaId]);

  const selecionada =
    selecionadaId != null
      ? (itensFiltrados.find((item) => item.unidadeId === selecionadaId) ?? null)
      : null;

  const periodoAberto =
    periodo.preset !== "todos" || Boolean(periodo.de || periodo.ate) || semRetorno || filtroRapido !== "nenhum";
  const filaVazia = !carregando && itens.length === 0 && !periodoAberto;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-card">
      {carregando && itens.length === 0 ? (
        <SkeletonAtendimentosOperacao
          className="min-h-0 flex-1"
          label="Carregando fila de cobranças"
          showHeaderAction={Boolean(headerActions)}
        />
      ) : filaVazia ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-lg">
          <EmptyState
            icon={<Icon icon={ListOrdered} size="lg" className="text-on-surface-variant" />}
            title="Fila vazia"
            description="Não há unidades em cobrança ativa."
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-[1024px]:flex-row">
          <aside
            className={`flex min-h-0 w-full flex-col border-border-subtle min-[1024px]:w-[min(100%,22rem)] min-[1024px]:shrink-0 min-[1024px]:border-r ${
              detalheMobileAberto ? "max-[1023px]:hidden" : "max-[1023px]:flex max-[1023px]:min-h-0 max-[1023px]:flex-1"
            }`}
          >
            <div className="relative z-20 flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-container-low px-2 py-2">
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 overflow-hidden">
                <PeriodInput
                  id="fila-data-retorno"
                  appearance="chip"
                  chipFill
                  value={periodo}
                  onChange={onPeriodoChange}
                  className="justify-center"
                />
                <button
                  type="button"
                  aria-pressed={semRetorno}
                  className={`${filaChipBase} ${
                    semRetorno
                      ? "border-primary-container bg-primary-container text-on-primary"
                      : "border-border-subtle bg-surface-card text-on-surface hover:bg-surface-subtle"
                  }`}
                  onClick={() => onSemRetornoChange?.(!semRetorno)}
                >
                  <Icon icon={CalendarX2} size="sm" className="shrink-0" aria-hidden />
                  <span className="truncate">Sem retorno</span>
                </button>
                <button
                  type="button"
                  aria-pressed={filtroRapido === "atrasados"}
                  className={`${filaChipBase} ${
                    filtroRapido === "atrasados"
                      ? "border-error bg-error-container text-on-error-container"
                      : "border-border-subtle bg-surface-card text-on-surface hover:bg-surface-subtle"
                  }`}
                  onClick={() =>
                    onFiltroRapidoChange?.(filtroRapido === "atrasados" ? "nenhum" : "atrasados")
                  }
                >
                  <Icon icon={CalendarClock} size="sm" className="shrink-0" aria-hidden />
                  <span className="truncate">Atrasados</span>
                </button>
              </div>
              {headerActions ? <div className="flex shrink-0 items-center gap-sm">{headerActions}</div> : null}
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-container-low"
              role="list"
              aria-label="Fila de atendimento"
            >
              {itensFiltrados.length === 0 ? (
                <div className="flex h-full min-h-40 items-center justify-center p-lg">
                  <EmptyState
                    icon={<Icon icon={CalendarClock} size="lg" className="text-on-surface-variant" />}
                    title="Nenhuma unidade neste filtro"
                    description="Ajuste o período ou os chips Sem retorno e Atrasados para ver a fila."
                    action={
                      onLimparFiltros ? (
                        <Button type="button" variant="outline" size="sm" onClick={onLimparFiltros}>
                          Limpar filtros
                        </Button>
                      ) : null
                    }
                  />
                </div>
              ) : null}
              {itensFiltrados.map((item) => {
                const ativo = selecionadaId === item.unidadeId;
                const rotuloDataHora = formatarDataHoraLista(referenciaDataHoraLista(item));
                const nomeResponsavel = contatoResponsavelDaUnidade(cadastros, item.unidadeId).nome.trim();
                const condominio = nomeCondominio(item.condominioId, cadastros);
                const status = indicadorStatusFila(item);
                return (
                  <button
                    key={item.unidadeId}
                    type="button"
                    role="listitem"
                    id={`fila-unidade-${item.unidadeId}`}
                    onClick={() => {
                      setSelecionadaId(item.unidadeId);
                      setDetalheMobileAberto(true);
                    }}
                    className={`flex w-full cursor-pointer gap-3 border-b border-border-subtle px-3 py-2.5 text-left transition-colors ${
                      ativo ? "bg-primary-fixed-dim" : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-full ${status.circulo}`}
                      title={status.rotulo}
                      aria-label={status.rotulo}
                    >
                      <Icon icon={status.icone} size="sm" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-body-md font-semibold text-on-surface">
                          {nomeResponsavel || rotuloUnidade(item)}
                        </p>
                        {rotuloDataHora ? (
                          <span className="shrink-0 text-[11px] leading-[15px] tabular-nums text-on-surface-variant">
                            {rotuloDataHora}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-body-sm">
                        {nomeResponsavel ? (
                          <>
                            <span className="text-on-surface-variant">{rotuloUnidade(item)}</span>
                            <span className="text-on-surface-variant" aria-hidden>
                              {" "}
                              ·{" "}
                            </span>
                            <span className="text-body-md text-on-surface-variant/95">{condominio}</span>
                          </>
                        ) : (
                          <span className="text-body-md text-on-surface-variant/95">{condominio}</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div
            className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-border-subtle min-[1024px]:border-t-0 min-[1024px]:border-l ${
              detalheMobileAberto ? "max-[1023px]:flex" : "max-[1023px]:hidden"
            } min-[1024px]:flex`}
          >
            <AtendimentoPainelCaso
              item={selecionada}
              onNovaProposta={
                selecionada && onNovaProposta ? () => onNovaProposta(selecionada) : undefined
              }
              onEncaminharJuridico={
                selecionada && onEncaminharJuridico ? () => onEncaminharJuridico(selecionada) : undefined
              }
              onConcluirRetorno={
                selecionada &&
                onConcluirRetorno &&
                selecionada.proximoRetornoAtendimentoId &&
                selecionada.retornoSituacao !== "concluido"
                  ? () => onConcluirRetorno(selecionada)
                  : undefined
              }
              onSalvo={onSalvoAtendimento}
              onRegistrarCompleto={onRegistrarCompleto}
              onVoltar={() => setDetalheMobileAberto(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
