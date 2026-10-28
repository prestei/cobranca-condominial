import {
  acimaDoLimite,
  debitoAbertoNaData,
  diasDeAtraso,
  escopoCondominios,
  escopoUnidades,
  faixasAtraso,
  getCadastros,
  grupoDebito,
  gruposDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  type Debito,
} from "@/data/catalogo";
import { listarAtendimentos } from "@/lib/atendimentos/service";
import type { DebitoIndicadores } from "@/lib/debitos/indicadores";
import { somarValorAtualizadoSemDuplicata } from "@/lib/debitos/indicadores";
import { listarDebitos, obterIndicadoresDebitos } from "@/lib/debitos/service";
import { resumoFilaCobranca } from "@/lib/fila/service";
import { listarEncaminhamentosJuridicos } from "@/lib/juridico/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { listarRetornosAgenda, type RetornoAgendaItem } from "@/lib/retornos/service";

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type DashboardPerfil = "administradora" | "atendente" | "advogado";

export type DashboardRetornoResumo = {
  atrasados: number;
  hoje: number;
  proximos: number;
  concluidos: number;
};

export type DashboardRetornoLinha = {
  atendimentoId: string;
  dataPrevista: string;
  unidadeLabel: string;
  codigoRe: string | null;
  proximaAcao: string;
  situacaoAgenda: RetornoAgendaItem["situacaoAgenda"];
};

export type DashboardRankingCondominio = {
  condominioId: number;
  nome: string;
  valor: number;
  unidadesDevedoras: number;
  unidadesTotal: number;
};

export type DashboardSerieDia = {
  dia: string;
  quantidade: number;
};

export type DashboardDistribuicaoValor = {
  nome: string;
  valor: number;
  percentual: number | null;
};

export type DashboardAdvogadoBarra = {
  nome: string;
  valor: number;
  ateLimite: number;
  acimaLimite: number;
};

export type DashboardOperacaoSemana = {
  periodo: { inicio: string; fim: string };
  contatos: number;
  responderam: number;
  taxaResposta: number | null;
  unidadesContatadas: number;
  retornosPendentes: number;
  serie: DashboardSerieDia[];
};

type DashboardComum = {
  perfil: DashboardPerfil;
  dataBase: string;
  limiteDias: number;
  cargoNome: string;
};

export type DashboardAdministradora = DashboardComum & {
  perfil: "administradora";
  indicadores: DebitoIndicadores;
  fila: { emCobranca: number; semResponsavel: number; retornosHoje: number };
  operacao: DashboardOperacaoSemana;
  retornos: { resumo: DashboardRetornoResumo; itens: DashboardRetornoLinha[] };
  rankingCondominio: DashboardRankingCondominio[];
  porGrupo: DashboardDistribuicaoValor[];
  porFaixa: DashboardDistribuicaoValor[];
  porAdvogado: DashboardAdvogadoBarra[];
  parteJuridicaPercentual: number | null;
};

export type DashboardAtendente = DashboardComum & {
  perfil: "atendente";
  fila: { emCobranca: number; semResponsavel: number; retornosHoje: number };
  atendimentosHoje: number;
  operacao: DashboardOperacaoSemana;
  retornos: { resumo: DashboardRetornoResumo; itens: DashboardRetornoLinha[] };
  indicadores: DebitoIndicadores | null;
};

export type DashboardAdvogado = DashboardComum & {
  perfil: "advogado";
  condominios: { total: number; itens: { id: number; nome: string; status: string }[] };
  indicadores: DebitoIndicadores | null;
  rankingCondominio: DashboardRankingCondominio[];
  juridico: {
    total: number;
    abertos: number;
    porStatus: { status: string; quantidade: number }[];
  } | null;
  retornos: { resumo: DashboardRetornoResumo; itens: DashboardRetornoLinha[] } | null;
};

export type DashboardPayload = DashboardAdministradora | DashboardAtendente | DashboardAdvogado;

function resolverPerfil(userId: number): DashboardPerfil {
  const perm = permissoesDoUsuarioId(userId);
  if (temPermissao(perm, "usuarios", "criar")) return "administradora";
  if (temPermissao(perm, "juridico", "ler") && temPermissao(perm, "condominios", "ler")) return "advogado";
  return "atendente";
}

function cargoDoUsuario(userId: number) {
  const cadastros = getCadastros();
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  const cargo = usuario ? cadastros.cargos.find((item) => item.id === usuario.cargoId) : undefined;
  return cargo?.nome ?? "—";
}

function periodoUltimos7Dias(hoje: string) {
  const fim = hoje;
  const inicioDate = new Date(`${hoje}T12:00:00`);
  inicioDate.setDate(inicioDate.getDate() - 6);
  const inicio = inicioDate.toISOString().slice(0, 10);
  return { inicio, fim };
}

