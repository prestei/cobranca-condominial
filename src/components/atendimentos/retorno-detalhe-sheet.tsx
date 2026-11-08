"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CalendarClock, Check, ClipboardList, History, XCircle } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { FormField, Input, Textarea } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import { formatarData, type Atendimento } from "@/data/catalogo";
import { aplicarAtendimentoSalvo } from "@/lib/atendimentos/sync-cliente";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { HistoricoRetornoEvento, RetornoAgendaItem } from "@/lib/retornos/service";
import { usePermissao } from "@/hooks/use-permissao";

const rotuloSituacao: Record<string, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos dias",
  agendado: "Compromisso futuro",
  concluido: "Realizado",
  cancelado: "Cancelado",
};

const rotuloHistorico: Record<HistoricoRetornoEvento["tipo"], string> = {
  agendamento: "Agendamento",
  reprogramacao: "Reprogramação",
  atualizacao: "Atualização",
  conclusao: "Realizado",
  cancelamento: "Cancelamento",
};

type Props = {
  item: RetornoAgendaItem | null;
  onClose: () => void;
  onAtualizado: () => void;
  onNovaTentativa: (unidadeId: number) => void;
};

export function RetornoDetalheSheet({ item, onClose, onAtualizado, onNovaTentativa }: Props) {
  const formId = useId();
  const { toast } = useToast();
  const { pode } = usePermissao();
  const podeEditar = pode("atendimentos", "editar");

  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [historico, setHistorico] = useState<HistoricoRetornoEvento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [dataPrevista, setDataPrevista] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [descricao, setDescricao] = useState("");

  const [confirmarRealizado, setConfirmarRealizado] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [justificativaCancelamento, setJustificativaCancelamento] = useState("");

  const aberto = item !== null;
  const pendente = item && item.situacaoAgenda !== "concluido" && item.situacaoAgenda !== "cancelado";

  const carregarDetalhes = useCallback(async () => {
    if (!item) return;
    setCarregando(true);
    try {
      const [resAtendimento, resHistorico] = await Promise.all([
        fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}`, { credentials: "same-origin" }),
        fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}/historico-retorno`, {
          credentials: "same-origin",
        }),
      ]);
      const payloadAtendimento = (await resAtendimento.json()) as { atendimento?: Atendimento; error?: string };
      const payloadHistorico = (await resHistorico.json()) as { eventos?: HistoricoRetornoEvento[]; error?: string };
      if (resAtendimento.ok && payloadAtendimento.atendimento) {
        setAtendimento(payloadAtendimento.atendimento);
      }
      if (resHistorico.ok) {
        setHistorico(payloadHistorico.eventos ?? []);
      } else {
        setHistorico([]);
      }
    } catch {
      toast({ variant: "error", title: "Não foi possível carregar o retorno." });
    } finally {
      setCarregando(false);
    }
  }, [item, toast]);

  useEffect(() => {
    if (!item) {
      setAtendimento(null);
      setHistorico([]);
      return;
    }
    const dataLocal = item.dataPrevista.includes("T") ? item.dataPrevista.slice(0, 16) : item.dataPrevista;
    setDataPrevista(dataLocal);
    setProximaAcao(item.proximaAcao);
    setDescricao(item.observacao);
    setJustificativaCancelamento("");
    void carregarDetalhes();
  }, [item, carregarDetalhes]);

  async function salvarEdicao() {
    if (!item || !pendente || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}/retorno`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataProximaAcao: dataPrevista, proximaAcao, descricao }),
      });
      const payload = (await response.json()) as { atendimento?: Atendimento; error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Falha ao salvar", description: payload.error });
        return;
      }
      if (payload.atendimento) {
        aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
        setAtendimento(payload.atendimento);
      }
      toast({ variant: "success", title: "Retorno atualizado" });
      onAtualizado();
      void carregarDetalhes();
    } catch {
      toast({ variant: "error", title: "Erro de comunicação" });
    } finally {
      setSalvando(false);
    }
  }

  async function reprogramar() {
    if (!item || !pendente || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}/reprogramar-retorno`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataProximaAcao: dataPrevista, proximaAcao, descricao }),
      });
      const payload = (await response.json()) as { atendimento?: Atendimento; error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Falha ao reprogramar", description: payload.error });
        return;
      }
      if (payload.atendimento) aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
      toast({ variant: "success", title: "Retorno reprogramado", description: "O histórico anterior foi preservado." });
      onAtualizado();
      onClose();
    } catch {
      toast({ variant: "error", title: "Erro de comunicação" });
    } finally {
      setSalvando(false);
    }
  }

  async function marcarRealizado() {
    if (!item || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}/concluir-retorno`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { atendimento?: Atendimento; error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível concluir", description: payload.error });
        return;
      }
      if (payload.atendimento) aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
      toast({ variant: "success", title: "Retorno marcado como realizado" });
      setConfirmarRealizado(false);
      onAtualizado();
      onClose();
    } catch {
      toast({ variant: "error", title: "Erro de comunicação" });
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarRetorno() {
    if (!item || salvando) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/atendimentos/${encodeURIComponent(item.atendimentoId)}/cancelar-retorno`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: justificativaCancelamento }),
      });
      const payload = (await response.json()) as { atendimento?: Atendimento; error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível cancelar", description: payload.error });
        return;
      }
      if (payload.atendimento) aplicarAtendimentoSalvo(payload.atendimento, "UPDATE");
      toast({ variant: "success", title: "Retorno cancelado" });
      setConfirmarCancelar(false);
      onAtualizado();
      onClose();
    } catch {
      toast({ variant: "error", title: "Erro de comunicação" });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Sheet open={aberto} onOpenChange={(open) => !open && onClose()}>
        <SheetContent aria-labelledby={`${formId}-titulo`}>
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon>
                <Icon icon={CalendarClock} size="md" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id={`${formId}-titulo`}>
                  {item ? `${item.condominioNome} · ${item.unidadeLabel}` : "Retorno"}
                </SheetTitle>
                <SheetDescription>
                  {item ? (
                    <>
                      RE {item.codigoRe ?? "—"} · {formatarProximoRetorno(item.dataPrevista)}
                    </>
                  ) : (
                    "Detalhes do compromisso"
                  )}
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>

          <SheetBody className="gap-md">
            {item ? (
              <div className="flex flex-wrap items-center gap-sm">
                <Badge
                  variant={
                    item.situacaoAgenda === "atrasado"
                      ? "error"
                      : item.situacaoAgenda === "concluido"
                        ? "success"
                        : item.situacaoAgenda === "cancelado"
                          ? "secondary"
                          : "primary"
                  }
                >
                  {rotuloSituacao[item.situacaoAgenda] ?? item.situacaoAgenda}
                </Badge>
                <span className="text-body-sm text-on-surface-variant">
                  Atendimento de origem: {formatarData(item.dataHoraAtendimento)} · {item.atendimentoAutorNome}
                </span>
              </div>
            ) : null}

            {pendente && podeEditar ? (
              <div className="flex flex-col gap-md border-t border-outline-variant pt-md">
                <FormField label="Data e horário" htmlFor={`${formId}-data`} required>
                  <Input
                    id={`${formId}-data`}
                    type="datetime-local"
                    value={dataPrevista}
                    onChange={(event) => setDataPrevista(event.target.value)}
                  />
                </FormField>
                <FormField label="Descrição do retorno" htmlFor={`${formId}-acao`} required>
                  <Input id={`${formId}-acao`} value={proximaAcao} onChange={(event) => setProximaAcao(event.target.value)} />
                </FormField>
                <FormField label="Observações" htmlFor={`${formId}-obs`}>
                  <Textarea id={`${formId}-obs`} value={descricao} onChange={(event) => setDescricao(event.target.value)} />
                </FormField>
              </div>
            ) : item ? (
              <dl className="grid gap-sm text-body-md text-on-surface">
                <div>
                  <dt className="text-body-sm text-on-surface-variant">Previsto</dt>
                  <dd>{formatarProximoRetorno(item.dataPrevista)}</dd>
                </div>
                <div>
                  <dt className="text-body-sm text-on-surface-variant">Descrição</dt>
                  <dd>{item.proximaAcao || "—"}</dd>
                </div>
                {item.observacao ? (
                  <div>
                    <dt className="text-body-sm text-on-surface-variant">Observações</dt>
                    <dd>{item.observacao}</dd>
                  </div>
                ) : null}
                {item.retornoCanceladoMotivo ? (
                  <div>
                    <dt className="text-body-sm text-on-surface-variant">Justificativa do cancelamento</dt>
                    <dd>{item.retornoCanceladoMotivo}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <section className="border-t border-outline-variant pt-md">
              <h3 className="flex items-center gap-sm text-title-sm font-semibold text-on-surface">
                <Icon icon={History} size="sm" />
                Histórico do retorno
              </h3>
              {carregando ? (
                <p className="mt-sm text-body-sm text-on-surface-variant">Carregando…</p>
              ) : historico.length === 0 ? (
                <p className="mt-sm text-body-sm text-on-surface-variant">Nenhum evento registrado.</p>
              ) : (
                <ol className="mt-sm flex max-h-48 flex-col gap-sm overflow-y-auto">
                  {historico.map((evento) => (
                    <li key={evento.id} className="rounded-md border border-outline-variant bg-surface-subtle/50 p-sm text-body-sm">
                      <p className="font-medium text-on-surface">
                        {rotuloHistorico[evento.tipo]} · {formatarData(evento.dataHora)}
                      </p>
                      <p className="text-on-surface-variant">{evento.autorNome}</p>
                      {evento.dataPrevista ? (
                        <p className="text-on-surface-variant">Previsto: {formatarProximoRetorno(evento.dataPrevista)}</p>
                      ) : null}
                      {evento.proximaAcao ? <p>{evento.proximaAcao}</p> : null}
                      {evento.justificativa ? (
                        <p className="text-on-surface-variant">Motivo: {evento.justificativa}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {atendimento ? (
              <section className="rounded-md border border-outline-variant bg-surface-subtle/40 p-sm text-body-sm">
                <p className="font-medium text-on-surface">Atendimento vinculado</p>
                <p className="text-on-surface-variant">
                  {atendimento.canal} · {atendimento.status} · {formatarData(atendimento.dataHora)}
                </p>
                {atendimento.assunto ? <p>{atendimento.assunto}</p> : null}
              </section>
            ) : null}

            {confirmarCancelar ? (
              <FormField label="Justificativa do cancelamento" htmlFor={`${formId}-justificativa`} required>
                <Textarea
                  id={`${formId}-justificativa`}
                  value={justificativaCancelamento}
                  onChange={(event) => setJustificativaCancelamento(event.target.value)}
                />
              </FormField>
            ) : null}
          </SheetBody>

          <SheetFooter className="flex-col gap-sm sm:flex-row sm:flex-wrap">
            {item && pode("atendimentos", "criar") ? (
              <Button type="button" variant="ghost" onClick={() => onNovaTentativa(item.unidadeId)}>
                <Icon icon={ClipboardList} size="sm" />
                Nova tentativa
              </Button>
            ) : null}
            {pendente && podeEditar ? (
              <>
                <Button type="button" variant="secondary" disabled={salvando} onClick={() => void salvarEdicao()}>
                  Salvar alterações
                </Button>
                <Button type="button" variant="secondary" disabled={salvando} onClick={() => void reprogramar()}>
                  Reprogramar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={salvando}
                  onClick={() => {
                    if (confirmarCancelar && justificativaCancelamento.trim()) {
                      void cancelarRetorno();
                    } else {
                      setConfirmarCancelar(true);
                    }
                  }}
                >
                  <Icon icon={XCircle} size="sm" />
                  {confirmarCancelar ? "Confirmar cancelamento" : "Cancelar retorno"}
                </Button>
                <Button type="button" disabled={salvando} onClick={() => setConfirmarRealizado(true)}>
                  <Icon icon={Check} size="sm" />
                  Marcar realizado
                </Button>
              </>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmarRealizado}
        onOpenChange={setConfirmarRealizado}
        title="Marcar retorno como realizado?"
        description="A data agendada e o atendimento original permanecem no histórico."
        confirmLabel={salvando ? "Salvando…" : "Confirmar"}
        onConfirm={() => {
          if (!salvando) void marcarRealizado();
        }}
      />

    </>
  );
}
