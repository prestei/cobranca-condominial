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
    {
      substituirEstadoCatalogo,
      exportarEstadoCatalogoParaPersistencia,
      registrarAgendadorPersistenciaCatalogo,
    },
    { postgresOperacionalDisponivel },
    { carregarIdentidadeDoPostgres },
    {
      carregarCatalogoSnapshotDoPostgres,
      salvarCatalogoSnapshotNoPostgres,
      agendarPersistenciaCatalogoNoPostgres,
    },
  ] = await Promise.all([
    import("@/data/catalogo"),
    import("@/lib/db/operacional-pg"),
    import("@/lib/db/identity-pg"),
    import("@/lib/db/catalogo-snapshot-pg"),
  ]);

  registrarAgendadorPersistenciaCatalogo(agendarPersistenciaCatalogoNoPostgres);

  if (!(await postgresOperacionalDisponivel())) {
    throw new Error("[pg] Tabelas indisponíveis. Rode: npm run db:migrate");
  }

  const identidade = await carregarIdentidadeDoPostgres();
  const snapshot = await carregarCatalogoSnapshotDoPostgres();

  if (snapshot) {
    // Identidade (role/"user") vem só do PostgreSQL — nunca do snapshot/seed em memória.
    substituirEstadoCatalogo({
      ...snapshot,
      ...(identidade
        ? {
            cargos: identidade.cargos,
            usuarios: identidade.usuarios,
          }
        : {}),
    });
    console.info("[pg] Catálogo hidratado do PostgreSQL (catalogo_snapshot + identidade).");
    return;
  }

  // Primeira subida: identidade do banco; operacional vazio (sem seed de demonstração).
  if (!identidade) {
    throw new Error("[pg] Identidade indisponível no PostgreSQL na primeira subida.");
  }
  const atual = exportarEstadoCatalogoParaPersistencia();
  const inicial = {
    ...atual,
    condominios: [],
    unidades: [],
    responsaveis: [],
    vinculos: [],
    debitos: [],
    atendimentos: [],
    propostasNegociacao: [],
    encaminhamentosJuridicos: [],
    documentosJuridicos: [],
    parcelasAcordo: [],
    pagamentosAcordo: [],
    atribuicoesCobranca: [],
    importacoes: [],
    auditoria: [],
    notificacoesInternas: [],
    notificacaoFalhas: [],
    cargos: identidade.cargos,
    usuarios: identidade.usuarios,
  };
  substituirEstadoCatalogo(inicial);
  const gravou = await salvarCatalogoSnapshotNoPostgres(exportarEstadoCatalogoParaPersistencia());
  if (!gravou) {
    throw new Error("[pg] Não foi possível gravar o snapshot inicial no PostgreSQL.");
  }
  console.info("[pg] Snapshot inicial do catálogo gravado no PostgreSQL.");
}
