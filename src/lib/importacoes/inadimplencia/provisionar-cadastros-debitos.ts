import {
  opcoesAdvogadosResponsaveis,
  proximoNumero,
  SITUACAO_COBRANCA_PADRAO,
  statusCondominio,
  statusUnidade,
  tiposUnidade,
  type Condominio,
  type Responsavel,
  type StatusCondominio,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
import {
  OBSERVACAO_CONDOMINIO_PROVISIONADO,
  OBSERVACAO_RESPONSAVEL_PROVISIONADO,
  OBSERVACAO_VINCULO_PROVISIONADO,
} from "@/lib/importacoes/inadimplencia/provisionamento-previa-markers";
import { getCadastros, registrarAuditoria, setCondominios, setResponsaveis, setUnidades, setVinculos } from "@/data/catalogo-store";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { normalizarNomeImportacao } from "@/lib/importacao-centro/normalizacao-campos";
import { CondominioServiceError, criarCondominio } from "@/lib/condominios/service";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { updateCondominium } from "@/lib/db/repositories/condominium-repository";
import {
  createResponsibleParty,
  findResponsiblePartyByTaxId,
  nextResponsiblePartyId,
} from "@/lib/db/repositories/responsible-party-repository";
import { createUnitLink, nextUnitLinkId } from "@/lib/db/repositories/unit-repository";
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

/** Quando a carteira tem um único município cadastrado, replica na provisão (relatórios PDF não trazem cidade). */
function resolverEnderecoPadraoCondominioProvisionamento(): { cidade: string; estado: string } {
  const pares = getCadastros()
    .condominios.map((item) => ({ cidade: item.cidade.trim(), estado: item.estado.trim() }))
    .filter((item) => item.cidade);
  if (pares.length === 0) return { cidade: "", estado: "" };

  const porCidade = new Map<string, Set<string>>();
  for (const item of pares) {
    const chave = item.cidade.toLocaleLowerCase("pt-BR");
    if (!porCidade.has(chave)) porCidade.set(chave, new Set());
    if (item.estado) porCidade.get(chave)!.add(item.estado.toLocaleUpperCase("pt-BR"));
  }
  if (porCidade.size !== 1) return { cidade: "", estado: "" };

  const [cidadeNorm, estados] = [...porCidade.entries()][0]!;
  const cidade = pares.find((item) => item.cidade.toLocaleLowerCase("pt-BR") === cidadeNorm)!.cidade;
  const estado = estados.size === 1 ? [...estados][0]! : "";
  return { cidade, estado };
}

async function completarEnderecoCondominioProvisionado(
  userId: number,
  condominioId: number,
  cidade: string,
  estado: string,
  persistirNoBanco: boolean,
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const cidadeInformada = cidade.trim();
  const estadoInformado = estado.trim();
  if (!cidadeInformada && !estadoInformado) return;

  const atual = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!atual) return;

  const precisaCidade = !atual.cidade.trim() && cidadeInformada;
  const precisaEstado = !atual.estado.trim() && estadoInformado;
  if (!precisaCidade && !precisaEstado) return;

  const atualizado: Condominio = {
    ...atual,
    cidade: precisaCidade ? cidadeInformada : atual.cidade,
    estado: precisaEstado ? estadoInformado : atual.estado,
  };
  setCondominios((current) => current.map((item) => (item.id === condominioId ? atualizado : item)));

  if (!persistirNoBanco) {
    registrarAuditoria(
      {
        entidade: "condominium",
        registroId: String(condominioId),
        acao: "UPDATE",
        dadosAnteriores: atual.nome,
        dadosNovos: atualizado.nome,
        camposAlterados: "cidade, estado, provisionamento_importacao",
      },
      userId,
      meta,
    );
    return;
  }

  const salvo = await updateCondominium(atualizado);
  setCondominios((current) => current.map((item) => (item.id === condominioId ? salvo : item)));
  await writeAuditLog({
    entity: "condominium",
    recordId: String(condominioId),
    action: "UPDATE",
    previousData: JSON.stringify({ cidade: atual.cidade, estado: atual.estado }),
    newData: JSON.stringify({ cidade: salvo.cidade, estado: salvo.estado }),
    changedFields: "cidade, estado, provisionamento_importacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

async function garantirResponsavelProvisionamento(
  userId: number,
  nomeResponsavel: string,
  unidadeId: number,
  persistirNoBanco: boolean,
  meta?: { ip?: string; userAgent?: string },
): Promise<{ responsavel: Responsavel; criado: boolean }> {
  let responsavel = localizarResponsavelExistente(nomeResponsavel, unidadeId);
  if (responsavel) return { responsavel, criado: false };

  const nomeNorm = normalizarNomeImportacao(nomeResponsavel).normalizado ?? nomeResponsavel;
  const docProvisorio = gerarDocumentoProvisorioResponsavel(nomeNorm);

  if (persistirNoBanco) {
    const existenteDoc = await findResponsiblePartyByTaxId(docProvisorio);
    if (existenteDoc && nomeResponsavelEquivalente(existenteDoc.nome, nomeNorm)) {
      if (!getCadastros().responsaveis.some((item) => item.id === existenteDoc.id)) {
        setResponsaveis((current) => [...current, existenteDoc]);
      }
      return { responsavel: existenteDoc, criado: false };
    }

    const nextId = await nextResponsiblePartyId();
    const novo: Responsavel = {
      id: nextId,
      nome: nomeNorm,
      cpfCnpj: docProvisorio,
      tipoPessoa: "Fisica",
      telefone: "",
      whatsapp: "",
      email: "",
      endereco: "",
      observacoes: OBSERVACAO_RESPONSAVEL_PROVISIONADO,
    };
    const salvo = await createResponsibleParty(novo);
    setResponsaveis((current) => [...current, salvo]);
    await writeAuditLog({
      entity: "responsible_party",
      recordId: String(salvo.id),
      action: "INSERT",
      previousData: "",
      newData: JSON.stringify({ id: salvo.id, nome: salvo.nome, provisario: true }),
      changedFields: "nome, cpf_cnpj, tipo_pessoa",
      userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return { responsavel: salvo, criado: true };
  }

  const nextId = proximoNumero(getCadastros().responsaveis.map((item) => item.id));
  const novo: Responsavel = {
    id: nextId,
    nome: nomeNorm,
    cpfCnpj: docProvisorio,
    tipoPessoa: "Fisica",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    observacoes: OBSERVACAO_RESPONSAVEL_PROVISIONADO,
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
  return { responsavel: novo, criado: true };
}

async function garantirVinculoResponsavelUnidade(
  userId: number,
  unidadeId: number,
  responsavelId: number,
  persistirNoBanco: boolean,
  meta?: { ip?: string; userAgent?: string },
): Promise<Vinculo | null> {
  const cadastros = getCadastros();
  const jaExiste = cadastros.vinculos.some(
    (item) =>
      item.unidadeId === unidadeId &&
      item.responsavelId === responsavelId &&
      item.tipoVinculo === "Proprietario",
  );
  if (jaExiste) return null;

  const temPrincipal = cadastros.vinculos.some((item) => item.unidadeId === unidadeId && item.principal);

  if (persistirNoBanco) {
    const vinculoId = await nextUnitLinkId();
    const vinculo: Vinculo = {
      id: vinculoId,
      unidadeId,
      responsavelId,
      tipoVinculo: "Proprietario",
      principal: !temPrincipal,
      observacoes: OBSERVACAO_VINCULO_PROVISIONADO,
    };
    const criado = await createUnitLink(vinculo);
    setVinculos((current) => [...current, criado]);
    await writeAuditLog({
      entity: "unit_responsible_party",
      recordId: String(criado.id),
      action: "INSERT",
      previousData: "",
      newData: JSON.stringify(criado),
      changedFields: "unidade_id, responsavel_id, tipo_vinculo, principal",
      userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return criado;
  }

  const vinculoId = proximoNumero(cadastros.vinculos.map((item) => item.id));
  const vinculo: Vinculo = {
    id: vinculoId,
    unidadeId,
    responsavelId,
    tipoVinculo: "Proprietario",
    principal: !temPrincipal,
    observacoes: OBSERVACAO_VINCULO_PROVISIONADO,
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

export type OpcoesProvisionamentoCadastrosDebitos = {
  /** Na prévia, cadastros auxiliares ficam só no catálogo da requisição; persistem na confirmação. */
  persistirNoBanco?: boolean;
};

type CondominioProvisionamentoInput = {
  nome: string;
  identificadorExterno: string;
  status: string;
  advogados: string[];
  administradora: string;
  observacao: string;
  cidade?: string;
  estado?: string;
};

type UnidadeProvisionamentoInput = {
  condominioId: number;
  identificacao: string;
  bloco: string;
  tipo: string;
  status: string;
  situacao: string;
};

function validarAdvogadosProvisionamento(nomes: string[]): void {
  const opcoes = new Set(opcoesAdvogadosResponsaveis(getCadastros()));
  if (nomes.length === 0) return;
  for (const nome of nomes) {
    if (!opcoes.has(nome)) {
      throw new CondominioServiceError("Advogado responsável inválido.", 400);
    }
  }
}

function identificadorExternoCondominioDuplicado(identificadorExterno: string): boolean {
  const norm = identificadorExterno.trim().toLocaleLowerCase("pt-BR");
  if (!norm) return false;
  return getCadastros().condominios.some(
    (item) => item.identificadorExterno.trim().toLocaleLowerCase("pt-BR") === norm,
  );
}

function unidadeIdentificacaoDuplicada(condominioId: number, identificacao: string): boolean {
  const norm = identificacao.trim().toLocaleLowerCase("pt-BR");
  return getCadastros().unidades.some(
    (item) =>
      item.condominioId === condominioId && item.identificacao.trim().toLocaleLowerCase("pt-BR") === norm,
  );
}

async function criarCondominioProvisionamento(
  userId: number,
  input: CondominioProvisionamentoInput,
  meta: { ip?: string; userAgent?: string } | undefined,
  persistirNoBanco: boolean,
): Promise<Condominio> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new CondominioServiceError("Informe o nome do condomínio.", 400);
  }
  validarAdvogadosProvisionamento(input.advogados);
  const identificadorExterno = input.identificadorExterno.trim();
  if (identificadorExterno && identificadorExternoCondominioDuplicado(identificadorExterno)) {
    throw new CondominioServiceError("Já existe um condomínio com este identificador.", 409);
  }
  const status = input.status;
  if (!statusCondominio.includes(status as StatusCondominio)) {
    throw new CondominioServiceError("Situação do condomínio inválida.", 400);
  }

  const enderecoPadrao = resolverEnderecoPadraoCondominioProvisionamento();
  const cidade = (input.cidade?.trim() || enderecoPadrao.cidade).trim();
  const estado = (input.estado?.trim() || enderecoPadrao.estado).trim();

  if (persistirNoBanco) {
    return criarCondominio(
      userId,
      {
        nome,
        identificadorExterno,
        status,
        advogados: [...input.advogados],
        administradora: input.administradora.trim(),
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        cidade,
        estado,
        observacao: input.observacao,
      },
      meta,
    );
  }

  const nextId = proximoNumero(getCadastros().condominios.map((item) => item.id));
  const condominio: Condominio = {
    id: nextId,
    nome,
    identificadorExterno,
    status,
    advogados: [...input.advogados],
    administradora: input.administradora.trim(),
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cidade,
    estado,
    observacao: input.observacao,
  };
  setCondominios((current) => [...current, condominio]);
  registrarAuditoria(
    {
      entidade: "condominium",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: condominio.nome,
      camposAlterados: "nome, identificador_externo, advogados, provisionamento_previa",
    },
    userId,
    meta,
  );
  return condominio;
}

async function criarUnidadeProvisionamento(
  userId: number,
  input: UnidadeProvisionamentoInput,
  meta: { ip?: string; userAgent?: string } | undefined,
  persistirNoBanco: boolean,
): Promise<Unidade> {
  const identificacao = input.identificacao.trim();
  if (!input.condominioId) {
    throw new UnidadeServiceError("Selecione o condomínio.", 400);
  }
  if (!identificacao) {
    throw new UnidadeServiceError("Informe a identificação da unidade.", 400);
  }
  if (!tiposUnidade.includes(input.tipo as (typeof tiposUnidade)[number])) {
    throw new UnidadeServiceError("Tipo de unidade inválido.", 400);
  }
  if (!statusUnidade.includes(input.status as (typeof statusUnidade)[number])) {
    throw new UnidadeServiceError("Situação da unidade inválida.", 400);
  }
  const condominio = getCadastros().condominios.find((item) => item.id === input.condominioId);
  if (!condominio) {
    throw new UnidadeServiceError("Condomínio inválido.", 400);
  }
  if (unidadeIdentificacaoDuplicada(input.condominioId, identificacao)) {
    throw new UnidadeServiceError("Já existe esta identificação neste condomínio.", 409);
  }

  if (persistirNoBanco) {
    return criarUnidade(
      userId,
      {
        condominioId: input.condominioId,
        identificacao,
        bloco: input.bloco,
        tipo: input.tipo,
        status: input.status,
        situacao: input.situacao,
      },
      meta,
      { ignorarEscopo: true },
    );
  }

  const nextId = proximoNumero(getCadastros().unidades.map((item) => item.id));
  const unidade: Unidade = {
    id: nextId,
    condominioId: input.condominioId,
    identificacao,
    bloco: input.bloco.trim(),
    tipo: input.tipo,
    status: input.status,
    situacao: input.situacao,
  };
  setUnidades((current) => [...current, unidade]);
  registrarAuditoria(
    {
      entidade: "unit",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify(unidade),
      camposAlterados: "condominio_id, identificacao, bloco, provisionamento_previa",
    },
    userId,
    meta,
  );
  return unidade;
}

/**
 * Garante condomínios, unidades e responsáveis referenciados no arquivo de inadimplência antes do parse dos débitos.
 * Operação idempotente: registros já existentes não são alterados (nem sobrescritos).
 * Autorizado pela permissão de importação (escopo de unidade é ignorado na criação auxiliar).
 */
export async function provisionarCadastrosImportacaoDebitos(
  matriz: string[][],
  userId: number,
  origem: string,
  meta?: { ip?: string; userAgent?: string },
  opcoes?: OpcoesProvisionamentoCadastrosDebitos,
): Promise<ResultadoProvisionamentoCadastrosDebitos> {
  const persistirNoBanco = opcoes?.persistirNoBanco === true;
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
  const enderecoPadrao = resolverEnderecoPadraoCondominioProvisionamento();

  for (const ref of referencias) {
    let condominioId: number | null = null;
    try {
      const valores: Partial<Record<string, string>> = {};
      if (ref.condominioNome) valores.condominioNome = ref.condominioNome;
      if (ref.condominioId) valores.condominioId = ref.condominioId;
      if (ref.condominioIdentificador) valores.condominioIdentificador = ref.condominioIdentificador;

      const cadastrosAtuais = getCadastros();
      condominioId = resolverCondominioIdImportacaoDebitos(valores, cadastrosAtuais.condominios, {
        unidades: cadastrosAtuais.unidades,
        identificacaoUnidade: ref.unidade,
        blocoUnidade: ref.bloco,
      });

      if (!condominioId && ref.condominioNome?.trim()) {
        const nome = ref.condominioNome.trim();
        const criado = await criarCondominioProvisionamento(
          userId,
          {
            nome,
            identificadorExterno: gerarIdentificadorExternoCondominio(nome),
            status: "Ativo",
            advogados: advogadosPadrao,
            administradora,
            observacao: OBSERVACAO_CONDOMINIO_PROVISIONADO,
            cidade: ref.condominioCidade?.trim() || enderecoPadrao.cidade,
            estado: ref.condominioEstado?.trim() || enderecoPadrao.estado,
          },
          meta,
          persistirNoBanco,
        );
        if (!getCadastros().condominios.some((item) => item.id === criado.id)) {
          setCondominios((current) => [...current, criado]);
        }
        condominiosCriados.push(criado);
        condominioId = criado.id;
      }

      if (!condominioId) continue;

      await completarEnderecoCondominioProvisionado(
        userId,
        condominioId,
        ref.condominioCidade?.trim() || enderecoPadrao.cidade,
        ref.condominioEstado?.trim() || enderecoPadrao.estado,
        persistirNoBanco,
        meta,
      );

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

        // Cadastro auxiliar na prévia: fica fora da fila até a confirmação gravar os débitos.
        const nova = await criarUnidadeProvisionamento(
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
          persistirNoBanco,
        );
        if (!getCadastros().unidades.some((item) => item.id === nova.id)) {
          setUnidades((current) => [...current, nova]);
        }
        unidadesCriadas.push(nova);
        unidadeId = nova.id;
      }

      const nomeResponsavel = ref.responsavel?.trim() ?? "";
      if (!nomeResponsavel || !unidadeId) continue;

      const { responsavel, criado: responsavelCriado } = await garantirResponsavelProvisionamento(
        userId,
        nomeResponsavel,
        unidadeId,
        persistirNoBanco,
        meta,
      );
      if (responsavelCriado) responsaveisCriados.push(responsavel);

      const vinculo = await garantirVinculoResponsavelUnidade(
        userId,
        unidadeId,
        responsavel.id,
        persistirNoBanco,
        meta,
      );
      if (vinculo) vinculosCriados.push(vinculo);
    } catch (error) {
      if (error instanceof UnidadeServiceError && error.status === 409 && condominioId) {
        await reidratarCatalogoCadastralImportacaoDebitos();
        const identificacao = ref.unidade?.trim() ?? "";
        const bloco = blocoPadrao(identificacao, ref.bloco);
        const existente = resolverUnidadeIdImportacaoDebitos(
          condominioId,
          identificacao,
          bloco !== "—" ? bloco : undefined,
          getCadastros().unidades,
        );
        if (existente.unidadeId) continue;
      }
      if (error instanceof CondominioServiceError || error instanceof UnidadeServiceError) {
        continue;
      }
      throw error;
    }
  }

  await reidratarCatalogoCadastralImportacaoDebitos();

  return { condominiosCriados, unidadesCriadas, responsaveisCriados, vinculosCriados };
}

/** Na prévia, cadastros provisionados ficam só na memória — não podem ser descartados ao sincronizar com o PG. */
function mesclarCadastroPorId<T extends { id: number }>(banco: T[], memoria: T[]): T[] {
  const porId = new Map<number, T>();
  for (const item of banco) porId.set(item.id, item);
  for (const item of memoria) {
    if (!porId.has(item.id)) porId.set(item.id, item);
  }
  return [...porId.values()];
}

/**
 * Sincroniza condomínio/unidade/responsável do PostgreSQL para o catálogo em memória da requisição.
 * Necessário quando a unidade já existe no banco (409) mas ainda não estava no snapshot inicial.
 * Mantém registros provisionados na prévia que ainda não foram persistidos.
 */
export async function reidratarCatalogoCadastralImportacaoDebitos(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  const memoria = getCadastros();
  const { listCondominiums } = await import("@/lib/db/repositories/condominium-repository");
  const { listUnits, listUnitLinks } = await import("@/lib/db/repositories/unit-repository");
  const { listResponsibleParties } = await import("@/lib/db/repositories/responsible-party-repository");
  const [condominiosDb, unidadesDb, responsaveisDb, vinculosDb] = await Promise.all([
    listCondominiums(),
    listUnits(),
    listResponsibleParties(),
    listUnitLinks(),
  ]);
  setCondominios(mesclarCadastroPorId(condominiosDb, memoria.condominios));
  setUnidades(mesclarCadastroPorId(unidadesDb, memoria.unidades));
  setResponsaveis(mesclarCadastroPorId(responsaveisDb, memoria.responsaveis));
  setVinculos(mesclarCadastroPorId(vinculosDb, memoria.vinculos));
}

export type ProvisionamentoPendenteObservacao = {
  resultado: ResultadoProvisionamentoCadastrosDebitos;
  persistidoNoBanco: boolean;
};

/** Registro efêmero do último provisionamento (mesma requisição de prévia), para gravar em `import.observacao_interna`. */
let provisionamentoPendenteObservacao: ProvisionamentoPendenteObservacao | null = null;

export function registrarProvisionamentoPendenteObservacao(
  resultado: ResultadoProvisionamentoCadastrosDebitos,
  persistidoNoBanco: boolean,
) {
  provisionamentoPendenteObservacao = { resultado, persistidoNoBanco };
}

export function consumirProvisionamentoPendenteObservacao(): ProvisionamentoPendenteObservacao | null {
  const atual = provisionamentoPendenteObservacao;
  provisionamentoPendenteObservacao = null;
  return atual;
}
