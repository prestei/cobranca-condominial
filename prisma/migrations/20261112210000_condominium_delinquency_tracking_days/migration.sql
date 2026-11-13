-- T02 — prazo de acompanhamento da inadimplência por condomínio (dias, opcional; padrão na aplicação).
ALTER TABLE "condominium"
  ADD COLUMN IF NOT EXISTS "delinquency_tracking_days" INTEGER;

COMMENT ON COLUMN "condominium"."delinquency_tracking_days" IS 'Prazo em dias para acompanhamento da inadimplência; NULL usa o padrão do sistema.';
