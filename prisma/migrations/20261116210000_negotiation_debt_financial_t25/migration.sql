-- T25: snapshot financeiro por débito vinculado à negociação formalizada

ALTER TABLE negotiation_proposal_debt
  ADD COLUMN valor_original_registrado NUMERIC(12, 2),
  ADD COLUMN valor_negociado_alocado NUMERIC(12, 2),
  ADD COLUMN desconto_concedido NUMERIC(12, 2),
  ADD COLUMN valor_pago_confirmado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN saldo_restante NUMERIC(12, 2),
  ADD COLUMN formalizado_em TIMESTAMP,
  ADD COLUMN formalizado_por_id INT REFERENCES "user"(id);

CREATE TABLE negotiation_proposal_debt_financial_change (
  id SERIAL PRIMARY KEY,
  vinculo_id INT NOT NULL REFERENCES negotiation_proposal_debt(id) ON DELETE CASCADE,
  debito_id INT NOT NULL REFERENCES debt(id) ON DELETE CASCADE,
  proposta_id VARCHAR(64) NOT NULL REFERENCES negotiation_proposal(id) ON DELETE CASCADE,
  campo VARCHAR(64) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario_id INT REFERENCES "user"(id),
  alterado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  observacoes TEXT
);

CREATE INDEX negotiation_proposal_debt_financial_change_debito_idx
  ON negotiation_proposal_debt_financial_change(debito_id);

CREATE INDEX negotiation_proposal_debt_formalizado_idx
  ON negotiation_proposal_debt(formalizado_em)
  WHERE formalizado_em IS NOT NULL;