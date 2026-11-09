import type { LinhaConferencia, SituacaoLinhaImportacao } from "@/lib/importacao-centro/types";
import type { AcaoConflitoImportacao, DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";

export function situacaoParaAcaoConflito(acao: AcaoConflitoImportacao): SituacaoLinhaImportacao {
  switch (acao) {
    case "importar_novo":
      return "novo";
    case "atualizar_existente":
      return "atualizacao";
    case "ignorar_existente":
      return "ignorado";
    case "solicitar_correcao":
      return "erro";
    case "revisao_manual":
      return "ignorado";
    default:
      return "ignorado";
  }
}

function resolverAcaoLinha(
  linha: LinhaConferencia,
  decisao?: DecisaoLinhaImportacao,
): { situacao: SituacaoLinhaImportacao; mensagem?: string; acaoAplicada: AcaoConflitoImportacao | "padrao_pipeline" } {
  if (linha.situacao === "revisao") {
    const acao = decisao?.acao ?? linha.conflito?.acaoPadrao ?? "revisao_manual";
    if (!decisao && acao === "atualizar_existente") {
      return {
        situacao: "ignorado",
        mensagem: "Atualização não autorizada; encaminhado para revisão manual.",
        acaoAplicada: "revisao_manual",
      };
    }
    return {
      situacao: situacaoParaAcaoConflito(acao),
      mensagem: decisao?.motivo ?? linha.mensagem,
      acaoAplicada: decisao ? decisao.acao : "padrao_pipeline",
    };
  }

  if (linha.situacao === "atualizacao" && !decisao) {
    return {
      situacao: "ignorado",
      mensagem: "Atualização exige autorização explícita.",
      acaoAplicada: "revisao_manual",
    };
  }

  if (decisao) {
    return {
      situacao: situacaoParaAcaoConflito(decisao.acao),
      mensagem: decisao.motivo ?? linha.mensagem,
      acaoAplicada: decisao.acao,
    };
  }

  return { situacao: linha.situacao, mensagem: linha.mensagem, acaoAplicada: "padrao_pipeline" };
}

export type LinhaComDecisaoAplicada = LinhaConferencia & {
  acaoAplicada?: AcaoConflitoImportacao | "padrao_pipeline";
};

export function aplicarDecisoesNasLinhas<TPayload>(
  linhas: LinhaConferencia<TPayload>[],
  decisoes?: DecisaoLinhaImportacao[],
): { linhas: LinhaComDecisaoAplicada[]; decisoesRegistradas: DecisaoLinhaImportacao[] } {
  const porLinha = new Map(decisoes?.map((item) => [item.linha, item]) ?? []);
  const decisoesRegistradas: DecisaoLinhaImportacao[] = [];

  const aplicadas = linhas.map((item) => {
    const decisao = porLinha.get(item.linha);
    const resolvido = resolverAcaoLinha(item, decisao);
    const precisaRegistrar =
      item.situacao === "revisao" ||
      decisao ||
      resolvido.acaoAplicada !== "padrao_pipeline";

    if (precisaRegistrar) {
      decisoesRegistradas.push({
        linha: item.linha,
        acao: decisao?.acao ?? (resolvido.acaoAplicada === "padrao_pipeline" ? (item.conflito?.acaoPadrao ?? "revisao_manual") : resolvido.acaoAplicada),
        motivo: resolvido.mensagem,
      });
    }

    return {
      ...item,
      situacao: resolvido.situacao,
      mensagem: resolvido.mensagem ?? item.mensagem,
      acaoAplicada: resolvido.acaoAplicada,
    };
  });

  return { linhas: aplicadas, decisoesRegistradas };
}
