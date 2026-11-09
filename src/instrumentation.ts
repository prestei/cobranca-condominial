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

  const [
    { substituirEstadoCatalogo, exportarEstadoCatalogoParaPersistencia },
    { postgresOperacionalDisponivel },
    { carregarIdentidadeDoPostgres },
    {
      carregarCatalogoSnapshotDoPostgres,
      salvarCatalogoSnapshotNoPostgres,
    },
  ] = await Promise.all([
    import("@/data/catalogo"),
    import("@/lib/db/operacional-pg"),
    import("@/lib/db/identity-pg"),
    import("@/lib/db/catalogo-snapshot-pg"),
  ]);

  if (!(await postgresOperacionalDisponivel())) {
    throw new Error("[pg] Tabelas indisponíveis. Rode: npm run db:migrate");
  }

  const identidade = await carregarIdentidadeDoPostgres();
  const snapshot = await carregarCatalogoSnapshotDoPostgres();

  if (snapshot) {
    substituirEstadoCatalogo({
      ...snapshot,
      ...(identidade
        ? {
            cargos: identidade.cargos.length ? identidade.cargos : snapshot.cargos,
            usuarios: identidade.usuarios.length ? identidade.usuarios : snapshot.usuarios,
          }
        : {}),
    });
    console.info("[pg] Catálogo hidratado do PostgreSQL (catalogo_snapshot + identidade).");
    return;
  }

  // Primeira subida: garante identidade no banco e grava snapshot inicial.
  const atual = exportarEstadoCatalogoParaPersistencia();
  const inicial = {
    ...atual,
    ...(identidade ? { cargos: identidade.cargos, usuarios: identidade.usuarios } : {}),
  };
  substituirEstadoCatalogo(inicial);
  const gravou = await salvarCatalogoSnapshotNoPostgres(exportarEstadoCatalogoParaPersistencia());
  if (!gravou) {
    throw new Error("[pg] Não foi possível gravar o snapshot inicial no PostgreSQL.");
  }
  console.info("[pg] Snapshot inicial do catálogo gravado no PostgreSQL.");
}
