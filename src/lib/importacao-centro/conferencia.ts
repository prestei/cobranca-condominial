import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import { montarResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import type {
  AdaptadorImportacao,
  ContadoresImportacao,
  LinhaConferencia,
  PreviewImportacaoCentral,
} from "@/lib/importacao-centro/types";
import { contarPorSituacao, marcarDuplicidadesNoArquivo } from "@/lib/importacao-centro/duplicidades";

export function conferirLinhasComBase<TPayload, TContexto>(
  linhas: LinhaConferencia<TPayload>[],
  adapter: Pick<AdaptadorImportacao<TPayload, TContexto>, "classificarContraBase">,
  contexto: TContexto,
): LinhaConferencia<TPayload>[] {
  return linhas.map((item) => {
    if (item.situacao !== "novo" || !item.payload) return item;
    const classificacao = adapter.classificarContraBase(item.payload, contexto);
    return {
      ...item,
      ...classificacao,
      payload: item.payload,
      validacao: item.validacao,
    };
  });
}

export function montarContadores(linhas: LinhaConferencia[]): ContadoresImportacao {
  const porSituacao = contarPorSituacao(linhas);
  return {
    novos: porSituacao.novo,
    atualizacoes: porSituacao.atualizacao,
    duplicados: porSituacao.duplicado,
    erros: porSituacao.erro,
    manualProtegido: porSituacao.manual_protegido,
    ignorados: porSituacao.ignorado,
    revisoes: porSituacao.revisao,
  };
}

export function montarPreview<TPayload, TContexto>(
  params: {
    hashArquivo: string;
    origem: string;
    arquivo: string;
    adapter: AdaptadorImportacao<TPayload, TContexto>;
    contexto: TContexto;
    linhas: LinhaConferencia<TPayload>[];
    inconsistenciasArquivo?: InconsistenciaValidacao[];
  },
): PreviewImportacaoCentral {
  const contadores = montarContadores(params.linhas);
  const amostraValida = params.linhas
    .filter((item) => item.situacao === "novo" || item.situacao === "atualizacao")
    .slice(0, 8)
    .map((item) => ({
      linha: item.linha,
      situacao: item.situacao,
      mensagem: item.mensagem,
      resumo: item.resumo,
    }));

  const inconsistenciasArquivo = params.inconsistenciasArquivo ?? [];
  const base: PreviewImportacaoCentral = {
    hashArquivo: params.hashArquivo,
    formato: params.adapter.formato,
    arquivo: params.arquivo,
    origem: params.origem,
    quantidadeRegistros: params.linhas.length,
    contadores,
    arquivoJaImportado: params.adapter.arquivoJaImportado(params.hashArquivo),
    inconsistenciasArquivo,
    linhas: params.linhas.map((item) => ({
      linha: item.linha,
      situacao: item.situacao,
      mensagem: item.mensagem,
      resumo: item.resumo,
      conflito: item.conflito,
      validacao: item.validacao,
    })),
    amostraValida,
    registrosValidados: params.linhas
      .map((item) => item.validacao)
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };

  return {
    ...base,
    resumoAprovacao: montarResumoAprovacaoImportacao({
      moduloDestino: params.adapter.modulo,
      preview: base,
    }),
  };
}

export function pipelineConferencia<TPayload, TContexto>(
  parseadas: Parameters<typeof marcarDuplicidadesNoArquivo<TPayload>>[0],
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  contexto: TContexto,
): LinhaConferencia<TPayload>[] {
  const comDuplicidadeArquivo = marcarDuplicidadesNoArquivo(parseadas, (p) =>
    adapter.chaveDuplicidadeNoArquivo(p),
  );
  return conferirLinhasComBase(comDuplicidadeArquivo, adapter, contexto);
}
