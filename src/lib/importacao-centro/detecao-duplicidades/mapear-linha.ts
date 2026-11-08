import type { SituacaoLinhaImportacao, LinhaConferencia } from "@/lib/importacao-centro/types";
import type { ConflitoImportacaoLinha, ResultadoDetecaoDuplicidade } from "@/lib/importacao-centro/detecao-duplicidades/types";

export function conflitoAPartirDaDetecao(detecao: ResultadoDetecaoDuplicidade): ConflitoImportacaoLinha {
  return {
    correspondencia: detecao.correspondencia,
    registroExistenteId: detecao.registroExistenteId,
    acoesPermitidas: detecao.acoesPermitidas,
    acaoPadrao: detecao.acaoPadrao,
    criteriosCoincidentes: detecao.criteriosCoincidentes,
    criteriosDivergentes: detecao.criteriosDivergentes,
  };
}

export function situacaoAPartirDaDetecao(
  detecao: ResultadoDetecaoDuplicidade,
  opts?: { manualProtegido?: boolean },
): Pick<LinhaConferencia, "situacao" | "mensagem" | "conflito"> {
  if (opts?.manualProtegido) {
    return {
      situacao: "manual_protegido",
      mensagem: detecao.mensagem,
      conflito: conflitoAPartirDaDetecao(detecao),
    };
  }

  if (detecao.correspondencia === "nenhuma") {
    return { situacao: "novo", mensagem: detecao.mensagem };
  }

  if (detecao.correspondencia === "exata" && detecao.acaoPadrao === "ignorar_existente") {
    return {
      situacao: "duplicado",
      mensagem: detecao.mensagem ?? "Registro já existente.",
      conflito: conflitoAPartirDaDetecao(detecao),
    };
  }

  return {
    situacao: "revisao" satisfies SituacaoLinhaImportacao,
    mensagem: detecao.mensagem ?? "Correspondência exige revisão antes da gravação.",
    conflito: conflitoAPartirDaDetecao(detecao),
  };
}
