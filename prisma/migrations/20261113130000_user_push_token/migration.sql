-- Registro de tokens FCM por usuário (push web T34)
CREATE TABLE "user_push_token" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fcm_token" VARCHAR(512) NOT NULL,
    "user_agent" VARCHAR(512),
    "criado_em" TIMESTAMP(3) NOT NULL,
    "ultimo_uso_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_push_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_push_token_fcm_token_key" ON "user_push_token"("fcm_token");

CREATE INDEX "user_push_token_usuario_id_idx" ON "user_push_token"("usuario_id");

ALTER TABLE "user_push_token" ADD CONSTRAINT "user_push_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
