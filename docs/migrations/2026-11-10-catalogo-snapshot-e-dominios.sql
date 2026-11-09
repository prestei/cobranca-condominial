-- Snapshot completo do catálogo operacional + tabelas dos domínios ainda não normalizados.
-- Fonte da verdade: PostgreSQL. Idempotente.

CREATE TABLE IF NOT EXISTS catalogo_snapshot (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_assignment (
  id SERIAL PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit(id),
  atendente_id INT NOT NULL REFERENCES "user"(id),
  atribuido_por_id INT NOT NULL REFERENCES "user"(id),
  atribuido_em TIMESTAMP NOT NULL,
  encerrado_em TIMESTAMP,
  motivo TEXT,
  anterior_atendente_id INT REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS service_ticket (
  id VARCHAR(64) PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit(id),
  responsavel_id INT REFERENCES responsible_party(id),
  usuario_id INT NOT NULL REFERENCES "user"(id),
  data_hora TIMESTAMP NOT NULL,
  canal VARCHAR(64),
  respondeu VARCHAR(16),
  motivo VARCHAR(255),
  assunto VARCHAR(255),
  descricao TEXT,
  status VARCHAR(32) NOT NULL,
  data_proxima_acao TIMESTAMP,
  proxima_acao VARCHAR(255),
  retorno_concluido_em TIMESTAMP,
  retorno_concluido_por_id INT REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS negotiation_proposal (
  id VARCHAR(64) PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium(id),
  unidade_id INT NOT NULL REFERENCES unit(id),
  usuario_id INT NOT NULL REFERENCES "user"(id),
  criado_em TIMESTAMP NOT NULL,
  status VARCHAR(32) NOT NULL,
  valor_proposto NUMERIC(12,2) NOT NULL,
  observacoes TEXT,
  debito_ids_json TEXT,
  acordo_confirmado_em TIMESTAMP,
  acordo_confirmado_por_id INT REFERENCES "user"(id),
  termos_aprovados TEXT
);

CREATE TABLE IF NOT EXISTS negotiation_proposal_debt (
  id SERIAL PRIMARY KEY,
  proposta_id VARCHAR(64) NOT NULL REFERENCES negotiation_proposal(id) ON DELETE CASCADE,
  debito_id INT NOT NULL REFERENCES debt(id),
  UNIQUE (proposta_id, debito_id)
);

CREATE TABLE IF NOT EXISTS agreement_installment (
  id VARCHAR(64) PRIMARY KEY,
  proposta_id VARCHAR(64) NOT NULL REFERENCES negotiation_proposal(id) ON DELETE CASCADE,
  condominio_id INT NOT NULL REFERENCES condominium(id),
  unidade_id INT NOT NULL REFERENCES unit(id),
  numero INT NOT NULL,
  valor_previsto NUMERIC(12,2) NOT NULL,
  vencimento_em DATE NOT NULL,
  criado_em TIMESTAMP NOT NULL,
  criado_por_id INT NOT NULL REFERENCES "user"(id),
  UNIQUE (proposta_id, numero)
);

CREATE TABLE IF NOT EXISTS agreement_payment (
  id VARCHAR(64) PRIMARY KEY,
  proposta_id VARCHAR(64) NOT NULL REFERENCES negotiation_proposal(id) ON DELETE CASCADE,
  parcela_id VARCHAR(64) NOT NULL REFERENCES agreement_installment(id),
  unidade_id INT NOT NULL REFERENCES unit(id),
  valor NUMERIC(12,2) NOT NULL,
  data_pagamento TIMESTAMP NOT NULL,
  referencia_comprovante VARCHAR(255),
  confirmacao VARCHAR(32) NOT NULL,
  criado_em TIMESTAMP NOT NULL,
  registrado_por_id INT NOT NULL REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS legal_case_referral (
  id VARCHAR(64) PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium(id),
  unidade_id INT NOT NULL REFERENCES unit(id),
  usuario_id INT NOT NULL REFERENCES "user"(id),
  encaminhado_em TIMESTAMP NOT NULL,
  status VARCHAR(64) NOT NULL,
  advogado_responsavel VARCHAR(255) NOT NULL,
  observacoes TEXT,
  debito_ids_json TEXT,
  resumo_contexto TEXT,
  atualizado_em TIMESTAMP NOT NULL,
  atualizado_por_id INT NOT NULL REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS legal_document (
  id VARCHAR(64) PRIMARY KEY,
  encaminhamento_id VARCHAR(64) NOT NULL REFERENCES legal_case_referral(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  referencia_arquivo VARCHAR(512),
  registrado_em TIMESTAMP NOT NULL,
  registrado_por_id INT NOT NULL REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS internal_notification (
  id SERIAL PRIMARY KEY,
  chave_idempotencia VARCHAR(255) NOT NULL UNIQUE,
  evento VARCHAR(64) NOT NULL,
  destinatario_id INT NOT NULL REFERENCES "user"(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  entidade_tipo VARCHAR(64) NOT NULL,
  registro_id VARCHAR(64) NOT NULL,
  unidade_id INT,
  condominio_id INT,
  criado_em TIMESTAMP NOT NULL,
  lida_em TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_failure (
  id SERIAL PRIMARY KEY,
  chave_idempotencia VARCHAR(255) NOT NULL,
  evento VARCHAR(64) NOT NULL,
  destinatario_id INT NOT NULL REFERENCES "user"(id),
  erro TEXT NOT NULL,
  ocorrido_em TIMESTAMP NOT NULL
);
