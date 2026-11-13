-- Alçada de negociação por advogado, detalhes da proposta e cancelamento de parcela.

CREATE TABLE IF NOT EXISTS lawyer_negotiation_rule (
  usuario_id INT PRIMARY KEY,
  desconto_maximo_percent NUMERIC(5, 2) NOT NULL DEFAULT 30,
  parcelas_maximas INT NOT NULL DEFAULT 24,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por_id INT NULL,
  CONSTRAINT lawyer_negotiation_rule_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES "user"(id) ON DELETE CASCADE,
  CONSTRAINT lawyer_negotiation_rule_atualizado_por_id_fkey
    FOREIGN KEY (atualizado_por_id) REFERENCES "user"(id) ON DELETE SET NULL
);

ALTER TABLE negotiation_proposal
  ADD COLUMN IF NOT EXISTS advogado_responsavel_id INT NULL,
  ADD COLUMN IF NOT EXISTS valor_divida_original NUMERIC(12, 2) NULL,
  ADD COLUMN IF NOT EXISTS valor_divida_atualizada NUMERIC(12, 2) NULL,
  ADD COLUMN IF NOT EXISTS quantidade_parcelas INT NULL,
  ADD COLUMN IF NOT EXISTS valores_definidos_por_id INT NULL,
  ADD COLUMN IF NOT EXISTS valores_aprovados_por_id INT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'negotiation_proposal_advogado_responsavel_id_fkey'
  ) THEN
    ALTER TABLE negotiation_proposal
      ADD CONSTRAINT negotiation_proposal_advogado_responsavel_id_fkey
        FOREIGN KEY (advogado_responsavel_id) REFERENCES "user"(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'negotiation_proposal_valores_definidos_por_id_fkey'
  ) THEN
    ALTER TABLE negotiation_proposal
      ADD CONSTRAINT negotiation_proposal_valores_definidos_por_id_fkey
        FOREIGN KEY (valores_definidos_por_id) REFERENCES "user"(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'negotiation_proposal_valores_aprovados_por_id_fkey'
  ) THEN
    ALTER TABLE negotiation_proposal
      ADD CONSTRAINT negotiation_proposal_valores_aprovados_por_id_fkey
        FOREIGN KEY (valores_aprovados_por_id) REFERENCES "user"(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE agreement_installment
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ NULL;
