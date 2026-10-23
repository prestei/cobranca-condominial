# Usuários

## Objetivo

Gestão de colaboradores, login individual e vínculo com cargos. O nome exibido em atendimentos e auditoria vem da sessão autenticada.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `usuarios`
- **Módulos relacionados:** [cargos](cargos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md)
- **Dados:** `user` em [banco.md](../banco.md); `Usuario` em `catalogo.ts` (protótipo em memória)
- **Stack:** [stack.md](../stack.md) — `AUTH_SECRET`, cookies de sessão

## Rotas e telas

- `/login` — `src/app/login/page.tsx` — entrada com código e senha
- `/usuarios` — `src/app/usuarios/page.tsx` — CRUD de colaboradores (sheet)

## Perfis e permissões

Perfis via `cargo` / `role` — regras detalhadas em [regra-negocio.md](../regra-negocio.md). A sessão carrega `userId`, `email`, `nome` e `cargoId`. Autorização por módulo e ação (`ler`, `criar`, `editar`, `excluir`, `exportar`) conforme [cargos.md](cargos.md) e `src/lib/permissions/`.

## Dados e persistência

Modelo lógico em `docs/banco.md` (`user`, `role`). O catálogo em memória (`src/data/catalogo.ts`) é a fonte de persistência até PostgreSQL; mutações de colaboradores passam pela API no servidor para que login e permissões usem os mesmos dados. Senhas sempre hasheadas com bcrypt no servidor; a API nunca devolve o hash.

## API e contratos

| Método | Path | Body | Resposta |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ codigo, password }` | `200` `{ user: { userId, email, nome, cargoId } }` ou `401` `{ error }` |
| POST | `/api/auth/logout` | — | `200` `{ ok: true }` |
| GET | `/api/auth/session` | — | `200` `{ user: SessionUser \| null }` (`cargoId` incluso) |
| GET | `/api/usuarios` | — | `200` `{ usuarios: UsuarioPublico[] }` — exige permissão `usuarios.ler` |
| POST | `/api/usuarios` | `{ codigo, cargoId, nome, telefone, email, senha }` | `201` `{ usuario }` ou `422` `{ error, fields }` — `usuarios.criar` |
| PATCH | `/api/usuarios/:id` | mesmo body; `senha` opcional | `200` `{ usuario }` — `usuarios.editar` |
| DELETE | `/api/usuarios/:id` | — | `200` `{ ok: true }` ou `409` se em uso / autoexclusão — `usuarios.excluir` |

Cookie: `lc_session`, HTTP-only, `SameSite=Lax`, duração 7 dias.

## Fluxos principais

1. **Login:** usuário envia código e senha → API valida no cadastro → cookie de sessão → redirecionamento para `/` ou `?from=`.
2. **Sessão:** `AuthProvider` consulta `/api/auth/session` e expõe `useAuth()`; menu e atendimentos usam `userId` da sessão.
3. **Logout:** menu **Sair** → `POST /api/auth/logout` → redireciona para `/login`.
4. **CRUD colaboradores:** sheet em `/usuarios` chama `/api/usuarios`; perfil de acesso via cargo selecionado no formulário (matriz em `/cargos`).

## Regras de negócio

- Login individual com senha; autoria de atendimentos pelo colaborador logado (não escolhível manualmente).
- Senha inicial de demonstração: `LexCondominial2026` para os usuários de exemplo (hash em `catalogo.ts`).
- Cada colaborador tem **código único** de login (cadastro em `/usuarios`); comparação sem diferenciar maiúsculas/minúsculas; e-mail continua único no cadastro.

## Integrações

Nenhuma.

## Estados de interface

- Login: carregando, erro de credencial, envio.
- Área autenticada: nome e cargo no header (`usuarioSessaoApp` + sessão).
- Rotas internas bloqueadas sem sessão (`src/proxy.ts`).
- **Sheet colaborador** (`/usuarios`): um painel para identificação (nome, código e cargo em grid), outro para contato (telefone e e-mail) e outro para senha (`type="password"`, obrigatória só na criação). `SheetHelpText` só na seção de senha. Confirmação ao sair com formulário preenchido.
- **Filtros** (`FilterBar`): busca por nome, código, e-mail ou telefone; selects de cargo, telefone (com/sem) e e-mail (com/sem). Limpar e Filtrar voltam para a página 1.
- **Listagem:** coluna Cargo com `BadgeCargo` (padrão visual de `/cargos`).

## Pendências e decisões

- Persistir `user` no PostgreSQL (API já centraliza regras e hash de senha).
- Recuperação de senha e política de bloqueio por tentativas.
