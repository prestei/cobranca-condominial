# Cargos / perfis

## Objetivo

Definição de cargos (perfis) e matriz de permissões por módulo do sistema. O administrador marca, para cada cargo, quais ações (ver, criar, editar, excluir, exportar) são permitidas em cada área.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — §2.2 permissões
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `cargos`
- **Módulos relacionados:** [usuarios](usuarios.md)
- **Dados:** tabela `role` em [banco.md](../banco.md); cache de leitura no cliente via `setCargos` após API
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)
- **Código transversal:** `src/lib/permissions/*`, `src/proxy.ts`, `src/hooks/use-permissao.ts`, `src/lib/roles/*`

## Rotas e telas

- `/roles` — `src/app/roles/page.tsx` — CRUD de cargos e matriz de permissões (sheet). Legado: `/cargos` → redirect.
- `/access-denied` — `src/app/access-denied/page.tsx` — feedback quando o usuário não tem permissão de **ver** o módulo. Legado: `/acesso-negado` → redirect.

## Perfis e permissões

| Quem configura | Quem é afetado |
|----------------|----------------|
| Colaborador com `cargos.criar` / `cargos.editar` | Todos os usuários vinculados ao cargo em [usuarios](usuarios.md) |

**Modelo:** JSON em `role.permissao_json`, normalizado em `src/lib/permissions/`. Chaves de primeiro nível = módulos (`dashboard`, `atendimentos`, `debitos`, …). Valores = objeto com flags `ler`, `criar`, `editar`, `excluir` e, em relatórios, `exportar`.

**Seeds iniciais:** `npm run db:seed` insere Administrador (id 1), Atendente (id 2) e Advogado (id 3) com os mesmos JSON de `src/lib/permissions/seeds.ts`. JSON legado com flags planas é migrado automaticamente ao ler (`parsePermissoesJson`).

**Enforcement:**

- **Rotas:** `src/proxy.ts` lê `permissao_json` do cargo (`session.cargoId`) no PostgreSQL.
- **API:** `requirePermission` / `requireAnyPermission` usam o mesmo store (`permissoesDaSessao`).
- **Menu e ações na UI:** `usePermissao` deriva permissões do cache de cargos no cliente (sincronizado pela API após login).

## Dados e persistência

| Tabela | Uso |
| --- | --- |
| `role` | Nome, descrição e `permissao_json` de cada cargo |

Migrations em `db/migrations/` (`db:migrate`). Dados iniciais: `npm run db:seed` (requer `DATABASE_URL`).

## API e contratos

| Método | Path | Permissão | Resposta |
| --- | --- | --- | --- |
| GET | `/api/roles` | `cargos.ler` **ou** `usuarios.ler` / `usuarios.criar` / `usuarios.editar` | `{ cargos: CargoPublico[] }` |
| POST | `/api/roles` | `cargos.criar` | `{ cargo }` — 201 |
| PATCH | `/api/roles/:id` | `cargos.editar` | `{ cargo }` |
| DELETE | `/api/roles/:id` | `cargos.excluir` | `{ ok: true }` |

Body de create/update: `{ nome, descricao, permissaoJson }`.

Erros comuns: `401` não autenticado; `403` sem permissão; `422` validação (nome duplicado, sem permissão marcada, cargo em uso na exclusão); `503` banco indisponível ou `DATABASE_URL` ausente.

Sessão: `cargoId` no JWT (`SessionUser` em `src/lib/auth/types.ts`).

## Fluxos principais

1. Admin abre `/roles` → lista carregada via `GET /api/roles` → **Novo** ou **Editar** → salva via POST/PATCH → PostgreSQL atualizado → cache local (`setCargos`).
2. Colaborador faz login → `AuthProvider` carrega cargos → permissões na UI; proxy e APIs leem o cargo pelo `cargoId` da sessão no banco.
3. Tentativa de abrir rota sem `ler` → redirecionamento para `/access-denied?modulo=…`.

## Regras de negócio

- Todo cargo deve ter ao menos uma permissão marcada ao salvar.
- Nome de cargo único (case-insensitive).
- Cargo em uso por colaboradores (lista em memória de `usuarios` até persistência de `user`) não pode ser excluído.
- Alterações de permissões do próprio cargo refletem no menu após recarregar cargos; rotas protegidas refletem na próxima requisição (leitura no banco).

## Integrações

Nenhuma.

## Estados de interface

- Carregamento inicial da listagem; erro se o banco não responder.
- Listagem: coluna **Áreas com acesso** com `ResumoPermissoesCargo`.
- Mobile: métricas em carrossel; desktop em grid de 3 colunas.
- Lista vazia / filtro sem resultado; sheet com `MatrizPermissoesCargo`; confirmação de exclusão e de saída com dados preenchidos.

## Pendências e decisões

- Persistir `user` no PostgreSQL e validar “cargo em uso” diretamente no banco.
- Recarregar sessão/JWT após alteração do próprio cargo (hoje `cargoId` na sessão permanece; permissões vêm do banco por `cargo_id`).
