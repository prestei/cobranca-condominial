import {
  acimaDoLimite,
  advogados,
  debitoAbertoNaData,
  diasDeAtraso,
  escopoCondominios,
  escopoUnidades,
  formatarData,
  getCadastros,
  grupoDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  nomeUnidade,
  nomeUsuario,
  opcoesAdvogadosResponsaveis,
  situacaoRetorno,
  type Atendimento,
  type Condominio,
  type Debito,
} from "@/data/catalogo";
import { listarAtendimentos } from "@/lib/atendimentos/service";
import { codigoReDoUsuario, listarAtendentesComRe } from "@/lib/colaboradores/re";
import { listarDebitos } from "@/lib/debitos/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { montarPainelProdutividadePorRe } from "@/lib/relatorios/produtividade";
import { listarRetornosAgenda } from "@/lib/retornos/service";

export class RelatorioServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type RelatorioTipo = "equipe" | "produtividade" | "retornos" | "efetividade" | "carteira";

export type RelatorioFiltros = {
  busca: string;
  de: string;
  ate: string;
  advogado: string;
  condominioId: number | null;
  codigoRe: string;
  respondeu: string;
  motivo: string;
  canal: string;
  dataBase: string;
};

export type RelatorioOpcoesFiltro = {
  condominios: { id: number; nome: string }[];
  advogados: string[];
  atendentesRe: { codigoRe: string }[];
  podeFiltrarPorRe: boolean;
};

const rotuloRetorno = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos 7 dias",
  agendado: "Agendado",
} as const;

function dentro(data: string, inicio: string, fim: string) {
  const dia = data.slice(0, 10);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}

