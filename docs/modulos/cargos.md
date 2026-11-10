# Cargos / perfis

## Objetivo

Definição de cargos (perfis) e matriz de permissões por módulo do sistema. O administrador marca, para cada cargo, quais ações (ver, criar, editar, excluir, exportar) são permitidas em cada área.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — §2.2 permissões
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `cargos`
- **Módulos relacionados:** [usuarios](usuarios.md)
- **Dados:** `role` em [banco.md](../banco.md); `Cargo` em `catalogo.ts`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)
- **Código transversal:** `src/lib/permissions/*`, `src/proxy.ts`, `src/hooks/use-permissao.ts`, `src/lib/auth/destino-pos-login.ts`

## Rotas e telas

- `/cargos` — `src/app/cargos/page.tsx` — CRUD de cargos e matriz de permissões (sheet)
- `/acesso-negado` — `src/app/acesso-negado/page.tsx` — feedback quando o usuário não tem permissão de **ver** o módulo

## Perfis e permissões

| Quem configura | Quem é afetado |
|----------------|----------------|
| Colaborador com `cargos.criar` / `cargos.editar` | Todos os usuários vinculados ao cargo em [usuarios](usuarios.md) |

**Modelo:** JSON em `permissao_json` / `Cargo.permissaoJson`, normalizado em `src/lib/permissions/`. Chaves de primeiro nível = módulos (`dashboard`, `atendimentos`, `debitos`, …). Valores = objeto com flags `ler`, `criar`, `editar`, `excluir` e, em relatórios, `exportar`.

**Permissões vigentes:** `role.permissao_json` no PostgreSQL. Evolução de matriz dos cargos de fábrica via `docs/migrations/*.sql` (ex.: Atendente + importações em `2026-11-12-atendente-permissao-importacoes.sql`). `src/lib/permissions/seeds.ts` só entra no bootstrap de tabela `role` vazia / reparo de JSON vazio e em “Restaurar padrão” na UI — não é a fonte das alterações de permissão em ambiente com banco. O seed do **Atendente** inclui `importacoes.ler/criar/editar` (alinhado à migration e a [importacoes.md](importacoes.md)); “Restaurar padrão” não remove mais o direito de importar. JSON legado com flags planas (`cadastros`, `retornos`, …) é migrado automaticamente ao ler (`parsePermissoesJson`).

**Enforcement:**

- **Rotas:** `src/proxy.ts` bloqueia acesso sem `ler` no módulo da rota.
- **Login:** `destinoSeguroAposLogin` evita mandar o colaborador para uma rota sem `ler` quando a URL traz `from`.
- **Menu:** `WorkspaceShell` oculta links sem `ler` (permissões da sessão vindas do servidor).
- **Ações:** telas de CRUD usam `usePermissao().pode(modulo, acao)` para botões Novo / Editar / Excluir e exportação em relatórios.

## Dados e persistência

Persistência em PostgreSQL (`role` via `src/lib/db/identity-pg.ts`). Cache de processo só espelha o banco. Modelo lógico em `docs/banco.md` (`role.permissao_json`).

Na subida, `garantirIdentidadeInicialPg` grava cargos padrão se a tabela estiver vazia e **repara** `permissao_json` vazio/`{}` dos cargos de fábrica — sem sobrescrever cargos que já tenham alguma permissão. Ajustes de matriz (ex.: importações do Atendente) ficam em migrations SQL em `docs/migrations/`. Login/sessão, `requirePermissao` e as checagens do fluxo de importação (`requirePermissaoAcaoImportacao` / `assertPermissaoAcaoImportacao` em `src/lib/importacoes/permissoes.ts`) leem `role.permissao_json` no PostgreSQL via `resolverPermissoesUsuario` — não dependem só do cache em memória do processo. O proxy usa o snapshot de permissões gravado no JWT (atualizado no login e em `GET /api/auth/session`). O menu no cliente usa apenas o payload da sessão. Sem Docker: deploy via systemd + PostgreSQL local (`npm run vps:push`).

## API e contratos

| Método | Path | Permissão | Resposta |
| --- | --- | --- | --- |
| GET | `/api/cargos` | `cargos.ler` | `{ cargos: Cargo[] }` |
| POST | `/api/cargos` | `cargos.criar` | `201` `{ cargo }` — auditoria `role` INSERT |
| PATCH | `/api/cargos/:id` | `cargos.editar` | `{ cargo }` — auditoria com resumo de permissões antes/depois |
| DELETE | `/api/cargos/:id` | `cargos.excluir` | `{ ok: true }` — bloqueado se houver colaboradores |

Serviço: `src/lib/cargos/service.ts`. Sessão: `cargoId` no JWT (`SessionUser` em `src/lib/auth/types.ts`).

## Fluxos principais

1. Admin abre `/cargos` → **Novo** ou **Editar** → preenche nome, descrição e matriz por módulo → salva via API (`permissaoJson` serializado no servidor).
2. Colaborador faz login → permissões derivadas do `cargoId` + `permissaoJson` do cargo (servidor) e enviadas em `login`/`session`.
3. Tentativa de abrir rota sem `ler` → redirecionamento para `/acesso-negado?modulo=…` (exceto no pós-login com `from` sem permissão, que cai no início).

## Regras de negócio

- Todo cargo deve ter ao menos uma permissão marcada ao salvar.
- Cargo em uso por colaboradores não pode ser excluído.
- Menu e ações no cliente usam as permissões da sessão (`GET /api/auth/session`); o proxy revalida no servidor a cada navegação lendo `role.permissao_json` no PostgreSQL (sem fallback para seed em memória).

## Integrações

Nenhuma.

## Estados de interface

- Listagem: indicadores **Cargos no sistema** / **Áreas de acesso** / **Colaboradores vinculados** (com detalhe no desktop), **Filtros** (busca, descrição, área), **Exportar**, tabela (`fitContainer`, sem scroll horizontal) e paginação; colunas **Cargo**, **Descrição**, **Colaboradores**, **Ação**; sheet wide para cadastro/edição (matriz + switch `ativo`).
- Mobile: cards em **grid** (`grid-cols-1` → `2` → `3`), mesmo padrão de [Colaboradores](usuarios.md); filtros; lista vazia / filtro sem resultado; sheet **wide** com cabeçalho em destaque (`primary-fixed`), título dinâmico (nome do cargo), bloco **Nome do cargo** / **Para que serve** em `SheetPanel` e `MatrizPermissoesCargo` (barra de progresso `módulos com acesso`, atalhos **Restaurar padrão** — seeds Administrador/Atendente/Advogado ou estado ao abrir — e **Desmarcar tudo**; um cartão por área, checkboxes Consultar, Cadastrar, Alterar, Excluir, Exportar dados); rodapé **Cancelar** + **Salvar**; confirmação de exclusão e de saída com dados preenchidos.

## Pendências e decisões

- Persistir `role` e API de cargos; alinhar middleware e sessão ao mesmo store do CRUD.
- Recarregar sessão após alteração do próprio cargo (hoje: novo login se só o JWT do servidor importar).
