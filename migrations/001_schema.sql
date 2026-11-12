-- T02 — modelo operacional (alinhado a docs/banco.md). Idempotente (IF NOT EXISTS / ADD COLUMN).

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (id) VALUES ('001_schema') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS role (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao VARCHAR(255) NOT NULL DEFAULT '',
  permissao_json TEXT NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS role_nome_lower_idx ON role (lower(nome));

CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  codigo_re VARCHAR(16),
  cargo_id INT REFERENCES role (id),
  nome VARCHAR(255),
  telefone VARCHAR(255),
  email VARCHAR(255),
  senha VARCHAR(255),
  avatar TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE role ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS codigo_re VARCHAR(16);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS user_codigo_lower_idx ON "user" (lower(codigo));
CREATE UNIQUE INDEX IF NOT EXISTS user_codigo_re_lower_idx ON "user" (lower(codigo_re))
  WHERE codigo_re IS NOT NULL AND trim(codigo_re) <> '';

CREATE TABLE IF NOT EXISTS condominium (
  id INT PRIMARY KEY,
  nome VARCHAR(255),
  identificador_externo VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'Ativo',
  advogados_json TEXT,
  administradora VARCHAR(255),
  estado VARCHAR(255),
  cidade VARCHAR(255),
  cep VARCHAR(255),
  logradouro VARCHAR(255),
  numero TEXT,
  complemento VARCHAR(255),
  observacao TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS condominium_identificador_externo_idx
  ON condominium (identificador_externo)
  WHERE identificador_externo IS NOT NULL AND trim(identificador_externo) <> '';

CREATE TABLE IF NOT EXISTS unit (
  id INT PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium (id) ON DELETE CASCADE,
  identificacao VARCHAR(255) NOT NULL,
  bloco VARCHAR(255),
  tipo VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Ativa',
  situacao VARCHAR(64) NOT NULL DEFAULT 'Sem cobrança'
);

CREATE TABLE IF NOT EXISTS responsible_party (
  id INT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(32) NOT NULL,
  tipo_pessoa VARCHAR(32) NOT NULL,
  telefone VARCHAR(255),
  whatsapp VARCHAR(255),
  email VARCHAR(255),
  endereco TEXT,
  observacoes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS responsible_party_cpf_cnpj_idx ON responsible_party (cpf_cnpj);

CREATE TABLE IF NOT EXISTS unit_responsible_party (
  id INT PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  responsavel_id INT NOT NULL REFERENCES responsible_party (id) ON DELETE CASCADE,
  tipo_vinculo VARCHAR(64) NOT NULL,
  principal BOOLEAN DEFAULT TRUE,
  observacoes TEXT
);

CREATE TABLE IF NOT EXISTS debt (
  id INT PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium (id) ON DELETE CASCADE,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  referencia VARCHAR(64) NOT NULL,
  descricao VARCHAR(255),
  data_vencimento DATE NOT NULL,
  valor NUMERIC(12, 2),
  valor_original NUMERIC(12, 2),
  multa NUMERIC(12, 2),
  juros NUMERIC(12, 2),
  correcao NUMERIC(12, 2),
  valor_atualizado NUMERIC(12, 2),
  status VARCHAR(32) NOT NULL,
  data_pagamento DATE,
  valor_pago NUMERIC(12, 2),
  origem VARCHAR(255),
  identificador_externo VARCHAR(255),
  atualizado_em TIMESTAMPTZ,
  fonte_valores VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS collection_assignment (
  id INT PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  atendente_id INT NOT NULL REFERENCES "user" (id),
  atribuido_por_id INT NOT NULL REFERENCES "user" (id),
  atribuido_em TIMESTAMPTZ NOT NULL,
  encerrado_em TIMESTAMPTZ,
  motivo TEXT,
  anterior_atendente_id INT REFERENCES "user" (id)
);

CREATE TABLE IF NOT EXISTS service_ticket (
  id UUID PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  responsavel_id INT REFERENCES responsible_party (id),
  usuario_id INT NOT NULL REFERENCES "user" (id),
  data_hora TIMESTAMPTZ NOT NULL,
  canal VARCHAR(64),
  respondeu VARCHAR(16),
  motivo VARCHAR(255),
  assunto VARCHAR(255),
  descricao TEXT,
  status VARCHAR(32) NOT NULL,
  data_proxima_acao DATE,
  proxima_acao VARCHAR(255),
  retorno_concluido_em TIMESTAMPTZ,
  retorno_concluido_por_id INT REFERENCES "user" (id)
);

CREATE TABLE IF NOT EXISTS negotiation_proposal (
  id UUID PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium (id) ON DELETE CASCADE,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES "user" (id),
  criado_em TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL,
  valor_proposto NUMERIC(12, 2) NOT NULL,
  observacoes TEXT,
  acordo_confirmado_em TIMESTAMPTZ,
  acordo_confirmado_por_id INT REFERENCES "user" (id),
  termos_aprovados TEXT
);

CREATE TABLE IF NOT EXISTS negotiation_proposal_debt (
  id SERIAL PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES negotiation_proposal (id) ON DELETE CASCADE,
  debito_id INT NOT NULL REFERENCES debt (id) ON DELETE CASCADE,
  UNIQUE (proposta_id, debito_id)
);

CREATE TABLE IF NOT EXISTS agreement_installment (
  id UUID PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES negotiation_proposal (id) ON DELETE CASCADE,
  condominio_id INT NOT NULL REFERENCES condominium (id) ON DELETE CASCADE,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  numero INT NOT NULL,
  valor_previsto NUMERIC(12, 2) NOT NULL,
  vencimento_em DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL,
  criado_por_id INT NOT NULL REFERENCES "user" (id),
  UNIQUE (proposta_id, numero)
);

CREATE TABLE IF NOT EXISTS agreement_payment (
  id UUID PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES negotiation_proposal (id) ON DELETE CASCADE,
  parcela_id UUID NOT NULL REFERENCES agreement_installment (id) ON DELETE CASCADE,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  valor NUMERIC(12, 2) NOT NULL,
  data_pagamento TIMESTAMPTZ NOT NULL,
  referencia_comprovante VARCHAR(255),
  confirmacao VARCHAR(32) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL,
  registrado_por_id INT NOT NULL REFERENCES "user" (id)
);

CREATE TABLE IF NOT EXISTS legal_case_referral (
  id UUID PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium (id) ON DELETE CASCADE,
  unidade_id INT NOT NULL REFERENCES unit (id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES "user" (id),
  encaminhado_em TIMESTAMPTZ NOT NULL,
  status VARCHAR(64) NOT NULL,
  advogado_responsavel VARCHAR(255) NOT NULL,
  observacoes TEXT,
  debito_ids_json TEXT,
  resumo_contexto TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL,
  atualizado_por_id INT NOT NULL REFERENCES "user" (id)
);

CREATE TABLE IF NOT EXISTS legal_document (
  id UUID PRIMARY KEY,
  encaminhamento_id UUID NOT NULL REFERENCES legal_case_referral (id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  referencia_arquivo VARCHAR(512),
  registrado_em TIMESTAMPTZ NOT NULL,
  registrado_por_id INT NOT NULL REFERENCES "user" (id)
);

CREATE TABLE IF NOT EXISTS import (
  id INT PRIMARY KEY,
  processo_id UUID,
  origem VARCHAR(255),
  tipo VARCHAR(64) NOT NULL,
  arquivo VARCHAR(512),
  status VARCHAR(32) NOT NULL,
  quantidade_registros INT,
  quantidade_importados INT,
  quantidade_atualizados INT,
  quantidade_ignorados INT,
  quantidade_erros INT,
  observacao_interna TEXT,
  usuario_id INT NOT NULL REFERENCES "user" (id),
  iniciado_em TIMESTAMPTZ,
  usuario_aprovacao_id INT REFERENCES "user" (id),
  aprovado_em TIMESTAMPTZ,
  data_importacao TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INT PRIMARY KEY,
  usuario_id INT REFERENCES "user" (id),
  entidade VARCHAR(64) NOT NULL,
  registro_id VARCHAR(64),
  acao VARCHAR(16) NOT NULL,
  dados_anteriores TEXT,
  dados_novos TEXT,
  campos_alterados TEXT,
  ip VARCHAR(64),
  user_agent VARCHAR(512),
  data_hora TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_notification (
  id INT PRIMARY KEY,
  chave_idempotencia VARCHAR(255) NOT NULL UNIQUE,
  evento VARCHAR(64) NOT NULL,
  destinatario_id INT NOT NULL REFERENCES "user" (id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  entidade_tipo VARCHAR(64) NOT NULL,
  registro_id VARCHAR(64) NOT NULL,
  unidade_id INT REFERENCES unit (id),
  condominio_id INT REFERENCES condominium (id),
  criado_em TIMESTAMPTZ NOT NULL,
  lida_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notification_failure (
  id INT PRIMARY KEY,
  chave_idempotencia VARCHAR(255),
  evento VARCHAR(64),
  destinatario_id INT,
  erro TEXT NOT NULL,
  ocorrido_em TIMESTAMPTZ NOT NULL
);

-- Estado operacional completo (fonte na subida / espelho das tabelas acima)
CREATE TABLE IF NOT EXISTS catalog_snapshot (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  versao INT NOT NULL,
  gravado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  state JSONB NOT NULL
);

