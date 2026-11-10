import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import {
  LIMITES_ARQUIVO_IMPORTACAO,
  mensagemTamanhoMaximoArquivo,
  tamanhoRequisicaoExcedeLimite,
  type ModuloImportacaoArquivo,
} from "@/lib/importacoes/limites";
import { criarImportacaoEmProcessamento } from "@/lib/importacao-centro/historico-auditoria";
import { receberUploadImportacao } from "@/lib/importacoes/resolver-entrada-importacao";
import { registrarErroTecnicoImportacao } from "@/lib/importacoes/log-tecnico";

const MODULOS_VALIDOS = new Set<ModuloImportacaoArquivo>(["debitos", "unidades", "condominios", "responsaveis"]);

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "iniciarImportacao");
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (tamanhoRequisicaoExcedeLimite(contentLength)) {
    registrarErroTecnicoImportacao({ codigo: "arquivo_grande", detalhe: "content-length" });
    return Response.json({ error: mensagemTamanhoMaximoArquivo() }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Envio inválido. Use multipart/form-data com o arquivo." }, { status: 400 });
  }

  const moduloRaw = String(formData.get("modulo") ?? "").trim();
  if (!MODULOS_VALIDOS.has(moduloRaw as ModuloImportacaoArquivo)) {
    return Response.json({ error: "Módulo de importação inválido." }, { status: 400 });
  }
  const modulo = moduloRaw as ModuloImportacaoArquivo;

  const campoArquivo = formData.get("arquivo");
  if (!(campoArquivo instanceof File)) {
    return Response.json({ error: "Selecione um arquivo para importar." }, { status: 400 });
  }

  if (campoArquivo.size > LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes) {
    registrarErroTecnicoImportacao({ codigo: "arquivo_grande", modulo });
    return Response.json({ error: mensagemTamanhoMaximoArquivo() }, { status: 400 });
  }

  const buffer = Buffer.from(await campoArquivo.arrayBuffer());
  const mimeDeclarado = campoArquivo.type || undefined;

  try {
    const recebido = await receberUploadImportacao(modulo, session.userId, {
      nomeArquivo: campoArquivo.name,
      buffer,
      mimeDeclarado,
    });
    criarImportacaoEmProcessamento({
      processoId: recebido.processoId,
      userId: session.userId,
      modulo: recebido.moduloEfetivo,
      arquivo: recebido.nomeArquivo,
      quantidadeRegistros: recebido.quantidadeRegistros,
      hashArquivo: recebido.hashArquivo,
    });
    return Response.json({ recebimento: recebido });
  } catch (error) {
    if (error instanceof ImportacaoCentroError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    registrarErroTecnicoImportacao({ codigo: "recebimento_inesperado", modulo });
    return Response.json({ error: "Não foi possível receber o arquivo." }, { status: 500 });
  }
}
