import type { DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import { aplicarDecisoesNasLinhas } from "@/lib/importacao-centro/detecao-duplicidades/aplicar-decisoes";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
  SituacaoLinhaImportacao,
} from "@/lib/importacao-centro/types";

const SITUACOES_GRAVAVEIS: SituacaoLinhaImportacao[] = ["novo", "atualizacao"];

export function executarPersistenciaAprovada<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  contexto: TContexto,
  linhasConferidas: LinhaConferencia<TPayload>[],
  parseadas: LinhaParseada<TPayload>[],
  meta: { origem: string; arquivo: string; userId: number },
  decisoesLinha?: DecisaoLinhaImportacao[],
  linhasIgnoradas?: number[],
): {
  contadores: ContadoresImportacao;
  relatorio: {
    erros: Array<{ linha: number; mensagem: string }>;
    ignorados: Array<{ linha: number; mensagem: string }>;
    decisoes?: DecisaoLinhaImportacao[];
  };
} {
  const ignoradasUsuario = new Set(linhasIgnoradas ?? []);
  const linhasParaDecisao =
    ignoradasUsuario.size > 0
      ? linhasConferidas.map((item) =>
          ignoradasUsuario.has(item.linha)
            ? {
                ...item,
                situacao: "ignorado" as const,
                mensagem: item.mensagem ?? "Ignorado pelo usuário na confirmação.",
              }
            : item,
        )
      : linhasConferidas;

  const { linhas: linhasComDecisao, decisoesRegistradas } = aplicarDecisoesNasLinhas(linhasParaDecisao, decisoesLinha);
  const payloadPorLinha = new Map(
    parseadas.filter((item) => item.payload).map((item) => [item.linha, item.payload!]),
  );

  const contadores: ContadoresImportacao = {
    novos: 0,
    atualizacoes: 0,
    duplicados: 0,
    erros: 0,
    manualProtegido: 0,
    ignorados: 0,
    revisoes: 0,
  };

  const erros: Array<{ linha: number; mensagem: string }> = [];
  const ignorados: Array<{ linha: number; mensagem: string }> = [];

  for (const linha of linhasComDecisao) {
    if (linha.situacao === "erro") {
      contadores.erros += 1;
      erros.push({ linha: linha.linha, mensagem: linha.mensagem ?? "Erro" });
      continue;
    }

    const payload = linha.payload ?? payloadPorLinha.get(linha.linha);
    if (!payload) continue;

    if (linha.situacao === "duplicado") {
      contadores.duplicados += 1;
      continue;
    }
    if (linha.situacao === "manual_protegido") {
      contadores.manualProtegido += 1;
      ignorados.push({
        linha: linha.linha,
        mensagem: linha.mensagem ?? "Registro manual protegido.",
      });
      continue;
    }
    if (linha.situacao === "ignorado") {
      contadores.ignorados += 1;
      ignorados.push({ linha: linha.linha, mensagem: linha.mensagem ?? "Ignorado." });
      continue;
    }

    if (linha.situacao === "revisao") {
      contadores.revisoes += 1;
      ignorados.push({ linha: linha.linha, mensagem: linha.mensagem ?? "Pendente de revisão." });
      continue;
    }

    if (!SITUACOES_GRAVAVEIS.includes(linha.situacao)) continue;

    const acao = adapter.persistirLinha(payload, linha.situacao, contexto, meta);
    if (acao === "novo") contadores.novos += 1;
    else if (acao === "atualizacao") contadores.atualizacoes += 1;
    else contadores.duplicados += 1;
  }

  return { contadores, relatorio: { erros, ignorados, decisoes: decisoesRegistradas } };
}

export type ContextoGravacaoImportacao = MetaExecucaoImportacao & { userId: number };
