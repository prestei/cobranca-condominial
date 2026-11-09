import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  nomeCondominio,
  proximoNumero,
  registrarAuditoria,
  setResponsaveis,
  setVinculos,
  type Importacao,
  type Responsavel,
  type Vinculo,
} from "@/data/catalogo";
import {
  chaveDuplicidadeResponsavelNoArquivo,
  detectarDuplicidadeResponsavel,
} from "@/lib/importacao-centro/detecao-duplicidades";
import { situacaoAPartirDaDetecao } from "@/lib/importacao-centro/detecao-duplicidades/mapear-linha";
import { serializarObservacaoImportacao } from "@/lib/importacoes/hash-arquivo";
import {
  interpretarPlanilhaResponsaveis,
  type ResponsavelVinculoImportPayload,
} from "@/lib/responsaveis/importar-planilha";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
} from "@/lib/importacao-centro/types";

export const FORMATO_IMPORTACAO_RESPONSAVEIS_V1 = "planilha-responsaveis-v1";

export type ContextoImportacaoResponsaveis = {
  condominios: Array<{ id: number; nome: string }>;
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>;
  responsaveis: Responsavel[];
  vinculos: Vinculo[];
  responsaveisMutaveis: Responsavel[];
  vinculosMutaveis: Vinculo[];
};

function normalizarCpfCnpj(valor: string) {
  return valor.replace(/\D/g, "");
}

function classificarResponsavel(
  payload: ResponsavelVinculoImportPayload,
  contexto: ContextoImportacaoResponsaveis,
): Pick<LinhaConferencia<ResponsavelVinculoImportPayload>, "situacao" | "mensagem" | "resumo" | "conflito"> {
  const unidade = contexto.unidades.find((item) => item.id === payload.unidadeId);
  const detecao = detectarDuplicidadeResponsavel(
    {
      nome: payload.responsavel.nome,
      cpfCnpj: payload.responsavel.cpfCnpj,
      identificadorExterno: payload.identificadorExterno,
    },
    contexto.responsaveis,
  );
  const mapeado = situacaoAPartirDaDetecao(detecao);

  const doc = normalizarCpfCnpj(payload.responsavel.cpfCnpj);
  const responsavelId =
    detecao.registroExistenteId ??
    contexto.responsaveis.find((item) => normalizarCpfCnpj(item.cpfCnpj) === doc)?.id;
  const vinculoExistente =
    responsavelId !== undefined
      ? contexto.vinculos.find(
          (item) =>
            item.unidadeId === payload.unidadeId &&
            item.responsavelId === responsavelId &&
            item.tipoVinculo === payload.tipoVinculo,
        )
      : undefined;

  if (vinculoExistente && mapeado.situacao === "novo") {
    return {
      situacao: "duplicado",
      mensagem: "Vínculo já cadastrado para esta unidade e responsável.",
      resumo: {
        condominio: unidade ? nomeCondominio(unidade.condominioId) : "—",
        unidade: unidade?.identificacao ?? "—",
        responsavel: payload.responsavel.nome,
        documento: payload.responsavel.cpfCnpj,
      },
    };
  }

  return {
    ...mapeado,
    resumo: {
      condominio: unidade ? nomeCondominio(unidade.condominioId) : "—",
      unidade: unidade?.identificacao ?? "—",
      responsavel: payload.responsavel.nome,
      documento: payload.responsavel.cpfCnpj,
      tipoVinculo: payload.tipoVinculo,
    },
  };
}

export const adaptadorImportacaoResponsaveis: AdaptadorImportacao<
  ResponsavelVinculoImportPayload,
  ContextoImportacaoResponsaveis
