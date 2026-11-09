import {
  detectarFormatoPorAssinatura,
  eAssinaturaExecutavel,
  eAssinaturaOleComposto,
  eAssinaturaZip,
  pdfPareceCorrompido,
  pdfProtegidoOuCriptografado,
} from "@/lib/importacoes/detectar-formato";
import { LeituraArquivoImportacaoError, lerConteudoPlanilha } from "@/lib/importacoes/ler-conteudo-arquivo";
import {
  FORMATOS_IMPORTACAO_CONHECIDOS,
  LIMITES_ARQUIVO_IMPORTACAO,
  extensaoDoNome,
  formatoPorExtensaoConhecida,
  mensagemLimiteRegistros,
  mensagemTamanhoMaximoArquivo,
  mimePermitidoParaFormato,
  type ModuloImportacaoArquivo,
} from "@/lib/importacoes/limites";
import {
  criarProcessoArquivoTemporario,
  hashBufferArquivo,
  type ProcessoArquivoImportacao,
} from "@/lib/importacoes/armazenamento-temporario";
import {
  detectarModuloImportacaoPorConteudo,
  mensagemModuloCorrigido,
} from "@/lib/importacoes/detectar-modulo-conteudo";
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
  /** Módulo escolhido na UI. */
  moduloSolicitado: ModuloImportacaoArquivo;
  /** Módulo efetivo após detecção do conteúdo (pode diferir do solicitado). */
  moduloEfetivo: ModuloImportacaoArquivo;
  /** true quando o arquivo foi redirecionado para outro destino. */
  moduloCorrigido: boolean;
  mensagemModulo?: string;
};

