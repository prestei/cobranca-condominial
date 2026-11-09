import {
  getCadastros,
  opcoesAdvogadosResponsaveis,
  proximoNumero,
  registrarAuditoria,
  setResponsaveis,
  setUnidades,
  setVinculos,
  situacaoCobrancaUnidade,
  type Condominio,
  type Responsavel,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { normalizarNomeImportacao } from "@/lib/importacao-centro/normalizacao-campos";
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

/** Documento provisório (não é CPF/CNPJ) para responsáveis criados só pelo nome do relatório. */
function gerarDocumentoProvisorioResponsavel(nome: string): string {
  const slug = normalizarCabecalhoPlanilha(nome)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const base = slug || "RESPONSAVEL";
  const existentes = new Set(getCadastros().responsaveis.map((item) => item.cpfCnpj.trim().toLocaleUpperCase("pt-BR")));
  let candidato = `IMPORT-${base}`;
  if (!existentes.has(candidato)) return candidato;
  let sufixo = 2;
  while (existentes.has(`${candidato}-${sufixo}`)) sufixo += 1;
  return `${candidato}-${sufixo}`;
}

function nomeResponsavelNormalizado(nome: string): string {
  return (normalizarNomeImportacao(nome).normalizado ?? nome.trim()).toLocaleLowerCase("pt-BR");
}

function nomeResponsavelEquivalente(a: string, b: string): boolean {
  const na = nomeResponsavelNormalizado(a);
  const nb = nomeResponsavelNormalizado(b);
  if (!na || !nb) return false;
  return na === nb;
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

function localizarResponsavelExistente(nome: string, unidadeId: number): Responsavel | undefined {
  const cadastros = getCadastros();
  const vinculosUnidade = cadastros.vinculos.filter((item) => item.unidadeId === unidadeId);
  for (const vinculo of vinculosUnidade) {
    const responsavel = cadastros.responsaveis.find((item) => item.id === vinculo.responsavelId);
    if (responsavel && nomeResponsavelEquivalente(responsavel.nome, nome)) {
      return responsavel;
    }
  }

  const candidatos = cadastros.responsaveis.filter((item) => nomeResponsavelEquivalente(item.nome, nome));
  if (candidatos.length === 1) return candidatos[0];

  const provisarios = candidatos.filter((item) => item.cpfCnpj.trim().toLocaleUpperCase("pt-BR").startsWith("IMPORT-"));
  if (provisarios.length === 1) return provisarios[0];

  return undefined;
}

function garantirVinculoResponsavelUnidade(
  userId: number,
  unidadeId: number,
  responsavelId: number,
  meta?: { ip?: string; userAgent?: string },
): Vinculo | null {
  const cadastros = getCadastros();
  const jaExiste = cadastros.vinculos.some(
    (item) =>
      item.unidadeId === unidadeId &&
      item.responsavelId === responsavelId &&
      item.tipoVinculo === "Proprietario",
  );
  if (jaExiste) return null;

  const temPrincipal = cadastros.vinculos.some((item) => item.unidadeId === unidadeId && item.principal);
  const vinculoId = proximoNumero(cadastros.vinculos.map((item) => item.id));
  const vinculo: Vinculo = {
    id: vinculoId,
    unidadeId,
    responsavelId,
    tipoVinculo: "Proprietario",
    principal: !temPrincipal,
    observacoes: "Vínculo criado automaticamente na importação de inadimplência.",
  };
  setVinculos((current) => [...current, vinculo]);
  registrarAuditoria(
    {
      entidade: "unit_responsible_party",
      registroId: String(vinculoId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify(vinculo),
      camposAlterados: "unidade_id, responsavel_id, tipo_vinculo, principal",
    },
    userId,
    meta,
  );
  return vinculo;
}

export type ResultadoProvisionamentoCadastrosDebitos = {
  condominiosCriados: Condominio[];
  unidadesCriadas: Unidade[];
  responsaveisCriados: Responsavel[];
  vinculosCriados: Vinculo[];
};

/**
 * Garante condomínios, unidades e responsáveis referenciados no arquivo de inadimplência antes do parse dos débitos.
 * Operação idempotente: registros já existentes não são alterados (nem sobrescritos).
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
    return { condominiosCriados: [], unidadesCriadas: [], responsaveisCriados: [], vinculosCriados: [] };
  }

  const advogadosPadrao = resolverAdvogadosProvisionamento(userId);
  if (advogadosPadrao.length === 0) {
    return { condominiosCriados: [], unidadesCriadas: [], responsaveisCriados: [], vinculosCriados: [] };
  }

  const condominiosCriados: Condominio[] = [];
  const unidadesCriadas: Unidade[] = [];
  const responsaveisCriados: Responsavel[] = [];
  const vinculosCriados: Vinculo[] = [];
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
      let { unidadeId } = resolverUnidadeIdImportacaoDebitos(
        condominioId,
        identificacao,
        bloco !== "—" ? bloco : undefined,
        getCadastros().unidades,
      );

      if (!unidadeId) {
        const unidadesNoCondominio = getCadastros().unidades.filter((item) => item.condominioId === condominioId);
        const mesmaIdentificacao = unidadesNoCondominio.filter(
          (item) =>
            item.identificacao.trim().toLocaleLowerCase("pt-BR") === identificacao.toLocaleLowerCase("pt-BR"),
        );
        if (mesmaIdentificacao.length > 1 && !ref.bloco?.trim()) {
          continue;
        }

        // Unidade que entra pela inadimplência já tem débito no arquivo → Em cobrança.
        const nova = criarUnidade(
          userId,
          {
            condominioId,
            identificacao,
            bloco,
            tipo: "Apartamento",
            status: "Ativa",
            situacao: "Em cobrança",
          },
          meta,
          { ignorarEscopo: true },
        );
        unidadesCriadas.push(nova);
        unidadeId = nova.id;
      } else {
        // Unidade já existia fora da fila: ao receber débitos da importação, entra em cobrança.
        const existente = getCadastros().unidades.find((item) => item.id === unidadeId);
        if (existente && situacaoCobrancaUnidade(existente) === "Sem cobrança") {
          const atualizada: Unidade = { ...existente, situacao: "Em cobrança" };
          setUnidades((current) => current.map((item) => (item.id === existente.id ? atualizada : item)));
          registrarAuditoria(
            {
              entidade: "unit",
              registroId: String(existente.id),
              acao: "UPDATE",
              dadosAnteriores: JSON.stringify({ situacao: existente.situacao }),
              dadosNovos: JSON.stringify({ situacao: "Em cobrança" }),
              camposAlterados: "situacao",
            },
            userId,
            meta,
          );
        }
      }

      const nomeResponsavel = ref.responsavel?.trim() ?? "";
      if (!nomeResponsavel || !unidadeId) continue;

      let responsavel = localizarResponsavelExistente(nomeResponsavel, unidadeId);
      if (!responsavel) {
        const nomeNorm = normalizarNomeImportacao(nomeResponsavel).normalizado ?? nomeResponsavel;
        const nextId = proximoNumero(getCadastros().responsaveis.map((item) => item.id));
        const novo: Responsavel = {
          id: nextId,
          nome: nomeNorm,
          cpfCnpj: gerarDocumentoProvisorioResponsavel(nomeNorm),
          tipoPessoa: "Fisica",
          telefone: "",
          whatsapp: "",
          email: "",
          endereco: "",
          observacoes: "Cadastro criado automaticamente na importação de inadimplência (sem CPF/CNPJ no arquivo).",
        };
        setResponsaveis((current) => [...current, novo]);
        registrarAuditoria(
          {
            entidade: "responsible_party",
            registroId: String(nextId),
            acao: "INSERT",
            dadosAnteriores: "",
            dadosNovos: JSON.stringify({ id: nextId, nome: novo.nome, provisario: true }),
            camposAlterados: "nome, cpf_cnpj, tipo_pessoa",
          },
          userId,
          meta,
        );
        responsaveisCriados.push(novo);
        responsavel = novo;
      }

      const vinculo = garantirVinculoResponsavelUnidade(userId, unidadeId, responsavel.id, meta);
      if (vinculo) vinculosCriados.push(vinculo);
    } catch (error) {
      if (error instanceof CondominioServiceError || error instanceof UnidadeServiceError) {
        continue;
      }
      throw error;
    }
  }

  return { condominiosCriados, unidadesCriadas, responsaveisCriados, vinculosCriados };
}
