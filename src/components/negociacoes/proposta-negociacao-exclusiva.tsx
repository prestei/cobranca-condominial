"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DoorOpen,
  FileText,
  Printer,
  Scale,
  User,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { GraficoRosca } from "@/components/charts";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { Icon } from "@/components/icon";
import { FormField, Input, Textarea } from "@/components/input";
import { SkeletonCardList } from "@/components/skeleton";
import { useToast } from "@/components/toast";
import { AcordoAcompanhamentoBlock } from "@/components/negociacoes/acordo-acompanhamento-block";
import {
  formatarData,
  formatarMoeda,
  type Cadastros,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { useCadastrosStatus } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import type { ResumoAcordo } from "@/lib/acordos/resumo";
import { identificadorColaboradorPorId } from "@/lib/colaboradores/re";
import type { PropostaNegociacaoDetalhe } from "@/lib/negociacoes/detalhe";
import type { ParcelaAcordoEnriquecida } from "@/lib/acordos/resumo";

type Props = {
  propostaId: string;
  cadastros: Cadastros;
  onVoltar: () => void;
  onRecarregar: () => void;
};

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  "Em análise": "secondary",
  Aceita: "success",
  Recusada: "error",
  Cancelada: "neutral",
};

function rotuloProposta(proposta: PropostaNegociacao) {
  const ano = proposta.criadoEm.slice(0, 4) || "2025";
  const sufixo = proposta.id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `PN-${ano}-${sufixo}`;
}

function rotuloStatusExibicao(status: string) {
  if (status === "Aceita") return "Ativa";
  return status;
}