function rejeitar(
  codigo: string,
  mensagem: string,
  status = 400,
  extra?: { detalhe?: string; modulo?: string },
): never {
  registrarErroTecnicoImportacao({
    codigo,
    detalhe: extra?.detalhe,
    modulo: extra?.modulo,
  });
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
  const contextoErro = { modulo: input.modulo };
  if (!nomeArquivo) rejeitar("nome_ausente", "Informe o nome do arquivo.", 400, contextoErro);

  if (!input.buffer || input.buffer.length === 0) {
    rejeitar("arquivo_vazio", "O arquivo está vazio.", 400, contextoErro);
  }

  if (input.buffer.length > LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes) {
    rejeitar("arquivo_grande", mensagemTamanhoMaximoArquivo(), 400, contextoErro);
  }

  const extensao = extensaoDoNome(nomeArquivo);
  if (!extensao) {
    rejeitar(
      "extensao_ausente",
      "O arquivo deve ter uma extensão reconhecida (.csv, .xlsx, .xls ou .pdf).",
      400,
      contextoErro,
    );
  }

  // Aceita qualquer formato conhecido: o conteúdo define o módulo efetivo.
  const formatoPorNome = formatoPorExtensaoConhecida(extensao);
  if (!formatoPorNome) {
    rejeitar(
      "formato_nao_autorizado",
      "Formato não autorizado. Use CSV, XLSX, XLS ou PDF.",
      400,
      contextoErro,
    );
  }

  if (eAssinaturaExecutavel(input.buffer)) {
    rejeitar(
      "formato_nao_autorizado",
      "Arquivo executável ou de sistema não é autorizado para importação.",
      400,
      contextoErro,
    );
  }

  if (eAssinaturaOleComposto(input.buffer)) {
    rejeitar(
      "arquivo_protegido",
      "Arquivo Excel binário (.xls) ou protegido por senha não é suportado. Exporte para CSV ou XLSX sem senha.",
      400,
      contextoErro,
    );
  }

  if (eAssinaturaZip(input.buffer) && formatoPorNome !== "xlsx") {
    rejeitar(
      "extensao_incompativel",
      `A extensão ${extensao} não corresponde ao conteúdo do arquivo (xlsx).`,
      400,
      contextoErro,
    );
  }

  const assinatura = detectarFormatoPorAssinatura(input.buffer);
  if (!assinatura) {
    if (eAssinaturaZip(input.buffer)) {
      rejeitar(
        "formato_nao_autorizado",
        "O arquivo compactado não é uma planilha XLSX autorizada.",
        400,
        contextoErro,
      );
    }
    rejeitar(
      "assinatura_desconhecida",
      "Não foi possível identificar o tipo real do arquivo. Verifique se não está corrompido.",
      400,
      contextoErro,
    );
  }

  if (assinatura.formato !== formatoPorNome) {
    rejeitar(
      "extensao_incompativel",
      `A extensão ${extensao} não corresponde ao conteúdo do arquivo (${assinatura.formato}).`,
      400,
      contextoErro,
    );
  }

  if (!FORMATOS_IMPORTACAO_CONHECIDOS.includes(assinatura.formato)) {
    rejeitar("formato_nao_autorizado", "Formato não autorizado. Use CSV, XLSX, XLS ou PDF.", 400, contextoErro);
  }

  const mime = input.mimeDeclarado?.trim() ?? "";
  if (mime && !mimePermitidoParaFormato(assinatura.formato, mime)) {
    rejeitar("mime_invalido", "O tipo MIME informado não é compatível com o arquivo.", 400, contextoErro);
  }

  if (assinatura.formato === "pdf") {
    if (pdfProtegidoOuCriptografado(input.buffer)) {
      rejeitar(
        "pdf_protegido",
        "PDF protegido por senha ou criptografado. Envie uma versão desbloqueada.",
        400,
        contextoErro,
      );
    }
    if (pdfPareceCorrompido(input.buffer)) {
      rejeitar("arquivo_corrompido", "PDF corrompido ou incompleto.", 400, contextoErro);
    }
  }

  let leitura;
  try {
    leitura = await lerConteudoPlanilha(input.buffer, assinatura.formato);
  } catch (error) {
    if (error instanceof LeituraArquivoImportacaoError) {
      rejeitar(error.codigo, error.message, 400, contextoErro);
    }
    rejeitar("leitura_falhou", "Não foi possível ler o arquivo.", 400, contextoErro);
  }

  if (leitura.quantidadeRegistros === 0) {
    rejeitar("arquivo_vazio", "Nenhum registro de dados encontrado no arquivo.", 400, contextoErro);
  }

  if (leitura.quantidadeRegistros > LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos) {
    rejeitar("muitos_registros", mensagemLimiteRegistros(), 400, contextoErro);
  }

  const moduloEfetivo = detectarModuloImportacaoPorConteudo({
    moduloSolicitado: input.modulo,
    matriz: leitura.matriz,
    metadadosRelatorio: leitura.metadadosRelatorio,
  });
  const moduloCorrigido = moduloEfetivo !== input.modulo;
  const avisoModulo = mensagemModuloCorrigido(input.modulo, moduloEfetivo);

  const hashArquivo =
    assinatura.formato === "xlsx" || assinatura.formato === "pdf"
      ? hashBufferArquivo(input.buffer)
      : hashConteudoArquivo(leitura.conteudoTexto ?? input.buffer.toString("utf8"));

  let processo: ProcessoArquivoImportacao;
  try {
    processo = await criarProcessoArquivoTemporario({
      userId: input.userId,
      modulo: moduloEfetivo,
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
    rejeitar("armazenamento_falhou", "Não foi possível preparar o arquivo para processamento.", 500, contextoErro);
  }

  return {
    processoId: processo.id,
    nomeArquivo: processo.nomeArquivo,
    formato: processo.formato,
    hashArquivo: processo.hashArquivo,
    tamanhoBytes: processo.tamanhoBytes,
    quantidadeRegistros: leitura.quantidadeRegistros,
    moduloSolicitado: input.modulo,
    moduloEfetivo,
    moduloCorrigido,
    mensagemModulo: avisoModulo,
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
