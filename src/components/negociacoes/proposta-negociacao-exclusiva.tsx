"use client";

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  DoorOpen,
  FileText,
  Handshake,
  ListOrdered,
  Plus,
  Printer,
  Scale,
  ScrollText,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { FormField, Input, Textarea } from "@/components/input";
import { PageContent, PageHeader } from "@/components/page-header";
import { SkeletonCardList } from "@/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
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

const PARCELAS_PREVIEW = 5;
const HISTORICO_PREVIEW = 4;

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

function formatarDataHoraPagamento(iso: string): string {
  const data = formatarData(iso.slice(0, 10));
  const hora = iso.includes("T") ? iso.slice(11, 16) : "";
  return hora && hora !== "00:00" ? `${data} — ${hora}` : data;
}

function tituloEventoHistorico(acao: string, campos?: string) {
  if (acao === "INSERT") return "Proposta criada";
  if (acao === "UPDATE") {
    if (campos?.toLowerCase().includes("status") && campos.toLowerCase().includes("aceita")) {
      return "Proposta confirmada";
    }
    return "Condições alteradas";
  }
  return "Atualização registrada";
}

export function PropostaNegociacaoExclusiva({ propostaId, cadastros, onVoltar, onRecarregar }: Props) {
  const formId = useId();
  const { toast } = useToast();
  const { refetch } = useCadastrosStatus();
  const { pode } = usePermissao();
  const podeEditar = pode("atendimentos", "editar") || pode("negociacoes", "editar");
  const podeRegistrar = pode("atendimentos", "criar") || pode("negociacoes", "criar");

  const [detalhe, setDetalhe] = useState<PropostaNegociacaoDetalhe | null>(null);
  const [resumo, setResumo] = useState<ResumoAcordo | null>(null);
  const [loading, setLoading] = useState(true);
  const [parcelasExpandidas, setParcelasExpandidas] = useState(false);
  const [sheetPagamentoAberto, setSheetPagamentoAberto] = useState(false);
  const [sheetParcelaAberto, setSheetParcelaAberto] = useState(false);
  const [historicoCompleto, setHistoricoCompleto] = useState(false);

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
    type Evento = { data: string; titulo: string; usuario?: string; destaque: boolean };
    const eventos: Evento[] = [];

    for (const log of cadastros.auditoria) {
      if (log.entidade !== "negotiation_proposal" || log.registroId !== id) continue;
      const userId = Number(log.usuarioId);
      const usuario = Number.isFinite(userId)
        ? identificadorColaboradorPorId(userId, cadastros)
        : log.usuarioId;
      const titulo = tituloEventoHistorico(log.acao, log.camposAlterados);
      const destaque = titulo === "Proposta confirmada" || titulo === "Proposta criada";
      eventos.push({
        data: log.dataHora,
        titulo,
        usuario,
        destaque,
      });
    }

    if (resumo) {
      for (const parcela of resumo.parcelas) {
        for (const pagamento of parcela.pagamentos) {
          if (pagamento.confirmacao !== "Confirmado") continue;
          eventos.push({
            data: pagamento.dataPagamento,
            titulo: `Pagamento da ${parcela.numero}ª parcela`,
            usuario: identificadorColaboradorPorId(pagamento.registradoPorId, cadastros),
            destaque: true,
          });
        }
      }
    }

    if (detalhe.proposta.status === "Aceita") {
      const jaConfirmou = eventos.some((item) => item.titulo === "Proposta confirmada");
      if (!jaConfirmou) {
        eventos.push({
          data: detalhe.proposta.criadoEm,
          titulo: "Proposta confirmada",
          usuario: detalhe.advogadoResponsavelRotulo,
          destaque: true,
        });
      }
    }

    eventos.sort((a, b) => b.data.localeCompare(a.data));
    return eventos;
  }, [cadastros, detalhe, resumo]);

  const percentualPago = useMemo(() => {
    if (!resumo) return 0;
    const acordado = centavos(resumo.valorAcordado);
    if (acordado <= 0) return 0;
    return Math.round((centavos(resumo.valorPagoConfirmado) / acordado) * 100);
  }, [resumo]);

  const parcelasVisiveis = useMemo(() => {
    if (!resumo) return [];
    const ordenadas = [...resumo.parcelas].sort((a, b) => a.numero - b.numero);
    if (parcelasExpandidas) return ordenadas;
    return ordenadas.slice(0, PARCELAS_PREVIEW);
  }, [parcelasExpandidas, resumo]);

  const historicoVisivel = useMemo(() => {
    if (historicoCompleto) return historico;
    return historico.slice(0, HISTORICO_PREVIEW);
  }, [historico, historicoCompleto]);

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

  function editarProposta() {
    if (!detalhe) return;
    if (detalhe.proposta.status === "Em análise") {
      document.getElementById("decisao-proposta")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (detalhe.proposta.status === "Aceita") {
      setSheetParcelaAberto(true);
      document.getElementById("parcelas-negociacao")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const acoesCabecalho = (propostaStatus?: string) => (
    <div className="flex flex-wrap items-center gap-sm print:hidden">
      <Button type="button" variant="ghost" size="sm" onClick={onVoltar}>
        <Icon icon={ArrowLeft} size="sm" aria-hidden />
        Voltar
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        <Icon icon={Printer} size="sm" aria-hidden />
        Imprimir
      </Button>
      {podeEditar && propostaStatus && (propostaStatus === "Em análise" || propostaStatus === "Aceita") ? (
        <Button type="button" size="sm" onClick={editarProposta}>
          Editar proposta
        </Button>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <>
        <PageHeader
          icon={Handshake}
          title="Proposta de negociação"
          description="Carregando detalhes da proposta."
          actions={acoesCabecalho()}
        />
        <PageContent>
          <SkeletonCardList rows={6} label="Carregando proposta" />
        </PageContent>
      </>
    );
  }

  if (!detalhe) {
    return (
      <>
        <PageHeader
          icon={Handshake}
          title="Proposta de negociação"
          description="Proposta não encontrada."
          actions={acoesCabecalho()}
        />
        <PageContent>
          <p className="text-body-sm text-on-surface-variant">Verifique o identificador ou volte à listagem.</p>
        </PageContent>
      </>
    );
  }

  const { proposta } = detalhe;
  const codigo = rotuloProposta(proposta);
  const totalParcelas = resumo?.parcelas.length ?? proposta.quantidadeParcelas ?? 0;
  const metas: { icon: typeof Building2; rotulo: string; valor: string }[] = [
    { icon: Building2, rotulo: "Condomínio", valor: detalhe.condominioNome },
    { icon: DoorOpen, rotulo: "Unidade", valor: detalhe.unidadeIdentificacao },
    { icon: User, rotulo: "Devedor", valor: detalhe.devedorNome },
    { icon: Scale, rotulo: "Advogado responsável", valor: detalhe.advogadoResponsavelRotulo },
    { icon: Calendar, rotulo: "Criada em", valor: formatarData(proposta.criadoEm) },
  ];

  return (
    <>
      <PageHeader
        icon={Handshake}
        title={
          <span className="inline-flex flex-wrap items-center gap-sm">
            Proposta de negociação #{codigo}
            <Badge variant={badgeStatus[proposta.status] ?? "secondary"}>
              {rotuloStatusExibicao(proposta.status)}
            </Badge>
          </span>
        }
        description="Acompanhe os detalhes da negociação, parcelas e histórico de pagamentos."
        actions={acoesCabecalho(proposta.status)}
      />

      <PageContent className="print:text-on-surface">
        <div className="flex flex-col gap-lg">
          <dl className="grid gap-md min-[768px]:grid-cols-2 min-[1024px]:grid-cols-5">
            {metas.map((item) => (
              <div
                key={item.rotulo}
                className="min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm"
              >
                <dt className="flex items-center gap-xs text-label-sm text-primary-container">
                  <Icon icon={item.icon} size="sm" className="text-primary-container" aria-hidden />
                  {item.rotulo}
                </dt>
                <dd className="mt-xs truncate text-body-md font-medium text-on-surface">{item.valor}</dd>
              </div>
            ))}
          </dl>

          <section
            className="rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card"
            aria-label="Resumo financeiro da negociação"
          >
            <div className="grid grid-cols-2 gap-x-xl gap-y-lg min-[900px]:grid-cols-4">
              <div className="min-w-0">
                <ResumoMetrica rotulo="Valor negociado" valor={formatarMoeda(proposta.valorProposto)} />
                <LinhaDescontoNegociado detalhe={detalhe} proposta={proposta} />
              </div>
              {resumo ? (
                <>
                  <ResumoMetrica
                    rotulo={`Total recebido · ${percentualPago}%`}
                    valor={formatarMoeda(resumo.valorPagoConfirmado)}
                    valorClassName="text-status-settled"
                  />
                  <ResumoMetrica rotulo="Saldo restante" valor={formatarMoeda(resumo.saldoRestante)} />
                  <ResumoMetrica rotulo="Parcelas" valor={String(totalParcelas)} />
                </>
              ) : null}
            </div>

            {resumo ? (
              totalParcelas > 0 ? (
                <div className="mt-lg flex flex-col gap-sm">
                  <BarraProgressoParcelas resumo={resumo} />
                  <LegendaParcelas resumo={resumo} />
                </div>
              ) : null
            ) : (
              <p className="mt-md text-body-sm text-on-surface-variant">Cronograma ainda não gerado.</p>
            )}
          </section>

          <section
            id="parcelas-negociacao"
            aria-label="Parcelas da negociação"
            className="flex min-w-0 flex-col gap-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <h2 className="flex items-center gap-sm text-headline-sm text-on-surface">
                <Icon icon={ListOrdered} size="md" className="text-primary-container" aria-hidden />
                Parcelas
              </h2>
              {proposta.status === "Aceita" && podeRegistrar ? (
                <div className="flex flex-wrap gap-sm print:hidden">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!resumo?.parcelas.length}
                    onClick={() => setSheetPagamentoAberto(true)}
                  >
                    <Icon icon={Wallet} size="sm" aria-hidden />
                    Registrar pagamento
                  </Button>
                  <Button type="button" size="sm" onClick={() => setSheetParcelaAberto(true)}>
                    <Icon icon={Plus} size="sm" aria-hidden />
                    Adicionar parcela
                  </Button>
                </div>
              ) : null}
            </div>
            <Table showExport={false} fitContainer aria-label="Parcelas da negociação">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead align="right">Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!resumo || resumo.parcelas.length === 0 ? (
                  <TableEmpty colSpan={4}>
                    <EmptyState
                      icon={<Icon icon={ListOrdered} size="lg" />}
                      title="Nenhuma parcela prevista"
                      description="Confirme o acordo ou gere o cronograma."
                      action={
                        proposta.status === "Aceita" && podeRegistrar ? (
                          <Button type="button" size="sm" onClick={() => setSheetParcelaAberto(true)}>
                            <Icon icon={Plus} size="sm" aria-hidden />
                            Adicionar parcela
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableEmpty>
                ) : (
                  parcelasVisiveis.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell>{parcela.numero}ª parcela</TableCell>
                      <TableCell className="tabular-nums">{formatarData(parcela.vencimentoEm)}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatarMoeda(parcela.valorPrevisto)}</TableCell>
                      <TableCell align="right">
                        <CelulaStatusPagamento parcela={parcela} cadastros={cadastros} className="items-end" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {resumo && resumo.parcelas.length > PARCELAS_PREVIEW ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-xs text-brass hover:text-brass"
                  onClick={() => setParcelasExpandidas((value) => !value)}
                >
                  {parcelasExpandidas ? "Mostrar menos" : `Ver todas as ${resumo.parcelas.length} parcelas`}
                  <Icon icon={ChevronDown} size="sm" aria-hidden />
                </Button>
              </div>
            ) : null}
          </section>

          <section aria-label="Histórico da negociação" className="flex min-w-0 flex-col gap-md">
            <div className="flex items-center justify-between gap-sm">
              <h2 className="flex items-center gap-sm text-headline-sm text-on-surface">
                <Icon icon={ScrollText} size="md" className="text-primary-container" aria-hidden />
                Histórico
              </h2>
              {historico.length > HISTORICO_PREVIEW ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-xs text-brass hover:text-brass"
                  onClick={() => setHistoricoCompleto((value) => !value)}
                >
                  {historicoCompleto ? "Resumir" : "Ver completo"}
                  <Icon icon={ArrowRight} size="sm" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card p-lg shadow-card">
              {historico.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">Sem eventos auditados ainda.</p>
              ) : (
                <ol className="relative flex flex-col gap-lg border-l-2 border-primary-fixed/35 py-xs pl-md">
                  {historicoVisivel.map((item, index) => (
                    <li key={`${item.data}-${item.titulo}-${index}`} className="relative pl-sm">
                      <span
                        className={[
                          "absolute -left-[calc(0.5rem+7px)] top-[0.45rem] size-2.5 rounded-full",
                          item.destaque
                            ? "bg-status-settled"
                            : "border-2 border-border-subtle bg-surface-card",
                        ].join(" ")}
                        aria-hidden
                      />
                      <p className="text-body-md font-medium leading-snug text-on-surface">{item.titulo}</p>
                      <p className="mt-xs text-body-md leading-snug text-on-surface-variant">
                        <time dateTime={item.data.slice(0, 10)} className="tabular-nums">
                          {formatarData(item.data.slice(0, 10))}
                        </time>
                        {item.usuario && item.usuario !== "—" ? (
                          <>
                            <span className="px-xs text-on-surface-variant/50" aria-hidden>
                              ·
                            </span>
                            <span>{item.usuario}</span>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

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

        </div>
      </PageContent>

      {proposta.status === "Aceita" ? (
        <>
          <Sheet open={sheetParcelaAberto} onOpenChange={setSheetParcelaAberto}>
            <SheetContent aria-labelledby={`${formId}-nova-parcela-titulo`}>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={Plus} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${formId}-nova-parcela-titulo`}>Adicionar parcela</SheetTitle>
                    <SheetDescription>Inclua uma parcela prevista no cronograma do acordo.</SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <AcordoAcompanhamentoBlock
                propostaId={proposta.id}
                podeRegistrar={podeRegistrar}
                podeCorrigir={podeEditar}
                modo="nova-parcela"
                onFechar={() => setSheetParcelaAberto(false)}
                onConcluido={() => setSheetParcelaAberto(false)}
                onChanged={() => {
                  void refetch();
                  onRecarregar();
                  void carregar();
                }}
              />
            </SheetContent>
          </Sheet>

          <Sheet open={sheetPagamentoAberto} onOpenChange={setSheetPagamentoAberto}>
            <SheetContent aria-labelledby={`${formId}-pagamento-titulo`}>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={Wallet} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${formId}-pagamento-titulo`}>Registrar pagamento</SheetTitle>
                    <SheetDescription>Informe valor, data e confirmação do recebimento.</SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <AcordoAcompanhamentoBlock
                propostaId={proposta.id}
                podeRegistrar={podeRegistrar}
                podeCorrigir={podeEditar}
                modo="registrar-pagamento"
                onFechar={() => setSheetPagamentoAberto(false)}
                onConcluido={() => setSheetPagamentoAberto(false)}
                onChanged={() => {
                  void refetch();
                  onRecarregar();
                  void carregar();
                }}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : null}
    </>
  );
}

function ResumoMetrica({
  rotulo,
  valor,
  valorClassName = "text-on-surface",
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  valorClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-label-sm text-on-surface-variant">{rotulo}</p>
      <p className={`mt-xs text-headline-lg font-bold tabular-nums tracking-tight ${valorClassName}`}>{valor}</p>
    </div>
  );
}

function LinhaDescontoNegociado({
  detalhe,
  proposta,
}: {
  detalhe: PropostaNegociacaoDetalhe;
  proposta: PropostaNegociacao;
}) {
  const base = proposta.valorDividaOriginal;
  if (!base) return null;

  const percentual = Number(detalhe.descontoPercent);
  if (percentual > 0) {
    const rotuloPercentual = Number.isInteger(percentual)
      ? String(percentual)
      : percentual.toFixed(2).replace(/\.?0+$/, "");
    return (
      <p className="mt-sm text-body-sm">
        <span className="font-medium text-badge-success-emphasis">Desconto de {rotuloPercentual}%</span>
        <span className="text-on-surface-variant"> sobre {formatarMoeda(base)}</span>
      </p>
    );
  }

  if (detalhe.descontoConcedido && detalhe.descontoConcedido !== "R$ 0,00") {
    return (
      <p className="mt-sm text-body-sm">
        <span className="font-medium text-badge-success-emphasis">Desconto de {detalhe.descontoConcedido}</span>
        <span className="text-on-surface-variant"> sobre {formatarMoeda(base)}</span>
      </p>
    );
  }

  return null;
}

function BarraProgressoParcelas({ resumo }: { resumo: ResumoAcordo }) {
  const parcelas = [...resumo.parcelas].sort((a, b) => a.numero - b.numero);
  return (
    <div className="flex w-full gap-1" role="img" aria-label="Progresso das parcelas">
      {parcelas.map((parcela) => {
        const paga = parcela.status === "Paga";
        const vencida = parcela.status === "Vencida";
        const classe = paga
          ? "bg-status-settled"
          : vencida
            ? "bg-status-critical"
            : "bg-primary-fixed/35";
        return (
          <div
            key={parcela.id}
            className={`h-2.5 min-w-0 flex-1 rounded-full ${classe}`}
            title={`Parcela ${parcela.numero}`}
          />
        );
      })}
    </div>
  );
}

function LegendaParcelas({ resumo }: { resumo: ResumoAcordo }) {
  return (
    <ul className="flex flex-wrap items-center gap-md text-body-sm text-on-surface-variant">
      <li className="flex items-center gap-xs">
        <span className="size-2 rounded-full bg-status-settled" aria-hidden />
        {resumo.parcelasPagas} pagas
      </li>
      <li className="flex items-center gap-xs">
        <span className="size-2 rounded-full bg-primary-container" aria-hidden />
        {resumo.parcelasPendentes} pendentes
      </li>
      <li className="flex items-center gap-xs">
        <span className="size-2 rounded-full bg-status-critical" aria-hidden />
        {resumo.parcelasVencidas} vencidas
      </li>
    </ul>
  );
}

function CelulaStatusPagamento({
  parcela,
  cadastros,
  className,
}: {
  parcela: ParcelaAcordoEnriquecida;
  cadastros: Cadastros;
  className?: string;
}) {
  const pago = parcela.status === "Paga";
  const vencida = parcela.status === "Vencida";
  const confirmado = parcela.pagamentos.find((item) => item.confirmacao === "Confirmado");

  const rotulo = pago ? "Paga" : vencida ? "Vencida" : "Pendente";

  return (
    <div className={`flex flex-col gap-xs ${className ?? ""}`}>
      {pago || vencida ? (
        <Badge variant={pago ? "success" : "error"} className="w-fit gap-1 font-medium">
          <span aria-hidden>●</span>
          {rotulo}
        </Badge>
      ) : (
        <Badge variant="neutral" className="w-fit">
          {rotulo}
        </Badge>
      )}
      {pago && confirmado ? (
        <p className="text-body-sm text-on-surface-variant">
          {formatarDataHoraPagamento(confirmado.dataPagamento)} ·{" "}
          {identificadorColaboradorPorId(confirmado.registradoPorId, cadastros)}
        </p>
      ) : null}
    </div>
  );
}
