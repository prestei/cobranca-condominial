# Usuários

## Objetivo

Gestão de colaboradores, login individual, código RE para atendentes e vínculo advogado ↔ condomínio. Autoria de atendimentos vem da sessão autenticada; identificação operacional do atendente é o RE.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `usuarios`
- **Módulos relacionados:** [cargos](cargos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md), [condominios](condominios.md)
- **Dados:** `user` em [banco.md](../banco.md); tipo `Usuario` em `src/data/catalogo.ts` (estado em memória no servidor, espelhado no cliente)
- **Migração RE:** [migrations/2026-10-29-codigo-re-usuarios.md](../migrations/2026-10-29-codigo-re-usuarios.md)
- **Stack:** [stack.md](../stack.md) — `AUTH_SECRET`, cookies de sessão

## Rotas e telas

- `/login` — `src/app/login/page.tsx` — entrada com código e senha
- `/usuarios` — `src/app/usuarios/page.tsx` — CRUD, situação ativo/inativo, RE e condomínios do advogado (sheet)

## Perfis e permissões

Perfis via `cargo` / `role` — regras detalhadas em [regra-negocio.md](../regra-negocio.md). A sessão carrega `userId`, `email`, `nome` e `cargoId`. Autorização por módulo e ação (`ler`, `criar`, `editar`, `excluir`, `exportar`) conforme [cargos.md](cargos.md) e `src/lib/permissions/`.

## Dados e persistência

Modelo lógico em `docs/banco.md` (`user`, `role`). Colaboradores e senhas (bcrypt) ficam no estado servidor de `catalogo.ts`; o CRUD em `/usuarios` persiste via API. Login valida no servidor com `buscarUsuarioPorCodigoLogin` + `verifyPassword` (bloqueia `ativo === false`).

## Código RE

| Regra | Detalhe |
| --- | --- |
| Formato | `RE-` + cinco dígitos, a partir de `RE-10000` |
| Quem recebe | Cargo **Atendente** apenas |
| Geração | `src/lib/colaboradores/re-sequencia.ts` + mutex em `reservarCodigoRe` |
| Frontend | Não envia nem altera `codigoRe` |
| Imutabilidade | RE não muda em edição, desativação ou reativação |
| Inativo | RE permanece alocado; atendente inativo não aparece em listas operacionais de RE |

Helpers: `codigoReDoUsuario`, `identificadorColaboradorPorId`, `listarAtendentesComRe` em `src/lib/colaboradores/re.ts`.

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
| POST | `/api/usuarios` | `{ codigo, cargoId, nome, telefone, email, senha, ativo?, condominioIds?, id? }` | `201` `{ usuario }` — RE gerado se Atendente |
| PATCH | `/api/usuarios/:id` | `{ codigo, cargoId, nome, telefone, email, senha?, ativo?, condominioIds? }` | `200` `{ usuario }` |
| PATCH | `/api/usuarios/:id/situacao` | `{ ativo: boolean }` | `200` `{ usuario }` |
| DELETE | `/api/usuarios/:id` | — | `200` `{ ok: true }` — bloqueado se houver atendimento, importação ou auditoria |

`condominioIds` (advogado): sincroniza o nome do colaborador na lista `advogados` de cada condomínio (`src/lib/usuarios/advogado-condominios.ts`).

Sincronização cliente: `src/lib/usuarios/sync-cliente.ts` (`garantirUsuariosPersistidosNoServidor` na abertura de `/usuarios`).

## Fluxos principais

1. **Login:** usuário envia código e senha → API valida no cadastro (ativo) → cookie de sessão → redirecionamento.
2. **Cadastro atendente:** POST `/api/usuarios` → servidor reserva próximo RE → resposta exibe `codigoRe` (toast na UI).
3. **Desativar:** PATCH `/api/usuarios/:id/situacao` com `{ ativo: false }` → login bloqueado; RE mantido.
4. **Advogado:** marcar condomínios no sheet → atualiza vínculos no cadastro de condomínios.

## Regras de negócio

- Login individual com senha; autoria de atendimentos pelo colaborador logado (não escolhível manualmente).
- Senha inicial de demonstração: `12345` para os usuários de exemplo (hash em `catalogo.ts`).
- Código de login único (normalizado sem diferenciar maiúsculas); e-mail único no cadastro.
- RE é identificador interno, **não** senha nem fator de autenticação.

## Integrações

Nenhuma.

## Estados de interface

- Login: carregando, erro de credencial, envio.
- Listagem (`/usuarios`): ordem vertical — cabeçalho (descrição + **Novo colaborador**), `FilterBar` em linha (busca, cargo, situação), quatro indicadores (`CardMetric` layout `stacked`: total, cargos cadastrados, com telefone, com acesso ativo no recorte), bloco **Colaboradores cadastrados** + exportar, tabela com seleção, nome (avatar + e-mail), RE, perfil (badge), cargo, situação, telefone, último acesso (placeholder `—` até persistência), ações; exportação CSV/XLS/PDF do recorte filtrado; paginação (20). Métricas e listagem respeitam o recorte após **Filtrar**. Ao abrir, sincroniza colaboradores e cargos com a API.
- Listagem: gestão administrativa exibe **nome** completo; RE na coluna dedicada (atendentes). Ações editar/desativar/excluir.
- Sheet: RE somente leitura após criado; checkboxes de condomínio para advogado.

## Pendências e decisões

- Migrar `user`, `ativo` e `codigo_re` para PostgreSQL (UNIQUE em `codigo_re`).
- Recuperação de senha e política de bloqueio por tentativas.