function centavos(valor: string): number {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function PropostaNegociacaoExclusiva({ propostaId, cadastros, onVoltar, onRecarregar }: Props) {
  const { toast } = useToast();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const podeEditar = pode("atendimentos", "editar") || pode("negociacoes", "editar");

  const [detalhe, setDetalhe] = useState<PropostaNegociacaoDetalhe | null>(null);
  const [resumo, setResumo] = useState<ResumoAcordo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendentesAbertos, setPendentesAbertos] = useState(false);
  const [operacoesAbertas, setOperacoesAbertas] = useState(false);

  const [termos, setTermos] = useState("");
  const [termosErro, setTermosErro] = useState("");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [statusSalvando, setStatusSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [detRes, parRes] = await Promise.all([
        fetch(`/api/propostas/${propostaId}`, { credentials: "same-origin" }),
        fetch(`/api/propostas/${propostaId}/parcelas`, { credentials: "same-origin" }),
      ]);
      const detPayload = (await detRes.json()) as { error?: string; detalhe?: PropostaNegociacaoDetalhe };
      const parPayload = (await parRes.json()) as { error?: string; resumo?: ResumoAcordo };
      if (!detRes.ok || !detPayload.detalhe) {
        setDetalhe(null);
        toast({ variant: "error", title: "Proposta", description: detPayload.error });
        return;
      }
      setDetalhe(detPayload.detalhe);
      setResumo(parPayload.resumo ?? null);
      setTermos("");
      setTermosErro("");
    } finally {
      setLoading(false);
    }
  }, [propostaId, toast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const historico = useMemo(() => {
    if (!detalhe) return [];
    const id = detalhe.proposta.id;
    type Evento = { data: string; titulo: string; descricao: string; usuario: string };
    const eventos: Evento[] = [];

    for (const log of cadastros.auditoria) {
      if (log.entidade !== "negotiation_proposal" || log.registroId !== id) continue;
      const userId = Number(log.usuarioId);
      const usuario = Number.isFinite(userId)
        ? identificadorColaboradorPorId(userId, cadastros)
        : log.usuarioId;
      const acao =
        log.acao === "INSERT"
          ? "Proposta criada"
          : log.acao === "UPDATE"
            ? "Proposta alterada"
            : `Registro ${log.acao.toLowerCase()}`;
      eventos.push({
        data: log.dataHora,
        titulo: acao,
        descricao: log.camposAlterados || "Atualização registrada",
        usuario,
      });
    }

    if (resumo) {
      for (const parcela of resumo.parcelas) {
        for (const pagamento of parcela.pagamentos) {
          if (pagamento.confirmacao !== "Confirmado") continue;
          eventos.push({
            data: pagamento.dataPagamento,
            titulo: "Pagamento confirmado",
            descricao: `Parcela ${parcela.numero} · ${formatarMoeda(pagamento.valor)}`,
            usuario: identificadorColaboradorPorId(pagamento.registradoPorId, cadastros),
          });
        }
      }
    }

    eventos.sort((a, b) => b.data.localeCompare(a.data));
    return eventos.slice(0, 12);
  }, [cadastros, detalhe, resumo]);

  const parcelasPagas = resumo?.parcelas.filter((item) => item.status === "Paga") ?? [];
  const parcelasPendentes = resumo?.parcelas.filter((item) => item.status === "Pendente") ?? [];
  const parcelasVencidas = resumo?.parcelas.filter((item) => item.status === "Vencida") ?? [];
  const parcelasAguardando = [...parcelasPendentes, ...parcelasVencidas];

  const valorPagasCent = parcelasPagas.reduce((s, p) => s + centavos(p.valorPagoConfirmado || p.valorPrevisto), 0);
  const valorPendentesCent = parcelasAguardando.reduce((s, p) => s + centavos(p.valorPrevisto), 0);
  const valorVencidasCent = parcelasVencidas.reduce((s, p) => s + centavos(p.valorPrevisto), 0);

  const percentualPago = useMemo(() => {
    if (!resumo) return 0;
    const acordado = centavos(resumo.valorAcordado);
    if (acordado <= 0) return 0;
    return Math.round((centavos(resumo.valorPagoConfirmado) / acordado) * 100);
  }, [resumo]);

  async function alterarStatus(status: string) {
    if (!detalhe || !podeEditar) return;
    const termosAprovados = termos.trim();
    if (status === "Aceita" && !termosAprovados) {
      setTermosErro("Informe os termos aprovados do acordo.");
      return;
    }
    setTermosErro("");
    setStatusSalvando(true);
    try {
      const response = await fetch(`/api/propostas/${detalhe.proposta.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          termosAprovados: status === "Aceita" ? termosAprovados : undefined,
          primeiroVencimento: status === "Aceita" ? primeiroVencimento.trim() || undefined : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; proposta?: PropostaNegociacao };
      if (!response.ok || !payload.proposta) {
        toast({ variant: "error", title: "Status", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Proposta atualizada" });
      void refetch();
      onRecarregar();
      await carregar();
    } finally {
      setStatusSalvando(false);
    }
  }

  if (loading) {
    return <SkeletonCardList rows={6} label="Carregando proposta" />;
  }

  if (!detalhe) {
    return (
      <div className="flex flex-col gap-md">
        <Button type="button" variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="size-icon-sm" aria-hidden />
          Voltar
        </Button>
        <p className="text-body-sm text-on-surface-variant">Proposta não encontrada.</p>
      </div>
    );
  }

  const { proposta } = detalhe;
  const codigo = rotuloProposta(proposta);

  const metas: { icon: typeof Building2; rotulo: string; valor: string }[] = [
    { icon: Building2, rotulo: "Condomínio", valor: detalhe.condominioNome },
    { icon: DoorOpen, rotulo: "Unidade", valor: detalhe.unidadeIdentificacao },
    { icon: User, rotulo: "Devedor", valor: detalhe.devedorNome },
    { icon: Scale, rotulo: "Advogado responsável", valor: detalhe.advogadoResponsavelRotulo },
    { icon: Calendar, rotulo: "Data da criação", valor: formatarData(proposta.criadoEm) },
  ];

  return (
    <div className="flex flex-col gap-md print:text-on-surface">
      <div className="flex flex-wrap items-center justify-between gap-sm print:hidden">
        <Button type="button" variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="size-icon-sm" aria-hidden />
          Voltar
        </Button>
        <div className="flex flex-wrap gap-sm">
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="size-icon-sm" aria-hidden />
            Imprimir
          </Button>
          {proposta.status === "Em análise" && podeEditar ? (
            <Button
              type="button"
              size="sm"
              onClick={() => document.getElementById("decisao-proposta")?.scrollIntoView({ behavior: "smooth" })}
            >
              Decidir proposta
            </Button>
          ) : null}
        </div>
      </div>

      <article className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card">
        <header className="flex flex-col gap-md p-lg">
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-headline-lg text-on-surface">Proposta de Negociação #{codigo}</h1>
            <Badge variant={badgeStatus[proposta.status] ?? "secondary"}>
              {rotuloStatusExibicao(proposta.status)}
            </Badge>
          </div>
          <dl className="grid gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-5">
            {metas.map((item) => (
              <div key={item.rotulo} className="min-w-0">
                <dt className="flex items-center gap-xs text-label-sm text-on-surface-variant">
                  <Icon icon={item.icon} size="sm" aria-hidden />
                  {item.rotulo}
                </dt>
                <dd className="mt-xs truncate text-body-md font-medium text-on-surface">{item.valor}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="border-t border-border-subtle bg-gradient-to-br from-primary-fixed/30 via-surface-card to-surface-card p-lg">
          <div className="flex flex-col gap-lg min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-on-surface-variant">Valor negociado</p>
              <p className="mt-xs text-headline-xl tabular-nums text-on-surface">{formatarMoeda(proposta.valorProposto)}</p>
              <dl className="mt-md grid gap-md min-[640px]:grid-cols-2 min-[960px]:grid-cols-4">
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Valor original</dt>
                  <dd className="text-body-md tabular-nums text-on-surface">
                    {proposta.valorDividaOriginal ? formatarMoeda(proposta.valorDividaOriginal) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Valor atualizado</dt>
                  <dd className="text-body-md tabular-nums text-on-surface">
                    {proposta.valorDividaAtualizada ? formatarMoeda(proposta.valorDividaAtualizada) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Desconto ({detalhe.descontoPercent}%)</dt>
                  <dd className="text-body-md tabular-nums text-on-surface">{detalhe.descontoConcedido}</dd>
                </div>
                <div>
                  <dt className="text-label-sm text-on-surface-variant">Parcelamento</dt>
                  <dd className="text-body-md text-on-surface">
                    {proposta.quantidadeParcelas
                      ? `${proposta.quantidadeParcelas}x de ${detalhe.valorParcelaIndicativo}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
            {resumo ? (
              <div className="flex shrink-0 flex-col items-center gap-xs min-[1024px]:w-44">
                <GraficoRosca
                  chave={`negociacao-${propostaId}`}
                  centro={`${percentualPago}%`}
                  legenda="Recebido"
                  fatias={[
                    {
                      nome: "Recebido",
                      valor: centavos(resumo.valorPagoConfirmado),
                      detalhe: formatarMoeda(resumo.valorPagoConfirmado),
                      tom: "settled",
                    },
                    {
                      nome: "Saldo",
                      valor: centavos(resumo.saldoRestante),
                      detalhe: formatarMoeda(resumo.saldoRestante),
                      tom: "navy",
                    },
                  ]}
                  vazio={<p className="text-body-sm text-on-surface-variant">Sem parcelas</p>}
                  semLegenda
                />
                <p className="text-center text-body-sm text-on-surface-variant">
                  Total recebido{" "}
                  <span className="font-medium tabular-nums text-on-surface">
                    {formatarMoeda(resumo.valorPagoConfirmado)}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Cronograma ainda não gerado.</p>
            )}
          </div>
        </section>

        {resumo ? (
          <section aria-label="Indicadores de parcelas" className="border-t border-border-subtle px-lg py-md">
            <div className="grid grid-cols-1 gap-sm min-[768px]:hidden">
              <KpiMobileCard
                rotulo="Parcelas pagas"
                valor={String(resumo.parcelasPagas).padStart(2, "0")}
                detalhe={formatarMoeda((valorPagasCent / 100).toFixed(2))}
                icon={CheckCircle2}
                iconClassName="bg-badge-success-subtle text-badge-success-emphasis"
              />
              <KpiMobileCard
                rotulo="Parcelas pendentes"
                valor={String(resumo.parcelasPendentes).padStart(2, "0")}
                detalhe={formatarMoeda((valorPendentesCent / 100).toFixed(2))}
                icon={Clock}
              />
              <KpiMobileCard
                rotulo="Parcelas vencidas"
                valor={String(resumo.parcelasVencidas).padStart(2, "0")}
                detalhe={formatarMoeda((valorVencidasCent / 100).toFixed(2))}
                icon={CalendarX2}
                destaque
              />
            </div>
            <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-3">
              <CardMetric
                rotulo="Parcelas pagas"
                valor={String(resumo.parcelasPagas).padStart(2, "0")}
                detalhe={formatarMoeda((valorPagasCent / 100).toFixed(2))}
                iconClassName="bg-badge-success-subtle text-badge-success-emphasis"
                icon={<Icon icon={CheckCircle2} size="md" className="text-badge-success-emphasis" />}
              />
              <CardMetric
                rotulo="Parcelas pendentes"
                valor={String(resumo.parcelasPendentes).padStart(2, "0")}
                detalhe={formatarMoeda((valorPendentesCent / 100).toFixed(2))}
                iconClassName="bg-primary-fixed/50 text-primary-container"
                icon={<Icon icon={Clock} size="md" className="text-primary-container" />}
              />
              <CardMetric
                rotulo="Parcelas vencidas"
                valor={String(resumo.parcelasVencidas).padStart(2, "0")}
                detalhe={formatarMoeda((valorVencidasCent / 100).toFixed(2))}
                iconClassName="bg-error-container text-status-critical"
                icon={<Icon icon={CalendarX2} size="md" className="text-status-critical" />}
              />
            </div>
          </section>
        ) : null}

        <div className="grid min-[1024px]:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
          <section className="flex flex-col gap-md border-t border-border-subtle p-lg min-[1024px]:border-r">
            <h2 className="text-headline-sm text-on-surface">Parcelas da negociação</h2>
            {!resumo || resumo.parcelas.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                Nenhuma parcela prevista. Confirme o acordo ou gere o cronograma.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle rounded-lg bg-surface-subtle/50">
                {parcelasPagas.map((parcela) => (
                  <LinhaParcela key={parcela.id} parcela={parcela} cadastros={cadastros} />
                ))}
                {parcelasAguardando.length > 0 ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-sm bg-surface-subtle px-md py-sm text-left transition-colors hover:brightness-[0.98]"
                      onClick={() => setPendentesAbertos((v) => !v)}
                    >
                      <span className="text-body-md font-medium text-on-surface">
                        Parcelas {parcelasAguardando[0]?.numero}
                        {parcelasAguardando.length > 1
                          ? ` a ${parcelasAguardando[parcelasAguardando.length - 1]?.numero}`
                          : ""}{" "}
                        · {parcelasAguardando.length} pendentes
                      </span>
                      {pendentesAbertos ? <ChevronUp className="size-icon-sm" /> : <ChevronDown className="size-icon-sm" />}
                    </button>
                    {pendentesAbertos ? (
                      <ul className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
                        {parcelasAguardando.map((parcela) => (
                          <LinhaParcela key={parcela.id} parcela={parcela} cadastros={cadastros} compacto />
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ) : null}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-md border-t border-border-subtle p-lg min-[1024px]:border-t-0">
            <h2 className="text-headline-sm text-on-surface">Histórico da negociação</h2>
            {historico.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Sem eventos auditados ainda.</p>
            ) : (
              <ol className="relative flex flex-col gap-md border-l border-border-subtle pl-md">
                {historico.map((item, index) => (
                  <li key={`${item.data}-${index}`} className="relative">
                    <span className="absolute -left-[calc(0.5rem+5px)] top-1.5 size-2.5 rounded-full bg-primary-container" />
                    <p className="text-label-sm text-on-surface">{item.titulo}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      {formatarData(item.data)} · {item.usuario}
                    </p>
                    <p className="text-body-sm text-on-surface">{item.descricao}</p>
                  </li>
                ))}
              </ol>
            )}
            {resumo ? (
              <p className="rounded-lg bg-surface-subtle px-md py-sm text-body-sm text-on-surface-variant">
                A soma das parcelas corresponde ao valor negociado ({formatarMoeda(resumo.valorAcordado)}). Saldo em
                aberto: {formatarMoeda(resumo.saldoRestante)}.
              </p>
            ) : null}
          </aside>
        </div>

        {proposta.status === "Em análise" && podeEditar ? (
          <section id="decisao-proposta" className="border-t border-border-subtle p-lg print:hidden">
            <h2 className="text-headline-sm text-on-surface">Decisão da proposta</h2>
            <div className="mt-md flex flex-col gap-sm">
              <FormField label="1º vencimento do cronograma (opcional)">
                <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
              </FormField>
              <FormField label="Termos do acordo (obrigatório ao aceitar)" error={termosErro} required>
                <Textarea
                  icon={FileText}
                  value={termos}
                  onChange={(e) => {
                    setTermos(e.target.value);
                    if (e.target.value.trim()) setTermosErro("");
                  }}
                  rows={3}
                />
              </FormField>
              <div className="flex flex-wrap gap-sm">
                <Button type="button" disabled={statusSalvando || !termos.trim()} onClick={() => void alterarStatus("Aceita")}>
                  Confirmar acordo
                </Button>
                <Button type="button" variant="secondary" disabled={statusSalvando} onClick={() => void alterarStatus("Recusada")}>
                  Recusar
                </Button>
                <Button type="button" variant="ghost" disabled={statusSalvando} onClick={() => void alterarStatus("Cancelada")}>
                  Cancelar proposta
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {proposta.status === "Aceita" ? (
          <section className="border-t border-border-subtle print:hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-sm px-lg py-md text-left"
              onClick={() => setOperacoesAbertas((v) => !v)}
            >
              <span className="text-headline-sm text-on-surface">Registrar pagamento e cronograma</span>
              {operacoesAbertas ? <ChevronUp className="size-icon-sm" /> : <ChevronDown className="size-icon-sm" />}
            </button>
            {operacoesAbertas ? (
              <div className="border-t border-border-subtle px-lg pb-lg pt-md">
                <AcordoAcompanhamentoBlock
                  propostaId={proposta.id}
                  podeRegistrar={pode("atendimentos", "criar") || pode("negociacoes", "criar")}
                  podeCorrigir={podeEditar}
                  onChanged={() => {
                    void refetch();
                    onRecarregar();
                    void carregar();
                  }}
                />
              </div>
            ) : null}
          </section>
        ) : null}
      </article>
    </div>
  );
}

function LinhaParcela({
  parcela,
  cadastros,
  compacto,
}: {
  parcela: ParcelaAcordoEnriquecida;
  cadastros: Cadastros;
  compacto?: boolean;
}) {
  const pago = parcela.status === "Paga";
  const confirmado = parcela.pagamentos.find((p) => p.confirmacao === "Confirmado");

  return (
  <li
    className={[
      "flex flex-col gap-xs px-md py-sm",
      pago ? "bg-success-container/10" : "bg-surface-card",
      compacto ? "text-body-sm" : "",
    ].join(" ")}
  >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <span className="flex items-center gap-sm font-medium text-on-surface">
          {pago ? <CheckCircle2 className="size-icon-sm text-success" aria-hidden /> : null}
          {parcela.numero}ª parcela · venc. {formatarData(parcela.vencimentoEm)}
        </span>
        <span className="flex items-center gap-sm">
          <span className="tabular-nums text-on-surface">{formatarMoeda(parcela.valorPrevisto)}</span>
          <Badge variant={pago ? "success" : parcela.status === "Vencida" ? "error" : "secondary"}>
            {parcela.status}
          </Badge>
        </span>
      </div>
      {pago && confirmado && !compacto ? (
        <p className="text-body-sm text-on-surface-variant">
          Pago em {formatarData(confirmado.dataPagamento)} · Por{" "}
          {identificadorColaboradorPorId(confirmado.registradoPorId, cadastros)}
        </p>
      ) : null}
    </li>
  );
}