> = {
  modulo: "responsaveis",
  tipoImportacao: "responsaveis",
  formato: FORMATO_IMPORTACAO_RESPONSAVEIS_V1,
  politicaAprovacao: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },

  prepararContexto(userId) {
    const cadastros = getCadastros();
    const condominios = escopoCondominios(cadastros, userId).map((item) => ({
      id: item.id,
      nome: item.nome,
    }));
    const unidades = escopoUnidades(cadastros, userId).map((item) => ({
      id: item.id,
      condominioId: item.condominioId,
      identificacao: item.identificacao,
      bloco: item.bloco ?? "",
    }));
    const responsaveis = [...cadastros.responsaveis];
    const vinculos = [...cadastros.vinculos];
    return {
      condominios,
      unidades,
      responsaveis,
      vinculos,
      responsaveisMutaveis: [...responsaveis],
      vinculosMutaveis: [...vinculos],
    };
  },

  interpretarMatriz(matriz, contexto): LinhaParseada<ResponsavelVinculoImportPayload>[] {
    const { linhas } = interpretarPlanilhaResponsaveis(matriz, contexto.condominios, contexto.unidades);
    return linhas;
  },

  validarOrigem(origem) {
    if (!origem.trim()) {
      return "Informe a origem do arquivo (ex.: exportação da carteira).";
    }
    return null;
  },

  chaveDuplicidadeNoArquivo(payload) {
    return `${payload.unidadeId}:${chaveDuplicidadeResponsavelNoArquivo({
      nome: payload.responsavel.nome,
      cpfCnpj: payload.responsavel.cpfCnpj,
      identificadorExterno: payload.identificadorExterno,
    })}:${payload.tipoVinculo}`;
  },

  classificarContraBase(payload, contexto) {
    return classificarResponsavel(payload, contexto);
  },

  arquivoJaImportado() {
    return false;
  },

  buscarImportacaoIdempotente() {
    return undefined;
  },

  persistirLinha(payload, situacao, contexto) {
    if (situacao !== "novo") return "ignorado";

    const doc = normalizarCpfCnpj(payload.responsavel.cpfCnpj);
    let responsavelId = contexto.responsaveisMutaveis.find((item) => normalizarCpfCnpj(item.cpfCnpj) === doc)?.id;
    let novoResponsavel = false;

    if (!responsavelId) {
      const nextId = proximoNumero(contexto.responsaveisMutaveis.map((item) => item.id));
      const novo: Responsavel = { id: nextId, ...payload.responsavel };
      contexto.responsaveisMutaveis = [...contexto.responsaveisMutaveis, novo];
      contexto.responsaveis.push(novo);
      responsavelId = nextId;
      novoResponsavel = true;
    }

    if (payload.principal) {
      contexto.vinculosMutaveis = contexto.vinculosMutaveis.map((item) =>
        item.unidadeId === payload.unidadeId ? { ...item, principal: false } : item,
      );
      contexto.vinculos = contexto.vinculos.map((item) =>
        item.unidadeId === payload.unidadeId ? { ...item, principal: false } : item,
      );
    }

    const duplicado = contexto.vinculosMutaveis.some(
      (item) =>
        item.unidadeId === payload.unidadeId &&
        item.responsavelId === responsavelId &&
        item.tipoVinculo === payload.tipoVinculo,
    );
    if (duplicado) return "ignorado";

    const nextVinculoId = proximoNumero(contexto.vinculosMutaveis.map((item) => item.id));
    const vinculo: Vinculo = {
      id: nextVinculoId,
      unidadeId: payload.unidadeId,
      responsavelId,
      tipoVinculo: payload.tipoVinculo,
      principal: payload.principal,
      observacoes: "",
    };
    contexto.vinculosMutaveis = [...contexto.vinculosMutaveis, vinculo];
    contexto.vinculos.push(vinculo);

    return novoResponsavel ? "novo" : "atualizacao";
  },

  finalizarPersistencia(contexto) {
    setResponsaveis(contexto.responsaveisMutaveis);
    setVinculos(contexto.vinculosMutaveis);
  },

  montarRegistroImportacao(input) {
    const importacaoId = proximoNumero(getCadastros().importacoes.map((item) => item.id));
    const observacaoInterna = serializarObservacaoImportacao({
      hashArquivo: input.hashArquivo,
      formato: FORMATO_IMPORTACAO_RESPONSAVEIS_V1,
      relatorio: input.relatorio,
    });

    const status: Importacao["status"] =
      input.contadores.erros > 0 && input.contadores.novos === 0 && input.contadores.atualizacoes === 0
        ? "Erro"
        : "Concluida";

    return {
      id: importacaoId,
      origem: input.origem,
      tipo: "responsaveis",
      arquivo: input.arquivo,
      status,
      quantidadeRegistros: String(input.quantidadeRegistros),
      quantidadeImportados: String(input.contadores.novos + input.contadores.atualizacoes),
      quantidadeAtualizados: String(input.contadores.atualizacoes),
      quantidadeErros: String(input.contadores.erros + input.contadores.duplicados),
      observacaoInterna,
      usuarioId: input.userId,
      dataImportacao: agoraIso(),
    };
  },

  registrarAuditoriaConfirmacao(
    importacao,
    contadores: ContadoresImportacao,
    userId,
    meta?: MetaExecucaoImportacao,
    aprovacao?,
  ) {
    registrarAuditoria(
      {
        entidade: "import",
        registroId: String(importacao.id),
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: JSON.stringify({
          tipo: "responsaveis",
          novos: contadores.novos,
          atualizados: contadores.atualizacoes,
          duplicados: contadores.duplicados,
          erros: contadores.erros,
          aprovacaoExplicita: aprovacao?.confirmacaoExplicita ?? false,
          aprovadoPorUsuarioId: aprovacao?.aprovadoPorUsuarioId ?? userId,
          aprovadoEm: aprovacao?.aprovadoEm ?? importacao.dataImportacao,
        }),
        camposAlterados: "tipo, arquivo, quantidades, aprovacao",
      },
      userId,
      meta,
    );
  },
};
