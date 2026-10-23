# Release

Registro de entregas do **Lex Condominial — Cobrança**. Detalhes por módulo ficam em [modulos/](modulos/README.md).

## Em desenvolvimento

- Persistência PostgreSQL para cadastros além de cargos, colaboradores e unidades (demais entidades ainda em `src/lib/catalog`).
- Exportação CSV/XLS/PDF com geração real de arquivos nas listagens que ainda não implementam `onExport` (referência em condomínios).

## 2026-10-23 — Rotas em português e PostgreSQL local

- Rotas de app em português (`/condominios`, `/unidades`, `/usuarios`, …); URLs antigas em inglês redirecionam via `next.config.ts`. Mapa atualizado em [mapa-do-projeto.md](mapa-do-projeto.md).
- Removido suporte a Docker no repositório; desenvolvimento com PostgreSQL local (`DATABASE_URL`, `db:migrate`, `db:seed`) — [stack.md](stack.md).

## 2026-10-23 — Skill make-functional e login

- Skill **make-functional**: filtros da `FilterBar`, menu **Exportar** (CSV/XLS/PDF) e importação de arquivos passam a ser critério de entrega funcional (recorte filtrado, `@/lib/export`, permissão `exportar`, processamento no PostgreSQL).
- Login: campos vazios por padrão; removido texto de demonstração com credenciais na tela.

## 2026-10-23 — PostgreSQL, rotas em inglês e APIs de cadastro

### Banco e autenticação

- Migrations em `db/migrations/` (`role`, `user`); scripts `npm run db:migrate`, `db:seed` e `db:windows-bootstrap`.
- Login e CRUD de colaboradores e cargos no PostgreSQL (`DATABASE_URL`); erros de conexão orientam migrate/seed (`src/lib/api/db-error.ts`).
- Windows: `DATABASE_URL` com **`127.0.0.1`** (evita `28P01` com `localhost`/IPv6); mensagens em `db:migrate`/`db:seed` e [stack.md](stack.md).
- Ver [stack.md](stack.md), [banco.md](banco.md), [modulos/usuarios.md](modulos/usuarios.md) e [modulos/cargos.md](modulos/cargos.md).

### Rotas e código

- Rotas de app em inglês (`/users`, `/roles`, `/condominiums`, …); URLs legadas em português redirecionam via `next.config.ts`.
- APIs `/api/users` e `/api/roles`; módulos em `src/lib/users` e `src/lib/roles`.
- Convenções de idioma (código em inglês, UI/docs em português): `.agents/skills/_shared/code-conventions.md`.

---

## 2026-10-23 — Listagens, colaboradores e merge main

### Listagens e design system

- Ordem padrão em `PageContent`: **`CardMetricRow` → `FilterBar` → tabela** (todas as listagens e relatórios com filtro).
- Documentação em [design-system.md](design-system.md) e skill `create-screen` alinhadas a essa ordem.
- Foco de campos (`Input`, `Select`, checkboxes): borda `primary-container` e anel `primary-fixed` (substitui destaque dourado no foco).

### Colaboradores (`/users`)

- Sheet em painéis (identificação, contato, senha), ícones no título dos painéis, fechamento com baseline/dirty check.
- Filtros: cargo, telefone (com/sem), e-mail (com/sem).
- Coluna cargo com `RoleBadge` (mesmo padrão visual dos badges em `/roles`).
- Ver [modulos/usuarios.md](modulos/usuarios.md).

### Condomínios e exportação (merge)

- Resolução de merge: KPIs + filtros locais + `onExport` no `ResponsiveTable` para exportação na listagem.
- Ajustes em catálogo, login, exportação e tabela compartilhada (`src/components/table.tsx`).

### Outros

- Atualizações em [banco.md](banco.md), `.env.example` e constantes de autenticação conforme merge remoto.
- Build: `Suspense` em páginas com `useSearchParams` (acesso negado, atendimentos, unidades) e ajustes de tipagem no layout e relatórios.

---

## 2026-10-22 — CardMetricRow nas listagens

- Adoção de `CardMetricRow` em dashboard, atendimentos, auditoria, cargos, condomínios, débitos, importações e relatórios.
- Diretrizes do componente documentadas em [design-system.md](design-system.md).
