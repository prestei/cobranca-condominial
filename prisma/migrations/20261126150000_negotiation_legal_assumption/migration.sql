-- Assunção jurídica da negociação pelo advogado (sem cancelar o acordo)

ALTER TABLE negotiation_proposal
  ADD COLUMN IF NOT EXISTS legal_assumption_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_assumption_by_user_id INT REFERENCES "user"(id),
  ADD COLUMN IF NOT EXISTS legal_assumption_referral_id VARCHAR(64) REFERENCES legal_case_referral(id);