import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";

export type CondominioRelacional = { id: number; status?: string };
export type UnidadeRelacional = { id: number; condominioId: number; status?: string; situacao?: string };

export function inconsistenciaCondominioInexistente(mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "relacional",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.relacional.condominioInexistente,
    mensagem,
    campo: "condominioId",
  });
}

export function inconsistenciaUnidadeInexistente(mensagem: string, campo = "unidadeId"): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "relacional",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.relacional.unidadeInexistente,
    mensagem,
    campo,
  });
}

export function inconsistenciaRegistroInexistente(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "relacional",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.relacional.registroInexistente,
    mensagem,
    campo,
  });
}

export function inconsistenciaVinculoIncompativel(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "relacional",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.relacional.vinculoIncompativel,
    mensagem,
    campo,
  });
}

export function localizarCondominioRelacional(
  condominios: CondominioRelacional[] | undefined,
  condominioId: number,
): CondominioRelacional | undefined {
  return condominios?.find((item) => item.id === condominioId);
}

export function localizarUnidadeRelacional(
  unidades: UnidadeRelacional[] | undefined,
  unidadeId: number,
): UnidadeRelacional | undefined {
  return unidades?.find((item) => item.id === unidadeId);
}

export function validarUnidadeComCondominio(params: {
  condominioId: number;
  unidadeId?: number;
  condominios?: CondominioRelacional[];
  unidades?: UnidadeRelacional[];
  exigirUnidade?: boolean;
}): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  const condominio = localizarCondominioRelacional(params.condominios, params.condominioId);
  if (!condominio) {
    itens.push(inconsistenciaCondominioInexistente("Unidade sem condomínio correspondente no escopo."));
  }

  if (params.exigirUnidade) {
    if (params.unidadeId == null) {
      itens.push(inconsistenciaUnidadeInexistente("Débito sem unidade correspondente."));
    } else {
      const unidade = localizarUnidadeRelacional(params.unidades, params.unidadeId);
      if (!unidade) {
        itens.push(inconsistenciaUnidadeInexistente("Débito sem unidade correspondente."));
      } else if (unidade.condominioId !== params.condominioId) {
        itens.push(inconsistenciaVinculoIncompativel("unidadeId", "Unidade não pertence ao condomínio informado."));
      }
    }
  }

  return itens;
}

export function validarResponsavelComUnidade(params: {
  unidadeId: number;
  unidades?: UnidadeRelacional[];
}): InconsistenciaValidacao[] {
  const unidade = localizarUnidadeRelacional(params.unidades, params.unidadeId);
  if (unidade) return [];
  return [
    inconsistenciaRegistroInexistente(
      "unidadeId",
      "Responsável associado a registro inexistente (unidade fora do escopo ou não cadastrada).",
    ),
  ];
}
