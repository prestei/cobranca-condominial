-- T28: histórico de quitação automática de débito

CREATE TABLE debt_settlement (
  id SERIAL PRIMARY KEY,
  debt_id INT NOT NULL REFERENCES debt(id) ON DELETE CASCADE,
  unit_id INT NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  settled_at TIMESTAMPTZ NOT NULL,
  paid_amount DECIMAL(12, 2) NOT NULL,
  proposal_id VARCHAR(64) REFERENCES negotiation_proposal(id) ON DELETE SET NULL,
  confirmed_by_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  unit_situation_before VARCHAR(64),
  unit_situation_after VARCHAR(64),
  source VARCHAR(32) NOT NULL,
  notes TEXT
);

CREATE INDEX debt_settlement_debt_idx ON debt_settlement(debt_id);
CREATE INDEX debt_settlement_unit_idx ON debt_settlement(unit_id);
CREATE UNIQUE INDEX debt_settlement_debt_settled_at_key ON debt_settlement(debt_id, settled_at);