import type {
  Auditoria,
  Cadastros,
  Condominio,
  Debito,
  Importacao,
  Responsavel,
  Unidade,
  Usuario,
  Vinculo,
  Cargo,
} from "@/data/catalogo";
import { comTransacaoPg, databaseUrlConfigurada, queryPg } from "@/lib/db/pool";
import type { PoolClient } from "pg";

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function intOuNull(value: string | number | null | undefined): number | null {
  const n = num(value);
  return n === null ? null : Math.trunc(n);
}

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

async function ajustarSequencia(client: PoolClient, tabela: string, coluna = "id") {
  const tabelaSql = tabela === "user" ? `"user"` : tabela;
  await client.query(
    `SELECT setval(
       pg_get_serial_sequence($1, $2),
       GREATEST(COALESCE((SELECT MAX(${coluna}) FROM ${tabelaSql}), 1), 1),
       true
     )`,
    [tabela === "user" ? "user" : tabela, coluna],
  );
}

async function garantirUsuariosECargos(
  client: PoolClient,
  cargos: Cargo[],
  usuarios: Usuario[],
) {
  for (const cargo of cargos) {
    await client.query(
      `INSERT INTO role (id, nome, descricao, permissao_json, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         permissao_json = EXCLUDED.permissao_json,
         ativo = EXCLUDED.ativo`,
      [cargo.id, cargo.nome, cargo.descricao ?? "", cargo.permissaoJson ?? "{}", cargo.ativo !== false],
    );
  }
  await ajustarSequencia(client, "role");

  for (const usuario of usuarios) {
    await client.query(
      `INSERT INTO "user" (id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         codigo = EXCLUDED.codigo,
         codigo_re = EXCLUDED.codigo_re,
         cargo_id = EXCLUDED.cargo_id,
         nome = EXCLUDED.nome,
         telefone = EXCLUDED.telefone,
         email = EXCLUDED.email,
         senha = COALESCE(EXCLUDED.senha, "user".senha),
         ativo = EXCLUDED.ativo`,
      [
        usuario.id,
        usuario.codigo,
        texto(usuario.codigoRe) ?? null,
        usuario.cargoId,
        usuario.nome,
        texto(usuario.telefone),
        texto(usuario.email),
        usuario.senha || null,
        usuario.ativo !== false,
      ],
    );
  }
  await ajustarSequencia(client, "user");
}

async function gravarCondominios(client: PoolClient, condominios: Condominio[]) {
  for (const item of condominios) {
    await client.query(
      `INSERT INTO condominium (
         id, nome, identificador_externo, status, advogados_json, administradora,
         estado, cidade, cep, logradouro, numero, complemento, observacao
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         identificador_externo = EXCLUDED.identificador_externo,
         status = EXCLUDED.status,
         advogados_json = EXCLUDED.advogados_json,
         administradora = EXCLUDED.administradora,
         estado = EXCLUDED.estado,
         cidade = EXCLUDED.cidade,
         cep = EXCLUDED.cep,
         logradouro = EXCLUDED.logradouro,
         numero = EXCLUDED.numero,
         complemento = EXCLUDED.complemento,
         observacao = EXCLUDED.observacao`,
      [
        item.id,
        item.nome,
        texto(item.identificadorExterno),
        item.status,
        JSON.stringify(item.advogados ?? []),
        texto(item.administradora),
        texto(item.estado),
        texto(item.cidade),
        texto(item.cep),
        texto(item.logradouro),
        texto(item.numero),
        texto(item.complemento),
        texto(item.observacao),
      ],
    );
  }
  await ajustarSequencia(client, "condominium");
}

async function gravarUnidades(client: PoolClient, unidades: Unidade[]) {
  for (const item of unidades) {
    await client.query(
      `INSERT INTO unit (id, condominio_id, identificacao, bloco, tipo, status, situacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         condominio_id = EXCLUDED.condominio_id,
         identificacao = EXCLUDED.identificacao,
         bloco = EXCLUDED.bloco,
         tipo = EXCLUDED.tipo,
         status = EXCLUDED.status,
         situacao = EXCLUDED.situacao`,
      [
        item.id,
        item.condominioId,
        item.identificacao,
        texto(item.bloco),
        item.tipo,
        item.status,
        item.situacao,
      ],
    );
  }
  await ajustarSequencia(client, "unit");
}

