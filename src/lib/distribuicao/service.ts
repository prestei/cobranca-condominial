import { agoraIso, debitoEmAberto, escopoCondominios, escopoUnidades, unidadeNaFilaCobrancaAtiva, type AtribuicaoCobranca, type Cadastros, type Unidade } from "@/data/catalogo";
import { loadCadastrosForScope, loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { getRequestCatalog, mutateRequestCatalog, runWithCatalogAsync } from "@/lib/db/request-catalog";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  listCollectionAssignments,
  nextCollectionAssignmentId,
  updateCollectionAssignment,
  upsertCollectionAssignments,
  createCollectionAssignment,
} from "@/lib/db/repositories/collection-repository";
import { getAppSetting, setAppSetting } from "@/lib/db/repositories/app-setting-repository";
import { invalidateServiceContextCache } from "@/lib/db/service-context";
import { codigoReDoUsuario, listarAtendentesComRe, usuarioEhAtendente } from "@/lib/colaboradores/re-server";
import { emitirNotificacaoCobrancaAtribuida } from "@/lib/notificacoes/service";
import { listarFilaCobranca } from "@/lib/fila/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class DistribuicaoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type CarteiraReResumo = {
  atendenteId: number;
  codigoRe: string;
  totalUnidades: number;
};

export type HistoricoAtribuicaoItem = {
  id: number;
  unidadeId: number;
  identificacaoUnidade: string;
  condominioNome: string;
  codigoReAtual: string;
  codigoReAnterior: string | null;
  codigoReAutor: string | null;
  atribuidoEm: string;
  encerradoEm: string | null;
  motivo: string;
};

export type DistribuirInput = {
  unidadeIds: number[];
  codigoRe: string;
  motivo?: string;
};

export type DistribuirResultado = {
  atribuidas: number;
  ignoradasMesmoResponsavel: number;
  atribuicoes: AtribuicaoCobranca[];
};

/** Estratégias de distribuição automática da fila sem responsável. */
export {
  descricaoEstrategiaDistribuicaoAutomatica,
  type DistribuicaoAutomaticaEstrategia,
} from "@/lib/distribuicao/labels";
import type { DistribuicaoAutomaticaEstrategia } from "@/lib/distribuicao/labels";

type AtendenteComRe = { id: number; codigoRe: string };

export type DistribuicaoAutomaticaConfig = {
  ativada: boolean;
  estrategia: DistribuicaoAutomaticaEstrategia;
};

export type DistribuicaoAutomaticaOpcoes = {
  estrategia?: DistribuicaoAutomaticaEstrategia;
};

export type ExecutarDistribuicaoAutomaticaResultado = DistribuirResultado & {
  pendentesAntes: number;
};

let configDistribuicaoAutomatica: DistribuicaoAutomaticaConfig = {
  ativada: true,
  estrategia: "carga",
};

let cadastrosMemoria: Cadastros | null = null;

/**
 * Carrega o catálogo operacional e executa o fluxo dentro de `runWithCatalog`,
 * para helpers que ainda leem via `getCadastros()` (ex.: listarAtendentesComRe).
 */
async function withDistribuicaoCatalog<T>(fn: () => Promise<T>): Promise<T> {
  const carregado = await loadFullOperationalCadastros();
  return runWithCatalogAsync(carregado, async () => {
    cadastrosMemoria = getRequestCatalog();
    return fn();
  });
}

function cadastrosAtual(): Cadastros {
  if (!cadastrosMemoria) {
    throw new DistribuicaoServiceError("Catálogo operacional não carregado.", 503);
  }
  return cadastrosMemoria;
}

function sincronizarAtribuicoesMemoria(atribuicoesCobranca: AtribuicaoCobranca[]) {
  const next = { ...cadastrosAtual(), atribuicoesCobranca };
  cadastrosMemoria = next;
  try {
    mutateRequestCatalog(() => next);
  } catch {
    // Fora de ALS (testes sem request catalog): memória local basta.
  }
}

export function distribuicaoAutomaticaDisponivel(): true {
  return true;
}

export function obterConfigDistribuicaoAutomatica(): DistribuicaoAutomaticaConfig {
  return { ...configDistribuicaoAutomatica };
}

