-- IDs operacionais podem ser UUID ou identificadores de demo (ex.: demo-retorno-102).

INSERT INTO schema_migrations (id) VALUES ('002_ids_texto') ON CONFLICT DO NOTHING;

ALTER TABLE legal_document DROP CONSTRAINT IF EXISTS legal_document_encaminhamento_id_fkey;
ALTER TABLE agreement_payment DROP CONSTRAINT IF EXISTS agreement_payment_parcela_id_fkey;
ALTER TABLE agreement_payment DROP CONSTRAINT IF EXISTS agreement_payment_proposta_id_fkey;
ALTER TABLE agreement_installment DROP CONSTRAINT IF EXISTS agreement_installment_proposta_id_fkey;
ALTER TABLE negotiation_proposal_debt DROP CONSTRAINT IF EXISTS negotiation_proposal_debt_proposta_id_fkey;
ALTER TABLE legal_case_referral DROP CONSTRAINT IF EXISTS legal_case_referral_id_fkey;

ALTER TABLE service_ticket ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE negotiation_proposal ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE agreement_installment ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE agreement_installment ALTER COLUMN proposta_id TYPE VARCHAR(64) USING proposta_id::text;
ALTER TABLE agreement_payment ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE agreement_payment ALTER COLUMN proposta_id TYPE VARCHAR(64) USING proposta_id::text;
ALTER TABLE agreement_payment ALTER COLUMN parcela_id TYPE VARCHAR(64) USING parcela_id::text;
ALTER TABLE legal_case_referral ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE legal_document ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE legal_document ALTER COLUMN encaminhamento_id TYPE VARCHAR(64) USING encaminhamento_id::text;
ALTER TABLE negotiation_proposal_debt ALTER COLUMN proposta_id TYPE VARCHAR(64) USING proposta_id::text;
ALTER TABLE import ALTER COLUMN processo_id TYPE VARCHAR(64) USING processo_id::text;

ALTER TABLE legal_document
  ADD CONSTRAINT legal_document_encaminhamento_id_fkey
  FOREIGN KEY (encaminhamento_id) REFERENCES legal_case_referral (id) ON DELETE CASCADE;
ALTER TABLE agreement_payment
  ADD CONSTRAINT agreement_payment_parcela_id_fkey
  FOREIGN KEY (parcela_id) REFERENCES agreement_installment (id) ON DELETE CASCADE;
ALTER TABLE agreement_payment
  ADD CONSTRAINT agreement_payment_proposta_id_fkey
  FOREIGN KEY (proposta_id) REFERENCES negotiation_proposal (id) ON DELETE CASCADE;
ALTER TABLE agreement_installment
  ADD CONSTRAINT agreement_installment_proposta_id_fkey
  FOREIGN KEY (proposta_id) REFERENCES negotiation_proposal (id) ON DELETE CASCADE;
ALTER TABLE negotiation_proposal_debt
  ADD CONSTRAINT negotiation_proposal_debt_proposta_id_fkey
  FOREIGN KEY (proposta_id) REFERENCES negotiation_proposal (id) ON DELETE CASCADE;
