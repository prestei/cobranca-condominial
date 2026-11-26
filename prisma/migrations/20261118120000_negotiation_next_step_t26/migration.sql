-- T26 — decisão explícita do próximo passo após registrar proposta de negociação

ALTER TABLE negotiation_proposal
  ADD COLUMN IF NOT EXISTS negotiation_queue_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS negotiation_queue_by_user_id INT REFERENCES "user"(id);

CREATE TABLE negotiation_next_step_decision (
  id VARCHAR(64) PRIMARY KEY,
  proposal_id VARCHAR(64) NOT NULL UNIQUE REFERENCES negotiation_proposal(id) ON DELETE CASCADE,
  condominium_id INT NOT NULL REFERENCES condominium(id),
  unit_id INT NOT NULL REFERENCES unit(id),
  user_id INT NOT NULL REFERENCES "user"(id),
  decided_at TIMESTAMPTZ NOT NULL,
  action VARCHAR(64) NOT NULL,
  analysis_target VARCHAR(32),
  destination_label VARCHAR(255) NOT NULL,
  responsible_user_id INT REFERENCES "user"(id),
  legal_referral_id VARCHAR(64) REFERENCES legal_case_referral(id),
  notes TEXT,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE
);

CREATE INDEX negotiation_next_step_decision_unit_idx ON negotiation_next_step_decision(unit_id);
CREATE INDEX negotiation_next_step_decision_user_idx ON negotiation_next_step_decision(user_id);