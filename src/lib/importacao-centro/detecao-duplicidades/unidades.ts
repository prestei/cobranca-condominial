import { Unidade } from "@/data/catalogo";
import type { UnidadeInput } from "@/lib/unidades/service";
import type { ResultadoDetecaoDuplicidade } from "@/lib/importacao-centro/detecao-duplicidades/types";

function chaveUnidade(payload: Pick<UnidadeInput, "condominioId" | "identificacao" | "bloco">): string {
  const bloco = (payload.bloco ?? "").trim().toLocaleLowerCase("pt-BR");
  const id = payload.identificacao.trim().toLocaleLowerCase("pt-BR");
  return `${payload.condominioId}:${bloco}:${id}`;
}

function semCorrespondencia(): ResultadoDetecaoDuplicidade {
  return {
    correspondencia: "nenhuma",
    acoesPermitidas: ["importar_novo"],
    acaoPadrao: "importar_novo",
  };
}

export function detectarDuplicidadeUnidade(
  payload: UnidadeInput,
  existentes: Unidade[],
): ResultadoDetecaoDuplicidade {
  const chave = chaveUnidade(payload);
  const existente = existentes.find(
    (item) =>
      chaveUnidade({
        condominioId: item.condominioId,
        identificacao: item.identificacao,
        bloco: item.bloco ?? "",
      }) === chave,
  );

  if (!existente) return semCorrespondencia();

  return {
    correspondencia: "exata",
    registroExistenteId: existente.id,
    chaveComparacao: chave,
    criteriosCoincidentes: ["condominio", "bloco", "identificacao"],
    acoesPermitidas: ["ignorar_existente", "revisao_manual", "atualizar_existente"],
    acaoPadrao: "ignorar_existente",
    mensagem: "Unidade já cadastrada neste condomínio.",
  };
}

export function chaveDuplicidadeUnidadeNoArquivo(payload: UnidadeInput): string {
  return chaveUnidade(payload);
}
