# Usuários

## Objetivo

Gestão de colaboradores, login individual e vínculo com cargos. O nome exibido em atendimentos e auditoria vem da sessão autenticada.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `usuarios`
- **Módulos relacionados:** [cargos](cargos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md)
- **Dados:** `user` e `role` em [banco.md](../banco.md); repositório em `src/lib/users/repository.ts`
- **Stack:** [stack.md](../stack.md) — `DATABASE_URL`, `AUTH_SECRET`, `npm run db:migrate`, `npm run db:seed`

## Rotas e telas

- `/login` — `src/app/login/page.tsx` — entrada com código e senha
- `/users` — `src/app/users/page.tsx` — CRUD de colaboradores (sheet). Legado: `/usuarios` → redirect.

## Perfis e permissões

Perfis via `cargo` / `role` — regras detalhadas em [regra-negocio.md](../regra-negocio.md). A sessão carrega `userId`, `email`, `nome` e `cargoId`. Autorização por módulo e ação (`ler`, `criar`, `editar`, `excluir`, `exportar`) conforme [cargos.md](cargos.md) e `src/lib/permissions/`.

## Dados e persistência

Colaboradores persistem na tabela PostgreSQL `"user"` (`cargo_id` → `role`). Login (`POST /api/auth/login`) e CRUD (`/api/users`) leem e gravam no banco via `src/lib/users/service.ts`. Senhas sempre hasheadas com bcrypt no servidor; a API nunca devolve o hash.

Após listar ou mutar colaboradores, o servidor sincroniza a lista pública (sem senha) em `src/lib/catalog` para telas que ainda exibem nomes a partir do estado em memória (atendimentos, etc.).

## API e contratos

| Método | Path | Body | Resposta |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ codigo, password }` | `200` `{ user: { userId, email, nome, cargoId } }` ou `401` `{ error }` |
| POST | `/api/auth/logout` | — | `200` `{ ok: true }` |
| GET | `/api/auth/session` | — | `200` `{ user: SessionUser \| null }` (`cargoId` incluso) |
| GET | `/api/users` | — | `200` `{ usuarios: UsuarioPublico[] }` — exige permissão `usuarios.ler` |
| POST | `/api/users` | `{ codigo, cargoId, nome, cpf?, dataNascimento?, telefone, email, senha }` | `201` `{ usuario }` ou `422` `{ error, fields }` — `usuarios.criar` |
| PATCH | `/api/users/:id` | mesmo body; `senha` opcional | `200` `{ usuario }` — `usuarios.editar` |
| DELETE | `/api/users/:id` | — | `200` `{ ok: true }` ou `409` se em uso / autoexclusão — `usuarios.excluir` |

Cookie: `lc_session`, HTTP-only, `SameSite=Lax`, duração 7 dias.

Erros de banco ou `DATABASE_URL` ausente: `503` com mensagem orientando migrate/seed (ver `src/lib/api/db-error.ts`).

## Fluxos principais

1. **Login:** usuário envia código e senha → API valida na tabela `user` → cookie de sessão → redirecionamento para `/` ou `?from=`.
2. **Sessão:** `AuthProvider` consulta `/api/auth/session` e expõe `useAuth()`; menu e atendimentos usam `userId` da sessão.
3. **Logout:** menu **Sair** → `POST /api/auth/logout` → redireciona para `/login`.
4. **CRUD colaboradores:** sheet em `/users` chama `/api/users`; perfil de acesso via cargo selecionado no formulário (matriz em `/roles`, dados em `role`).

## Regras de negócio

- Login individual com senha; autoria de atendimentos pelo colaborador logado (não escolhível manualmente).
- Colaborador inicial (`npm run db:seed`): **Prestei**, código de login `1234`, senha `1234`, cargo Administrador.
- Cada colaborador tem **código único** de login (cadastro em `/users`); comparação sem diferenciar maiúsculas/minúsculas; e-mail continua único no cadastro.
- CPF e data de nascimento são opcionais; quando informados, persistem só dígitos (11 e DDMMAAAA) e são exibidos com máscara na tela.
- Exclusão bloqueada se houver atendimentos, importações ou auditoria no protótipo em memória referenciando o colaborador; bloqueio de autoexclusão com sessão ativa.

## Integrações

Nenhuma.

## Estados de interface

- Login: carregando, erro de credencial, envio.
- Área autenticada: nome e cargo no header (`usuarioSessaoApp` + sessão).
- Rotas internas bloqueadas sem sessão (`src/proxy.ts`).
- **Sheet colaborador** (`/users`): um painel para identificação (nome; CPF e data de nascimento opcionais com máscara; código e cargo em grid), outro para contato (telefone com máscara e e-mail) e outro para senha (`type="password"`, obrigatória só na criação). `SheetHelpText` só na seção de senha. Confirmação ao sair com formulário preenchido.
- **Filtros** (`FilterBar`): busca por nome, código, e-mail ou telefone; selects de cargo, telefone (com/sem) e e-mail (com/sem). Limpar e Filtrar voltam para a página 1.
- **Listagem:** coluna Cargo com `RoleBadge` (padrão visual de `/roles`).

## Pendências e decisões

- Recuperação de senha e política de bloqueio por tentativas.
- Persistir atendimentos/importações/auditoria no PostgreSQL para checagem de exclusão de colaborador só no banco.
