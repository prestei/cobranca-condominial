"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DoorOpen,
  FileText,
  Printer,
  Scale,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { GraficoRosca } from "@/components/charts";
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

function FaixaMeta({
  icon,
  rotulo,
  valor,
}: {
  icon: typeof Building2;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-xs rounded-lg border border-border-subtle bg-surface-card px-md py-sm">
      <span className="flex items-center gap-xs text-label-sm text-on-surface-variant">
        <Icon icon={icon} size="sm" />
        {rotulo}
      </span>
      <span className="truncate text-body-md font-medium text-on-surface">{valor}</span>
    </div>
  );
}

function CartaoStatus({
  tom,
  titulo,
  quantidade,
  valor,
}: {
  tom: "success" | "secondary" | "error";
  titulo: string;
  quantidade: number;
  valor: string;
}) {
  const borda =
    tom === "success"
      ? "border-success/30 bg-success-container/20"
      : tom === "error"
        ? "border-error/30 bg-error-container/20"
        : "border-primary-container/25 bg-primary-fixed/25";
  return (
    <div className={`flex flex-1 flex-col gap-xs rounded-xl border p-md ${borda}`}>
      <span className="text-label-sm font-medium text-on-surface-variant">{titulo}</span>
      <span className="text-metric tabular-nums text-on-surface">{String(quantidade).padStart(2, "0")}</span>
      <span className="text-body-sm tabular-nums text-on-surface-variant">{valor}</span>
    </div>
  );
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

  return (
    <div className="flex flex-col gap-lg print:text-on-surface">
      <header className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div className="flex flex-col gap-sm">
            <Button type="button" variant="ghost" size="sm" className="w-fit print:hidden" onClick={onVoltar}>
              <ArrowLeft className="size-icon-sm" aria-hidden />
              Voltar
            </Button>
            <div className="flex flex-wrap items-center gap-sm">
              <h1 className="text-headline-lg text-on-surface">Proposta de Negociação #{codigo}</h1>
              <Badge variant={badgeStatus[proposta.status] ?? "secondary"}>
                {rotuloStatusExibicao(proposta.status)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-sm print:hidden">
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
                Editar proposta
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-sm min-[768px]:grid-cols-5">
          <FaixaMeta icon={Building2} rotulo="Condomínio" valor={detalhe.condominioNome} />
          <FaixaMeta icon={DoorOpen} rotulo="Unidade" valor={detalhe.unidadeIdentificacao} />
          <FaixaMeta icon={User} rotulo="Devedor" valor={detalhe.devedorNome} />
          <FaixaMeta icon={Scale} rotulo="Advogado responsável" valor={detalhe.advogadoResponsavelRotulo} />
          <FaixaMeta icon={Calendar} rotulo="Data da criação" valor={formatarData(proposta.criadoEm)} />
        </div>
      </header>

      <section className="grid gap-md lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-primary-container text-on-primary shadow-card">
          <div className="flex flex-col gap-md p-lg">
            <p className="text-label-md text-primary-fixed/90">Valor Negociado</p>
            <p className="text-headline-xl tabular-nums text-on-primary">{formatarMoeda(proposta.valorProposto)}</p>
            <div className="grid gap-sm border-t border-on-primary/20 pt-md min-[640px]:grid-cols-4">
              <div>
                <p className="text-label-sm text-on-primary/80">Valor original</p>
                <p className="text-body-md tabular-nums">
                  {proposta.valorDividaOriginal ? formatarMoeda(proposta.valorDividaOriginal) : "—"}
                </p>
              </div>
              <div>
                <p className="text-label-sm text-on-primary/80">Valor atualizado</p>
                <p className="text-body-md tabular-nums">
                  {proposta.valorDividaAtualizada ? formatarMoeda(proposta.valorDividaAtualizada) : "—"}
                </p>
              </div>
              <div>
                <p className="text-label-sm text-on-primary/80">Desconto {detalhe.descontoPercent}%</p>
                <p className="text-body-md tabular-nums">{detalhe.descontoConcedido}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-primary/80">Parcelamento</p>
                <p className="text-body-md">
                  {proposta.quantidadeParcelas
                    ? `${proposta.quantidadeParcelas}x de ${detalhe.valorParcelaIndicativo}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
          {resumo ? (
            <GraficoRosca
              chave={`negociacao-${propostaId}`}
              centro={`${percentualPago}%`}
              legenda="Total recebido"
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
              vazio={<p className="text-body-sm text-on-surface-variant">Sem parcelas definidas</p>}
              semLegenda
            />
          ) : (
            <p className="text-body-sm text-on-surface-variant">Cronograma ainda não gerado</p>
          )}
        </div>
      </section>

      {resumo ? (
        <section className="grid gap-sm min-[768px]:grid-cols-4">
          <CartaoStatus
            tom="success"
            titulo="Parcelas pagas"
            quantidade={resumo.parcelasPagas}
            valor={formatarMoeda((valorPagasCent / 100).toFixed(2))}
          />
          <CartaoStatus
            tom="secondary"
            titulo="Parcelas pendentes"
            quantidade={resumo.parcelasPendentes}
            valor={formatarMoeda((valorPendentesCent / 100).toFixed(2))}
          />
          <CartaoStatus
            tom="error"
            titulo="Parcelas vencidas"
            quantidade={resumo.parcelasVencidas}
            valor={formatarMoeda((valorVencidasCent / 100).toFixed(2))}
          />
          <div className="flex flex-col justify-center rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
            <span className="text-label-sm text-on-surface-variant">Total recebido</span>
            <span className="text-metric tabular-nums text-on-surface">{formatarMoeda(resumo.valorPagoConfirmado)}</span>
          </div>
        </section>
      ) : null}

      <div className="grid gap-lg min-[1024px]:grid-cols-[minmax(0,1.5fr)_minmax(17rem,22rem)]">
        <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <h2 className="text-headline-sm text-on-surface">Parcelas da Negociação</h2>
          {!resumo || resumo.parcelas.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nenhuma parcela prevista. Confirme o acordo ou gere o cronograma.</p>
          ) : (
            <ul className="flex flex-col gap-sm">
              {parcelasPagas.map((parcela) => (
                <LinhaParcela key={parcela.id} parcela={parcela} cadastros={cadastros} />
              ))}
              {parcelasAguardando.length > 0 ? (
                <li className="rounded-lg border border-border-subtle bg-surface-subtle">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-sm px-md py-sm text-left"
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
                    <ul className="flex flex-col gap-xs border-t border-border-subtle p-sm">
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

        <aside className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <h2 className="text-headline-sm text-on-surface">Histórico da Negociação</h2>
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
            <div className="rounded-lg border border-primary-container/30 bg-primary-fixed/25 px-md py-sm text-body-sm text-on-surface">
              A soma das parcelas corresponde ao valor negociado ({formatarMoeda(resumo.valorAcordado)}). Saldo confirmado:{" "}
              {formatarMoeda(resumo.saldoRestante)}.
            </div>
          ) : null}
        </aside>
      </div>

      {resumo ? (
        <footer className="grid gap-md rounded-xl border border-border-subtle bg-surface-subtle p-lg min-[768px]:grid-cols-[auto_1fr] min-[768px]:items-center">
          <div className="flex items-center gap-md">
            <div
              className="flex size-20 items-center justify-center rounded-full border-4 border-primary-container text-headline-sm tabular-nums text-primary-container"
              style={{
                background: `conic-gradient(var(--color-primary-container) ${percentualPago}%, var(--color-surface-container) 0)`,
              }}
              role="img"
              aria-label={`${percentualPago}% recebido`}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-surface-card text-headline-sm">
                {percentualPago}%
              </span>
            </div>
            <div>
              <p className="text-body-md tabular-nums text-on-surface">{formatarMoeda(resumo.valorPagoConfirmado)}</p>
              <p className="text-body-sm text-on-surface-variant">Já recebido (confirmado)</p>
            </div>
          </div>
          <div className="grid gap-sm min-[640px]:grid-cols-4">
            <ResumoRodape icon={Wallet} rotulo="Saldo restante" valor={formatarMoeda(resumo.saldoRestante)} />
            <ResumoRodape icon={CalendarDays} rotulo="Total de parcelas" valor={String(resumo.parcelasTotal)} />
            <ResumoRodape icon={CheckCircle2} rotulo="Pagas" valor={String(resumo.parcelasPagas)} tom="success" />
            <ResumoRodape icon={Clock} rotulo="Pendentes" valor={String(resumo.parcelasPendentes)} />
          </div>
        </footer>
      ) : null}

      {proposta.status === "Em análise" && podeEditar ? (
        <section
          id="decisao-proposta"
          className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card print:hidden"
        >
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
        <section className="rounded-xl border border-border-subtle bg-surface-card shadow-card print:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-lg py-md text-left"
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
    </div>
  );
}

function ResumoRodape({
  icon,
  rotulo,
  valor,
  tom,
}: {
  icon: typeof Wallet;
  rotulo: string;
  valor: string;
  tom?: "success";
}) {
  return (
    <div className="flex items-center gap-sm rounded-lg bg-surface-card px-md py-sm">
      <Icon icon={icon} size="sm" className={tom === "success" ? "text-success" : "text-primary-container"} />
      <div>
        <p className="text-metric tabular-nums text-on-surface">{valor}</p>
        <p className="text-body-sm text-on-surface-variant">{rotulo}</p>
      </div>
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
        "flex flex-col gap-xs rounded-lg border border-border-subtle px-md py-sm",
        pago ? "bg-success-container/15" : "bg-surface-card",
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
