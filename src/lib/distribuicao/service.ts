import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  proximoNumero,
  registrarAuditoria,
  setAtribuicoesCobranca,
  unidadeNaFilaCobrancaAtiva,
  type AtribuicaoCobranca,
  type Unidade,
} from "@/data/catalogo";
import { codigoReDoUsuario, listarAtendentesComRe, usuarioEhAtendente } from "@/lib/colaboradores/re";
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

/** Estratégias de distribuição automática (protótipo — carga equilibrada como padrão). */
export type DistribuicaoAutomaticaEstrategia = "carga" | "rodizio" | "condominio" | "volume";

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

export function distribuicaoAutomaticaDisponivel(): true {
  return true;
}

export function obterConfigDistribuicaoAutomatica(): DistribuicaoAutomaticaConfig {
  return { ...configDistribuicaoAutomatica };
}

export function atualizarConfigDistribuicaoAutomatica(
  userId: number,
  patch: Partial<DistribuicaoAutomaticaConfig>,
): DistribuicaoAutomaticaConfig {
  assertGerenciaDistribuicao(userId);
  configDistribuicaoAutomatica = {
    ...configDistribuicaoAutomatica,
    ...patch,
    estrategia: patch.estrategia ?? configDistribuicaoAutomatica.estrategia,
    ativada: patch.ativada ?? configDistribuicaoAutomatica.ativada,
  };
  return obterConfigDistribuicaoAutomatica();
}

export function contarUnidadesAguardandoAtribuicao(userId: number): number {
  return listarFilaCobranca(userId).filter((item) => !item.codigoRe).length;
}

function escolherReCargaEquilibrada(userId: number, contagem: Map<number, number>) {
  const atendentes = listarAtendentesComRe();
  if (atendentes.length === 0) {
    throw new DistribuicaoServiceError("Não há atendentes com RE cadastrado.", 400);
  }
  let escolhido = atendentes[0];
  let menor = contagem.get(escolhido.id) ?? 0;
  for (const atendente of atendentes) {
    const total = contagem.get(atendente.id) ?? 0;
    if (total < menor) {
      menor = total;
      escolhido = atendente;
    }
  }
  void userId;
  return escolhido;
}

export function executarDistribuicaoAutomatica(
  userId: number,
  meta?: { ip?: string; userAgent?: string },
): ExecutarDistribuicaoAutomaticaResultado {
  assertGerenciaDistribuicao(userId);
  if (!configDistribuicaoAutomatica.ativada) {
    throw new DistribuicaoServiceError("Ative a distribuição automática antes de distribuir.", 400);
  }

  const pendentes = listarFilaCobranca(userId).filter((item) => !item.codigoRe);
  if (pendentes.length === 0) {
    return { atribuidas: 0, ignoradasMesmoResponsavel: 0, atribuicoes: [], pendentesAntes: 0 };
  }

  const carteiras = listarCarteiraPorRe(userId);
  const contagem = new Map<number, number>(carteiras.map((item) => [item.atendenteId, item.totalUnidades]));

  let atribuidas = 0;
  let ignoradasMesmoResponsavel = 0;
  const atribuicoes: AtribuicaoCobranca[] = [];

  for (const item of pendentes) {
    const atendente =
      configDistribuicaoAutomatica.estrategia === "carga"
        ? escolherReCargaEquilibrada(userId, contagem)
        : escolherReCargaEquilibrada(userId, contagem);

    const resultado = distribuirUnidades(
      userId,
      {
        unidadeIds: [item.unidadeId],
        codigoRe: atendente.codigoRe,
        motivo: "Distribuição automática",
      },
      meta,
    );
    atribuidas += resultado.atribuidas;
    ignoradasMesmoResponsavel += resultado.ignoradasMesmoResponsavel;
    atribuicoes.push(...resultado.atribuicoes);
    if (resultado.atribuidas > 0) {
      contagem.set(atendente.id, (contagem.get(atendente.id) ?? 0) + resultado.atribuidas);
    }
  }

  return {
    atribuidas,
    ignoradasMesmoResponsavel,
    atribuicoes,
    pendentesAntes: pendentes.length,
  };
}

