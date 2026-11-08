import {
  detectarFormatoPorAssinatura,
  pdfPareceCorrompido,
  pdfProtegidoOuCriptografado,
} from "@/lib/importacoes/detectar-formato";
import { LeituraArquivoImportacaoError, lerConteudoPlanilha } from "@/lib/importacoes/ler-conteudo-arquivo";
import {
  FORMATOS_AUTORIZADOS_POR_MODULO,
  LIMITES_ARQUIVO_IMPORTACAO,
  extensaoDoNome,
  formatoPorExtensao,
  mimePermitidoParaFormato,
  type ModuloImportacaoArquivo,
} from "@/lib/importacoes/limites";
import {
  criarProcessoArquivoTemporario,
  hashBufferArquivo,
  type ProcessoArquivoImportacao,
} from "@/lib/importacoes/armazenamento-temporario";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { registrarErroTecnicoImportacao } from "@/lib/importacoes/log-tecnico";

export class RecebimentoArquivoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo: string,
  ) {
    super(message);
  }
}

export type ResultadoRecebimentoArquivo = {
  processoId: string;
  nomeArquivo: string;
  formato: string;
  hashArquivo: string;
  tamanhoBytes: number;
  quantidadeRegistros: number;
};

function rejeitar(codigo: string, mensagem: string, status = 400, detalhe?: string): never {
  registrarErroTecnicoImportacao({ codigo, detalhe });
  throw new RecebimentoArquivoError(mensagem, status, codigo);
}

export async function receberArquivoImportacao(input: {
  userId: number;
  modulo: ModuloImportacaoArquivo;
  nomeArquivo: string;
  buffer: Buffer;
  mimeDeclarado?: string;
}): Promise<ResultadoRecebimentoArquivo> {
  const nomeArquivo = input.nomeArquivo.trim();
  if (!nomeArquivo) rejeitar("nome_ausente", "Informe o nome do arquivo.");

  if (!input.buffer || input.buffer.length === 0) {
    rejeitar("arquivo_vazio", "O arquivo está vazio.");
  }

  if (input.buffer.length > LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes) {
    rejeitar(
      "arquivo_grande",
      `O arquivo excede o tamanho máximo de ${Math.round(LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes / (1024 * 1024))} MiB.`,
    );
  }

  const extensao = extensaoDoNome(nomeArquivo);
  if (!extensao) rejeitar("extensao_ausente", "O arquivo deve ter uma extensão reconhecida (.csv, .xlsx, .xls ou .pdf).");

  const formatoPorNome = formatoPorExtensao(extensao, input.modulo);
  if (!formatoPorNome) {
    rejeitar("formato_nao_autorizado", "Formato não autorizado para este módulo.");
  }

  const assinatura = detectarFormatoPorAssinatura(input.buffer);
  if (!assinatura) {
    rejeitar("assinatura_desconhecida", "Não foi possível identificar o tipo real do arquivo. Verifique se não está corrompido.");
  }

  if (assinatura.formato !== formatoPorNome) {
    rejeitar(
      "extensao_incompativel",
      `A extensão ${extensao} não corresponde ao conteúdo do arquivo (${assinatura.formato}).`,
    );
  }

  const formatosModulo = FORMATOS_AUTORIZADOS_POR_MODULO[input.modulo];
  if (!formatosModulo.includes(assinatura.formato)) {
    rejeitar("formato_nao_autorizado", "Formato não autorizado para este módulo.");
  }

  const mime = input.mimeDeclarado?.trim() ?? "";
  if (mime && !mimePermitidoParaFormato(assinatura.formato, mime)) {
    rejeitar("mime_invalido", "O tipo MIME informado não é compatível com o arquivo.");
  }

  if (assinatura.formato === "pdf") {
    if (pdfProtegidoOuCriptografado(input.buffer)) {
      rejeitar("pdf_protegido", "PDF protegido por senha ou criptografado. Envie uma versão desbloqueada.");
    }
    if (pdfPareceCorrompido(input.buffer)) {
      rejeitar("arquivo_corrompido", "PDF corrompido ou incompleto.");
    }
  }

  let leitura;
  try {
    leitura = lerConteudoPlanilha(input.buffer, assinatura.formato);
  } catch (error) {
    if (error instanceof LeituraArquivoImportacaoError) {
      rejeitar(error.codigo, error.message);
    }
    rejeitar("leitura_falhou", "Não foi possível ler o arquivo.");
  }

  if (leitura.quantidadeRegistros === 0) {
    rejeitar("arquivo_vazio", "Nenhum registro de dados encontrado no arquivo.");
  }

  if (leitura.quantidadeRegistros > LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos) {
    rejeitar(
      "muitos_registros",
      `O arquivo excede o limite de ${LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos.toLocaleString("pt-BR")} registros.`,
    );
  }

  const hashArquivo =
    assinatura.formato === "xlsx" || assinatura.formato === "pdf"
      ? hashBufferArquivo(input.buffer)
      : hashConteudoArquivo(leitura.conteudoTexto ?? input.buffer.toString("utf8"));

  let processo: ProcessoArquivoImportacao;
  try {
    processo = await criarProcessoArquivoTemporario({
      userId: input.userId,
      modulo: input.modulo,
      nomeArquivo,
      formato: assinatura.formato,
      buffer: input.buffer,
      hashArquivo,
      conteudoTexto: leitura.conteudoTexto,
      matrizPlanilha: leitura.matriz,
      quantidadeRegistros: leitura.quantidadeRegistros,
      metadadosRelatorio: leitura.metadadosRelatorio,
    });
  } catch {
    rejeitar("armazenamento_falhou", "Não foi possível preparar o arquivo para processamento.", 500);
  }

  return {
    processoId: processo.id,
    nomeArquivo: processo.nomeArquivo,
    formato: processo.formato,
    hashArquivo: processo.hashArquivo,
    tamanhoBytes: processo.tamanhoBytes,
    quantidadeRegistros: leitura.quantidadeRegistros,
  };
}

/** Validação equivalente para fluxo legado (conteúdo já em texto no corpo JSON). */
export async function receberArquivoLegadoTexto(input: {
  userId: number;
  modulo: ModuloImportacaoArquivo;
  nomeArquivo: string;
  conteudo: string;
}): Promise<ResultadoRecebimentoArquivo> {
  const buffer = Buffer.from(input.conteudo.replace(/^\uFEFF/, ""), "utf8");
  return receberArquivoImportacao({
    userId: input.userId,
    modulo: input.modulo,
    nomeArquivo: input.nomeArquivo,
    buffer,
    mimeDeclarado: "text/plain",
  });
}
