-- Reparo: bancos criados via scripts legados tinham `prazo_acompanhamento_dias`;
-- a migração 20261112210000 pode ter sido apenas resolvida sem executar o SQL.
ALTER TABLE "condominium"
  ADD COLUMN IF NOT EXISTS "delinquency_tracking_days" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'condominium'
      AND column_name = 'prazo_acompanhamento_dias'
  ) THEN
    UPDATE "condominium"
    SET "delinquency_tracking_days" = CASE
      WHEN "prazo_acompanhamento_dias" = 60 THEN NULL
      ELSE "prazo_acompanhamento_dias"
    END
    WHERE "delinquency_tracking_days" IS NULL;

    ALTER TABLE "condominium"
      DROP CONSTRAINT IF EXISTS "condominium_prazo_acompanhamento_dias_positive";

    ALTER TABLE "condominium"
      DROP COLUMN "prazo_acompanhamento_dias";
  END IF;
END $$;

COMMENT ON COLUMN "condominium"."delinquency_tracking_days" IS 'Prazo em dias para acompanhamento da inadimplência; NULL usa o padrão do sistema.';