function mesSeguinte(iso: string) {
  const data = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  data.setMonth(data.getMonth() + 1);
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}`;
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function somar(itens: Array<{ valorAtualizado: string }>) {
  return itens.reduce((total, item) => total + (Number(item.valorAtualizado) || 0), 0);
}

function reDoUsuario(usuarioId: number): string {
  const usuario = getCadastros().usuarios.find((item) => item.id === usuarioId);
  if (!usuario) return "—";
  return codigoReDoUsuario(usuario) ?? "—";
}

function idsUsuarioPorRe(codigoRe: string): number[] {
  const alvo = codigoRe.trim().toUpperCase();
  return getCadastros()
    .usuarios.filter((item) => codigoReDoUsuario(item)?.toUpperCase() === alvo)
    .map((item) => item.id);
}

export function filtrosPadrao(): RelatorioFiltros {
  const hoje = hojeIso();
  const inicioDate = new Date(`${hoje}T12:00:00`);
  inicioDate.setDate(inicioDate.getDate() - 6);
  const de = inicioDate.toISOString().slice(0, 10);
  return {
    busca: "",
    de,
    ate: hoje,
    advogado: "todos",
    condominioId: null,
    codigoRe: "todos",
    respondeu: "todos",
    motivo: "todos",
    canal: "todos",
    dataBase: hoje,
  };
}

export function parseRelatorioFiltros(searchParams: URLSearchParams, tipo: RelatorioTipo): RelatorioFiltros {
  const padrao = filtrosPadrao();
  const condominioRaw = searchParams.get("condominio")?.trim();
  let condominioId: number | null = null;
  if (condominioRaw && condominioRaw !== "todos") {
    const parsed = Number(condominioRaw);
    if (Number.isFinite(parsed) && parsed > 0) condominioId = parsed;
  }

  const dataBase = searchParams.get("dataBase")?.trim() || padrao.dataBase;

  return {
    busca: searchParams.get("busca")?.trim() ?? padrao.busca,
    de: searchParams.get("de")?.trim() || (tipo === "carteira" ? "" : padrao.de),
    ate: searchParams.get("ate")?.trim() || (tipo === "carteira" ? "" : padrao.ate),
    advogado: searchParams.get("advogado")?.trim() || padrao.advogado,
    condominioId,
    codigoRe: searchParams.get("codigoRe")?.trim() || searchParams.get("atendente")?.trim() || padrao.codigoRe,
    respondeu: searchParams.get("respondeu")?.trim() || padrao.respondeu,
    motivo: searchParams.get("motivo")?.trim() || padrao.motivo,
    canal: searchParams.get("canal")?.trim() || padrao.canal,
    dataBase,
  };
}

export function assertRelatorioTipo(valor: string | null): RelatorioTipo {
  if (
    valor === "equipe" ||
    valor === "produtividade" ||
    valor === "retornos" ||
    valor === "efetividade" ||
    valor === "carteira"
  ) {
    return valor;
  }
  throw new RelatorioServiceError("Informe um tipo de relatório válido.", 400);
}

export function obterOpcoesFiltrosRelatorio(userId: number): RelatorioOpcoesFiltro {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "relatorios", "ler")) {
    throw new RelatorioServiceError("Sem permissão para consultar relatórios.", 403);
  }
  const cadastros = getCadastros();
  const condominios = escopoCondominios(cadastros, userId).map((item) => ({ id: item.id, nome: item.nome }));
  const advogadosEscopo = [...new Set(condominios.flatMap((c) => cadastros.condominios.find((x) => x.id === c.id)?.advogados ?? []))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  const advogadosLista = advogadosEscopo.length > 0 ? advogadosEscopo : opcoesAdvogadosResponsaveis(cadastros);
  const podeFiltrarPorRe = temPermissao(perm, "usuarios", "criar");
  return {
    condominios,
    advogados: advogadosLista.length ? advogadosLista : [...advogados],
    atendentesRe: listarAtendentesComRe().map((item) => ({ codigoRe: item.codigoRe })),
    podeFiltrarPorRe,
  };
}

function combinaCarteira(condominio: Condominio | undefined, filtros: RelatorioFiltros) {
  if (!condominio) return false;
  if (filtros.advogado !== "todos" && !condominio.advogados.includes(filtros.advogado)) return false;
  if (filtros.condominioId != null && condominio.id !== filtros.condominioId) return false;
  return true;
}

function condominioDaUnidade(unidadeId: string | number) {
  const unidade = getCadastros().unidades.find((item) => String(item.id) === String(unidadeId));
  if (!unidade) return undefined;
  return getCadastros().condominios.find((item) => item.id === unidade.condominioId);
}

function filtrarAtendimentos(userId: number, filtros: RelatorioFiltros, exigirPeriodo: boolean): Atendimento[] {
  const busca = filtros.busca.trim().toLocaleLowerCase("pt-BR");
  const idsRe =
    filtros.codigoRe !== "todos" && filtros.codigoRe.trim() ? new Set(idsUsuarioPorRe(filtros.codigoRe)) : null;

  return listarAtendimentos(userId).filter((item) => {
    if (exigirPeriodo && !dentro(item.dataHora, filtros.de, filtros.ate)) return false;
    const condominio = condominioDaUnidade(item.unidadeId);
    if (!combinaCarteira(condominio, filtros)) return false;
    if (idsRe && !idsRe.has(item.usuarioId)) return false;
    if (filtros.respondeu !== "todos" && item.respondeu !== filtros.respondeu) return false;
    if (filtros.motivo !== "todos" && item.motivo !== filtros.motivo) return false;
    if (filtros.canal !== "todos" && item.canal !== filtros.canal) return false;
    const texto = `${item.assunto} ${item.descricao} ${item.motivo} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase(
      "pt-BR",
    );
    return busca.length === 0 || texto.includes(busca);
  });
}