export async function atualizarConfigDistribuicaoAutomatica(
  userId: number,
  patch: Partial<DistribuicaoAutomaticaConfig>,
): Promise<DistribuicaoAutomaticaConfig> {
  assertGerenciaDistribuicao(userId);
  configDistribuicaoAutomatica = {
    ...configDistribuicaoAutomatica,
    ...patch,
    estrategia: patch.estrategia ?? configDistribuicaoAutomatica.estrategia,
    ativada: patch.ativada ?? configDistribuicaoAutomatica.ativada,
  };
  const snapshot = obterConfigDistribuicaoAutomatica();
  await setAppSetting("distribuicao_automatica", snapshot);
  return snapshot;
}

const ESTRATEGIAS_VALIDAS: DistribuicaoAutomaticaEstrategia[] = ["carga", "rodizio", "condominio", "volume"];

export async function hidratarConfigDistribuicaoDoPostgres(): Promise<void> {
  const valor = await getAppSetting("distribuicao_automatica");
  if (!valor || typeof valor !== "object") return;
  const raw = valor as Record<string, unknown>;
  const estrategia = raw.estrategia;
  configDistribuicaoAutomatica = {
    ativada: raw.ativada !== false,
    estrategia:
      typeof estrategia === "string" && ESTRATEGIAS_VALIDAS.includes(estrategia as DistribuicaoAutomaticaEstrategia)
        ? (estrategia as DistribuicaoAutomaticaEstrategia)
        : configDistribuicaoAutomatica.estrategia,
  };
}

export async function contarUnidadesAguardandoAtribuicao(userId: number): Promise<number> {
  const fila = await listarFilaCobranca(userId);
  return fila.filter((item) => !item.codigoRe).length;
}

function listarAtendentesAtivosComRe(): AtendenteComRe[] {
  const atendentes = listarAtendentesComRe();
  if (atendentes.length === 0) {
    throw new DistribuicaoServiceError("Não há atendentes com RE cadastrado.", 400);
  }
  return atendentes;
}

function compararAtendentesPorRe(a: AtendenteComRe, b: AtendenteComRe) {
  return a.codigoRe.localeCompare(b.codigoRe, "pt-BR");
}

function escolherReCargaEquilibrada(contagem: Map<number, number>): AtendenteComRe {
  const atendentes = listarAtendentesAtivosComRe();
  let escolhido = atendentes[0];
  let menor = contagem.get(escolhido.id) ?? 0;
  for (const atendente of atendentes) {
    const total = contagem.get(atendente.id) ?? 0;
    if (total < menor || (total === menor && compararAtendentesPorRe(atendente, escolhido) < 0)) {
      menor = total;
      escolhido = atendente;
    }
  }
  return escolhido;
}

function escolherReRodizio(indice: number): { atendente: AtendenteComRe; proximoIndice: number } {
  const atendentes = listarAtendentesAtivosComRe();
  const atendente = atendentes[indice % atendentes.length];
  return { atendente, proximoIndice: indice + 1 };
}

function contagemUnidadesPorReNoCondominio(userId: number, condominioId: number): Map<number, number> {
  const idsEscopo = new Set(escopoUnidades(cadastrosAtual(), userId).map((item) => item.id));
  const contagem = new Map<number, number>();
  for (const registro of cadastrosAtual().atribuicoesCobranca) {
    if (registro.encerradoEm) continue;
    if (!idsEscopo.has(registro.unidadeId)) continue;
    const unidade = cadastrosAtual().unidades.find((item) => item.id === registro.unidadeId);
    if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
    if (unidade.condominioId !== condominioId) continue;
    contagem.set(registro.atendenteId, (contagem.get(registro.atendenteId) ?? 0) + 1);
  }
  return contagem;
}

function escolherRePorCondominio(
  userId: number,
  condominioId: number,
  contagemGlobal: Map<number, number>,
): AtendenteComRe {
  const atendentes = listarAtendentesAtivosComRe();
  const noCondominio = contagemUnidadesPorReNoCondominio(userId, condominioId);
  let melhor: AtendenteComRe | null = null;
  let maior = 0;
  for (const atendente of atendentes) {
    const total = noCondominio.get(atendente.id) ?? 0;
    if (total > maior) {
      maior = total;
      melhor = atendente;
    } else if (total === maior && total > 0 && melhor && compararAtendentesPorRe(atendente, melhor) < 0) {
      melhor = atendente;
    }
  }
  if (maior > 0 && melhor) return melhor;
  return escolherReCargaEquilibrada(contagemGlobal);
}

