import { Responsavel } from "@/data/catalogo";
import { chaveDocumentoResponsavel, chaveNomeNormalizado } from "@/lib/importacao-centro/detecao-duplicidades/chaves";
import type { ResultadoDetecaoDuplicidade } from "@/lib/importacao-centro/detecao-duplicidades/types";

export type ResponsavelImportDetecao = Pick<Responsavel, "nome" | "cpfCnpj"> & {
  identificadorExterno?: string;
};

function semCorrespondencia(): ResultadoDetecaoDuplicidade {
  return {
    correspondencia: "nenhuma",
    acoesPermitidas: ["importar_novo"],
    acaoPadrao: "importar_novo",
  };
}

export function detectarDuplicidadeResponsavel(
  payload: ResponsavelImportDetecao,
  existentes: Responsavel[],
): ResultadoDetecaoDuplicidade {
  const doc = chaveDocumentoResponsavel(payload.cpfCnpj);
  if (doc) {
    const porDoc = existentes.find((item) => chaveDocumentoResponsavel(item.cpfCnpj) === doc);
    if (porDoc) {
      return {
        correspondencia: "exata",
        registroExistenteId: porDoc.id,
        chaveComparacao: `documento:${doc}`,
        criteriosCoincidentes: ["cpfCnpj"],
        acoesPermitidas: ["ignorar_existente", "atualizar_existente", "revisao_manual"],
        acaoPadrao: "ignorar_existente",
        mensagem: "Responsável já cadastrado com o mesmo documento.",
      };
    }
  }

  const ext = payload.identificadorExterno?.trim();
  if (ext) {
    const extNorm = ext.toLocaleLowerCase("pt-BR");
    const porExt = existentes.find(
      (item) => (item as Responsavel & { identificadorExterno?: string }).identificadorExterno?.trim().toLocaleLowerCase("pt-BR") === extNorm,
    );
    if (porExt) {
      return {
        correspondencia: "exata",
        registroExistenteId: porExt.id,
        chaveComparacao: `identificadorExterno:${extNorm}`,
        criteriosCoincidentes: ["identificadorExterno"],
        acoesPermitidas: ["ignorar_existente", "revisao_manual"],
        acaoPadrao: "ignorar_existente",
        mensagem: "Responsável já cadastrado com este identificador de origem.",
      };
    }
  }

  const nomeChave = chaveNomeNormalizado(payload.nome);
  if (nomeChave && !doc) {
    const porNome = existentes.find((item) => chaveNomeNormalizado(item.nome) === nomeChave);
    if (porNome) {
      return {
        correspondencia: "possivel",
        registroExistenteId: porNome.id,
        chaveComparacao: `nome:${nomeChave}`,
        criteriosCoincidentes: ["nome"],
        criteriosDivergentes: ["documento ausente na planilha"],
        acoesPermitidas: ["ignorar_existente", "importar_novo", "solicitar_correcao", "revisao_manual"],
        acaoPadrao: "revisao_manual",
        mensagem: "Nome coincide com responsável existente; documento não informado para confirmação exata.",
      };
    }
  }

  return semCorrespondencia();
}

export function chaveDuplicidadeResponsavelNoArquivo(payload: ResponsavelImportDetecao): string {
  const doc = chaveDocumentoResponsavel(payload.cpfCnpj);
  if (doc) return `doc:${doc}`;
  const ext = payload.identificadorExterno?.trim();
  if (ext) return `ext:${ext.toLocaleLowerCase("pt-BR")}`;
  const nome = chaveNomeNormalizado(payload.nome);
  return `nome:${nome ?? payload.nome.trim()}`;
}
