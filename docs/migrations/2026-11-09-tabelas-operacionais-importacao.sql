-- Identidade + tabelas operacionais (importação de inadimplência).
-- Idempotente (IF NOT EXISTS). Fonte da verdade: PostgreSQL (não memória/.data).

CREATE TABLE IF NOT EXISTS role (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255),
  descricao VARCHAR(255),
  permissao_json TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  cargo_id INT REFERENCES role(id),
  nome VARCHAR(255),
  cpf VARCHAR(255),
  data_nascimento VARCHAR(255),
  telefone VARCHAR(255),
  email VARCHAR(255),
  senha VARCHAR(255),
  codigo_re VARCHAR(16),
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS user_codigo_unique
  ON "user" (lower(trim(codigo)));

ALTER TABLE role
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS codigo_re VARCHAR(16),
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS user_codigo_re_unique
  ON "user" (codigo_re)
  WHERE codigo_re IS NOT NULL AND TRIM(BOTH FROM codigo_re) <> '';

CREATE TABLE IF NOT EXISTS condominium (
  id SERIAL PRIMARY KEY,
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

CREATE UNIQUE INDEX IF NOT EXISTS condominium_identificador_externo_unique
  ON condominium (lower(identificador_externo))
  WHERE identificador_externo IS NOT NULL AND TRIM(BOTH FROM identificador_externo) <> '';

CREATE TABLE IF NOT EXISTS unit (
  id SERIAL PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium(id),
  identificacao VARCHAR(64) NOT NULL,
  bloco VARCHAR(64),
  tipo VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Ativa',
  situacao VARCHAR(64) NOT NULL DEFAULT 'Sem cobrança'
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_condo_identificacao_bloco_unique
  ON unit (condominio_id, lower(identificacao), lower(COALESCE(bloco, '')));

CREATE TABLE IF NOT EXISTS responsible_party (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(64) NOT NULL,
  tipo_pessoa VARCHAR(32) NOT NULL,
  telefone VARCHAR(64),
  whatsapp VARCHAR(64),
  email VARCHAR(255),
  endereco TEXT,
  observacoes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS responsible_party_cpf_cnpj_unique
  ON responsible_party (lower(cpf_cnpj));

CREATE TABLE IF NOT EXISTS unit_responsible_party (
  id SERIAL PRIMARY KEY,
  unidade_id INT NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  responsavel_id INT NOT NULL REFERENCES responsible_party(id) ON DELETE CASCADE,
  tipo_vinculo VARCHAR(64) NOT NULL,
  principal BOOLEAN DEFAULT true,
  observacoes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_responsible_party_unique
  ON unit_responsible_party (unidade_id, responsavel_id, lower(tipo_vinculo));

CREATE TABLE IF NOT EXISTS debt (
  id SERIAL PRIMARY KEY,
  condominio_id INT NOT NULL REFERENCES condominium(id),
  unidade_id INT NOT NULL REFERENCES unit(id),
  referencia VARCHAR(64) NOT NULL,
  descricao VARCHAR(255),
  data_vencimento DATE NOT NULL,
  valor NUMERIC(12,2),
  valor_original NUMERIC(12,2),
  multa NUMERIC(12,2),
  juros NUMERIC(12,2),
  correcao NUMERIC(12,2),
  valor_atualizado NUMERIC(12,2),
  status VARCHAR(32) NOT NULL,
  data_pagamento DATE,
  valor_pago NUMERIC(12,2),
  origem VARCHAR(64),
  identificador_externo VARCHAR(255),
  atualizado_em TIMESTAMP,
  fonte_valores VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS debt_unidade_idx ON debt (unidade_id);
CREATE INDEX IF NOT EXISTS debt_condominio_idx ON debt (condominio_id);
CREATE UNIQUE INDEX IF NOT EXISTS debt_identificador_externo_unique
  ON debt (lower(identificador_externo))
  WHERE identificador_externo IS NOT NULL AND TRIM(BOTH FROM identificador_externo) <> '';

CREATE TABLE IF NOT EXISTS import (
  id SERIAL PRIMARY KEY,
  processo_id VARCHAR(64),
  origem VARCHAR(64),
  tipo VARCHAR(64) NOT NULL,
  arquivo VARCHAR(512),
  status VARCHAR(64) NOT NULL,
  quantidade_registros INT,
  quantidade_importados INT,
  quantidade_atualizados INT,
  quantidade_ignorados INT,
  quantidade_erros INT,
  observacao_interna TEXT,
  usuario_id INT NOT NULL REFERENCES "user"(id),
  iniciado_em TIMESTAMP,
  usuario_aprovacao_id INT REFERENCES "user"(id),
  aprovado_em TIMESTAMP,
  data_importacao TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS import_processo_id_unique
  ON import (processo_id)
  WHERE processo_id IS NOT NULL AND TRIM(BOTH FROM processo_id) <> '';

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES "user"(id),
  entidade VARCHAR(64) NOT NULL,
  registro_id VARCHAR(64),
  acao VARCHAR(32) NOT NULL,
  dados_anteriores TEXT,
  dados_novos TEXT,
  campos_alterados TEXT,
  ip VARCHAR(64),
  user_agent TEXT,
  data_hora TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_entidade_idx ON audit_log (entidade, registro_id);
