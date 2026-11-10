-- Avatar do colaborador + configurações de app (ex.: distribuição automática).
-- Idempotente para ambientes que já aplicaram docs/migrations/2026-11-13-avatar-e-app-setting.sql.

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS app_setting (
  chave VARCHAR(128) PRIMARY KEY,
  valor JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
