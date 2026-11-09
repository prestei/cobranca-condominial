/** Códigos estáveis das regras do motor (Ticket 05). Novos módulos reutilizam estes ids. */
export const CODIGOS_VALIDACAO = {
  estrutural: {
    campoObrigatorioAusente: "estrutural.campo_obrigatorio_ausente",
    colunaDesconhecida: "estrutural.coluna_desconhecida",
    colunaDuplicada: "estrutural.coluna_duplicada",
    formatoIncompativel: "estrutural.formato_incompativel",
    tipoDadoIncorreto: "estrutural.tipo_dado_incorreto",
    registroVazio: "estrutural.registro_vazio",
  },
  cadastral: {
    nomeAusente: "cadastral.nome_ausente",
    codigoInvalido: "cadastral.codigo_invalido",
    emailInvalido: "cadastral.email_invalido",
    documentoInvalido: "cadastral.documento_invalido",
    registroExistente: "cadastral.registro_existente",
    campoObrigatorio: "cadastral.campo_obrigatorio",
    parseRejeitado: "cadastral.parse_rejeitado",
  },
  relacional: {
    condominioInexistente: "relacional.condominio_inexistente",
    unidadeInexistente: "relacional.unidade_inexistente",
    registroInexistente: "relacional.registro_inexistente",
    vinculoIncompativel: "relacional.vinculo_incompativel",
  },
  financeira: {
    valorInvalido: "financeira.valor_invalido",
    valorNegativo: "financeira.valor_negativo",
    somaDivergente: "financeira.soma_divergente",
    vencimentoInvalido: "financeira.vencimento_invalido",
    referenciaInconsistente: "financeira.referencia_inconsistente",
    registroDuplicado: "financeira.registro_duplicado",
  },
  negocio: {
    regraModulo: "negocio.regra_modulo",
    permissao: "negocio.permissao",
    restricao: "negocio.restricao_existente",
    estadoIncompativel: "negocio.estado_incompativel",
  },
  motor: {
    validarRegistro: "motor.validar_registro",
    validarEstruturaArquivo: "motor.validar_estrutura_arquivo",
    revalidarLinha: "motor.revalidar_linha_previa",
    validadorGenerico: "motor.validador_generico",
  },
} as const;

export const REGRAS_ESTRUTURAIS_MOTOR = [
  CODIGOS_VALIDACAO.estrutural.campoObrigatorioAusente,
  CODIGOS_VALIDACAO.estrutural.colunaDesconhecida,
  CODIGOS_VALIDACAO.estrutural.colunaDuplicada,
  CODIGOS_VALIDACAO.estrutural.formatoIncompativel,
  CODIGOS_VALIDACAO.estrutural.tipoDadoIncorreto,
] as const;

export const REGRAS_CADASTRAIS_MOTOR = [
  CODIGOS_VALIDACAO.cadastral.nomeAusente,
  CODIGOS_VALIDACAO.cadastral.codigoInvalido,
  CODIGOS_VALIDACAO.cadastral.emailInvalido,
  CODIGOS_VALIDACAO.cadastral.documentoInvalido,
  CODIGOS_VALIDACAO.cadastral.registroExistente,
] as const;

export const REGRAS_RELACIONAIS_MOTOR = [
  CODIGOS_VALIDACAO.relacional.condominioInexistente,
  CODIGOS_VALIDACAO.relacional.unidadeInexistente,
  CODIGOS_VALIDACAO.relacional.registroInexistente,
  CODIGOS_VALIDACAO.relacional.vinculoIncompativel,
] as const;

export const REGRAS_FINANCEIRAS_MOTOR = [
  CODIGOS_VALIDACAO.financeira.valorInvalido,
  CODIGOS_VALIDACAO.financeira.valorNegativo,
  CODIGOS_VALIDACAO.financeira.somaDivergente,
  CODIGOS_VALIDACAO.financeira.vencimentoInvalido,
  CODIGOS_VALIDACAO.financeira.referenciaInconsistente,
  CODIGOS_VALIDACAO.financeira.registroDuplicado,
] as const;

export const REGRAS_NEGOCIO_MOTOR = [
  CODIGOS_VALIDACAO.negocio.regraModulo,
  CODIGOS_VALIDACAO.negocio.permissao,
  CODIGOS_VALIDACAO.negocio.restricao,
  CODIGOS_VALIDACAO.negocio.estadoIncompativel,
] as const;
