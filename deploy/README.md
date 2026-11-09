# Deploy — VPS + domínio + SSL + banco espelho

Pacote **idempotente**: em uma VPS limpa (ou já usada), um único comando leva a aplicação ao mesmo estado — Next.js, PostgreSQL (pronto para replicação), Caddy com HTTPS e firewall.

## Arquitetura

```
Internet → Caddy :443 (Let's Encrypt) → app :3000 (Next.js)
                                      → db :5432 (Postgres primary, WAL replica)
                                                      ↓ streaming
                                            VPS contingência (standby)
```

| Peça | Função |
| --- | --- |
| `docker-compose.yml` | Stack principal (Caddy + app + Postgres) |
| `docker-compose.standby.yml` | Só o banco espelho na VPS de contingência |
| `scripts/remote-bootstrap.sh` | Roda **na VPS**: Docker, swap, UFW, sobe stack |
| `scripts/push.sh` | Roda **no seu PC**: rsync + bootstrap remoto |
| `scripts/setup-standby.sh` | Liga o espelho quando a 2ª VPS existir |

## Pré-requisitos no DNS

Aponte para o IP da VPS principal (`162.35.125.252`):

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` / `danieljorgeadv.com` | `162.35.125.252` |
| A | `www` | `162.35.125.252` |

Sem isso o Caddy sobe, mas o certificado Let's Encrypt só emite depois da propagação.

## Configuração local (uma vez)

```bash
cp deploy/env.example deploy/.env.production
cp deploy/secrets/vps.env.example deploy/secrets/vps.env
# Edite senhas fortes em ambos os arquivos
```

Gere segredos:

```bash
openssl rand -hex 32   # AUTH_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD / REPLICATION_PASSWORD
```

Em `deploy/.env.production`, `DATABASE_URL` deve usar o usuário/senha do Postgres e host `db` (rede Docker).

## Subir / atualizar a VPS principal

```bash
chmod +x deploy/scripts/*.sh deploy/scripts/ssh_pty.py
./deploy/scripts/push.sh
```

Pode executar de novo a qualquer momento: atualiza código, reconstrói imagens e recria só o que mudou.

## Status

```bash
./deploy/scripts/status.sh
```

## Banco espelho (contingência) — quando a 2ª VPS existir

1. Preencha `STANDBY_HOST` / `STANDBY_PASSWORD` em `deploy/secrets/vps.env`
2. Crie `deploy/.env.standby` com `PRIMARY_HOST=<IP da principal>` e as mesmas senhas de replicação
3. No primary, restrinja `REPLICA_CIDR` ao IP da contingência (`x.x.x.x/32`) e rode `push.sh` de novo
4. Execute:

```bash
./deploy/scripts/setup-standby.sh
```

No primary: `SELECT * FROM pg_stat_replication;` deve listar o standby em `streaming`.

## VPS limpa só com SSH (sem push da sua máquina)

Se o código já estiver em `/opt/cobranca-condominial` e `.env.production` no lugar:

```bash
DOMAIN=danieljorgeadv.com APP_DIR=/opt/cobranca-condominial \
  bash /opt/cobranca-condominial/deploy/scripts/remote-bootstrap.sh
```

## Segurança

- `deploy/secrets/` e `deploy/.env.production` **não** vão para o Git
- Troque a senha root da VPS se ela foi compartilhada em chat
- Quando o standby existir, feche `5432` no UFW só para o IP dele
