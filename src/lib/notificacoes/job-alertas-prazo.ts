import { processarAlertasPrazoInadimplencia } from "@/lib/notificacoes/alertas-prazo-inadimplencia-service";

/** Intervalo da verificação automática de prazo de inadimplência (T03). */
export const INTERVALO_ALERTAS_PRAZO_INADIMPLENCIA_MS = 60 * 60 * 1000;

let agendado = false;
let emExecucao = false;

export type ResultadoCicloAlertasPrazo = {
  executou: boolean;
  motivo?: "em_andamento" | "erro";
  emitidas?: number;
  erro?: string;
};

export async function executarCicloAlertasPrazoInadimplencia(): Promise<ResultadoCicloAlertasPrazo> {
  if (emExecucao) {
    return { executou: false, motivo: "em_andamento" };
  }
  emExecucao = true;
  try {
    const resultado = await processarAlertasPrazoInadimplencia();
    if (resultado.emitidas > 0) {
      console.info(
        `[notificacoes] alertas de prazo: ${resultado.emitidas} notificação(ões) emitida(s) (${resultado.candidatos} marcos elegíveis).`,
      );
    }
    return { executou: true, emitidas: resultado.emitidas };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.error("[notificacoes] ciclo de alertas de prazo falhou:", mensagem);
    return { executou: false, motivo: "erro", erro: mensagem };
  } finally {
    emExecucao = false;
  }
}

export function agendarAlertasPrazoInadimplenciaPeriodicos(): void {
  if (agendado) return;
  if (process.env.NODE_ENV === "test") return;
  agendado = true;

  setTimeout(() => {
    void executarCicloAlertasPrazoInadimplencia();
  }, 30_000).unref?.();

  setInterval(() => {
    void executarCicloAlertasPrazoInadimplencia();
  }, INTERVALO_ALERTAS_PRAZO_INADIMPLENCIA_MS).unref?.();

  console.info(
    `[notificacoes] alertas de prazo agendados a cada ${INTERVALO_ALERTAS_PRAZO_INADIMPLENCIA_MS / 60_000} min.`,
  );
}

export function resetAgendamentoAlertasPrazoParaTestes(): void {
  agendado = false;
  emExecucao = false;
}