function calcularOperacaoSemana(userId: number, hoje: string): DashboardOperacaoSemana {
  const periodo = periodoUltimos7Dias(hoje);
  const atendimentos = listarAtendimentos(userId).filter((item) => {
    const dia = item.dataHora.slice(0, 10);
    return dia >= periodo.inicio && dia <= periodo.fim;
  });
  const responderam = atendimentos.filter((item) => item.respondeu === "Sim").length;
  const taxaResposta = atendimentos.length ? (responderam / atendimentos.length) * 100 : null;
  const unidadesContatadas = new Set(atendimentos.map((item) => item.unidadeId)).size;
  const retornosAgenda = listarRetornosAgenda(userId, { estado: "pendente" });
  const retornosPendentes = retornosAgenda.total;

  const serieMapa = new Map<string, number>();
  for (const item of atendimentos) {
    const dia = item.dataHora.slice(0, 10);
    serieMapa.set(dia, (serieMapa.get(dia) ?? 0) + 1);
  }
  const serie = [...serieMapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, quantidade]) => ({ dia, quantidade }));

  return {
    periodo,
    contatos: atendimentos.length,
    responderam,
    taxaResposta,
    unidadesContatadas,
    retornosPendentes,
    serie,
  };
}

function debitosAbertosEscopo(userId: number, dataBase: string): Debito[] {
  return listarDebitos(userId).filter((item) => debitoAbertoNaData(item, dataBase));
}

function rankingCondominios(userId: number, dataBase: string, limiteDias: number): DashboardRankingCondominio[] {
  const cadastros = getCadastros();
  const debitos = debitosAbertosEscopo(userId, dataBase);
  const idsCondominio = new Set(debitos.map((item) => item.condominioId));

  return [...idsCondominio]
    .map((condominioId) => {
      const itens = debitos.filter((item) => item.condominioId === condominioId);
      const unidadesTotal = escopoUnidades(cadastros, userId).filter((item) => item.condominioId === condominioId)
        .length;
      return {
        condominioId,
        nome: cadastros.condominios.find((item) => item.id === condominioId)?.nome ?? "—",
        valor: somarValorAtualizadoSemDuplicata(itens),
        unidadesDevedoras: new Set(itens.map((item) => item.unidadeId)).size,
        unidadesTotal,
      };
    })
    .sort((a, b) => b.valor - a.valor);
}

function distribuicaoGrupos(debitos: Debito[], totalAberto: number): DashboardDistribuicaoValor[] {
  return gruposDebito.map((grupo) => {
    const itens = debitos.filter((item) => grupoDebito(item.descricao) === grupo);
    const valor = somarValorAtualizadoSemDuplicata(itens);
    return {
      nome: grupo,
      valor,
      percentual: totalAberto > 0 ? (valor / totalAberto) * 100 : null,
    };
  });
}

function distribuicaoFaixas(debitos: Debito[], dataBase: string, totalAberto: number): DashboardDistribuicaoValor[] {
  return faixasAtraso.map((faixa) => {
    const itens = debitos.filter((item) => {
      const dias = diasDeAtraso(item.dataVencimento, dataBase);
      return dias >= faixa.min && dias <= faixa.max;
    });
    const valor = somarValorAtualizadoSemDuplicata(itens);
    return {
      nome: faixa.label,
      valor,
      percentual: totalAberto > 0 ? (valor / totalAberto) * 100 : null,
    };
  });
}

function distribuicaoAdvogados(
  userId: number,
  debitos: Debito[],
  dataBase: string,
  limiteDias: number,
): DashboardAdvogadoBarra[] {
  const cadastros = getCadastros();
  const condominios = escopoCondominios(cadastros, userId);
  const advogados = [...new Set(condominios.flatMap((item) => item.advogados))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return advogados
    .map((nome) => {
      const ids = new Set(
        condominios.filter((item) => item.advogados.includes(nome)).map((item) => item.id),
      );
      const itens = debitos.filter((item) => ids.has(item.condominioId));
      const valor = somarValorAtualizadoSemDuplicata(itens);
      const ateLimite = somarValorAtualizadoSemDuplicata(
        itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase), limiteDias)),
      );
      const acimaLimite = somarValorAtualizadoSemDuplicata(
        itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase), limiteDias)),
      );
      return { nome, valor, ateLimite, acimaLimite };
    })
    .filter((linha) => linha.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

function mapRetornoItens(itens: RetornoAgendaItem[], limite = 12): DashboardRetornoLinha[] {
  return itens.slice(0, limite).map((item) => ({
    atendimentoId: item.atendimentoId,
    dataPrevista: item.dataPrevista,
    unidadeLabel: item.unidadeLabel,
    codigoRe: item.codigoRe,
    proximaAcao: item.proximaAcao || item.observacao || "—",
    situacaoAgenda: item.situacaoAgenda,
  }));
}

function retornosPendentesDashboard(userId: number) {
  const resultado = listarRetornosAgenda(userId, { estado: "pendente" }, { page: 1, pageSize: 50 });
  const itensOrdenados = [...resultado.itens].sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  return {
    resumo: resultado.resumo,
    itens: mapRetornoItens(itensOrdenados),
  };
}

function indicadoresEscopo(userId: number, dataBase: string, limiteDias: number): DebitoIndicadores | null {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "ler")) return null;
  const cadastros = getCadastros();
  const unidadesCarteira = escopoUnidades(cadastros, userId).length;
  return obterIndicadoresDebitos(userId, { dataBase, limiteDias, unidadesCarteira, filtros: {} });
}

