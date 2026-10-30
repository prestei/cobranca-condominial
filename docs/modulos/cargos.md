# Cargos / perfis

## Objetivo

Definição de cargos (perfis) e matriz de permissões por módulo do sistema. O administrador marca, para cada cargo, quais ações (ver, criar, editar, excluir, exportar) são permitidas em cada área.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — §2.2 permissões
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `cargos`
- **Módulos relacionados:** [usuarios](usuarios.md)
- **Dados:** `role` em [banco.md](../banco.md); `Cargo` em `catalogo.ts`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)
- **Código transversal:** `src/lib/permissions/*`, `src/middleware.ts`, `src/hooks/use-permissao.ts`

## Rotas e telas

- `/cargos` — `src/app/cargos/page.tsx` — CRUD de cargos e matriz de permissões (sheet)
- `/acesso-negado` — `src/app/acesso-negado/page.tsx` — feedback quando o usuário não tem permissão de **ver** o módulo

## Perfis e permissões

| Quem configura | Quem é afetado |
|----------------|----------------|
| Colaborador com `cargos.criar` / `cargos.editar` | Todos os usuários vinculados ao cargo em [usuarios](usuarios.md) |

**Modelo:** JSON em `permissao_json` / `Cargo.permissaoJson`, normalizado em `src/lib/permissions/`. Chaves de primeiro nível = módulos (`dashboard`, `atendimentos`, `debitos`, …). Valores = objeto com flags `ler`, `criar`, `editar`, `excluir` e, em relatórios, `exportar`.

**Seeds de demonstração:** `src/lib/permissions/seeds.ts` (Administrador, Atendente, Advogado). JSON legado com flags planas (`cadastros`, `retornos`, …) é migrado automaticamente ao ler (`parsePermissoesJson`).

**Enforcement:**

- **Rotas:** `middleware` bloqueia acesso sem `ler` no módulo da rota.
- **Menu:** `WorkspaceShell` oculta links sem `ler`.
- **Ações:** telas de CRUD usam `usePermissao().pode(modulo, acao)` para botões Novo / Editar / Excluir e exportação em relatórios.

## Dados e persistência

Protótipo em memória (`setCargos` em `catalogo.ts`). Modelo lógico em `docs/banco.md` (`role.permissao_json`).

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
2. Colaborador faz login → permissões derivadas do `cargoId` + `permissaoJson` do cargo.
3. Tentativa de abrir rota sem `ler` → redirecionamento para `/acesso-negado?modulo=…`.

## Regras de negócio

- Todo cargo deve ter ao menos uma permissão marcada ao salvar.
- Cargo em uso por colaboradores não pode ser excluído.
- Alterações de cargo no cliente refletem imediatamente no menu via `usePermissao` (lê `catalogo` no browser). O `middleware` usa o seed do servidor até persistência compartilhada (PostgreSQL).

## Integrações

Nenhuma.

## Estados de interface

- Listagem: colunas **Áreas com acesso** (`ResumoPermissoesCargo` — badge por módulo; passe o mouse para ver ações) e **Colaboradores** (quantidade vinculada ao cargo).
- Mobile: métricas em **carrossel** (`CardMetricRow` — um `CardMetric` por vez, deslize ou aguarde 5s; pontos indicam a posição); desktop em grid de 3 colunas. Indicadores no modo `rotulo` / `valor` / `detalhe` com faixa lateral (`accent`). Cards de lista com **Descrição**, **Áreas com acesso** (stacked) e **Colaboradores**.
- Lista vazia / filtro sem resultado; sheet **wide** com cabeçalho em destaque (`primary-fixed`), título dinâmico (nome do cargo), bloco **Nome do cargo** / **Para que serve** em `SheetPanel` e `MatrizPermissoesCargo` (barra de progresso `módulos com acesso`, atalhos **Restaurar padrão** — seeds Administrador/Atendente/Advogado ou estado ao abrir — e **Desmarcar tudo**; um cartão por área, checkboxes Consultar, Cadastrar, Alterar, Excluir, Exportar dados); rodapé **Cancelar** + **Salvar**; confirmação de exclusão e de saída com dados preenchidos.

## Pendências e decisões

- Persistir `role` e API de cargos; alinhar middleware e sessão ao mesmo store do CRUD.
- Recarregar sessão após alteração do próprio cargo (hoje: novo login se só o JWT do servidor importar).