async function gravarResponsaveis(client: PoolClient, responsaveis: Responsavel[]) {
  for (const item of responsaveis) {
    await client.query(
      `INSERT INTO responsible_party (
         id, nome, cpf_cnpj, tipo_pessoa, telefone, whatsapp, email, endereco, observacoes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         cpf_cnpj = EXCLUDED.cpf_cnpj,
         tipo_pessoa = EXCLUDED.tipo_pessoa,
         telefone = EXCLUDED.telefone,
         whatsapp = EXCLUDED.whatsapp,
         email = EXCLUDED.email,
         endereco = EXCLUDED.endereco,
         observacoes = EXCLUDED.observacoes`,
      [
        item.id,
        item.nome,
        item.cpfCnpj,
        item.tipoPessoa,
        texto(item.telefone),
        texto(item.whatsapp),
        texto(item.email),
        texto(item.endereco),
        texto(item.observacoes),
      ],
    );
  }
  await ajustarSequencia(client, "responsible_party");
}

async function gravarVinculos(client: PoolClient, vinculos: Vinculo[]) {
  for (const item of vinculos) {
    await client.query(
      `INSERT INTO unit_responsible_party (
         id, unidade_id, responsavel_id, tipo_vinculo, principal, observacoes
       ) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         unidade_id = EXCLUDED.unidade_id,
         responsavel_id = EXCLUDED.responsavel_id,
         tipo_vinculo = EXCLUDED.tipo_vinculo,
         principal = EXCLUDED.principal,
         observacoes = EXCLUDED.observacoes`,
      [
        item.id,
        item.unidadeId,
        item.responsavelId,
        item.tipoVinculo,
        Boolean(item.principal),
        texto(item.observacoes),
      ],
    );
  }
  await ajustarSequencia(client, "unit_responsible_party");
}

async function gravarDebitos(client: PoolClient, debitos: Debito[]) {
  for (const item of debitos) {
    await client.query(
      `INSERT INTO debt (
         id, condominio_id, unidade_id, referencia, descricao, data_vencimento,
         valor, valor_original, multa, juros, correcao, valor_atualizado,
         status, data_pagamento, valor_pago, origem, identificador_externo,
         atualizado_em, fonte_valores
       ) VALUES (
         $1,$2,$3,$4,$5,$6::date,$7,$8,$9,$10,$11,$12,$13,$14::date,$15,$16,$17,$18::timestamptz,$19
       )
       ON CONFLICT (id) DO UPDATE SET
         condominio_id = EXCLUDED.condominio_id,
         unidade_id = EXCLUDED.unidade_id,
         referencia = EXCLUDED.referencia,
         descricao = EXCLUDED.descricao,
         data_vencimento = EXCLUDED.data_vencimento,
         valor = EXCLUDED.valor,
         valor_original = EXCLUDED.valor_original,
         multa = EXCLUDED.multa,
         juros = EXCLUDED.juros,
         correcao = EXCLUDED.correcao,
         valor_atualizado = EXCLUDED.valor_atualizado,
         status = EXCLUDED.status,
         data_pagamento = EXCLUDED.data_pagamento,
         valor_pago = EXCLUDED.valor_pago,
         origem = EXCLUDED.origem,
         identificador_externo = EXCLUDED.identificador_externo,
         atualizado_em = EXCLUDED.atualizado_em,
         fonte_valores = EXCLUDED.fonte_valores`,
      [
        item.id,
        item.condominioId,
        item.unidadeId,
        item.referencia,
        texto(item.descricao),
        item.dataVencimento || null,
        num(item.valor),
        num(item.valorOriginal),
        num(item.multa),
        num(item.juros),
        num(item.correcao),
        num(item.valorAtualizado),
        item.status,
        texto(item.dataPagamento),
        num(item.valorPago),
        texto(item.origem),
        texto(item.identificadorExterno),
        texto(item.atualizadoEm),
        item.fonteValores,
      ],
    );
  }
  await ajustarSequencia(client, "debt");
}

