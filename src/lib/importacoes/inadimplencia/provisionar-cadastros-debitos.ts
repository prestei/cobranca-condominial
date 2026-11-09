import {
  getCadastros,
  opcoesAdvogadosResponsaveis,
  SITUACAO_COBRANCA_PADRAO,
  type Condominio,
  type Unidade,
} from "@/data/catalogo";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { CondominioServiceError, criarCondominio } from "@/lib/condominios/service";
import {
  extrairReferenciasCadastraisMatrizDebitos,
  resolverCondominioIdImportacaoDebitos,
  resolverUnidadeIdImportacaoDebitos,
} from "@/lib/importacoes/importar-debitos-planilha";
import { criarUnidade, UnidadeServiceError } from "@/lib/unidades/service";

function blocoPadrao(identificacao: string, blocoInformado?: string): string {
  const bloco = blocoInformado?.trim().replace(/^—$/, "") ?? "";
  if (bloco) return bloco;
  const prefixo = identificacao.split("-")[0]?.trim();
  return prefixo || "—";
}

function gerarIdentificadorExternoCondominio(nome: string): string {
  const norm = normalizarCabecalhoPlanilha(nome)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const base = norm || "CONDOMINIO";
  const existentes = new Set(
    getCadastros().condominios.map((item) => item.identificadorExterno.trim().toLocaleUpperCase("pt-BR")),
  );
  let candidato = `IMPORT-${base}`;
  if (!existentes.has(candidato)) return candidato;
  let sufixo = 2;
  while (existentes.has(`${candidato}-${sufixo}`)) sufixo += 1;
  return `${candidato}-${sufixo}`;
}

/** Prefere o próprio usuário quando ele é opção válida de advogado; senão o primeiro da lista. */
function resolverAdvogadosProvisionamento(userId: number): string[] {
  const cadastros = getCadastros();
  const opcoes = opcoesAdvogadosResponsaveis(cadastros);
  if (opcoes.length === 0) return [];
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (usuario?.nome && opcoes.includes(usuario.nome)) {
    return [usuario.nome];
  }
  return [opcoes[0]!];
}

export type ResultadoProvisionamentoCadastrosDebitos = {
  condominiosCriados: Condominio[];
  unidadesCriadas: Unidade[];
};

/**
 * Garante condomínios e unidades referenciados no arquivo de inadimplência antes do parse dos débitos.
 * Operação idempotente: registros já existentes não são alterados.
 * Autorizado pela permissão de importação (escopo de unidade é ignorado na criação auxiliar).
 */
export function provisionarCadastrosImportacaoDebitos(
  matriz: string[][],
  userId: number,
  origem: string,
  meta?: { ip?: string; userAgent?: string },
): ResultadoProvisionamentoCadastrosDebitos {
  const referencias = extrairReferenciasCadastraisMatrizDebitos(matriz);
  if (referencias.length === 0) {
    return { condominiosCriados: [], unidadesCriadas: [] };
  }

  const advogadosPadrao = resolverAdvogadosProvisionamento(userId);
  if (advogadosPadrao.length === 0) {
    return { condominiosCriados: [], unidadesCriadas: [] };
  }

  const condominiosCriados: Condominio[] = [];
  const unidadesCriadas: Unidade[] = [];
  const administradora = origem.trim() || "Importação";

  for (const ref of referencias) {
    try {
      const valores: Partial<Record<string, string>> = {};
      if (ref.condominioNome) valores.condominioNome = ref.condominioNome;
      if (ref.condominioId) valores.condominioId = ref.condominioId;
      if (ref.condominioIdentificador) valores.condominioIdentificador = ref.condominioIdentificador;

      let condominioId = resolverCondominioIdImportacaoDebitos(valores, getCadastros().condominios);

      if (!condominioId && ref.condominioNome?.trim()) {
        const nome = ref.condominioNome.trim();
        const criado = criarCondominio(
          userId,
          {
            nome,
            identificadorExterno: gerarIdentificadorExternoCondominio(nome),
            status: "Ativo",
            advogados: advogadosPadrao,
            administradora,
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            cidade: "",
            estado: "",
            observacao: "Cadastro criado automaticamente na importação de inadimplência.",
          },
          meta,
        );
        condominiosCriados.push(criado);
        condominioId = criado.id;
      }

      if (!condominioId) continue;

      const identificacao = ref.unidade?.trim() ?? "";
      if (!identificacao) continue;

      const bloco = blocoPadrao(identificacao, ref.bloco);
      const { unidadeId } = resolverUnidadeIdImportacaoDebitos(
        condominioId,
        identificacao,
        bloco !== "—" ? bloco : undefined,
        getCadastros().unidades,
      );

      if (unidadeId) continue;

      const unidadesNoCondominio = getCadastros().unidades.filter((item) => item.condominioId === condominioId);
      const mesmaIdentificacao = unidadesNoCondominio.filter(
        (item) =>
          item.identificacao.trim().toLocaleLowerCase("pt-BR") === identificacao.toLocaleLowerCase("pt-BR"),
      );
      if (mesmaIdentificacao.length > 1 && !ref.bloco?.trim()) {
        continue;
      }

      const nova = criarUnidade(
        userId,
        {
          condominioId,
          identificacao,
          bloco,
          tipo: "Apartamento",
          status: "Ativa",
          situacao: SITUACAO_COBRANCA_PADRAO,
        },
        meta,
        { ignorarEscopo: true },
      );
      unidadesCriadas.push(nova);
    } catch (error) {
      if (error instanceof CondominioServiceError || error instanceof UnidadeServiceError) {
        continue;
      }
      throw error;
    }
  }

  return { condominiosCriados, unidadesCriadas };
}
