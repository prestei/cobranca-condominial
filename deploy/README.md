# Deploy — Node.js + PostgreSQL + Caddy (sem Docker)

A aplicação sobe como processo **Next.js** (`npm run start`) gerenciado por **systemd**.  
Dados vivem **somente no PostgreSQL**. Não há Docker nem volume `.data`.

## Subir VPS limpa (recomendado)

No seu PC, na raiz do projeto:

```bash
npm run vps:subir
# ou: ./deploy/scripts/push.sh --assistente
```

**Windows (PowerShell):**

```powershell
.\deploy\scripts\subir-vps.ps1
# ou sem perguntas: .\deploy\scripts\subir-vps.ps1 -Host 203.0.113.10 -Password '…'
```

A tela pede **somente**:

1. IP da VPS  
2. Senha SSH (root)  

O domínio HTTPS usa o padrão `danieljorgeadv.com` (altere com `--domain` no script Python ou `-Domain` no `.ps1`).

O assistente gera segredos, **exige `git push` no `main`**, atualiza a VPS com **git fetch/reset** (não envia arquivo a arquivo), instala Node/Caddy/PostgreSQL, abre firewall, roda migrate/build e deixa o serviço no ar.

Depois aponte o DNS `A` do domínio e `www` para esse IP (HTTPS/Let's Encrypt).

Atualizações seguintes (já com secrets salvos):

1. `git push origin main` (o deploy usa o que está no GitHub)  
2. `npm run vps:push` (ou `python3 deploy/scripts/deploy_git.py sync` + bootstrap/deploy)

Repositório **privado** na VPS: coloque um PAT read-only em `deploy/secrets/vps.env` como `GITHUB_DEPLOY_TOKEN=…`.

## Arquitetura

```
Internet → Caddy :443/:80 → 127.0.0.1:3000 (Next.js / systemd)
                          → PostgreSQL local (DATABASE_URL em deploy/.env.production)
```

| Peça | Função |
| --- | --- |
| `scripts/subir-vps.py` | Assistente: IP + senha → VPS no ar |
| `scripts/deploy_git.py` | Preflight local + git sync na VPS |
| `scripts/remote-git-sync.sh` | Na VPS: clone ou fetch+reset (preserva `.env.production`) |
| `scripts/push.sh` | Re-deploy (ou abre o assistente se faltar config) |
| `scripts/remote-bootstrap.sh` | Node, Caddy, Postgres, UFW, systemd |
| `scripts/ci-remote-deploy.sh` | migrate + build + restart (backup de `.next` e rollback se build/healthcheck falhar) |
| `systemd/cobranca-app.service` | Processo da aplicação |

## Pré-requisitos no seu PC

- **Linux/macOS:** `python3`, `ssh`, `git`
- **Windows:** Python 3 (`py -3`); o assistente instala `paramiko` de `deploy/requirements-deploy.txt` (não precisa de WSL nem rsync)
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

Workflow: `.github/workflows/deploy.yml` — git sync na VPS + `ci-remote-deploy.sh`.

Secrets do repositório (Settings → Secrets and variables → Actions):

| Secret | Conteúdo |
| --- | --- |
| `VPS_HOST` | IP ou hostname da VPS |
| `VPS_USER` | Usuário SSH (ex.: `root`) |
| `VPS_APP_DIR` | Diretório da app (ex.: `/opt/cobranca-condominial`) |
| `VPS_SSH_PRIVATE_KEY` | Chave privada ed25519 (local: `deploy/secrets/deploy_vps_ed25519`) |
| `DEPLOY_REPO_TOKEN` | (Opcional) PAT read-only se o repositório for privado |

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
