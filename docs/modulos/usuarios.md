# Usuários

## Objetivo

Gestão de colaboradores, login individual e vínculo com cargos. O nome exibido em atendimentos e auditoria vem da sessão autenticada.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `usuarios`
- **Módulos relacionados:** [cargos](cargos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md)
- **Dados:** `user` em [banco.md](../banco.md); tipo `Usuario` em `src/data/catalogo.ts` (estado em memória no servidor, espelhado no cliente)
- **Stack:** [stack.md](../stack.md) — `AUTH_SECRET`, cookies de sessão

## Rotas e telas

- `/login` — `src/app/login/page.tsx` — entrada com código e senha
- `/usuarios` — `src/app/usuarios/page.tsx` — CRUD de colaboradores (sheet)

## Perfis e permissões

Perfis via `cargo` / `role` — regras detalhadas em [regra-negocio.md](../regra-negocio.md). A sessão carrega `userId`, `email`, `nome` e `cargoId`. Autorização por módulo e ação (`ler`, `criar`, `editar`, `excluir`, `exportar`) conforme [cargos.md](cargos.md) e `src/lib/permissions/`.

## Dados e persistência

Modelo lógico em `docs/banco.md` (`user`, `role`). Colaboradores e senhas (bcrypt) ficam no estado servidor de `catalogo.ts`; o CRUD em `/usuarios` persiste via API. Login valida no servidor com `buscarUsuarioPorCodigoLogin` + `verifyPassword`.

## API e contratos

### Autenticação

| Método | Path | Body | Resposta |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ codigo, password }` | `200` `{ user: { userId, email, nome, cargoId } }` ou `401` `{ error }` |
| POST | `/api/auth/logout` | — | `200` `{ ok: true }` |
| GET | `/api/auth/session` | — | `200` `{ user: SessionUser \| null }` (`cargoId` incluso) |

Cookie: `lc_session`, HTTP-only, `SameSite=Lax`, duração 7 dias.

### Colaboradores (`src/lib/usuarios/service.ts`)

Permissões: `usuarios.ler` (listar), `usuarios.criar`, `usuarios.editar`, `usuarios.excluir`. Respostas **não** incluem `senha`.

| Método | Path | Body | Resposta |
| --- | --- | --- | --- |
| GET | `/api/usuarios` | — | `200` `{ usuarios: UsuarioPublico[] }` |
| POST | `/api/usuarios` | `{ codigo, cargoId, nome, telefone, email, senha, codigoRe?, id? }` | `201` `{ usuario }` ou `4xx` `{ error }` |
| PATCH | `/api/usuarios/:id` | `{ codigo, cargoId, nome, telefone, email, senha?, codigoRe? }` | `200` `{ usuario }` |
| DELETE | `/api/usuarios/:id` | — | `200` `{ ok: true }` — bloqueado se houver atendimento, importação ou auditoria |

Sincronização cliente: `src/lib/usuarios/sync-cliente.ts` (`garantirUsuariosPersistidosNoServidor` na abertura de `/usuarios`).

## Fluxos principais

1. **Login:** usuário envia código e senha → API valida no cadastro → cookie de sessão → redirecionamento para `/` ou `?from=`.
2. **Sessão:** `AuthProvider` consulta `/api/auth/session` e expõe `useAuth()`; menu e atendimentos usam `userId` da sessão.
3. **Logout:** menu **Sair** → `POST /api/auth/logout` → redireciona para `/login`.
4. **CRUD colaboradores:** sheet em `/usuarios` → `POST`/`PATCH`/`DELETE` `/api/usuarios` → estado servidor + espelho no cliente.

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

- Migrar `user` e senhas para PostgreSQL (migrations em `db/migrations/`).
- Recuperação de senha e política de bloqueio por tentativas.