async function gravarImportacoes(client: PoolClient, importacoes: Importacao[]) {
  for (const item of importacoes) {
    await client.query(
      `INSERT INTO import (
         id, processo_id, origem, tipo, arquivo, status,
         quantidade_registros, quantidade_importados, quantidade_atualizados,
         quantidade_ignorados, quantidade_erros, observacao_interna,
         usuario_id, iniciado_em, usuario_aprovacao_id, aprovado_em, data_importacao
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz,$15,$16::timestamptz,$17::timestamptz
       )
       ON CONFLICT (id) DO UPDATE SET
         processo_id = EXCLUDED.processo_id,
         origem = EXCLUDED.origem,
         tipo = EXCLUDED.tipo,
         arquivo = EXCLUDED.arquivo,
         status = EXCLUDED.status,
         quantidade_registros = EXCLUDED.quantidade_registros,
         quantidade_importados = EXCLUDED.quantidade_importados,
         quantidade_atualizados = EXCLUDED.quantidade_atualizados,
         quantidade_ignorados = EXCLUDED.quantidade_ignorados,
         quantidade_erros = EXCLUDED.quantidade_erros,
         observacao_interna = EXCLUDED.observacao_interna,
         usuario_id = EXCLUDED.usuario_id,
         iniciado_em = EXCLUDED.iniciado_em,
         usuario_aprovacao_id = EXCLUDED.usuario_aprovacao_id,
         aprovado_em = EXCLUDED.aprovado_em,
         data_importacao = EXCLUDED.data_importacao`,
      [
        item.id,
        texto(item.processoId),
        texto(item.origem),
        item.tipo,
        texto(item.arquivo),
        item.status,
        intOuNull(item.quantidadeRegistros),
        intOuNull(item.quantidadeImportados),
        intOuNull(item.quantidadeAtualizados),
        intOuNull(item.quantidadeIgnorados),
        intOuNull(item.quantidadeErros),
        texto(item.observacaoInterna),
        item.usuarioId,
        texto(item.iniciadoEm),
        item.usuarioAprovacaoId ?? null,
        texto(item.aprovadoEm ?? undefined),
        item.dataImportacao,
      ],
    );
  }
  await ajustarSequencia(client, "import");
}

async function gravarAuditoria(client: PoolClient, auditoria: Auditoria[]) {
  for (const item of auditoria) {
    await client.query(
      `INSERT INTO audit_log (
         id, usuario_id, entidade, registro_id, acao, dados_anteriores, dados_novos,
         campos_alterados, ip, user_agent, data_hora
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz)
       ON CONFLICT (id) DO NOTHING`,
      [
        item.id,
        intOuNull(item.usuarioId),
        item.entidade,
        texto(item.registroId),
        item.acao,
        texto(item.dadosAnteriores),
        texto(item.dadosNovos),
        texto(item.camposAlterados),
        texto(item.ip),
        texto(item.userAgent),
        item.dataHora,
      ],
    );
  }
  await ajustarSequencia(client, "audit_log");
}

/** Persiste no PostgreSQL o recorte operacional usado pela importação. */
export async function salvarOperacionalNoPostgres(cadastros: Cadastros): Promise<boolean> {
  if (!databaseUrlConfigurada()) return false;
  try {
    const ok = await comTransacaoPg(async (client) => {
      await garantirUsuariosECargos(client, cadastros.cargos, cadastros.usuarios);
      await gravarCondominios(client, cadastros.condominios);
      await gravarUnidades(client, cadastros.unidades);
      await gravarResponsaveis(client, cadastros.responsaveis);
      await gravarVinculos(client, cadastros.vinculos);
      await gravarDebitos(client, cadastros.debitos);
      await gravarImportacoes(client, cadastros.importacoes);
      await gravarAuditoria(client, cadastros.auditoria);
      return true;
    });
    return Boolean(ok);
  } catch (error) {
    console.error("[pg] falha ao gravar operacional:", error);
    return false;
  }
}

