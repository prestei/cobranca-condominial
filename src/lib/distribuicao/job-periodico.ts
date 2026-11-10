import {
  dispararDistribuicaoAutomaticaSeAtivada,
  obterConfigDistribuicaoAutomatica,
  type ExecutarDistribuicaoAutomaticaResultado,
} from "@/lib/distribuicao/service";

/** Intervalo de verificação da fila sem RE (distribuição automática). */
export const INTERVALO_DISTRIBUICAO_AUTOMATICA_MS = 5 * 60 * 1000;

let agendado = false;
let emExecucao = false;

export type ResultadoCicloDistribuicaoAutomatica = {
  executou: boolean;
  motivo?: "desativada" | "em_andamento" | "sem_gestor" | "erro";
  resultado?: ExecutarDistribuicaoAutomaticaResultado;
  erro?: string;
};

/**
 * Um ciclo: se a distribuição automática estiver ativada, atribui RE às cobranças sem responsável.
 * Idempotente e seguro para sobreposição (ignora se já houver ciclo em andamento).
 */
export async function executarCicloDistribuicaoAutomatica(): Promise<ResultadoCicloDistribuicaoAutomatica> {
  if (emExecucao) {
    return { executou: false, motivo: "em_andamento" };
  }
  if (!obterConfigDistribuicaoAutomatica().ativada) {
    return { executou: false, motivo: "desativada" };
  }

  emExecucao = true;
  try {
    const resultado = await dispararDistribuicaoAutomaticaSeAtivada(0, {
      userAgent: "job-distribuicao-automatica/5m",
    });
    if (!resultado) {
      return { executou: false, motivo: "desativada" };
    }
    if (resultado.atribuidas > 0) {
      console.info(
        `[distribuicao] ciclo automático: ${resultado.atribuidas} cobrança(s) atribuída(s) de ${resultado.pendentesAntes} pendente(s).`,
      );
    }
    return { executou: true, resultado };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.error("[distribuicao] ciclo automático falhou:", mensagem);
    return { executou: false, motivo: "erro", erro: mensagem };
  } finally {
    emExecucao = false;
  }
}

/** Agenda verificação a cada 5 minutos (uma vez por processo). */
export function agendarDistribuicaoAutomaticaPeriodica(): void {
  if (agendado) return;
  if (process.env.NODE_ENV === "test") return;
  agendado = true;

  // Primeiro ciclo após subida (não bloqueia o boot).
  setTimeout(() => {
    void executarCicloDistribuicaoAutomatica();
  }, 15_000).unref?.();

  setInterval(() => {
    void executarCicloDistribuicaoAutomatica();
  }, INTERVALO_DISTRIBUICAO_AUTOMATICA_MS).unref?.();

  console.info(
    `[distribuicao] verificação automática agendada a cada ${INTERVALO_DISTRIBUICAO_AUTOMATICA_MS / 60_000} min.`,
  );
}

/** Apenas para testes. */
export function resetAgendamentoDistribuicaoAutomaticaParaTestes(): void {
  agendado = false;
  emExecucao = false;
}