export function podeGerenciarDistribuicao(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function assertGerenciaDistribuicao(userId: number) {
  if (!podeGerenciarDistribuicao(userId)) {
    throw new DistribuicaoServiceError("Sem permissão para distribuir ou redistribuir cobranças.", 403);
  }
}

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
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
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function normalizarRe(codigoRe: string) {
  return codigoRe.trim().toUpperCase();
}

function resolverAtendentePorRe(codigoRe: string) {
  const alvo = normalizarRe(codigoRe);
  if (!alvo) {
    throw new DistribuicaoServiceError("Informe o RE do atendente.", 400);
  }
  const usuario = getCadastros().usuarios.find(
    (item) => codigoReDoUsuario(item)?.toUpperCase() === alvo,
  );
  if (!usuario || !usuarioEhAtendente(usuario)) {
    throw new DistribuicaoServiceError("RE não encontrado ou colaborador não é atendente.", 404);
  }
  return usuario;
}

function rotuloReUsuarioId(userId: number | null | undefined) {
  if (!userId) return null;
  const usuario = getCadastros().usuarios.find((item) => item.id === userId);
  return usuario ? codigoReDoUsuario(usuario) : null;
}

function montarHistoricoItem(registro: AtribuicaoCobranca): HistoricoAtribuicaoItem {
  const cadastros = getCadastros();
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

export function listarCarteiraPorRe(userId: number): CarteiraReResumo[] {
  assertGerenciaDistribuicao(userId);
  const idsEscopo = new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
  const contagem = new Map<number, number>();

  for (const registro of getCadastros().atribuicoesCobranca) {
    if (registro.encerradoEm) continue;
    if (!idsEscopo.has(registro.unidadeId)) continue;
    const unidade = getCadastros().unidades.find((item) => item.id === registro.unidadeId);
    if (!unidade || !unidadeElegivelDistribuicao(unidade)) continue;
    contagem.set(registro.atendenteId, (contagem.get(registro.atendenteId) ?? 0) + 1);
  }

  return listarAtendentesComRe().map((atendente) => ({
    atendenteId: atendente.id,
    codigoRe: atendente.codigoRe,
    totalUnidades: contagem.get(atendente.id) ?? 0,
  }));
}

export function listarHistoricoAtribuicoes(
  userId: number,
  opcoes?: { unidadeId?: number; limit?: number },
): HistoricoAtribuicaoItem[] {
  assertGerenciaDistribuicao(userId);
  const idsEscopo = new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
  const limit = Math.min(200, Math.max(1, opcoes?.limit ?? 50));

  let lista = getCadastros().atribuicoesCobranca.filter((item) => idsEscopo.has(item.unidadeId));
  if (opcoes?.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === opcoes.unidadeId);
  }
  return lista
    .sort((a, b) => b.atribuidoEm.localeCompare(a.atribuidoEm))
    .slice(0, limit)
    .map(montarHistoricoItem);
}

export function distribuirUnidades(
  userId: number,
  input: DistribuirInput,
  meta?: { ip?: string; userAgent?: string },
): DistribuirResultado {
  assertGerenciaDistribuicao(userId);

  const ids = [...new Set(input.unidadeIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) {
    throw new DistribuicaoServiceError("Selecione ao menos uma cobrança (unidade).", 400);
  }

  const atendente = resolverAtendentePorRe(input.codigoRe);
  const motivo = (input.motivo ?? "").trim();
  const erros: string[] = [];
  const plano: Array<{ unidadeId: number; vigente: AtribuicaoCobranca | undefined }> = [];

  for (const unidadeId of ids) {
    const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
    if (!unidade) {
      erros.push(`Unidade ${unidadeId} não encontrada.`);
      continue;
    }
    try {
      unidadeNoEscopo(userId, unidade);
    } catch {
      erros.push(`Unidade ${unidade.identificacao} fora do escopo.`);
      continue;
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
  const cadastros = getCadastros();
  let nextId = proximoNumero(cadastros.atribuicoesCobranca.map((item) => item.id));

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
      atribuidoPorId: userId,
      atribuidoEm: agora,
      encerradoEm: null,
      motivo,
      anteriorAtendenteId: item.vigente?.atendenteId ?? null,
    };
    nextId += 1;
    atualizados.push(novo);
    novosRegistros.push(novo);

    registrarAuditoria(
      {
        entidade: "collection_assignment",
        registroId: String(novo.id),
        acao: item.vigente ? "UPDATE" : "INSERT",
        dadosAnteriores: item.vigente ? rotuloReUsuarioId(item.vigente.atendenteId) ?? "" : "",
        dadosNovos: codigoReDoUsuario(atendente) ?? "",
        camposAlterados: "atendente_id, anterior_atendente_id, motivo",
      },
      userId,
      meta,
    );
  }

  if (novosRegistros.length === 0 && ignoradasMesmoResponsavel === ids.length) {
    return { atribuidas: 0, ignoradasMesmoResponsavel, atribuicoes: [] };
  }

  setAtribuicoesCobranca(atualizados);

  return {
    atribuidas: novosRegistros.length,
    ignoradasMesmoResponsavel,
    atribuicoes: novosRegistros,
  };
}
