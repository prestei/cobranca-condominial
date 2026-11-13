# Matriz de permissões por cargo (fábrica)

Referência **normativa** para os três cargos de fábrica do escritório. A fonte de verdade em runtime é `role.permissao_json` no PostgreSQL; o bootstrap e **Restaurar padrão** em `/cargos` usam `src/lib/permissions/seeds.ts`.

## Detecção de perfil operacional

O menu lateral e o layout do **Início** (`/`) seguem `resolverPerfilOperacional`:

| Ordem | Regra | Perfil na UI |
| --- | --- | --- |
| 1 | `usuarios.criar` | **Administradora** — menu completo de operação |
| 2 | `juridico.ler` **e** `condominios.ler` | **Advogado(a)** — menu `secoesAdvogado` |
| 3 | demais com `dashboard.ler` | **Atendente** — menu `secoesAtendente` |

Sem `dashboard.ler` → rota `/` e APIs do dashboard retornam **403** ou redirecionam para `/acesso-negado`.

## Legenda das ações

| Flag JSON | Rótulo na matriz (`/cargos`) | Uso no sistema |
| --- | --- | --- |
| `ler` | Consultar | Menu, rota (`proxy.ts`) e listagens/APIs GET |
| `criar` | Cadastrar | Botão **Novo**, importação/envio, POST |
| `editar` | Alterar | Edição em sheet, PATCH, aprovação de importação |
| `excluir` | Excluir | Exclusão com confirmação, DELETE |
| `exportar` | Exportar dados | Relatórios e exportação CSV/XLS autorizada |

A matriz na tela lista **todas** as ações possíveis por módulo (incluindo CRUD onde o módulo suporta). Cargos restritos marcam só o subconjunto abaixo — não é bug exibir checkboxes desmarcados.

## Administrador

**Colaborador demo:** MILENA · **Escopo:** carteira completa.

| Módulo | Consultar | Cadastrar | Alterar | Excluir | Exportar |
| --- | :---: | :---: | :---: | :---: | :---: |
| Início | ✓ | — | — | — | — |
| Atendimentos | ✓ | ✓ | ✓ | ✓ | — |
| Inadimplência | ✓ | ✓ | ✓ | ✓ | — |
| Jurídico | ✓ | ✓ | ✓ | — | — |
| Negociações | ✓ | ✓ | ✓ | — | — |
| Condomínios | ✓ | ✓ | ✓ | ✓ | — |
| Unidades | ✓ | ✓ | ✓ | ✓ | — |
| Relatórios | ✓ | — | — | — | ✓ |
| Importações | ✓ | ✓ | ✓ | ✓ | — |
| Colaboradores | ✓ | ✓ | ✓ | ✓ | — |
| Cargos | ✓ | ✓ | ✓ | ✓ | — |
| Auditoria | ✓ | — | — | — | — |

**Início:** painel administrativo (`DashboardAdministradoraView`) — KPIs da carteira, fila, operação 7 dias, gráficos e retornos da equipe.

## Atendente

**Colaboradores demo:** RAQUEL, TÁSSIA · **Escopo:** unidades da **carteira vigente** (`collection_assignment`).

| Módulo | Consultar | Cadastrar | Alterar | Excluir | Exportar |
| --- | :---: | :---: | :---: | :---: | :---: |
| Início | ✓ | — | — | — | — |
| Atendimentos | ✓ | ✓ | ✓ | — | — |
| Negociações | ✓ | ✓ | — | — | — |
| Inadimplência | ✓ | — | — | — | — |
| Importações | ✓ | ✓ | ✓ | — | — |
| *Demais módulos* | — | — | — | — | — |

**Início:** `DashboardAtendenteView` apenas — saudação, quatro KPIs do dia, próximos retornos, ações rápidas (sem gráficos administrativos).

**Menu:** Rotina (Início, Atendimentos, Minha agenda, Notificações) + Cobrança (Inadimplência consulta, Negociações, Importações) + Ajuda.

**API bloqueada (ex.):** `GET/POST /api/usuarios`, `GET /api/cargos`, `GET /api/juridico` → **403** com sessão RAQUEL (validado em 2026-11-13).

## Advogado

**Colaborador demo:** ADRYELLE · **Escopo:** condomínios cujo array `advogados` contém o **nome** do colaborador (`Dra. Adryelle` nos condomínios de teste após migration `2026-11-13-permissoes-negociacoes-demo-advogado.sql`).

| Módulo | Consultar | Cadastrar | Alterar | Excluir | Exportar |
| --- | :---: | :---: | :---: | :---: | :---: |
| Início | ✓ | — | — | — | — |
| Jurídico | ✓ | — | ✓ | — | — |
| Negociações | ✓ | — | ✓ | — | — |
| Inadimplência | ✓ | — | — | — | — |
| Condomínios | ✓ | — | — | — | — |
| Unidades | ✓ | — | — | — | — |
| Relatórios | ✓ | — | — | — | ✓ |
| *Demais módulos* | — | — | — | — | — |

**Início:** `DashboardAdvogadoView` — condomínios no escopo, indicadores, ranking, resumo jurídico e negociações.

**Menu:** Rotina (Início, Jurídico, Negociações, Notificações), Carteira (consulta), Análise (relatórios), Ajuda.

## Sincronização código ↔ banco

| Artefato | Papel |
| --- | --- |
| `src/lib/permissions/seeds.ts` | JSON dos três cargos; **Restaurar padrão** na UI |
| `garantirIdentidadeInicialPg` | Grava cargos se tabela vazia; repara JSON `{}` |
| `docs/migrations/dump-role-user.sql` | Snapshot de referência |
| `docs/migrations/2026-11-13-permissoes-negociacoes-demo-advogado.sql` | Negociações nos cargos 1–3 + vínculo advogada demo |

## Login de demonstração

Em `localhost`, a tela de login **não** pré-preenche mais o usuário administrador de teste (`USUARIOTST`). Use:

| Código | Cargo | Senha demo |
| --- | --- | --- |
| MILENA | Administrador | 12345 |
| RAQUEL / TASSIA | Atendente | 12345 |
| ADRYELLE | Advogado | 12345 |

Ver também [usuarios.md](usuarios.md), [cargos.md](cargos.md), [dashboard.md](dashboard.md) e [regra-negocio.md](../regra-negocio.md) §Dashboard e perfis.
