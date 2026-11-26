-- T24: situação operacional do débito, histórico de alterações e períodos de inadimplência da unidade

ALTER TABLE debt
  ADD COLUMN situacao_operacional VARCHAR(32) NOT NULL DEFAULT 'Em aberto',
  ADD COLUMN situacao_operacional_alterada_em TIMESTAMP,
  ADD COLUMN usuario_situacao_operacional_id INT REFERENCES "user"(id);

UPDATE debt
SET situacao_operacional = 'Quitada'
WHERE status = 'Pago';

UPDATE debt
SET situacao_operacional = 'Prescrita'
WHERE situacao_inadimplencia = 'Inadimplência prescrita'
  AND situacao_operacional = 'Em aberto';

UPDATE debt
SET situacao_operacional = 'Em aberto'
WHERE situacao_operacional = 'Em aberto'
  AND status IN ('Vencido', 'Pendente')
  AND situacao_inadimplencia <> 'Inadimplência prescrita';

CREATE TABLE debt_operational_situation_change (
  id SERIAL PRIMARY KEY,
  debito_id INT NOT NULL REFERENCES debt(id) ON DELETE CASCADE,
  situacao_anterior VARCHAR(32),
  situacao_nova VARCHAR(32) NOT NULL,
  usuario_id INT REFERENCES "user"(id),
  alterado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  observacoes TEXT
);

CREATE TABLE unit_delinquency_period (
  id SERIAL PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  inicio_em DATE NOT NULL,
  fim_em DATE,
  usuario_abertura_id INT REFERENCES "user"(id),
  usuario_encerramento_id INT REFERENCES "user"(id)
);

CREATE INDEX unit_delinquency_period_unidade_idx ON unit_delinquency_period(unidade_id);

INSERT INTO debt_operational_situation_change (debito_id, situacao_anterior, situacao_nova, alterado_em, observacoes)
SELECT id, NULL, situacao_operacional, COALESCE(situacao_operacional_alterada_em, atualizado_em, NOW()), 'Migração T24 — situação inicial'
FROM debt;

-- Débitos vinculados a proposta ativa (não cancelada/recusada)
UPDATE debt d
SET situacao_operacional = 'Em negociação'
FROM negotiation_proposal_debt npd
JOIN negotiation_proposal np ON np.id = npd.proposta_id
WHERE npd.debito_id = d.id
  AND np.status NOT IN ('Cancelada', 'Recusada')
  AND d.situacao_operacional IN ('Em aberto', 'Em negociação')
  AND d.status IN ('Vencido', 'Pendente')
  AND d.situacao_inadimplencia <> 'Inadimplência prescrita';