function valorNumericoInadimplenciaUnidade(unidadeId: number): number {
  let total = 0;
  for (const debito of cadastrosAtual().debitos) {
    if (debito.unidadeId !== unidadeId || !debitoEmAberto(debito)) continue;
    const valor = Number.parseFloat(debito.valorAtualizado || debito.valor || "0");
    if (Number.isFinite(valor)) total += valor;
  }
  return total;
}

function montarVolumeInadimplenciaPorRe(userId: number): Map<number, number> {
  const idsEscopo = new Set(escopoUnidades(cadastrosAtual(), userId).map((item) => item.id));
  const volume = new Map<number, number>();
  for (const registro of cadastrosAtual().atribuicoesCobranca) {
    if (registro.encerradoEm) continue;
    if (!idsEscopo.has(registro.unidadeId)) continue;
    const unidade = cadastrosAtual().unidades.find((item) => item.id === registro.unidadeId);
    if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
    volume.set(
      registro.atendenteId,
      (volume.get(registro.atendenteId) ?? 0) + valorNumericoInadimplenciaUnidade(registro.unidadeId),
    );
  }
  return volume;
}

function escolherReVolumeEquilibrado(contagemVolume: Map<number, number>, unidadeId: number): AtendenteComRe {
  const atendentes = listarAtendentesAtivosComRe();
  const valorNova = valorNumericoInadimplenciaUnidade(unidadeId);
  let escolhido = atendentes[0];
  let menorProjecao = (contagemVolume.get(escolhido.id) ?? 0) + valorNova;
  for (const atendente of atendentes) {
    const projecao = (contagemVolume.get(atendente.id) ?? 0) + valorNova;
    if (
      projecao < menorProjecao ||
      (projecao === menorProjecao && compararAtendentesPorRe(atendente, escolhido) < 0)
    ) {
      menorProjecao = projecao;
      escolhido = atendente;
    }
  }
  return escolhido;
}

function escolherReParaUnidadePendente(
  userId: number,
  item: { unidadeId: number; condominioId: number },
  estrategia: DistribuicaoAutomaticaEstrategia,
  contagemUnidades: Map<number, number>,
  contagemVolume: Map<number, number>,
  indiceRodizio: number,
): { atendente: AtendenteComRe; proximoIndiceRodizio: number } {
  switch (estrategia) {
    case "rodizio": {
      const { atendente, proximoIndice } = escolherReRodizio(indiceRodizio);
      return { atendente, proximoIndiceRodizio: proximoIndice };
    }
    case "condominio":
      return {
        atendente: escolherRePorCondominio(userId, item.condominioId, contagemUnidades),
        proximoIndiceRodizio: indiceRodizio,
      };
    case "volume":
      return {
        atendente: escolherReVolumeEquilibrado(contagemVolume, item.unidadeId),
        proximoIndiceRodizio: indiceRodizio,
      };
    case "carga":
    default:
      return {
        atendente: escolherReCargaEquilibrada(contagemUnidades),
        proximoIndiceRodizio: indiceRodizio,
      };
  }
}

function listarCarteiraGlobalPorRe(): CarteiraReResumo[] {
  const contagem = new Map<number, number>();
  for (const registro of cadastrosAtual().atribuicoesCobranca) {
    if (registro.encerradoEm) continue;
    const unidade = cadastrosAtual().unidades.find((item) => item.id === registro.unidadeId);
    if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
    contagem.set(registro.atendenteId, (contagem.get(registro.atendenteId) ?? 0) + 1);
  }
  return listarAtendentesComRe().map((atendente) => ({
    atendenteId: atendente.id,
    codigoRe: atendente.codigoRe,
    totalUnidades: contagem.get(atendente.id) ?? 0,
  }));
}

