# Débitos

## Objetivo

Consultar e acompanhar débitos por unidade e condomínio, com valores e situações coerentes com a origem (importação ou correção manual auditada).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (inadimplência); ticket T14
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `debitos`
- **Módulos relacionados:** [unidades](unidades.md), [importacoes](importacoes.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md), [integracao-superlogica](integracao-superlogica.md)
- **Dados:** `debt` em [banco.md](../banco.md); `Debito` em `catalogo.ts`

## Rotas e telas

- `/debitos` — `src/app/debitos/page.tsx` — painel **Inadimplência**: KPIs (original, atualizado, faixas até/acima do limite), gráfico de unidades inadimplentes, filtros, tabela **Registros de Inadimplência** com exportação CSV/XLS/PDF, cadastro/edição em sheet (três etapas), confirmação de unidade quitada.

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Ver listagem e indicadores | `debitos.ler` |
| Cadastrar débito manual | `debitos.criar` |
| Corrigir débito | `debitos.editar` |
| Excluir débito | `debitos.excluir` |
| Confirmar unidade quitada | `debitos.editar` ou `unidades.editar` |

Escopo de condomínio validado no servidor (`escopoCondominios` / `escopoUnidades`).

## Dados e persistência

Protótipo: catálogo em memória (`catalogo.ts`), alinhado ao modelo `debt`:

- Valores monetários persistidos como informados — **sem** recálculo automático de juros, multa ou correção.
- `fonteValores`: `origem` (importação/administradora) ou `manual` (correção no sistema).
- `atualizadoEm`: timestamp ISO da última gravação (importação ou manual).
- Histórico de alterações manuais e importações relevantes em `audit_log` (`entidade` = `debt` ou `unit` na quitação).

## API e contratos

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/debitos` | `debitos.ler` | Query: `condominioId`, `unidadeId`, `status`, `origem`, `q`, `vencimentoDe`, `vencimentoAte` → `{ debitos }` |
| GET | `/api/debitos/[id]` | `debitos.ler` | Detalhe para edição → `{ debito }` |
| POST | `/api/debitos` | `debitos.criar` | Body: campos do débito → `{ debito }` (201) |
| PATCH | `/api/debitos/[id]` | `debitos.editar` | Body: campos do débito → `{ debito }` |
| DELETE | `/api/debitos/[id]` | `debitos.excluir` | → `{ ok: true }` |
| GET | `/api/debitos/indicadores` | `debitos.ler` | Query: `dataBase`, `limiteDias`, filtros como listagem, `cidade` → `{ indicadores, dataBase, limiteDias }` |
| POST | `/api/debitos/unidade/[unidadeId]/confirmar-quitacao` | `debitos.editar` ou `unidades.editar` | Body opcional `{ forcar: true }` → `{ unidade, debitosAbertos }`; 409 se ainda há débitos em aberto |

Importação em lote: [importacoes](importacoes.md) — `POST /api/importacoes/debitos/confirmar` retorna `{ debitos }` atualizados.

Serviço: `src/lib/debitos/service.ts`. Sincronização cliente: `src/lib/debitos/sync-cliente.ts`. Indicadores (deduplicação por ID externo): `src/lib/debitos/indicadores.ts`.

## Fluxos principais

1. **Listagem** — ao abrir, sincroniza condomínios (`/api/condominios`) e unidades (`/api/unidades`) no catálogo do cliente, depois carrega `/api/debitos`; layout: KPIs, **filtros**, bloco de percentuais, tabela; filtros locais (período, data-base, cidade, origem, situação); exportação da tabela filtrada (CSV, XLS, PDF via impressão).
2. **Indicadores** — totais na data-base usam valores persistidos; soma deduplica registros com o mesmo `identificadorExterno`.
3. **Cadastro/edição manual** — selects de condomínio/unidade usam escopo do usuário; ao editar, recarrega cadastros relacionados e `GET /api/debitos/[id]` antes de preencher o sheet; API + auditoria; `fonteValores` = `manual`.
4. **Importação** — atualiza `fonteValores` = `origem` e `atualizadoEm`; ver T13.
5. **Quitação da unidade** — situação `Quitada` (fora da fila); atendimentos e débitos históricos permanecem.

## Regras de negócio

- Débito da unidade como origem do atendimento de cobrança.
- Não inventar juros/multa/correção: usar apenas campos gravados.
- Regra de **entrada automática** na cobrança ao importar: pendente ([DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md)).

## Integrações

Importação via administradoras — ver `integracao-superlogica.md`.

## Estados de interface

- Carregamento inicial via API (débitos + condomínios + unidades); toasts em erro de save/delete; sheet de edição desabilita salvar enquanto carrega o débito.
- Sheet de cadastro em três etapas (identificação, valores, pagamento).
- Coluna **Origem / atualização** exibe fonte dos valores e data da última persistência.

## Pendências e decisões

- Cálculo automático de encargos e política de saldo divergente da fonte: [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