function money(value: unknown): string {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function isoDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : raw.slice(0, 10);
}

function isoDateTime(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Carrega do PostgreSQL o estado operacional (substitui o recorte no catálogo em memória). */
export async function carregarOperacionalDoPostgres(): Promise<Partial<Cadastros> | null> {
  if (!databaseUrlConfigurada()) return null;
  try {
    const { carregarIdentidadeDoPostgres } = await import("@/lib/db/identity-pg");
    const identidade = await carregarIdentidadeDoPostgres();

    const condominiosRes = await queryPg(`SELECT * FROM condominium ORDER BY id`);
    if (!condominiosRes) return null;

    const [unidadesRes, responsaveisRes, vinculosRes, debitosRes, importacoesRes, auditoriaRes] =
      await Promise.all([
        queryPg(`SELECT * FROM unit ORDER BY id`),
        queryPg(`SELECT * FROM responsible_party ORDER BY id`),
        queryPg(`SELECT * FROM unit_responsible_party ORDER BY id`),
        queryPg(`SELECT * FROM debt ORDER BY id`),
        queryPg(`SELECT * FROM import ORDER BY id`),
        queryPg(`SELECT * FROM audit_log ORDER BY id`),
      ]);

    if (!unidadesRes || !responsaveisRes || !vinculosRes || !debitosRes || !importacoesRes || !auditoriaRes) {
      return null;
    }

    // Identidade sempre volta do PG. Demais entidades: se vazias no banco, mantém o que já estiver no processo.
    const operacionalVazio =
      condominiosRes.rowCount === 0 &&
      unidadesRes.rowCount === 0 &&
      debitosRes.rowCount === 0 &&
      importacoesRes.rowCount === 0;

    if (operacionalVazio && identidade) {
      return { cargos: identidade.cargos, usuarios: identidade.usuarios };
    }

    if (operacionalVazio) {
      return null;
    }

    const condominios: Condominio[] = condominiosRes.rows.map((row) => ({
      id: Number(row.id),
      nome: String(row.nome ?? ""),
      identificadorExterno: String(row.identificador_externo ?? ""),
      status: (row.status === "Inativo" ? "Inativo" : "Ativo") as Condominio["status"],
      advogados: (() => {
        try {
          const parsed = JSON.parse(String(row.advogados_json ?? "[]"));
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          return [];
        }
      })(),
      administradora: String(row.administradora ?? ""),
      estado: String(row.estado ?? ""),
      cidade: String(row.cidade ?? ""),
      cep: String(row.cep ?? ""),
      logradouro: String(row.logradouro ?? ""),
      numero: String(row.numero ?? ""),
      complemento: String(row.complemento ?? ""),
      observacao: String(row.observacao ?? ""),
    }));

    const unidades: Unidade[] = unidadesRes.rows.map((row) => ({
      id: Number(row.id),
      condominioId: Number(row.condominio_id),
      identificacao: String(row.identificacao ?? ""),
      bloco: String(row.bloco ?? ""),
      tipo: String(row.tipo ?? "Apartamento"),
      status: String(row.status ?? "Ativa"),
      situacao: String(row.situacao ?? "Sem cobrança"),
    }));

    const responsaveis: Responsavel[] = responsaveisRes.rows.map((row) => ({
      id: Number(row.id),
      nome: String(row.nome ?? ""),
      cpfCnpj: String(row.cpf_cnpj ?? ""),
      tipoPessoa: String(row.tipo_pessoa ?? "Fisica"),
      telefone: String(row.telefone ?? ""),
      whatsapp: String(row.whatsapp ?? ""),
      email: String(row.email ?? ""),
      endereco: String(row.endereco ?? ""),
      observacoes: String(row.observacoes ?? ""),
    }));

    const vinculos: Vinculo[] = vinculosRes.rows.map((row) => ({
      id: Number(row.id),
      unidadeId: Number(row.unidade_id),
      responsavelId: Number(row.responsavel_id),
      tipoVinculo: String(row.tipo_vinculo ?? "Proprietario"),
      principal: Boolean(row.principal),
      observacoes: String(row.observacoes ?? ""),
    }));

    const debitos: Debito[] = debitosRes.rows.map((row) => ({
      id: Number(row.id),
      condominioId: Number(row.condominio_id),
      unidadeId: Number(row.unidade_id),
      referencia: String(row.referencia ?? ""),
      descricao: String(row.descricao ?? ""),
      dataVencimento: isoDate(row.data_vencimento),
      valor: money(row.valor),
      valorOriginal: money(row.valor_original),
      multa: money(row.multa),
      juros: money(row.juros),
      correcao: money(row.correcao),
      valorAtualizado: money(row.valor_atualizado),
      status: String(row.status ?? "Vencido"),
      dataPagamento: isoDate(row.data_pagamento),
      valorPago: money(row.valor_pago),
      origem: String(row.origem ?? ""),
      identificadorExterno: String(row.identificador_externo ?? ""),
      atualizadoEm: isoDateTime(row.atualizado_em),
      fonteValores: row.fonte_valores === "manual" ? "manual" : "origem",
    }));

    const importacoes: Importacao[] = importacoesRes.rows.map((row) => ({
      id: Number(row.id),
      processoId: row.processo_id ? String(row.processo_id) : undefined,
      origem: String(row.origem ?? ""),
      tipo: String(row.tipo ?? "debitos"),
      arquivo: String(row.arquivo ?? ""),
      status: String(row.status ?? ""),
      quantidadeRegistros: String(row.quantidade_registros ?? "0"),
      quantidadeImportados: String(row.quantidade_importados ?? "0"),
      quantidadeAtualizados: String(row.quantidade_atualizados ?? "0"),
      quantidadeIgnorados: String(row.quantidade_ignorados ?? "0"),
      quantidadeErros: String(row.quantidade_erros ?? "0"),
      observacaoInterna: String(row.observacao_interna ?? ""),
      usuarioId: Number(row.usuario_id),
      iniciadoEm: row.iniciado_em ? isoDateTime(row.iniciado_em) : undefined,
      usuarioAprovacaoId: row.usuario_aprovacao_id === null ? null : Number(row.usuario_aprovacao_id),
      aprovadoEm: row.aprovado_em ? isoDateTime(row.aprovado_em) : null,
      dataImportacao: isoDateTime(row.data_importacao),
    }));

    const auditoria: Auditoria[] = auditoriaRes.rows.map((row) => ({
      id: Number(row.id),
      usuarioId: row.usuario_id === null || row.usuario_id === undefined ? "" : String(row.usuario_id),
      entidade: String(row.entidade ?? ""),
      registroId: String(row.registro_id ?? ""),
      acao: String(row.acao ?? ""),
      dadosAnteriores: String(row.dados_anteriores ?? ""),
      dadosNovos: String(row.dados_novos ?? ""),
      camposAlterados: String(row.campos_alterados ?? ""),
      ip: String(row.ip ?? ""),
      userAgent: String(row.user_agent ?? ""),
      dataHora: isoDateTime(row.data_hora),
    }));

    return {
      ...(identidade ? { cargos: identidade.cargos, usuarios: identidade.usuarios } : {}),
      condominios,
      unidades,
      responsaveis,
      vinculos,
      debitos,
      importacoes,
      auditoria,
    };
  } catch (error) {
    console.error("[pg] falha ao carregar operacional:", error);
    return null;
  }
}

export async function postgresOperacionalDisponivel(): Promise<boolean> {
  if (!databaseUrlConfigurada()) return false;
  try {
    const res = await queryPg(`SELECT to_regclass('public.debt') AS debt, to_regclass('public.import') AS import`);
    return Boolean(res?.rows[0]?.debt && res.rows[0]?.import);
  } catch {
    return false;
  }
}