function montarVolumeInadimplenciaGlobalPorRe(): Map<number, number> {
  const volume = new Map<number, number>();
  for (const registro of cadastrosAtual().atribuicoesCobranca) {
    if (registro.encerradoEm) continue;
    const unidade = cadastrosAtual().unidades.find((item) => item.id === registro.unidadeId);
    if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
    volume.set(
      registro.atendenteId,
      (volume.get(registro.atendenteId) ?? 0) + valorNumericoInadimplenciaUnidade(registro.unidadeId),
    );
  }
  return volume;
}

function listarUnidadesPendentesSemRe(unidadeIds?: number[]): Array<{ unidadeId: number; condominioId: number }> {
  const filtro = unidadeIds && unidadeIds.length > 0 ? new Set(unidadeIds) : null;
  const pendentes: Array<{ unidadeId: number; condominioId: number }> = [];
  for (const unidade of cadastrosAtual().unidades) {
    if (filtro && !filtro.has(unidade.id)) continue;
    if (!unidadeElegivelDistribuicao(unidade)) continue;
    if (atribuicaoVigente(unidade.id)) continue;
    pendentes.push({ unidadeId: unidade.id, condominioId: unidade.condominioId });
  }
  return pendentes;
}

/**
 * Núcleo da distribuição automática (estratégia configurada).
 * `escopoGlobal` ignora carteira do usuário — usado após importação de inadimplência.
 * `preferirAtendenteId`: quando o autor da importação é atendente com RE, prioriza a carteira dele.
 */
async function executarDistribuicaoAutomaticaCore(
  atribuidoPorId: number,
  meta: { ip?: string; userAgent?: string } | undefined,
  opcoes: {
    escopoUserId?: number;
    unidadeIds?: number[];
    escopoGlobal?: boolean;
    preferirAtendenteId?: number;
  },
): Promise<ExecutarDistribuicaoAutomaticaResultado> {
  const pendentes = opcoes.escopoGlobal
    ? listarUnidadesPendentesSemRe(opcoes.unidadeIds)
    : (await listarFilaCobranca(opcoes.escopoUserId ?? atribuidoPorId))
        .filter((item) => !item.codigoRe)
        .filter((item) => !opcoes.unidadeIds?.length || opcoes.unidadeIds.includes(item.unidadeId))
        .map((item) => ({ unidadeId: item.unidadeId, condominioId: item.condominioId }));

  if (pendentes.length === 0) {
    return { atribuidas: 0, ignoradasMesmoResponsavel: 0, atribuicoes: [], pendentesAntes: 0 };
  }

  const carteiras = opcoes.escopoGlobal
    ? listarCarteiraGlobalPorRe()
    : listarCarteiraPorRe(opcoes.escopoUserId ?? atribuidoPorId);
  const contagemUnidades = new Map<number, number>(carteiras.map((item) => [item.atendenteId, item.totalUnidades]));
  const contagemVolume = opcoes.escopoGlobal
    ? montarVolumeInadimplenciaGlobalPorRe()
    : montarVolumeInadimplenciaPorRe(opcoes.escopoUserId ?? atribuidoPorId);
  const estrategia = configDistribuicaoAutomatica.estrategia;
  const usuarioDistribuicao = opcoes.escopoGlobal
    ? resolverUsuarioGestaoDistribuicao()
    : (opcoes.escopoUserId ?? atribuidoPorId);
  const preferido =
    opcoes.preferirAtendenteId != null
      ? listarAtendentesComRe().find((item) => item.id === opcoes.preferirAtendenteId)
      : undefined;

  let atribuidas = 0;
  let ignoradasMesmoResponsavel = 0;
  const atribuicoes: AtribuicaoCobranca[] = [];
  let indiceRodizio = 0;

  for (const item of pendentes) {
    const escolhido = preferido
      ? { atendente: preferido, proximoIndiceRodizio: indiceRodizio }
      : escolherReParaUnidadePendente(
          usuarioDistribuicao,
          item,
          estrategia,
          contagemUnidades,
          contagemVolume,
          indiceRodizio,
        );
    const { atendente, proximoIndiceRodizio } = escolhido;
    indiceRodizio = proximoIndiceRodizio;

    const resultado = await distribuirUnidades(
      usuarioDistribuicao,
      {
        unidadeIds: [item.unidadeId],
        codigoRe: atendente.codigoRe,
        motivo: `Distribuição automática (${estrategia})`,
      },
      meta,
      { atribuidoPorIdOverride: atribuidoPorId, ignorarEscopo: opcoes.escopoGlobal === true },
    );
    atribuidas += resultado.atribuidas;
    ignoradasMesmoResponsavel += resultado.ignoradasMesmoResponsavel;
    atribuicoes.push(...resultado.atribuicoes);
    if (resultado.atribuicoes.length > 0) {
      contagemUnidades.set(atendente.id, (contagemUnidades.get(atendente.id) ?? 0) + resultado.atribuidas);
      if (estrategia === "volume") {
        contagemVolume.set(
          atendente.id,
          (contagemVolume.get(atendente.id) ?? 0) + valorNumericoInadimplenciaUnidade(item.unidadeId),
        );
      }
    }
  }

  return {
    atribuidas,
    ignoradasMesmoResponsavel,
    atribuicoes,
    pendentesAntes: pendentes.length,
  };
}

