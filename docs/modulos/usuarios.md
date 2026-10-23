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

Modelo lógico em `docs/banco.md` (`user`, `role`). Hoje o login valida contra `getCadastros().usuarios` no servidor (mesmo seed que o protótipo). Senhas iniciais em bcrypt; novas senhas cadastradas na UI permanecem em texto no cliente até a migração para PostgreSQL.

## API e contratos

| Método | Path | Body | Resposta |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ codigo, password }` | `200` `{ user: { userId, email, nome, cargoId } }` ou `401` `{ error }` |
| POST | `/api/auth/logout` | — | `200` `{ ok: true }` |
| GET | `/api/auth/session` | — | `200` `{ user: SessionUser \| null }` (`cargoId` incluso) |

Cookie: `lc_session`, HTTP-only, `SameSite=Lax`, duração 7 dias.

## Fluxos principais

1. **Login:** usuário envia código e senha → API valida no cadastro → cookie de sessão → redirecionamento para `/` ou `?from=`.
2. **Sessão:** `AuthProvider` consulta `/api/auth/session` e expõe `useAuth()`; menu e atendimentos usam `userId` da sessão.
3. **Logout:** menu **Sair** → `POST /api/auth/logout` → redireciona para `/login`.
4. **CRUD colaboradores:** sheet em `/usuarios` (ainda em memória no cliente).

## Regras de negócio

- Login individual com senha; autoria de atendimentos pelo colaborador logado (não escolhível manualmente).
- Senha inicial de demonstração: `12345` para os usuários de exemplo (hash em `catalogo.ts`); acesso rápido com código `12345`.
- Cada colaborador tem **código único** de login (cadastro em `/usuarios`); comparação sem diferenciar maiúsculas/minúsculas; e-mail continua único no cadastro.

## Integrações

Nenhuma.

## Estados de interface

- Login: carregando, erro de credencial, envio.
- Área autenticada: nome e cargo no header (`usuarioSessaoApp` + sessão).
- Rotas internas bloqueadas sem sessão (`src/proxy.ts`).

## Pendências e decisões

- Persistir `user` e senhas hasheadas no PostgreSQL; alinhar CRUD de `/usuarios` à API.
- API de usuários e sincronização servidor/cliente para permissões no `middleware`.
- Recuperação de senha e política de bloqueio por tentativas.
