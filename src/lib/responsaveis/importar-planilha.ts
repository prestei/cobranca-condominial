import { tiposPessoa, tiposVinculo, type Responsavel } from "@/data/catalogo";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";
import { normalizarCpfCnpjImportacao } from "@/lib/importacao-centro/normalizacao-campos";

export type ResponsavelVinculoImportPayload = {
  unidadeId: number;
  responsavel: Omit<Responsavel, "id">;
  tipoVinculo: string;
  principal: boolean;
  identificadorExterno?: string;
};

export type ResultadoLinhaImportacaoResponsavel = {
  linha: number;
  payload?: ResponsavelVinculoImportPayload;
  erro?: string;
};

export type ResumoImportacaoResponsaveis = {
  linhas: ResultadoLinhaImportacaoResponsavel[];
  importaveis: ResponsavelVinculoImportPayload[];
};

function normalizarCabecalho(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

const mapaCabecalho: Record<string, string> = {
  unidade: "identificacao",
  identificacao: "identificacao",
  identificação: "identificacao",
  bloco: "bloco",
  condominio: "condominioNome",
  condomínio: "condominioNome",
  "condominio id": "condominioId",
  condominio_id: "condominioId",
  nome: "nome",
  "cpf cnpj": "cpfCnpj",
  "cpf/cnpj": "cpfCnpj",
  cpf: "cpfCnpj",
  cnpj: "cpfCnpj",
  documento: "cpfCnpj",
  "tipo pessoa": "tipoPessoa",
  telefone: "telefone",
  whatsapp: "whatsapp",
  email: "email",
  "e-mail": "email",
  endereco: "endereco",
  endereço: "endereco",
  observacoes: "observacoes",
  observações: "observacoes",
  "tipo vinculo": "tipoVinculo",
  "tipo vínculo": "tipoVinculo",
  vinculo: "tipoVinculo",
  vínculo: "tipoVinculo",
  principal: "principal",
  "identificador externo": "identificadorExterno",
  identificador: "identificadorExterno",
};

function resolverCondominioId(
  condominioIdRaw: string | undefined,
  condominioNomeRaw: string | undefined,
  condominios: Array<{ id: number; nome: string }>,
): number | null {
  if (condominioIdRaw?.trim()) {
    const id = Number(condominioIdRaw.trim());
    if (Number.isFinite(id) && condominios.some((item) => item.id === id)) return id;
  }
  const nome = condominioNomeRaw?.trim();
  if (!nome) return null;
  const alvo = normalizarCabecalho(nome);
  const encontrado = condominios.find((item) => normalizarCabecalho(item.nome) === alvo);
  return encontrado?.id ?? null;
}

function resolverUnidadeId(
  condominioId: number,
  identificacao: string,
  bloco: string,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>,
): number | null {
  const idNorm = identificacao.trim().toLocaleLowerCase("pt-BR");
  const blocoNorm = bloco.trim().toLocaleLowerCase("pt-BR");
  const candidatas = unidades.filter(
    (item) => item.condominioId === condominioId && item.identificacao.trim().toLocaleLowerCase("pt-BR") === idNorm,
  );
  if (candidatas.length === 0) return null;
  if (blocoNorm) {
    return candidatas.find((item) => (item.bloco ?? "").trim().toLocaleLowerCase("pt-BR") === blocoNorm)?.id ?? null;
  }
  if (candidatas.length === 1) return candidatas[0]!.id;
  const semBloco = candidatas.filter((item) => !(item.bloco ?? "").trim());
  if (semBloco.length === 1) return semBloco[0]!.id;
  return null;
}

function parsePrincipal(valor: string | undefined): boolean {
  const texto = (valor ?? "").trim().toLocaleLowerCase("pt-BR");
  if (!texto) return false;
  return ["sim", "s", "1", "true", "verdadeiro", "principal"].includes(texto);
}

function parseTipoPessoa(valor: string | undefined, doc: string): string {
  const texto = valor?.trim() ?? "";
  if (texto && tiposPessoa.includes(texto as (typeof tiposPessoa)[number])) {
    return texto;
  }
  const digitos = doc.replace(/\D/g, "");
  return digitos.length > 11 ? "Juridica" : "Fisica";
}

function parseTipoVinculo(valor: string | undefined): string | null {
  const texto = valor?.trim() ?? "";
  if (!texto) return "Proprietario";
  const alvo = texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
  const mapa: Record<string, string> = {
    proprietario: "Proprietario",
    proprietário: "Proprietario",
    inquilino: "Inquilino",
    administrador: "Administrador",
    sindico: "Sindico",
    síndico: "Sindico",
  };
  const chave = alvo.toLocaleLowerCase("pt-BR");
  const normalizado = mapa[chave] ?? texto;
  if (tiposVinculo.includes(normalizado as (typeof tiposVinculo)[number])) {
    return normalizado;
  }
  return null;
}

function montarPayload(
  valores: Record<string, string | undefined>,
  condominios: Array<{ id: number; nome: string }>,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>,
): { payload?: ResponsavelVinculoImportPayload; erro?: string } {
  const condominioId = resolverCondominioId(valores.condominioId, valores.condominioNome, condominios);
  if (!condominioId) {
    return { erro: "Condomínio inválido ou fora do escopo." };
  }

  const identificacao = valores.identificacao?.trim() ?? "";
  if (!identificacao) {
    return { erro: "Informe a identificação da unidade." };
  }

  const bloco = valores.bloco?.trim() ?? "";
  const unidadeId = resolverUnidadeId(condominioId, identificacao, bloco, unidades);
  if (!unidadeId) {
    return { erro: "Unidade não encontrada no condomínio informado." };
  }

  const nome = valores.nome?.trim() ?? "";
  if (!nome) {
    return { erro: "Informe o nome do responsável." };
  }

  const cpfResultado = normalizarCpfCnpjImportacao(valores.cpfCnpj ?? "");
  if (cpfResultado.erro || !cpfResultado.normalizado) {
    return { erro: cpfResultado.erro ?? "CPF/CNPJ inválido ou ausente." };
  }

  const tipoVinculo = parseTipoVinculo(valores.tipoVinculo);
  if (!tipoVinculo) {
    return { erro: "Tipo de vínculo inválido." };
  }

  const docFormatado = cpfResultado.normalizado;

  return {
    payload: {
      unidadeId,
      tipoVinculo,
      principal: parsePrincipal(valores.principal),
      identificadorExterno: valores.identificadorExterno?.trim() || undefined,
      responsavel: {
        nome,
        cpfCnpj: docFormatado,
        tipoPessoa: parseTipoPessoa(valores.tipoPessoa, docFormatado),
        telefone: valores.telefone?.trim() ?? "",
        whatsapp: valores.whatsapp?.trim() ?? "",
        email: valores.email?.trim() ?? "",
        endereco: valores.endereco?.trim() ?? "",
        observacoes: valores.observacoes?.trim() ?? "",
      },
    },
  };
}

export function interpretarPlanilhaResponsaveis(
  matriz: string[][],
  condominios: Array<{ id: number; nome: string }>,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>,
): ResumoImportacaoResponsaveis {
  if (matriz.length === 0) {
    return { linhas: [], importaveis: [] };
  }

  const cabecalho = matriz[0].map((cell) => normalizarCabecalho(cell));
  const indicePorCampo: Record<string, number> = {};
  cabecalho.forEach((coluna, indice) => {
    const campo = mapaCabecalho[coluna];
    if (campo && indicePorCampo[campo] === undefined) {
      indicePorCampo[campo] = indice;
    }
  });

  const linhas: ResultadoLinhaImportacaoResponsavel[] = [];
  const importaveis: ResponsavelVinculoImportPayload[] = [];

  for (let i = 1; i < matriz.length; i += 1) {
    const linhaBruta = matriz[i];
    const vazia = linhaBruta.every((cell) => !cell?.trim());
    if (vazia) continue;

    const valores: Record<string, string | undefined> = {};
    for (const [campo, indice] of Object.entries(indicePorCampo)) {
      valores[campo] = linhaBruta[indice]?.trim();
    }

    const { payload, erro } = montarPayload(valores, condominios, unidades);
    const registro: ResultadoLinhaImportacaoResponsavel = { linha: i + 1 };
    if (erro) {
      registro.erro = erro;
    } else if (payload) {
      registro.payload = payload;
      importaveis.push(payload);
    }
    linhas.push(registro);
  }

  return { linhas, importaveis };
}

export function interpretarArquivoResponsaveis(
  conteudo: string,
  condominios: Array<{ id: number; nome: string }>,
  unidades: Array<{ id: number; condominioId: number; identificacao: string; bloco: string }>,
): ResumoImportacaoResponsaveis {
  const matriz = lerMatrizPlanilha(conteudo);
  return interpretarPlanilhaResponsaveis(matriz, condominios, unidades);
}
