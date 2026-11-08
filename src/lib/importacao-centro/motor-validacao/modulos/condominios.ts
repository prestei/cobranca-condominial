import type { CondominioImportPayload } from "@/lib/condominios/importar-planilha";
import type { ContextoImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { normalizarEmailImportacao } from "@/lib/importacao-centro/normalizacao-campos";
import { criarInconsistencia, inconsistenciaDeErroParse } from "@/lib/importacao-centro/motor-validacao/registro";
import {
  extrairCabecalhoNormalizado,
  montarDadosOriginaisLinha,
  validarCabecalhoEstrutural,
} from "@/lib/importacao-centro/motor-validacao/estrutural";
import type {
  EntradaValidacaoRegistro,
  InconsistenciaValidacao,
  ValidadorModuloImportacao,
} from "@/lib/importacao-centro/motor-validacao/types";

const COLUNAS_RECONHECIDAS = new Set(
  [
    "nome",
    "identificador",
    "identificador externo",
    "situacao",
    "situação",
    "status",
    "cidade",
    "estado",
    "administradora",
    "advogados",
    "advogado responsavel",
    "advogado responsável",
    "unidades",
    "cep",
    "logradouro",
    "numero",
    "número",
    "complemento",
    "observacao",
    "observação",
    "email",
    "e-mail",
  ].map((item) => normalizarCabecalhoPlanilha(item)),
);

const COLUNAS_OBRIGATORIAS = ["nome", "advogados"];

function validarCadastralCondominio(
  payload: CondominioImportPayload,
  contexto: ContextoImportacaoCondominios,
  dadosOriginais: Record<string, string>,
): InconsistenciaValidacao[] {
  const itens: InconsistenciaValidacao[] = [];

  if (!payload.nome?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "erro",
        codigo: "cadastral.nome_ausente",
        mensagem: "Nome do condomínio é obrigatório.",
        campo: "nome",
      }),
    );
  }

  const emailRaw = dadosOriginais.email ?? dadosOriginais["e-mail"];
  if (emailRaw?.trim()) {
    const email = normalizarEmailImportacao(emailRaw);
    if (email.erro) {
      itens.push(
        criarInconsistencia({
          categoria: "cadastral",
          severidade: "erro",
          codigo: "cadastral.email_invalido",
          mensagem: email.erro,
          campo: "email",
        }),
      );
    }
  }

  if (payload.advogados.length === 0) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "erro",
        codigo: "cadastral.campo_obrigatorio",
        mensagem: "Informe ao menos um advogado responsável.",
        campo: "advogados",
      }),
    );
  }

  const nomeAlvo = payload.nome.trim().toLocaleLowerCase("pt-BR");
  const existente = contexto.condominios.find(
    (item) => item.nome.trim().toLocaleLowerCase("pt-BR") === nomeAlvo,
  );
  if (existente && !payload.identificadorExterno?.trim()) {
    itens.push(
      criarInconsistencia({
        categoria: "cadastral",
        severidade: "atencao",
        codigo: "cadastral.registro_existente",
        mensagem: "Já existe condomínio com o mesmo nome; confira se não é duplicidade.",
        campo: "nome",
      }),
    );
  }

  return itens;
}

export const validadorImportacaoCondominios: ValidadorModuloImportacao<
  CondominioImportPayload,
  ContextoImportacaoCondominios
> = {
  modulo: "condominios",
  colunasReconhecidas: COLUNAS_RECONHECIDAS,
  colunasObrigatorias: COLUNAS_OBRIGATORIAS,

  validarEstruturaArquivo(matriz) {
    return validarCabecalhoEstrutural({
      cabecalho: extrairCabecalhoNormalizado(matriz),
      colunasReconhecidas: COLUNAS_RECONHECIDAS,
      colunasObrigatorias: COLUNAS_OBRIGATORIAS.map(normalizarCabecalhoPlanilha),
    });
  },

  validarRegistro(entrada: EntradaValidacaoRegistro<CondominioImportPayload, ContextoImportacaoCondominios>) {
    const inconsistencias: InconsistenciaValidacao[] = [];
    const dadosOriginais = montarDadosOriginaisLinha(entrada.cabecalho, entrada.linhaBruta);

    if (entrada.erroParse) {
      inconsistencias.push(inconsistenciaDeErroParse(entrada.erroParse));
    }

    if (entrada.payload) {
      inconsistencias.push(...validarCadastralCondominio(entrada.payload, entrada.contexto, dadosOriginais));
    }

    return {
      dadosOriginais,
      dadosNormalizados: entrada.payload ?? null,
      inconsistencias,
      regrasAplicadas: ["motor.validar_registro"],
    };
  },
};
