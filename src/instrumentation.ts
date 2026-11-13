export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[pg] DATABASE_URL é obrigatória. O sistema não opera em memória nem em arquivo .data.",
      );
    }
    console.warn("[pg] DATABASE_URL ausente — modo de teste/dev sem persistência durável.");
    return;
  }

  const { ensureIdentitySeed } = await import("@/lib/db/repositories/identity-repository");
  await ensureIdentitySeed();

  const { hidratarConfigDistribuicaoDoPostgres } = await import("@/lib/distribuicao/service");
  await hidratarConfigDistribuicaoDoPostgres();

  const { hidratarConfigAlertasPrazoDoPostgres } = await import(
    "@/lib/notificacoes/alertas-prazo-inadimplencia-service"
  );
  await hidratarConfigAlertasPrazoDoPostgres();

  const { agendarDistribuicaoAutomaticaPeriodica } = await import("@/lib/distribuicao/job-periodico");
  agendarDistribuicaoAutomaticaPeriodica();

  const { agendarAlertasPrazoInadimplenciaPeriodicos } = await import("@/lib/notificacoes/job-alertas-prazo");
  agendarAlertasPrazoInadimplenciaPeriodicos();
}
