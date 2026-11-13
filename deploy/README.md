# Deploy — Node.js + PostgreSQL + Caddy (sem Docker)

A aplicação sobe como processo **Next.js** (`npm run start`) gerenciado por **systemd**.  
Dados vivem **somente no PostgreSQL**. Não há Docker nem volume `.data`.

## Subir VPS limpa (recomendado)

No seu PC, na raiz do projeto:

```bash
npm run vps:subir
# ou: ./deploy/scripts/push.sh --assistente
```

A tela pede:

1. IP da VPS  
2. Senha SSH (root)  
3. Domínio (padrão: `danieljorgeadv.com`)

O assistente gera segredos, envia o código, instala Node/Caddy/PostgreSQL, abre firewall, roda migrate/build e deixa o serviço no ar.

Depois aponte o DNS `A` do domínio e `www` para esse IP (HTTPS/Let's Encrypt).

Atualizações seguintes (já com secrets salvos):

```bash
npm run vps:push
```

## Arquitetura

```
Internet → Caddy :443/:80 → 127.0.0.1:3000 (Next.js / systemd)
                          → PostgreSQL local (DATABASE_URL em deploy/.env.production)
```

| Peça | Função |
| --- | --- |
| `scripts/subir-vps.py` | Assistente: IP + senha → VPS no ar |
| `scripts/push.sh` | Re-deploy (ou abre o assistente se faltar config) |
| `scripts/remote-bootstrap.sh` | Node, Caddy, Postgres, UFW, systemd |
| `scripts/ci-remote-deploy.sh` | migrate + build + restart (backup de `.next` e rollback se build/healthcheck falhar) |
| `systemd/cobranca-app.service` | Processo da aplicação |

## Pré-requisitos no seu PC

- `python3`, `ssh`, `rsync`
- VPS Ubuntu limpa com acesso SSH root + senha

## Deploy manual (só se precisar)

```bash
# Na VPS, com código já em /opt/cobranca-condominial e .env.production
sudo INSTALL_LOCAL_POSTGRES=1 bash deploy/scripts/remote-bootstrap.sh
sudo bash deploy/scripts/ci-remote-deploy.sh
```

## Auto-deploy

Há **dois** caminhos (podem coexistir):

### 1. GitHub Actions (push em `main`)

Workflow: `.github/workflows/deploy.yml` — rsync + `ci-remote-deploy.sh` na VPS.

Secrets do repositório (Settings → Secrets and variables → Actions):

| Secret | Conteúdo |
| --- | --- |
| `VPS_HOST` | IP ou hostname da VPS |
| `VPS_USER` | Usuário SSH (ex.: `root`) |
| `VPS_APP_DIR` | Diretório da app (ex.: `/opt/cobranca-condominial`) |
| `VPS_SSH_PRIVATE_KEY` | Chave privada ed25519 (local: `deploy/secrets/deploy_vps_ed25519`) |

A chave pública correspondente deve estar em `~/.ssh/authorized_keys` na VPS (comentário típico: `github-actions-deploy@cobranca`).

Disparo manual: Actions → **Deploy produção** → Run workflow.

### 2. Timer na VPS (git pull a cada 2 min)

```bash
bash /opt/cobranca-condominial/deploy/scripts/install-auto-deploy.sh
systemctl status cobranca-auto-deploy.timer
```

## Dados

- Migrations: **Prisma** (`prisma/migrations`) via `npx prisma migrate deploy` (script `npm run db:migrate`)
- Schema: `prisma/schema.prisma` + client em `src/lib/db/prisma.ts`
- Identidade: `role` / `"user"`
- Domínios: `condominium`, `unit`, `debt`, `import`, `service_ticket`, `collection_assignment`, …

Reinício do app **não** apaga colaboradores nem débitos: tudo está no PostgreSQL (fora de `/opt/cobranca-condominial`).
