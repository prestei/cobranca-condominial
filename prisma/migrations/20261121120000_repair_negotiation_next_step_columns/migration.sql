-- Reparo: migração T26 criou colunas condominium_id / unit_id / user_id;
-- o schema Prisma mapeia condominio_id, unidade_id e usuario_id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'negotiation_next_step_decision'
      AND column_name = 'condominium_id'
  ) THEN
    ALTER TABLE negotiation_next_step_decision
      RENAME COLUMN condominium_id TO condominio_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'negotiation_next_step_decision'
      AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE negotiation_next_step_decision
      RENAME COLUMN unit_id TO unidade_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'negotiation_next_step_decision'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE negotiation_next_step_decision
      RENAME COLUMN user_id TO usuario_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'negotiation_next_step_decision_unit_idx'
  ) THEN
    ALTER INDEX negotiation_next_step_decision_unit_idx
      RENAME TO negotiation_next_step_decision_unidade_idx;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'negotiation_next_step_decision_user_idx'
  ) THEN
    ALTER INDEX negotiation_next_step_decision_user_idx
      RENAME TO negotiation_next_step_decision_usuario_idx;
  END IF;
END $$;