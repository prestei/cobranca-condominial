import type { Cadastros } from "@/data/catalogo";
import { getPool, postgresDisponivel, withClient } from "@/lib/db/client";

const VERSAO_SNAPSHOT = 1;

function parseDataIso(iso: string | undefined | null): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDataYmd(ymd: string | undefined | null): string | null {
  if (!ymd?.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(ymd)) return ymd.slice(0, 10);
  const d = parseDataIso(ymd);
  return d ? d.toISOString().slice(0, 10) : null;
}

function parseDecimal(valor: string | undefined | null): string | null {
  if (valor == null || valor === "") return null;
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

function parseIntOrNull(raw: string | number | undefined | null): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

/** Espelha o catálogo nas tabelas relacionais (T02). */
export async function sincronizarCatalogoRelacional(state: Cadastros): Promise<void> {
  if (!postgresDisponivel()) return;

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const cargo of state.cargos) {
        await client.query(
          `INSERT INTO role (id, nome, descricao, permissao_json, ativo)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             nome = EXCLUDED.nome,
             descricao = EXCLUDED.descricao,
             permissao_json = EXCLUDED.permissao_json,
             ativo = EXCLUDED.ativo`,
          [cargo.id, cargo.nome, cargo.descricao ?? "", cargo.permissaoJson, cargo.ativo !== false],
        );
      }
      const cargoIds = state.cargos.map((c) => c.id);
      if (cargoIds.length > 0) {
        await client.query(`DELETE FROM role WHERE id <> ALL ($1::int[])`, [cargoIds]);
      }

      for (const usuario of state.usuarios) {
        await client.query(
          `INSERT INTO "user" (id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, avatar, ativo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             codigo = EXCLUDED.codigo,
             codigo_re = EXCLUDED.codigo_re,
             cargo_id = EXCLUDED.cargo_id,
             nome = EXCLUDED.nome,
             telefone = EXCLUDED.telefone,
             email = EXCLUDED.email,
             senha = EXCLUDED.senha,
             avatar = EXCLUDED.avatar,
             ativo = EXCLUDED.ativo`,
          [
            usuario.id,
            usuario.codigo,
            usuario.codigoRe ?? null,
            usuario.cargoId,
            usuario.nome,
            usuario.telefone,
            usuario.email,
            usuario.senha,
            usuario.avatar ?? null,
            usuario.ativo !== false,
          ],
        );
      }

      for (const c of state.condominios) {
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
            c.id,
            c.nome,
            c.identificadorExterno || null,
            c.status,
            JSON.stringify(c.advogados ?? []),
            c.administradora,
            c.estado,
            c.cidade,
            c.cep,
            c.logradouro,
            c.numero,
            c.complemento,
            c.observacao,
          ],
        );
      }

      for (const u of state.unidades) {
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
          [u.id, u.condominioId, u.identificacao, u.bloco, u.tipo, u.status, u.situacao],
        );
      }

      for (const r of state.responsaveis) {
        await client.query(
          `INSERT INTO responsible_party (id, nome, cpf_cnpj, tipo_pessoa, telefone, whatsapp, email, endereco, observacoes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
            r.id,
            r.nome,
            r.cpfCnpj,
            r.tipoPessoa,
            r.telefone,
            r.whatsapp,
            r.email,
            r.endereco,
            r.observacoes,
          ],
        );
      }

      for (const v of state.vinculos) {
        await client.query(
          `INSERT INTO unit_responsible_party (id, unidade_id, responsavel_id, tipo_vinculo, principal, observacoes)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE SET
             unidade_id = EXCLUDED.unidade_id,
             responsavel_id = EXCLUDED.responsavel_id,
             tipo_vinculo = EXCLUDED.tipo_vinculo,
             principal = EXCLUDED.principal,
             observacoes = EXCLUDED.observacoes`,
          [v.id, v.unidadeId, v.responsavelId, v.tipoVinculo, v.principal, v.observacoes],
        );
      }

      for (const d of state.debitos) {
        const venc = parseDataYmd(d.dataVencimento);
        if (!venc) continue;
        await client.query(
          `INSERT INTO debt (
            id, condominio_id, unidade_id, referencia, descricao, data_vencimento,
            valor, valor_original, multa, juros, correcao, valor_atualizado, status,
            data_pagamento, valor_pago, origem, identificador_externo, atualizado_em, fonte_valores
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
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
            d.id,
            d.condominioId,
            d.unidadeId,
            d.referencia,
            d.descricao,
            venc,
            parseDecimal(d.valor),
            parseDecimal(d.valorOriginal),
            parseDecimal(d.multa),
            parseDecimal(d.juros),
            parseDecimal(d.correcao),
            parseDecimal(d.valorAtualizado),
            d.status,
            parseDataYmd(d.dataPagamento),
            parseDecimal(d.valorPago),
            d.origem,
            d.identificadorExterno || null,
            parseDataIso(d.atualizadoEm),
            d.fonteValores,
          ],
        );
      }

      for (const a of state.atribuicoesCobranca) {
        await client.query(
          `INSERT INTO collection_assignment (
            id, unidade_id, atendente_id, atribuido_por_id, atribuido_em, encerrado_em, motivo, anterior_atendente_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO UPDATE SET
            unidade_id = EXCLUDED.unidade_id,
            atendente_id = EXCLUDED.atendente_id,
            atribuido_por_id = EXCLUDED.atribuido_por_id,
            atribuido_em = EXCLUDED.atribuido_em,
            encerrado_em = EXCLUDED.encerrado_em,
            motivo = EXCLUDED.motivo,
            anterior_atendente_id = EXCLUDED.anterior_atendente_id`,
          [
            a.id,
            a.unidadeId,
            a.atendenteId,
            a.atribuidoPorId,
            parseDataIso(a.atribuidoEm),
            parseDataIso(a.encerradoEm),
            a.motivo,
            a.anteriorAtendenteId,
          ],
        );
      }

      for (const t of state.atendimentos) {
        const unidadeId = parseIntOrNull(t.unidadeId);
        if (unidadeId == null) continue;
        await client.query(
          `INSERT INTO service_ticket (
            id, unidade_id, responsavel_id, usuario_id, data_hora, canal, respondeu, motivo, assunto,
            descricao, status, data_proxima_acao, proxima_acao, retorno_concluido_em, retorno_concluido_por_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO UPDATE SET
            unidade_id = EXCLUDED.unidade_id,
            responsavel_id = EXCLUDED.responsavel_id,
            usuario_id = EXCLUDED.usuario_id,
            data_hora = EXCLUDED.data_hora,
            canal = EXCLUDED.canal,
            respondeu = EXCLUDED.respondeu,
            motivo = EXCLUDED.motivo,
            assunto = EXCLUDED.assunto,
            descricao = EXCLUDED.descricao,
            status = EXCLUDED.status,
            data_proxima_acao = EXCLUDED.data_proxima_acao,
            proxima_acao = EXCLUDED.proxima_acao,
            retorno_concluido_em = EXCLUDED.retorno_concluido_em,
            retorno_concluido_por_id = EXCLUDED.retorno_concluido_por_id`,
          [
            t.id,
            unidadeId,
            parseIntOrNull(t.responsavelId),
            t.usuarioId,
            parseDataIso(t.dataHora),
            t.canal,
            t.respondeu,
            t.motivo,
            t.assunto,
            t.descricao,
            t.status,
            parseDataYmd(t.dataProximaAcao),
            t.proximaAcao,
            parseDataIso(t.retornoConcluidoEm),
            t.retornoConcluidoPorId,
          ],
        );
      }

      for (const p of state.propostasNegociacao) {
        await client.query(
          `INSERT INTO negotiation_proposal (
            id, condominio_id, unidade_id, usuario_id, criado_em, status, valor_proposto, observacoes,
            acordo_confirmado_em, acordo_confirmado_por_id, termos_aprovados
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO UPDATE SET
            condominio_id = EXCLUDED.condominio_id,
            unidade_id = EXCLUDED.unidade_id,
            usuario_id = EXCLUDED.usuario_id,
            criado_em = EXCLUDED.criado_em,
            status = EXCLUDED.status,
            valor_proposto = EXCLUDED.valor_proposto,
            observacoes = EXCLUDED.observacoes,
            acordo_confirmado_em = EXCLUDED.acordo_confirmado_em,
            acordo_confirmado_por_id = EXCLUDED.acordo_confirmado_por_id,
            termos_aprovados = EXCLUDED.termos_aprovados`,
          [
            p.id,
            p.condominioId,
            p.unidadeId,
            p.usuarioId,
            parseDataIso(p.criadoEm),
            p.status,
            parseDecimal(p.valorProposto),
            p.observacoes,
            parseDataIso(p.acordoConfirmadoEm),
            p.acordoConfirmadoPorId,
            p.termosAprovados,
          ],
        );
      }

      await client.query(`DELETE FROM negotiation_proposal_debt`);
      for (const p of state.propostasNegociacao) {
        for (const debitoId of p.debitoIds ?? []) {
          await client.query(
            `INSERT INTO negotiation_proposal_debt (proposta_id, debito_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [p.id, debitoId],
          );
        }
      }

      for (const parcela of state.parcelasAcordo) {
        const venc = parseDataYmd(parcela.vencimentoEm);
        if (!venc) continue;
        await client.query(
          `INSERT INTO agreement_installment (
            id, proposta_id, condominio_id, unidade_id, numero, valor_previsto, vencimento_em, criado_em, criado_por_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO UPDATE SET
            proposta_id = EXCLUDED.proposta_id,
            condominio_id = EXCLUDED.condominio_id,
            unidade_id = EXCLUDED.unidade_id,
            numero = EXCLUDED.numero,
            valor_previsto = EXCLUDED.valor_previsto,
            vencimento_em = EXCLUDED.vencimento_em,
            criado_em = EXCLUDED.criado_em,
            criado_por_id = EXCLUDED.criado_por_id`,
          [
            parcela.id,
            parcela.propostaId,
            parcela.condominioId,
            parcela.unidadeId,
            parcela.numero,
            parseDecimal(parcela.valorPrevisto),
            venc,
            parseDataIso(parcela.criadoEm),
            parcela.criadoPorId,
          ],
        );
      }

      for (const pgto of state.pagamentosAcordo) {
        await client.query(
          `INSERT INTO agreement_payment (
            id, proposta_id, parcela_id, unidade_id, valor, data_pagamento,
            referencia_comprovante, confirmacao, criado_em, registrado_por_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO UPDATE SET
            proposta_id = EXCLUDED.proposta_id,
            parcela_id = EXCLUDED.parcela_id,
            unidade_id = EXCLUDED.unidade_id,
            valor = EXCLUDED.valor,
            data_pagamento = EXCLUDED.data_pagamento,
            referencia_comprovante = EXCLUDED.referencia_comprovante,
            confirmacao = EXCLUDED.confirmacao,
            criado_em = EXCLUDED.criado_em,
            registrado_por_id = EXCLUDED.registrado_por_id`,
          [
            pgto.id,
            pgto.propostaId,
            pgto.parcelaId,
            pgto.unidadeId,
            parseDecimal(pgto.valor),
            parseDataIso(pgto.dataPagamento),
            pgto.referenciaComprovante,
            pgto.confirmacao,
            parseDataIso(pgto.criadoEm),
            pgto.registradoPorId,
          ],
        );
      }

      for (const e of state.encaminhamentosJuridicos) {
        await client.query(
          `INSERT INTO legal_case_referral (
            id, condominio_id, unidade_id, usuario_id, encaminhado_em, status, advogado_responsavel,
            observacoes, debito_ids_json, resumo_contexto, atualizado_em, atualizado_por_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (id) DO UPDATE SET
            condominio_id = EXCLUDED.condominio_id,
            unidade_id = EXCLUDED.unidade_id,
            usuario_id = EXCLUDED.usuario_id,
            encaminhado_em = EXCLUDED.encaminhado_em,
            status = EXCLUDED.status,
            advogado_responsavel = EXCLUDED.advogado_responsavel,
            observacoes = EXCLUDED.observacoes,
            debito_ids_json = EXCLUDED.debito_ids_json,
            resumo_contexto = EXCLUDED.resumo_contexto,
            atualizado_em = EXCLUDED.atualizado_em,
            atualizado_por_id = EXCLUDED.atualizado_por_id`,
          [
            e.id,
            e.condominioId,
            e.unidadeId,
            e.usuarioId,
            parseDataIso(e.encaminhadoEm),
            e.status,
            e.advogadoResponsavel,
            e.observacoes,
            JSON.stringify(e.debitoIds ?? []),
            e.resumoContexto,
            parseDataIso(e.atualizadoEm),
            e.atualizadoPorId,
          ],
        );
      }

      for (const doc of state.documentosJuridicos) {
        await client.query(
          `INSERT INTO legal_document (
            id, encaminhamento_id, titulo, descricao, referencia_arquivo, registrado_em, registrado_por_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (id) DO UPDATE SET
            encaminhamento_id = EXCLUDED.encaminhamento_id,
            titulo = EXCLUDED.titulo,
            descricao = EXCLUDED.descricao,
            referencia_arquivo = EXCLUDED.referencia_arquivo,
            registrado_em = EXCLUDED.registrado_em,
            registrado_por_id = EXCLUDED.registrado_por_id`,
          [
            doc.id,
            doc.encaminhamentoId,
            doc.titulo,
            doc.descricao,
            doc.referenciaArquivo,
            parseDataIso(doc.registradoEm),
            doc.registradoPorId,
          ],
        );
      }

      for (const imp of state.importacoes) {
        await client.query(
          `INSERT INTO import (
            id, processo_id, origem, tipo, arquivo, status,
            quantidade_registros, quantidade_importados, quantidade_atualizados, quantidade_ignorados, quantidade_erros,
            observacao_interna, usuario_id, iniciado_em, usuario_aprovacao_id, aprovado_em, data_importacao
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
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
            imp.id,
            imp.processoId ?? null,
            imp.origem,
            imp.tipo,
            imp.arquivo,
            imp.status,
            parseIntOrNull(imp.quantidadeRegistros),
            parseIntOrNull(imp.quantidadeImportados),
            parseIntOrNull(imp.quantidadeAtualizados),
            parseIntOrNull(imp.quantidadeIgnorados ?? ""),
            parseIntOrNull(imp.quantidadeErros),
            imp.observacaoInterna,
            imp.usuarioId,
            parseDataIso(imp.iniciadoEm ?? ""),
            imp.usuarioAprovacaoId ?? null,
            parseDataIso(imp.aprovadoEm ?? ""),
            parseDataIso(imp.dataImportacao),
          ],
        );
      }

      for (const log of state.auditoria) {
        const usuarioId = parseIntOrNull(log.usuarioId);
        await client.query(
          `INSERT INTO audit_log (
            id, usuario_id, entidade, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, ip, user_agent, data_hora
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO UPDATE SET
            usuario_id = EXCLUDED.usuario_id,
            entidade = EXCLUDED.entidade,
            registro_id = EXCLUDED.registro_id,
            acao = EXCLUDED.acao,
            dados_anteriores = EXCLUDED.dados_anteriores,
            dados_novos = EXCLUDED.dados_novos,
            campos_alterados = EXCLUDED.campos_alterados,
            ip = EXCLUDED.ip,
            user_agent = EXCLUDED.user_agent,
            data_hora = EXCLUDED.data_hora`,
          [
            log.id,
            usuarioId,
            log.entidade,
            log.registroId,
            log.acao,
            log.dadosAnteriores,
            log.dadosNovos,
            log.camposAlterados,
            log.ip,
            log.userAgent,
            parseDataIso(log.dataHora),
          ],
        );
      }

      for (const n of state.notificacoesInternas) {
        await client.query(
          `INSERT INTO internal_notification (
            id, chave_idempotencia, evento, destinatario_id, titulo, descricao, entidade_tipo, registro_id,
            unidade_id, condominio_id, criado_em, lida_em
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          ON CONFLICT (id) DO UPDATE SET
            chave_idempotencia = EXCLUDED.chave_idempotencia,
            evento = EXCLUDED.evento,
            destinatario_id = EXCLUDED.destinatario_id,
            titulo = EXCLUDED.titulo,
            descricao = EXCLUDED.descricao,
            entidade_tipo = EXCLUDED.entidade_tipo,
            registro_id = EXCLUDED.registro_id,
            unidade_id = EXCLUDED.unidade_id,
            condominio_id = EXCLUDED.condominio_id,
            criado_em = EXCLUDED.criado_em,
            lida_em = EXCLUDED.lida_em`,
          [
            n.id,
            n.chaveIdempotencia,
            n.evento,
            n.destinatarioId,
            n.titulo,
            n.descricao,
            n.entidadeTipo,
            n.registroId,
            n.unidadeId,
            n.condominioId,
            parseDataIso(n.criadoEm),
            parseDataIso(n.lidaEm),
          ],
        );
      }

      for (const f of state.notificacaoFalhas) {
        await client.query(
          `INSERT INTO notification_failure (id, chave_idempotencia, evento, destinatario_id, erro, ocorrido_em)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE SET
             chave_idempotencia = EXCLUDED.chave_idempotencia,
             evento = EXCLUDED.evento,
             destinatario_id = EXCLUDED.destinatario_id,
             erro = EXCLUDED.erro,
             ocorrido_em = EXCLUDED.ocorrido_em`,
          [
            f.id,
            f.chaveIdempotencia,
            f.evento,
            f.destinatarioId,
            f.erro,
            parseDataIso(f.ocorridoEm),
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function carregarCatalogoDoPostgres(): Promise<Cadastros | null> {
  if (!postgresDisponivel()) return null;

  const result = await getPool().query<{ state: Cadastros; versao: number }>(
    `SELECT versao, state FROM catalog_snapshot WHERE id = 1`,
  );
  const row = result.rows[0];
  if (!row?.state || row.versao !== VERSAO_SNAPSHOT) return null;
  return structuredClone(row.state) as Cadastros;
}

export async function gravarCatalogoNoPostgres(state: Cadastros): Promise<void> {
  if (!postgresDisponivel()) return;

  await getPool().query(
    `INSERT INTO catalog_snapshot (id, versao, gravado_em, state)
     VALUES (1, $1, now(), $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       versao = EXCLUDED.versao,
       gravado_em = EXCLUDED.gravado_em,
       state = EXCLUDED.state`,
    [VERSAO_SNAPSHOT, JSON.stringify(state)],
  );

  try {
    await sincronizarCatalogoRelacional(state);
  } catch (error) {
    console.error("[catalogo] Falha ao espelhar catálogo nas tabelas PostgreSQL:", error);
  }
}
