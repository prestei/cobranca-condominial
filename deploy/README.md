# Deploy — Node.js + PostgreSQL + Caddy (sem Docker)

A aplicação sobe como processo **Next.js** (`npm run start`) gerenciado por **systemd**.  
Dados vivem **somente no PostgreSQL**. Não há Docker nem volume `.data`.

## Subir VPS limpa (recomendado)

No seu PC, na raiz do projeto:

```bash
npm run vps:subir
# ou: ./deploy/scripts/push.sh --assistente
```

A tela pede **somente**:

1. IP da VPS  
2. Senha SSH (root)

O assistente gera segredos, envia o código, instala Node/Caddy/PostgreSQL, abre firewall, roda migrate/build e deixa o serviço no ar.

Depois aponte o DNS `A` de `danieljorgeadv.com` e `www` para esse IP (HTTPS/Let's Encrypt).

Atualizações seguintes (já com secrets salvos):

```bash
npm run vps:push
```

## Arquitetura

```
Internet → Caddy :443/:80 → 127.0.0.1:3000 (Next.js / systemd)
                          → PostgreSQL local (127.0.0.1:5432)
```

| Peça | Função |
| --- | --- |
| `scripts/subir-vps.py` | Assistente: IP + senha → VPS no ar |
| `scripts/push.sh` | Re-deploy (ou abre o assistente se faltar config) |
| `scripts/remote-bootstrap.sh` | Node, Caddy, Postgres, UFW, systemd |
| `scripts/ci-remote-deploy.sh` | migrate + build + restart |
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