function resolverUsuarioGestaoDistribuicao(): number {
  const cadastros = cadastrosAtual();
  const gestor = cadastros.usuarios.find(
    (item) => item.ativo && temPermissao(permissoesDoUsuarioId(item.id, cadastros), "usuarios", "criar"),
  );
  if (!gestor) {
    throw new DistribuicaoServiceError("Não há usuário com permissão para distribuir cobranças.", 500);
  }
  return gestor.id;
}

export async function executarDistribuicaoAutomatica(
  userId: number,
  meta?: { ip?: string; userAgent?: string },
): Promise<ExecutarDistribuicaoAutomaticaResultado> {
  return withDistribuicaoCatalog(async () => {
    assertGerenciaDistribuicao(userId);
    if (!configDistribuicaoAutomatica.ativada) {
      throw new DistribuicaoServiceError("Ative a distribuição automática antes de distribuir.", 400);
    }
    return executarDistribuicaoAutomaticaCore(userId, meta, { escopoUserId: userId });
  });
}

/**
 * Se a distribuição automática estiver ativada, atribui RE às unidades sem responsável
 * (ex.: após confirmação de novas inadimplências). Não exige permissão do autor da importação.
 */
export async function dispararDistribuicaoAutomaticaSeAtivada(
  autorUserId: number,
  meta?: { ip?: string; userAgent?: string },
  opcoes?: { unidadeIds?: number[] },
): Promise<ExecutarDistribuicaoAutomaticaResultado | null> {
  if (!configDistribuicaoAutomatica.ativada) return null;
  return withDistribuicaoCatalog(async () => {
    const autor = autorUserId > 0 ? autorUserId : resolverUsuarioGestaoDistribuicao();
    const preferirAtendenteId = listarAtendentesComRe().some((item) => item.id === autor) ? autor : undefined;
    return executarDistribuicaoAutomaticaCore(autor, meta, {
      escopoGlobal: true,
      unidadeIds: opcoes?.unidadeIds,
      preferirAtendenteId,
    });
  });
}

export function podeGerenciarDistribuicao(userId: number, cadastros?: Cadastros) {
  const perm = permissoesDoUsuarioId(userId, cadastros ?? cadastrosMemoria ?? undefined);
  return temPermissao(perm, "usuarios", "criar");
}

function assertGerenciaDistribuicao(userId: number) {
  if (!podeGerenciarDistribuicao(userId, cadastrosMemoria ?? undefined)) {
    throw new DistribuicaoServiceError("Sem permissão para distribuir ou redistribuir cobranças.", 403);
  }
}

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(cadastrosAtual(), userId).map((item) => item.id));
}

function unidadeNoEscopo(userId: number, unidade: Unidade) {
  const ids = idsCondominioNoEscopo(userId);
  if (!ids.has(unidade.condominioId)) {
    throw new DistribuicaoServiceError("Unidade fora do seu escopo de acesso.", 403);
  }
}

