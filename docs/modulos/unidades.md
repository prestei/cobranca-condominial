# Unidades

## Objetivo

Cadastro e consulta de unidades por condomínio, com condôminos/responsáveis financeiros e acesso ao histórico de débitos e atendimentos.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `unidades`
- **Módulos relacionados:** [condominios](condominios.md), [debitos](debitos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md)
- **Dados:** `unit`, `responsible_party`, `unit_responsible_party` em [banco.md](../banco.md); `Unidade`, `Responsavel`, `Vinculo` em `src/lib/catalog`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)

## Rotas e telas

- `/units` — `src/app/units/page.tsx` — listagem, filtros, CRUD em `Sheet`, consulta detalhada em `UnidadeDetalheSheet`
- Atalhos: `/debts?unidade={id}`, `/service-tickets?unidade={id}`, `/service-tickets?novo=1&unidade={id}`

## Perfis e permissões

| Ação | Módulo / ação |
| --- | --- |
| Ver listagem e detalhe | `unidades.ler` |
| Criar | `unidades.criar` |
| Editar unidade e vínculos | `unidades.editar` |
| Excluir (sem histórico) | `unidades.excluir` |

Escopo por condomínio: advogado vê apenas unidades dos condomínios em que está vinculado; atendente vê unidades de condomínios **Ativos**; administradora vê todos.

Dados pessoais de responsáveis (CPF/CNPJ, telefone, e-mail, endereço) só são retornados completos para quem pode editar unidades, criar atendimentos ou gerir usuários. Demais perfis recebem campos mascarados na API.

## Dados e persistência

Cache em memória (`src/lib/catalog`) sincronizado com a API; regras de mutação no servidor. Identificador primário da unidade: `id` numérico; unicidade operacional: `identificacao` + `condominio_id`.

Campos da unidade: condomínio, identificação, bloco, tipo, status cadastral (`Ativa`/`Inativa`), situação de cobrança (`Sem cobrança` no cadastro novo; `Em cobrança`, `Em acordo`, etc. quando entra na operação de inadimplência).

Vínculos: `unit_responsible_party` com tipo (`Proprietario`, `Inquilino`, …) e flag `principal` (responsável financeiro principal).

## API e contratos

Todas exigem cookie de sessão (`lc_session`).

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/unidades` | `ler` | Lista unidades no escopo do usuário |
| POST | `/api/unidades` | `criar` | Cria unidade; body: `condominioId`, `identificacao`, `bloco`, `tipo`, `status`, `situacao?` |
| GET | `/api/unidades/:id` | `ler` | Detalhe, vínculos, resumo de débitos/atendimentos |
| PATCH | `/api/unidades/:id` | `editar` | Atualiza cadastro (preserva histórico) |
| DELETE | `/api/unidades/:id` | `excluir` | Remove só se não houver vínculos/débitos/atendimentos (409 caso contrário) |
| POST | `/api/unidades/:id/vinculos` | `editar` | Vincula responsável existente ou novo |
| DELETE | `/api/unidades/:id/vinculos/:vinculoId` | `editar` | Remove vínculo |

Erros comuns: `400` validação, `403` escopo/permissão, `409` duplicidade ou exclusão bloqueada.

Implementação: `src/lib/unidades/service.ts`, rotas em `src/app/api/unidades/`.

## Fluxos principais

1. Listar → filtrar → **Consultar** (detalhe + histórico resumido) ou **Editar** / **Novo**; **Importar** (CSV ou XLS exportado) cria unidades em lote com permissão `unidades.criar` — colunas mínimas: Unidade, Condomínio, Tipo (demais opcionais, alinhadas à exportação)
2. **Novo:** etapa 1 (dados da unidade) → **Continuar** → etapa 2 (responsável opcional) → **Salvar** (cria unidade e vínculo quando informado)
3. No detalhe: vincular proprietário/responsável financeiro; ir a débitos ou atendimentos filtrados
4. Inativar unidade (`status` = `Inativa`) mantém vínculos e histórico
5. Alterações registradas em `audit_log` via `registrarAuditoria`

## Regras de negócio

- Unidade exige condomínio válido e dentro do escopo do usuário
- Sem duplicidade de identificação no mesmo condomínio
- CPF/CNPJ não é identificador da unidade; usado apenas em `responsible_party`
- Exclusão física bloqueada quando há histórico operacional

## Integrações

Nenhuma direta; importações futuras podem criar unidades e vínculos (ver [importacoes](importacoes.md)).

## Estados de interface

Ao abrir `/units`, a listagem sincroniza com `GET /api/unidades` (escopo e permissões no servidor) e mescla no catálogo do cliente via `sincronizarUnidadesDoServidor`. Loading no detalhe (`UnidadeDetalheSheet`), validação no formulário, toasts de erro da API, `EmptyState` na listagem.

## Pendências e decisões

- Persistência PostgreSQL (depende de T02): API já centraliza regras para migração
- Linha do tempo completa da unidade: ticket T12