function resumoJuridico(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", "ler")) return null;
  const lista = listarEncaminhamentosJuridicos(userId);
  const abertos = lista.filter((item) => item.status !== "Arquivado" && item.status !== "Retornado à cobrança amigável");
  const mapa = new Map<string, number>();
  for (const item of lista) {
    mapa.set(item.status, (mapa.get(item.status) ?? 0) + 1);
  }
  const porStatus = [...mapa.entries()]
    .map(([status, quantidade]) => ({ status, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  return { total: lista.length, abertos: abertos.length, porStatus };
}

export function obterDashboard(userId: number, input?: { dataBase?: string; limiteDias?: number }): DashboardPayload {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "dashboard", "ler")) {
    throw new DashboardServiceError("Sem permissão para consultar o dashboard.", 403);
  }

  const dataBase = input?.dataBase?.trim() || hojeIso();
  const limiteDias =
    input?.limiteDias != null && Number.isFinite(input.limiteDias) && input.limiteDias >= 1
      ? input.limiteDias
      : LIMITE_AMIGAVEL_DIAS;
  const hoje = hojeIso();
  const perfil = resolverPerfil(userId);
  const cargoNome = cargoDoUsuario(userId);
  const comum = { dataBase, limiteDias, cargoNome };

  if (perfil === "administradora") {
    const indicadores = indicadoresEscopo(userId, dataBase, limiteDias);
    if (!indicadores) {
      throw new DashboardServiceError("Indicadores de inadimplência indisponíveis para este perfil.", 500);
    }
    const debitos = debitosAbertosEscopo(userId, dataBase);
    const totalAberto = indicadores.totalAtualizado;
    const parteJuridicaPercentual = totalAberto > 0 ? (indicadores.acimaLimite / totalAberto) * 100 : null;

    return {
      perfil,
      ...comum,
      indicadores,
      fila: resumoFilaCobranca(userId),
      operacao: calcularOperacaoSemana(userId, hoje),
      retornos: retornosPendentesDashboard(userId),
      rankingCondominio: rankingCondominios(userId, dataBase, limiteDias).slice(0, 12),
      porGrupo: distribuicaoGrupos(debitos, totalAberto),
      porFaixa: distribuicaoFaixas(debitos, dataBase, totalAberto),
      porAdvogado: distribuicaoAdvogados(userId, debitos, dataBase, limiteDias),
      parteJuridicaPercentual,
    };
  }

  if (perfil === "atendente") {
    const atendimentosHoje = listarAtendimentos(userId).filter((item) => item.dataHora.slice(0, 10) === hoje).length;
    return {
      perfil,
      ...comum,
      fila: resumoFilaCobranca(userId),
      atendimentosHoje,
      operacao: calcularOperacaoSemana(userId, hoje),
      retornos: retornosPendentesDashboard(userId),
      indicadores: indicadoresEscopo(userId, dataBase, limiteDias),
    };
  }

  const cadastros = getCadastros();
  const condominiosEscopo = escopoCondominios(cadastros, userId);
  const retornos =
    temPermissao(perm, "atendimentos", "ler") ? retornosPendentesDashboard(userId) : null;

  return {
    perfil: "advogado",
    ...comum,
    condominios: {
      total: condominiosEscopo.length,
      itens: condominiosEscopo.map((item) => ({ id: item.id, nome: item.nome, status: item.status })),
    },
    indicadores: indicadoresEscopo(userId, dataBase, limiteDias),
    rankingCondominio: rankingCondominios(userId, dataBase, limiteDias).slice(0, 10),
    juridico: resumoJuridico(userId),
    retornos,
  };
}
