import type { DashboardPayload } from "@/lib/dashboard/service";
import { DashboardServiceError, obterDashboard } from "@/lib/dashboard/service";
import { temPermissao } from "@/lib/permissions/check";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import type { PerfilOperacional } from "@/lib/perfil-operacional";

const MAX_CHARS = 3_500;
const MAX_RETORNOS = 5;

const ROTULO_INDICADOR: Record<string, string> = {
  pendentes: "Pendentes",
  aguardando_retorno: "Aguardando retorno",
  resolvidos_periodo: "Resolvidos (período)",
  atencao: "Requer atenção",
};

function truncar(texto: string): string {
  if (texto.length <= MAX_CHARS) return texto;
  return `${texto.slice(0, MAX_CHARS)}\n[… consulta truncada …]`;
}

function serializarDashboard(dash: DashboardPayload): string {
  const linhas: string[] = [`Data-base: ${dash.dataBase}. Perfil: ${dash.perfil}. Cargo: ${dash.cargoNome}.`];

  if ("fila" in dash) {
    linhas.push(
      `Fila — em cobrança: ${dash.fila.emCobranca}; sem responsável: ${dash.fila.semResponsavel}; retornos hoje: ${dash.fila.retornosHoje}.`,
    );
  }

  if (dash.perfil === "atendente") {
    linhas.push(`Atendimentos registrados hoje: ${dash.atendimentosHoje}.`);
    linhas.push(
      `Operação (últimos 7 dias): contatos ${dash.operacao.contatos}; responderam ${dash.operacao.responderam}; taxa de resposta ${
        dash.operacao.taxaResposta != null ? `${Math.round(dash.operacao.taxaResposta)}%` : "—"
      }.`,
    );
    for (const item of dash.indicadoresOperacionais.itens) {
      const rotulo = ROTULO_INDICADOR[item.id] ?? item.id;
      linhas.push(`Indicador «${rotulo}»: ${item.total}.`);
    }
  }

  if (dash.perfil === "administradora") {
    const ind = dash.indicadores;
    linhas.push(
      `Inadimplência — unidades devedoras: ${ind.unidadesDevedoras}; total atualizado: ${ind.totalAtualizado}; acima do prazo amigável: ${ind.acimaLimite}.`,
    );
    linhas.push(
      `Operação (7 dias): contatos ${dash.operacao.contatos}; taxa de resposta ${
        dash.operacao.taxaResposta != null ? `${Math.round(dash.operacao.taxaResposta)}%` : "—"
      }.`,
    );
    if (dash.parteJuridicaPercentual != null) {
      linhas.push(`Parte jurídica (aprox.): ${dash.parteJuridicaPercentual.toFixed(1)}% do valor em aberto.`);
    }
  }

  if (dash.perfil === "advogado") {
    linhas.push(`Condomínios no escopo: ${dash.condominios.total}.`);
    if (dash.juridico) {
      linhas.push(`Jurídico — total encaminhamentos: ${dash.juridico.total}; em aberto: ${dash.juridico.abertos}.`);
    }
    if (dash.negociacoes) {
      linhas.push(
        `Negociações — em análise: ${dash.negociacoes.emAnalise}; aceitas: ${dash.negociacoes.aceitas}; parcelas vencidas: ${dash.negociacoes.parcelasVencidas}.`,
      );
    }
    if (dash.indicadores) {
      linhas.push(
        `Inadimplência (escopo) — unidades devedoras: ${dash.indicadores.unidadesDevedoras}; total atualizado: ${dash.indicadores.totalAtualizado}.`,
      );
    }
  }

  if (dash.retornos) {
    const r = dash.retornos.resumo;
    linhas.push(`Retornos pendentes — atrasados: ${r.atrasados}; hoje: ${r.hoje}; próximos: ${r.proximos}.`);
    const amostra = dash.retornos.itens.slice(0, MAX_RETORNOS);
    for (const item of amostra) {
      linhas.push(`  • ${item.dataPrevista} — ${item.unidadeLabel} (${item.situacaoAgenda})`);
    }
    if (dash.retornos.itens.length > MAX_RETORNOS) {
      linhas.push(`  • … +${dash.retornos.itens.length - MAX_RETORNOS} retorno(s) não listados aqui.`);
    }
  }

  return truncar(linhas.join("\n"));
}

/**
 * Consulta no servidor indicadores já calculados para o usuário (mesma regra de escopo do dashboard).
 * Não inclui senhas, tokens, nem dados fora das permissões do cargo.
 */
export async function montarSnapshotOperacionalAssistente(input: {
  userId: number;
  permissoes: PermissoesCargo;
  perfil: PerfilOperacional;
}): Promise<string | null> {
  if (!temPermissao(input.permissoes, "dashboard", "ler")) {
    return "Sem permissão de dashboard: números agregados não foram consultados. Use a captura da tela ou o manual.";
  }

  try {
    const dash = await obterDashboard(input.userId);
    return serializarDashboard(dash);
  } catch (error) {
    if (error instanceof DashboardServiceError && error.status === 403) {
      return "Consulta operacional negada: sem permissão de dashboard.";
    }
    console.warn("[assistente] snapshot operacional falhou:", error);
    return null;
  }
}