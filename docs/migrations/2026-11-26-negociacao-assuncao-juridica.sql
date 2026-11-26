-- Assunção jurídica da proposta pelo advogado (espelho de prisma/migrations/20261126150000_negotiation_legal_assumption)

ALTER TABLE negotiation_proposal
  ADD COLUMN IF NOT EXISTS legal_assumption_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_assumption_by_user_id INT REFERENCES "user"(id),
  ADD COLUMN IF NOT EXISTS legal_assumption_referral_id VARCHAR(64) REFERENCES legal_case_referral(id);