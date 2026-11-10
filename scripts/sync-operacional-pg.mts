import { readFileSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
try {
  for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // ignore
}

if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

const { exportarEstadoCatalogoParaPersistencia, getCadastros, substituirEstadoCatalogo } = await import(
  "../src/data/catalogo.ts"
);
const { carregarCatalogoSnapshotDoPostgres, salvarCatalogoSnapshotNoPostgres } = await import(
  "../src/lib/db/catalogo-snapshot-pg.ts"
);
const { postgresOperacionalDisponivel } = await import("../src/lib/db/operacional-pg.ts");
const { carregarIdentidadeDoPostgres } = await import("../src/lib/db/identity-pg.ts");

if (!(await postgresOperacionalDisponivel())) {
  console.error("Tabelas indisponíveis. Rode: npm run db:migrate");
  process.exit(1);
}

const existente = await carregarCatalogoSnapshotDoPostgres();
const identidade = await carregarIdentidadeDoPostgres();
if (!identidade) {
  console.error("Identidade indisponível no PostgreSQL.");
  process.exit(1);
}
if (existente) {
  substituirEstadoCatalogo({
    ...existente,
    cargos: identidade.cargos,
    usuarios: identidade.usuarios,
  });
} else {
  const atual = exportarEstadoCatalogoParaPersistencia();
  substituirEstadoCatalogo({
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
  });
}

const ok = await salvarCatalogoSnapshotNoPostgres(exportarEstadoCatalogoParaPersistencia());
if (!ok) {
  console.error("Falha ao sincronizar snapshot para o PostgreSQL.");
  process.exit(1);
}

const atual = getCadastros();
console.log("Snapshot sincronizado no PostgreSQL:", {
  usuarios: atual.usuarios.length,
  cargos: atual.cargos.length,
  condominios: atual.condominios.length,
  unidades: atual.unidades.length,
  debitos: atual.debitos.length,
  importacoes: atual.importacoes.length,
  atendimentos: atual.atendimentos.length,
});
