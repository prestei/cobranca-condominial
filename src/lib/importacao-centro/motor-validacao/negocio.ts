import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
import type { InconsistenciaValidacao, SeveridadeInconsistencia } from "@/lib/importacao-centro/motor-validacao/types";
import type { CondominioRelacional, UnidadeRelacional } from "@/lib/importacao-centro/motor-validacao/relacional";

export function inconsistenciaNegocio(params: {
  codigo?: string;
  mensagem: string;
  campo?: string;
  severidade?: SeveridadeInconsistencia;
}): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "negocio",
    severidade: params.severidade ?? "erro",
    codigo: params.codigo ?? CODIGOS_VALIDACAO.negocio.regraModulo,
    mensagem: params.mensagem,
    campo: params.campo,
  });
}

export function validarPermissaoEscopoCondominio(
  condominioId: number,
  idsPermitidos: ReadonlySet<number> | number[] | undefined,
): InconsistenciaValidacao[] {
  if (!idsPermitidos) return [];
  const set = idsPermitidos instanceof Set ? idsPermitidos : new Set(idsPermitidos);
  if (set.size === 0 || set.has(condominioId)) return [];
  return [
    inconsistenciaNegocio({
      codigo: CODIGOS_VALIDACAO.negocio.permissao,
      mensagem: "Registro fora do escopo de condomínio permitido para este usuário.",
      campo: "condominioId",
      severidade: "erro",
    }),
  ];
}

export function validarRestricaoCadastroInativo(params: {
  condominio?: CondominioRelacional;
  unidade?: UnidadeRelacional;
}): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];
  if (params.condominio?.status && params.condominio.status.toLocaleLowerCase("pt-BR") === "inativo") {
    itens.push(
      inconsistenciaNegocio({
        codigo: CODIGOS_VALIDACAO.negocio.restricao,
        mensagem: "Condomínio inativo: importação deste registro exige conferência das restrições cadastrais.",
        campo: "condominioId",
        severidade: "atencao",
      }),
    );
  }
  if (params.unidade?.status && params.unidade.status.toLocaleLowerCase("pt-BR") === "inativa") {
    itens.push(
      inconsistenciaNegocio({
        codigo: CODIGOS_VALIDACAO.negocio.estadoIncompativel,
        mensagem: "Unidade inativa não recebe novos débitos até reativação.",
        campo: "unidadeId",
        severidade: "erro",
      }),
    );
  }
  if (params.unidade?.situacao && params.unidade.situacao.toLocaleLowerCase("pt-BR") === "quitada") {
    itens.push(
      inconsistenciaNegocio({
        codigo: CODIGOS_VALIDACAO.negocio.estadoIncompativel,
        mensagem: "Unidade quitada: novo débito exige conferência do estado de cobrança.",
        campo: "unidadeId",
        severidade: "atencao",
      }),
    );
  }
  return itens;
}

export function validarClassificacaoPermitida(
  valor: string | undefined,
  permitidos: readonly string[],
  campo: string,
  rotulo: string,
): InconsistenciaValidacao[] {
  const bruto = valor?.trim() ?? "";
  if (!bruto) return [];
  if (permitidos.includes(bruto)) return [];
  return [
    inconsistenciaNegocio({
      codigo: CODIGOS_VALIDACAO.negocio.estadoIncompativel,
      mensagem: `${rotulo} incompatível com as regras do sistema.`,
      campo,
      severidade: "erro",
    }),
  ];
}
