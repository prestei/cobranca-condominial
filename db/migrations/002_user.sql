-- Colaboradores (login e CRUD em /usuarios)

CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  cargo_id INT REFERENCES role (id),
  nome VARCHAR(255),
  cpf VARCHAR(11),
  data_nascimento VARCHAR(8),
  telefone VARCHAR(255),
  email VARCHAR(255),
  senha VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_codigo_lower_idx ON "user" (LOWER(codigo));
CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_idx ON "user" (LOWER(email))
  WHERE email IS NOT NULL AND TRIM(email) <> '';