function unidadeElegivelDistribuicao(unidade: Unidade) {
  if (unidade.status === "Inativa") return false;
  return unidadeNaFilaCobrancaAtiva(unidade);
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return cadastrosAtual().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function normalizarRe(codigoRe: string) {
  return codigoRe.trim().toUpperCase();
}

function resolverAtendentePorRe(codigoRe: string) {
  const alvo = normalizarRe(codigoRe);
  if (!alvo) {
    throw new DistribuicaoServiceError("Informe o RE do atendente.", 400);
  }
  const usuario = cadastrosAtual().usuarios.find(
    (item) => codigoReDoUsuario(item)?.toUpperCase() === alvo,
  );
  if (!usuario || !usuarioEhAtendente(usuario)) {
    throw new DistribuicaoServiceError("RE não encontrado ou colaborador não é atendente.", 404);
  }
  return usuario;
}

function rotuloReUsuarioId(userId: number | null | undefined) {
  if (!userId) return null;
  const usuario = cadastrosAtual().usuarios.find((item) => item.id === userId);
  return usuario ? codigoReDoUsuario(usuario) : null;
}

function montarHistoricoItem(registro: AtribuicaoCobranca): HistoricoAtribuicaoItem {
  const cadastros = cadastrosAtual();
  const unidade = cadastros.unidades.find((item) => item.id === registro.unidadeId);
  const condominio = unidade ? cadastros.condominios.find((item) => item.id === unidade.condominioId) : undefined;
  return {
    id: registro.id,
    unidadeId: registro.unidadeId,
    identificacaoUnidade: unidade?.identificacao ?? "—",
    condominioNome: condominio?.nome ?? "—",
    codigoReAtual: rotuloReUsuarioId(registro.atendenteId) ?? "—",
    codigoReAnterior: rotuloReUsuarioId(registro.anteriorAtendenteId),
    codigoReAutor: rotuloReUsuarioId(registro.atribuidoPorId),
    atribuidoEm: registro.atribuidoEm,
    encerradoEm: registro.encerradoEm,
    motivo: registro.motivo,
  };
}

export async function listarCarteiraPorRe(userId: number): Promise<CarteiraReResumo[]> {
  return withDistribuicaoCatalog(async () => {
    assertGerenciaDistribuicao(userId);
    const idsEscopo = new Set(escopoUnidades(cadastrosAtual(), userId).map((item) => item.id));
    const contagem = new Map<number, number>();

    for (const registro of cadastrosAtual().atribuicoesCobranca) {
      if (registro.encerradoEm) continue;
      if (!idsEscopo.has(registro.unidadeId)) continue;
      const unidade = cadastrosAtual().unidades.find((item) => item.id === registro.unidadeId);
      if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
      contagem.set(registro.atendenteId, (contagem.get(registro.atendenteId) ?? 0) + 1);
    }

    return listarAtendentesComRe().map((atendente) => ({
      atendenteId: atendente.id,
      codigoRe: atendente.codigoRe,
      totalUnidades: contagem.get(atendente.id) ?? 0,
    }));
  });
}

export async function listarHistoricoAtribuicoes(
  userId: number,
  opcoes?: { unidadeId?: number; limit?: number },
): Promise<HistoricoAtribuicaoItem[]> {
  return withDistribuicaoCatalog(async () => {
    assertGerenciaDistribuicao(userId);
    const idsEscopo = new Set(escopoUnidades(cadastrosAtual(), userId).map((item) => item.id));
    const limit = Math.min(200, Math.max(1, opcoes?.limit ?? 50));

    let lista = cadastrosAtual().atribuicoesCobranca.filter((item) => idsEscopo.has(item.unidadeId));
    if (opcoes?.unidadeId) {
      lista = lista.filter((item) => item.unidadeId === opcoes.unidadeId);
    }
    return lista
      .sort((a, b) => b.atribuidoEm.localeCompare(a.atribuidoEm))
      .slice(0, limit)
      .map(montarHistoricoItem);
  });
}

export type DistribuirUnidadesOpcoes = {
  /** Autor da atribuição na auditoria (ex.: quem confirmou a importação). */
  atribuidoPorIdOverride?: number;
  /** Permite atribuir unidades fora do escopo do gestor (disparo sistêmico pós-importação). */
  ignorarEscopo?: boolean;
};

export async function distribuirUnidades(
  userId: number,
  input: DistribuirInput,
  meta?: { ip?: string; userAgent?: string },
  opcoes?: DistribuirUnidadesOpcoes,
): Promise<DistribuirResultado> {
  return withDistribuicaoCatalog(async () => {
  assertGerenciaDistribuicao(userId);

  const ids = [...new Set(input.unidadeIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) {
    throw new DistribuicaoServiceError("Selecione ao menos uma cobrança (unidade).", 400);
  }

  const atendente = resolverAtendentePorRe(input.codigoRe);
  const motivo = (input.motivo ?? "").trim();
  const erros: string[] = [];
  const plano: Array<{ unidadeId: number; vigente: AtribuicaoCobranca | undefined }> = [];
  const atribuidoPorId = opcoes?.atribuidoPorIdOverride ?? userId;

  for (const unidadeId of ids) {
    const unidade = cadastrosAtual().unidades.find((item) => item.id === unidadeId);
    if (!unidade) {
      erros.push(`Unidade ${unidadeId} não encontrada.`);
      continue;
    }
    if (!opcoes?.ignorarEscopo) {
      try {
        unidadeNoEscopo(userId, unidade);
      } catch {
        erros.push(`Unidade ${unidade.identificacao} fora do escopo.`);
        continue;
      }
    }
    if (!unidadeElegivelDistribuicao(unidade)) {
      erros.push(`Unidade ${unidade.identificacao} não está em cobrança ativa.`);
      continue;
    }
    plano.push({ unidadeId, vigente: atribuicaoVigente(unidadeId) });
  }

  if (erros.length > 0) {
    throw new DistribuicaoServiceError("Não foi possível distribuir todas as cobranças selecionadas.", 400, erros);
  }

  const agora = agoraIso();
  let ignoradasMesmoResponsavel = 0;
  const novosRegistros: AtribuicaoCobranca[] = [];
  const cadastros = cadastrosAtual();
  let nextId = await nextCollectionAssignmentId();

  const atualizados = [...cadastros.atribuicoesCobranca];

  for (const item of plano) {
    if (item.vigente?.atendenteId === atendente.id) {
      ignoradasMesmoResponsavel += 1;
      continue;
    }

    if (item.vigente) {
      const idx = atualizados.findIndex((reg) => reg.id === item.vigente!.id);
      if (idx >= 0) {
        atualizados[idx] = { ...atualizados[idx], encerradoEm: agora, motivo: motivo || atualizados[idx].motivo };
      }
    }

    const novo: AtribuicaoCobranca = {
      id: nextId,
      unidadeId: item.unidadeId,
      atendenteId: atendente.id,
      atribuidoPorId,
      atribuidoEm: agora,
      encerradoEm: null,
      motivo,
      anteriorAtendenteId: item.vigente?.atendenteId ?? null,
    };
    nextId += 1;
    atualizados.push(novo);
    novosRegistros.push(novo);

    if (item.vigente) {
      const fechado = atualizados.find((reg) => reg.id === item.vigente!.id);
      if (fechado) await updateCollectionAssignment(fechado);
    }
    await createCollectionAssignment(novo);
    await writeAuditLog({
      entity: "collection_assignment",
      recordId: String(novo.id),
      action: item.vigente ? "UPDATE" : "INSERT",
      previousData: item.vigente ? rotuloReUsuarioId(item.vigente.atendenteId) ?? "" : "",
      newData: codigoReDoUsuario(atendente) ?? "",
      changedFields: "atendente_id, anterior_atendente_id, motivo",
      userId: atribuidoPorId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  if (novosRegistros.length === 0 && ignoradasMesmoResponsavel === ids.length) {
    return { atribuidas: 0, ignoradasMesmoResponsavel, atribuicoes: [] };
  }

  sincronizarAtribuicoesMemoria(atualizados);
  invalidateServiceContextCache();

  for (const registro of novosRegistros) {
    await emitirNotificacaoCobrancaAtribuida(registro);
  }

  return {
    atribuidas: novosRegistros.length,
    ignoradasMesmoResponsavel,
    atribuicoes: novosRegistros,
  };
  });
}