function filtrarDebitos(userId: number, filtros: RelatorioFiltros): Debito[] {
  const busca = filtros.busca.trim().toLocaleLowerCase("pt-BR");
  const dataBase = filtros.dataBase || hojeIso();
  return listarDebitos(userId).filter((item) => {
    const condominio = getCadastros().condominios.find((atual) => atual.id === item.condominioId);
    if (!combinaCarteira(condominio, filtros)) return false;
    if (!debitoAbertoNaData(item, dataBase)) return false;
    const texto = `${item.descricao} ${item.referencia} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase(
      "pt-BR",
    );
    return busca.length === 0 || texto.includes(busca);
  });
}

export function rotulosFiltrosAplicados(filtros: RelatorioFiltros, tipo: RelatorioTipo): string[] {
  const cadastros = getCadastros();
  const linhas: string[] = [];
  if (tipo === "carteira") {
    linhas.push(`Data-base: ${formatarData(filtros.dataBase)}`);
  } else {
    linhas.push(`Período: ${filtros.de ? formatarData(filtros.de) : "—"} a ${filtros.ate ? formatarData(filtros.ate) : "—"}`);
  }
  if (filtros.advogado !== "todos") linhas.push(`Advogado: ${filtros.advogado}`);
  if (filtros.condominioId != null) {
    const nome = cadastros.condominios.find((item) => item.id === filtros.condominioId)?.nome ?? String(filtros.condominioId);
    linhas.push(`Condomínio: ${nome}`);
  }
  if (filtros.codigoRe !== "todos") linhas.push(`RE: ${filtros.codigoRe}`);
  if (filtros.respondeu !== "todos") linhas.push(`Respondeu: ${filtros.respondeu}`);
  if (filtros.motivo !== "todos") linhas.push(`Motivo: ${filtros.motivo}`);
  if (filtros.canal !== "todos") linhas.push(`Meio: ${filtros.canal}`);
  if (filtros.busca.trim()) linhas.push(`Busca: ${filtros.busca.trim()}`);
  return linhas;
}

export type RelatorioExportSecao = {
  titulo: string;
  colunas: string[];
  linhas: string[][];
};

export type RelatorioExportPayload = {
  titulo: string;
  nomeArquivo: string;
  meta: { geradoEm: string; filtros: string[] };
  secoes: RelatorioExportSecao[];
};

export function montarExportRelatorio(userId: number, tipo: RelatorioTipo, filtros: RelatorioFiltros): RelatorioExportPayload {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "relatorios", "exportar")) {
    throw new RelatorioServiceError("Sem permissão para exportar relatórios.", 403);
  }
  if (!temPermissao(perm, "relatorios", "ler")) {
    throw new RelatorioServiceError("Sem permissão para consultar relatórios.", 403);
  }

  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const metaFiltros = rotulosFiltrosAplicados(filtros, tipo);
  const dataBase = filtros.dataBase || hojeIso();

  if (tipo === "retornos") {
    const resultado = listarRetornosAgenda(
      userId,
      {
        estado: "pendente",
        de: filtros.de || undefined,
        ate: filtros.ate || undefined,
        condominioId: filtros.condominioId ?? undefined,
        codigoRe: filtros.codigoRe !== "todos" ? filtros.codigoRe : undefined,
        busca: filtros.busca || undefined,
      },
      { page: 1, pageSize: 10_000 },
    );
    let itens = resultado.itens;
    if (filtros.advogado !== "todos") {
      itens = itens.filter((item) => {
        const condo = getCadastros().condominios.find((c) => c.id === item.condominioId);
        return condo?.advogados.includes(filtros.advogado);
      });
    }
    return {
      titulo: "Retornos pendentes",
      nomeArquivo: "retornos-pendentes",
      meta: { geradoEm, filtros: metaFiltros },
      secoes: [
        {
          titulo: "Retornos pendentes",
          colunas: ["Quando", "Condomínio", "Unidade", "RE", "Próxima ação", "Situação"],
          linhas: itens.map((item) => [
            formatarData(item.dataPrevista),
            item.condominioNome,
            item.unidadeLabel,
            item.codigoRe ?? "—",
            item.proximaAcao || "—",
            rotuloRetorno[
              item.situacaoAgenda === "atrasado"
                ? "atrasado"
                : item.situacaoAgenda === "hoje"
                  ? "hoje"
                  : item.situacaoAgenda === "semana"
                    ? "semana"
                    : "agendado"
            ],
          ]),
        },
      ],
    };
  }

  if (tipo === "efetividade") {
    const atendimentos = filtrarAtendimentos(userId, filtros, true);
    const cruzamento = [...new Set(atendimentos.map((item) => item.unidadeId))].map((unidadeId) => {
      const contatos = atendimentos.filter((item) => item.unidadeId === unidadeId);
      const meses = new Set(contatos.map((item) => mesSeguinte(item.dataHora)));
      const pagamento = listarDebitos(userId).find(
        (debito) =>
          String(debito.unidadeId) === String(unidadeId) &&
          debito.status === "Pago" &&
          debito.dataPagamento &&
          meses.has(debito.dataPagamento.slice(0, 7)),
      );
      const acordo = listarDebitos(userId).find(
        (debito) =>
          String(debito.unidadeId) === String(unidadeId) &&
          grupoDebito(debito.descricao) === "Acordo" &&
          meses.has(debito.dataVencimento.slice(0, 7)),
      );
      return {
        unidade: nomeUnidade(unidadeId),
        condominio: condominioDaUnidade(unidadeId)?.nome ?? "—",
        contatos: contatos.length,
        resultado: pagamento ? "Pagou no mês seguinte" : acordo ? "Acordo no mês seguinte" : "Sem resultado no mês seguinte",
      };
    });
    return {
      titulo: "Efetividade da cobrança",
      nomeArquivo: "efetividade-cobranca",
      meta: { geradoEm, filtros: metaFiltros },
      secoes: [
        {
          titulo: "Unidades contatadas",
          colunas: ["Unidade", "Condomínio", "Contatos", "Resultado"],
          linhas: cruzamento.map((linha) => [linha.unidade, linha.condominio, String(linha.contatos), linha.resultado]),
        },
      ],
    };
  }

  if (tipo === "produtividade") {
    const painel = montarPainelProdutividadePorRe(userId, filtros);
    const linhasResumo = painel.linhas.map((linha) => [
      linha.codigoRe,
      String(linha.atendimentosRegistrados),
      String(linha.retornosConcluidos),
      String(linha.negociacoesRegistradas),
      String(linha.acoesRegistradas),
      String(linha.acordosConfirmados),
      String(linha.retornosPrevistos),
      String(linha.retornosAtrasados),
      String(linha.retornosEmAberto),
      String(linha.cobrancasAtribuidas),
    ]);
    const meios = [...new Set(painel.linhas.flatMap((linha) => Object.keys(linha.porMeio)))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    const linhasMeio = painel.linhas.flatMap((linha) =>
      meios
        .filter((meio) => (linha.porMeio[meio] ?? 0) > 0)
        .map((meio) => [linha.codigoRe, meio, String(linha.porMeio[meio] ?? 0)]),
    );
    return {
      titulo: "Produtividade por RE",
      nomeArquivo: "produtividade-por-re",
      meta: { geradoEm, filtros: metaFiltros },
      secoes: [
        {
          titulo: "Indicadores por RE",
          colunas: [
            "RE",
            "Atendimentos",
            "Retornos concluídos",
            "Negociações",
            "Ações agendadas",
            "Acordos confirmados",
            "Retornos previstos",
            "Retornos atrasados",
            "Retornos em aberto",
            "Cobranças na carteira",
          ],
          linhas: linhasResumo,
        },
        {
          titulo: "Atendimentos por meio (período)",
          colunas: ["RE", "Meio", "Quantidade"],
          linhas: linhasMeio,
        },
        {
          titulo: "Definições dos indicadores",
          colunas: ["Definição"],
          linhas: painel.definicoes.map((texto) => [texto]),
        },
      ],
    };
  }

  if (tipo === "equipe") {
    const atendimentos = filtrarAtendimentos(userId, filtros, true);
    const lista = [...atendimentos].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    return {
      titulo: "Produtividade da equipe",
      nomeArquivo: "relatorio-cobranca",
      meta: { geradoEm, filtros: metaFiltros },
      secoes: [
        {
          titulo: "Atendimentos do período",
          colunas: ["Data", "Condomínio", "Unidade", "RE", "Advogado", "Meio", "Respondeu", "Motivo", "Assunto", "Retorno", "Próxima ação", "Situação"],
          linhas: lista.map((item) => {
            const condominio = condominioDaUnidade(item.unidadeId);
            return [
              formatarData(item.dataHora),
              condominio?.nome ?? "—",
              nomeUnidade(item.unidadeId),
              reDoUsuario(item.usuarioId),
              condominio?.advogados[0] ?? "—",
              item.canal,
              item.respondeu || "—",
              item.motivo || "—",
              item.assunto || "—",
              formatarData(item.dataProximaAcao),
              item.proximaAcao || "—",
              item.status,
            ];
          }),
        },
      ],
    };
  }

  const debitos = filtrarDebitos(userId, filtros);
  const listaDebitos = [...debitos].sort((a, b) => Number(b.valorAtualizado) - Number(a.valorAtualizado));
  const idsUnidadeRecorte = new Set(debitos.map((item) => String(item.unidadeId)));
  const atendimentosCarteira = filtrarAtendimentos(userId, { ...filtros, de: "", ate: "" }, false);
  for (const item of atendimentosCarteira) idsUnidadeRecorte.add(String(item.unidadeId));

  const statsPorUnidade = [...idsUnidadeRecorte]
    .map((unidadeId) => {
      const contatos = atendimentosCarteira.filter((item) => String(item.unidadeId) === String(unidadeId));
      const respostas = contatos.filter((item) => item.respondeu === "Sim").length;
      const cobrancas = debitos.filter((item) => String(item.unidadeId) === String(unidadeId));
      const valorAberto = somar(cobrancas);
      const dias =
        cobrancas.length > 0 ? Math.max(...cobrancas.map((item) => diasDeAtraso(item.dataVencimento, dataBase))) : 0;
      const ultimo = [...contatos].sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
      return {
        nome: nomeUnidade(unidadeId),
        condominio: condominioDaUnidade(unidadeId)?.nome ?? "—",
        contatos: contatos.length,
        resposta: contatos.length ? (respostas / contatos.length) * 100 : 0,
        valorAberto,
        dias,
        cobrancas: cobrancas.length,
        ultimo: ultimo ? formatarData(ultimo.dataHora) : "—",
      };
    })
    .sort((a, b) => b.valorAberto - a.valorAberto || b.contatos - a.contatos || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    titulo: "Carteira e unidades",
    nomeArquivo: "carteira-inadimplencia",
    meta: { geradoEm, filtros: metaFiltros },
    secoes: [
      {
        titulo: "Débitos em aberto",
        colunas: ["Condomínio", "Advogado", "Unidade", "Referência", "Descrição", "Grupo", "Vencimento", "Dias", "Original", "Atualizado", "Situação"],
        linhas: listaDebitos.map((item) => {
          const condominio = getCadastros().condominios.find((atual) => atual.id === item.condominioId);
          const dias = diasDeAtraso(item.dataVencimento, dataBase);
          return [
            condominio?.nome ?? "—",
            condominio?.advogados[0] ?? "—",
            nomeUnidade(item.unidadeId),
            item.referencia,
            item.descricao || "—",
            grupoDebito(item.descricao),
            formatarData(item.dataVencimento),
            String(dias),
            dinheiro(Number(item.valorOriginal) || 0),
            dinheiro(Number(item.valorAtualizado) || 0),
            item.status,
          ];
        }),
      },
      {
        titulo: "Por unidade",
        colunas: ["Unidade", "Condomínio", "Contatos", "Resposta", "Cobranças abertas", "Dias de atraso", "Valor atualizado", "Último contato"],
        linhas: statsPorUnidade.map((linha) => [
          linha.nome,
          linha.condominio,
          String(linha.contatos),
          percentual(linha.resposta),
          String(linha.cobrancas),
          String(linha.dias),
          dinheiro(linha.valorAberto),
          linha.ultimo,
        ]),
      },
    ],
  };
}

/** Valida se o condomínio pedido está no escopo (ex.: exportação por advogado). */
export function assertCondominioNoEscopo(userId: number, condominioId: number | null) {
  if (condominioId == null) return;
  const ids = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  if (!ids.has(condominioId)) {
    throw new RelatorioServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
}

export function unidadesCarteiraEscopo(userId: number) {
  return escopoUnidades(getCadastros(), userId).length;
}

export { LIMITE_AMIGAVEL_DIAS, acimaDoLimite, diasDeAtraso, debitoAbertoNaData };
