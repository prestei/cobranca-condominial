# Auditoria

## Objetivo

Consulta da trilha de alterações e correções administrativas (quem, quando, entidade, valores anterior/novo).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — correções pela administradora com histórico
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — perfil Administradora e auditoria
- **Módulos relacionados:** todos os serviços que chamam `registrarAuditoria` (débitos, unidades, atendimentos, importações, negociações, acordos, condomínios, distribuição, jurídico); [usuarios](usuarios.md), [cargos](cargos.md)
- **Dados:** coleção `auditoria` no catálogo em memória (`src/data/catalogo.ts`); schema futuro `audit_log` em [banco.md](../banco.md)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `auditoria`

## Rotas e telas

- `/auditoria` — `src/app/auditoria/page.tsx` — **Histórico de alterações**: linguagem simples na tabela; ícone de olho abre `Sheet` com antes/depois; botão **Ver detalhes técnicos** para JSON e metadados

## Perfis e permissões

- **Consulta:** módulo `auditoria`, ação `ler` (padrão no cargo Administrador em `src/lib/permissions/seeds.ts`)
- Atendente e Advogado **não** possuem permissão de leitura da auditoria
- A rota de API valida sessão e permissão no servidor

## Dados e persistência

Cada evento (`Auditoria`):

| Campo (API/UI) | Descrição |
| --- | --- |
| `id` | Identificador sequencial |
| `usuarioId` | Colaborador que executou a ação |
| `entidade` | Tabela/domínio (ex.: `debt`, `unit`, `service_ticket`) |
| `registroId` | ID do registro afetado |
| `acao` | `INSERT`, `UPDATE` ou `DELETE` |
| `dadosAnteriores` / `dadosNovos` | JSON ou texto com estado antes/depois |
| `camposAlterados` | Lista resumida de campos |
| `ip`, `userAgent` | Metadados da requisição quando disponíveis |
| `dataHora` | Timestamp ISO local |

Gravação: `registrarAuditoria` em `catalogo.ts`, invocada pelos serviços em `src/lib/**/service.ts` após mutações. Antes de persistir, `src/lib/auditoria/sanitize.ts` remove senhas, tokens, hashes bcrypt e JSON bruto de `permissao_json`.

Na tela, **Quem fez** usa RE do atendente quando existir (`rotuloAutorAuditoria` / `identificadorColaboradorPorId`).

## API e contratos

### `GET /api/auditoria`

- **Auth:** sessão obrigatória
- **Permissão:** `auditoria.ler`
- **Query (opcional):** `entidade`, `acao`, `q` ou `busca`, `dataDe`/`de`, `dataAte`/`ate`, `usuarioId`, `autor`/`re` — filtros no servidor; a tela aplica busca textual adicional no cliente após sincronizar
- **200:** `{ "auditoria": Auditoria[] }` ordenado por `dataHora` decrescente
- **401 / 403 / 500:** `{ "error": string }`

Não há endpoints de criação ou exclusão: a auditoria é append-only via fluxos de negócio.

## Fluxos principais

1. Colaborador com permissão abre `/auditoria`
2. A página chama `GET /api/auditoria` e mescla o resultado no catálogo (`sincronizarAuditoriaDoServidor`)
3. Filtros e ordenação na interface; paginação client-side (`PAGE_SIZE`)
4. Operações em outros módulos (ex.: editar débito via API) geram linhas visíveis após novo carregamento da página ou nova sessão no servidor

## Regras de negócio

- Correções não apagam o valor anterior no registro de auditoria (`dadosAnteriores`); correções de atendimento gravam snapshot completo antes/depois
- Usuário sem `auditoria.ler` não deve ver o menu nem obter dados da API
- Não há API de alteração ou exclusão de eventos (append-only)
- Dados sensíveis não entram nos campos serializados (sanitização centralizada)
- Entidades exibidas com rótulos em português na tela (mapa `rotuloEntidade` em `page.tsx`)

## Integrações

Nenhuma.

## Estados de interface

- Textos para leitura não técnica (`src/lib/auditoria/apresentacao.ts`): colunas *Quando*, *Quem fez*, *Onde*, *O que aconteceu*, *Resumo*
- Sheet de detalhe com *Como estava antes* / *Como ficou depois*; seção técnica opcional
- Carregamento, erro de API, lista vazia e filtros sem resultado com mensagens em português claro

## Pendências e decisões

- Persistência em PostgreSQL (`audit_log` + migration): schema documentado em `banco.md`; hoje o catálogo em memória do servidor concentra os eventos até a camada PG estar ativa
- Exclusão de importação ainda pode registrar auditoria só no cliente até existir endpoint dedicado
