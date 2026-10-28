# Condomínios

## Objetivo

Cadastro e gestão dos condomínios da carteira do escritório, base compartilhada para unidades, débitos, atendimentos e relatórios.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — cadastro compartilhado (Projeto 1 e 2)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — vínculo com advogado responsável; escopo por perfil
- **Módulos relacionados:** [unidades](unidades.md), [debitos](debitos.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md), [auditoria](auditoria.md)
- **Dados:** tabela `condominium` em [banco.md](../banco.md); tipo `Condominio` em `src/data/catalogo.ts`
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `condominios`

## Rotas e telas

- `/condominios` — `src/app/condominios/page.tsx` — listagem, filtros, métricas, CRUD em `Sheet` (etapas Dados → Endereço → Observação), detalhe em `Sheet`, importação/exportação de planilha
- Atalhos: `/unidades?condominio={id}`, `/unidades?condominio={id}&novo=1`

## Perfis e permissões

| Ação | Módulo / ação |
| --- | --- |
| Ver listagem e detalhe | `condominios.ler` |
| Criar e importar planilha | `condominios.criar` |
| Editar, inativar/reativar | `condominios.editar` |
| Excluir (sem histórico) | `condominios.excluir` |

**Escopo:** administradora (criar/editar) vê todos os condomínios; advogado com apenas `ler` vê condomínios em que consta em `advogados`; atendente com `atendimentos.ler` vê condomínios **Ativos** (`escopoCondominios` em `src/data/catalogo.ts`). Validação de escopo também no servidor (`src/lib/condominios/service.ts`).

## Dados e persistência

Protótipo em memória (`src/data/catalogo.ts`), com mutações validadas no servidor via API. Snapshot compartilhado entre requisições no mesmo processo Node; o cliente sincroniza com `GET /api/condominios` ao abrir telas que dependem da carteira.

Campos principais: `nome`, `identificadorExterno` (único quando preenchido), `status` (`Ativo` | `Inativo`), `advogados[]`, `administradora`, endereço (CEP, logradouro, número, complemento, cidade, estado), `observacao`.

## API e contratos

Todas exigem cookie de sessão (`lc_session`).

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/condominios` | `condominios.ler` | Lista condomínios no escopo do usuário → `{ condominios }` |
| POST | `/api/condominios` | `condominios.criar` | Cria condomínio; body espelha `Condominio` sem `id` (opcional `id` na sincronização cliente→servidor) |
| PATCH | `/api/condominios/:id` | `condominios.editar` | Atualiza cadastro completo **ou** body só `{ status }` para inativar/reativar |
| DELETE | `/api/condominios/:id` | `condominios.excluir` | Remove só se não houver unidades nem histórico de cobrança → `{ ok: true }` |

Erros comuns: `400` validação (nome, advogados), `403` escopo, `404` não encontrado, `409` identificador duplicado ou exclusão bloqueada.

Implementação: `src/lib/condominios/service.ts`, rotas em `src/app/api/condominios/`; sync cliente: `src/lib/condominios/sync-cliente.ts`; importação CSV/XLS: `src/lib/condominios/importar-planilha.ts`.

## Fluxos principais

1. **Abrir `/condominios`** — `garantirCondominiosPersistidosNoServidor` (GET + POST de registros só locais); toast se falhar; listagem a partir do catálogo reativo (`useCadastros`).
2. **Filtrar** — busca textual, administradora, cidade, advogado responsável, situação; botões **Filtrar** / **Limpar** aplicam recorte; métricas e exportação usam o **recorte filtrado**.
3. **Novo / Editar** — sheet em 3 etapas; CEP consultado via ViaCEP (`src/lib/cep.ts`); validação de nome e ao menos um advogado; POST ou PATCH; auditoria em `audit_log`.
4. **Inativar / Reativar** — PATCH parcial `{ status }`; histórico operacional permanece consultável.
5. **Excluir** — DELETE; bloqueado com unidades ou débitos/atendimentos/atribuições vinculados.
6. **Importar** — CSV (`;`) ou XLS exportado pela tela; colunas mínimas **Nome** e **Advogados**; duplicidade por `identificadorExterno` ignorada ou 409.
7. **Exportar** — CSV, XLS ou PDF (HTML para impressão) do recorte filtrado.

## Regras de negócio

- Ao menos um advogado responsável; nomes devem constar em `opcoesAdvogadosResponsaveis` (advogados da carteira + usuários cargo Advogado).
- `identificadorExterno` opcional; quando preenchido, único na carteira (case-insensitive).
- Inativação não apaga unidades, débitos ou atendimentos; condomínio inativo some das rotinas que filtram **Ativo**.
- Exclusão física apenas sem unidades e sem histórico de cobrança na unidade.
- Novo condomínio via formulário sempre nasce **Ativo** (importação pode informar situação).

## Integrações

Nenhuma direta neste módulo; importações de inadimplência resolvem condomínio por nome ou identificador externo (ver [importacoes](importacoes.md)).

## Estados de interface

`PageHeader` com descrição; quatro indicadores (`CardMetric`, grid 4 colunas como Inadimplência) sobre o recorte filtrado (total, ativos, inadimplentes com débito pendente/vencido em alguma unidade, com cidade cadastrada); seção **Filtros** + `FilterBar`; tabela responsiva com ícone na coluna Condomínio; exportação/importação; paginação (20 itens); `EmptyState`; toasts de erro da API e da sincronização; confirmações para sair do formulário, inativar e excluir.

## Pendências e decisões

- Persistência PostgreSQL (`condominium`) — infra Docker em [stack.md](../stack.md); substituir camada em memória conforme evolução do projeto.
- Coluna `administradora` documentada em [banco.md](../banco.md); migration quando o ORM for adotado.
