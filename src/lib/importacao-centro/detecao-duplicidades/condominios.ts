import type { Condominio } from "@/data/catalogo";
import type { CondominioImportPayload } from "@/lib/condominios/importar-planilha";
import { chaveIdentificadorExterno, chaveNomeNormalizado } from "@/lib/importacao-centro/detecao-duplicidades/chaves";
import type { ResultadoDetecaoDuplicidade } from "@/lib/importacao-centro/detecao-duplicidades/types";

const ACOES_DUPLICIDADE_EXATA: ResultadoDetecaoDuplicidade["acoesPermitidas"] = [
  "ignorar_existente",
  "revisao_manual",
];

const ACOES_POSSIVEL: ResultadoDetecaoDuplicidade["acoesPermitidas"] = [
  "ignorar_existente",
  "importar_novo",
  "solicitar_correcao",
  "revisao_manual",
];

function semCorrespondencia(): ResultadoDetecaoDuplicidade {
  return {
    correspondencia: "nenhuma",
    acoesPermitidas: ["importar_novo"],
    acaoPadrao: "importar_novo",
  };
}

export function detectarDuplicidadeCondominio(
  payload: CondominioImportPayload,
  existentes: Condominio[],
): ResultadoDetecaoDuplicidade {
  const ext = chaveIdentificadorExterno(payload.identificadorExterno);
  if (ext) {
    const porId = existentes.find((item) => chaveIdentificadorExterno(item.identificadorExterno) === ext);
    if (porId) {
      return {
        correspondencia: "exata",
        registroExistenteId: porId.id,
        chaveComparacao: `identificadorExterno:${ext}`,
        criteriosCoincidentes: ["identificadorExterno"],
        acoesPermitidas: ACOES_DUPLICIDADE_EXATA,
        acaoPadrao: "ignorar_existente",
        mensagem: "Condomínio já cadastrado com este identificador externo.",
      };
    }
  }

  const nomeChave = chaveNomeNormalizado(payload.nome);
  if (nomeChave) {
    const porNome = existentes.find((item) => chaveNomeNormalizado(item.nome) === nomeChave);
    if (porNome) {
      const criterios: string[] = ["nome"];
      if (ext && chaveIdentificadorExterno(porNome.identificadorExterno)) {
        criterios.push("identificadorExterno (divergente na planilha)");
        return {
          correspondencia: "possivel",
          registroExistenteId: porNome.id,
          chaveComparacao: `nome:${nomeChave}`,
          criteriosCoincidentes: ["nome"],
          criteriosDivergentes: ["identificadorExterno"],
          acoesPermitidas: ACOES_POSSIVEL,
          acaoPadrao: "revisao_manual",
          mensagem: "Nome coincide com condomínio existente, mas o identificador externo difere; revise antes de importar.",
        };
      }
      return {
        correspondencia: "possivel",
        registroExistenteId: porNome.id,
        chaveComparacao: `nome:${nomeChave}`,
        criteriosCoincidentes: criterios,
        acoesPermitidas: ACOES_POSSIVEL,
        acaoPadrao: ext ? "revisao_manual" : "ignorar_existente",
        mensagem: ext
          ? "Nome coincide com registro existente; confira se não é duplicidade."
          : "Já existe condomínio com o mesmo nome normalizado.",
      };
    }
  }

  return semCorrespondencia();
}

export function chaveDuplicidadeCondominioNoArquivo(payload: CondominioImportPayload): string {
  const ext = chaveIdentificadorExterno(payload.identificadorExterno);
  if (ext) return `ext:${ext}`;
  const nome = chaveNomeNormalizado(payload.nome);
  return `nome:${nome ?? payload.nome.trim()}`;
}
