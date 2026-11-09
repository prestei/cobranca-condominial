# Deploy — Node.js + PostgreSQL + Caddy (sem Docker)

A aplicação sobe como processo **Next.js** (`npm run start`) gerenciado por **systemd**.  
Dados vivem **somente no PostgreSQL** (`DATABASE_URL`). Não há Docker nem volume `.data`.

## Arquitetura

```
Internet → Caddy :443 (Let's Encrypt) → 127.0.0.1:3000 (Next.js / systemd)
                                      → PostgreSQL (DATABASE_URL)
```

| Peça | Função |
| --- | --- |
| `systemd/cobranca-app.service` | Processo Node da aplicação |
| `scripts/remote-bootstrap.sh` | Na VPS: Node, Caddy, unit systemd |
| `scripts/ci-remote-deploy.sh` | migrate + build + restart |
| `scripts/push.sh` | Do seu PC: sync/código + deploy remoto |
| `scripts/auto-deploy-pull.sh` | Timer: pull `main` + deploy |

## Pré-requisitos

1. DNS `A` do domínio apontando para a VPS
2. PostgreSQL acessível (instalação nativa, managed cloud, etc.) — **não** use container efêmero
3. `deploy/.env.production` com `AUTH_SECRET` (≥32) e `DATABASE_URL`

```bash
cp deploy/env.example deploy/.env.production
openssl rand -hex 32   # AUTH_SECRET
# Ajuste DATABASE_URL
```

## Bootstrap (VPS limpa)

```bash
# No servidor, com o código em /opt/cobranca-condominial
sudo bash deploy/scripts/remote-bootstrap.sh
# Opcional Postgres local:
# sudo INSTALL_LOCAL_POSTGRES=1 bash deploy/scripts/remote-bootstrap.sh
sudo bash deploy/scripts/ci-remote-deploy.sh
```

## Deploy / atualização

```bash
./deploy/scripts/push.sh
# ou na VPS:
APP_DIR=/opt/cobranca-condominial bash deploy/scripts/ci-remote-deploy.sh
```

O deploy roda `npm run db:migrate`, `npm run build` e `systemctl restart cobranca-app`.

## Auto-deploy

```bash
bash /opt/cobranca-condominial/deploy/scripts/install-auto-deploy.sh
systemctl status cobranca-auto-deploy.timer
```

## Dados

- Migrations: `docs/migrations/*.sql` via `npm run db:migrate`
- Snapshot completo: tabela `catalogo_snapshot`
- Identidade: `role` / `"user"`
- Importação: `condominium`, `unit`, `debt`, `import`, …

Reinício do app **não** apaga colaboradores nem débitos: tudo está no PostgreSQL.
