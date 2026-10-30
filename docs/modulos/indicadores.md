# Indicadores operacionais

## Objetivo

Painel consolidado de cobrança, inadimplência e produtividade por condomínio, com gráficos e ranking, derivado de dados persistidos no escopo do usuário.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — painel e relatórios por condomínio
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — escopo por perfil/advogado
- **Módulos relacionados:** [relatorios](relatorios.md), [debitos](debitos.md), [atendimentos](atendimentos.md), [dashboard](dashboard.md)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md)

## Rotas e telas

- `/indicadores` — `src/app/indicadores/page.tsx`
- Menu lateral: seção **Análise** → Indicadores

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Ver painel | `relatorios.ler` + `debitos.ler` |
| Dados jurídicos na coluna **Fase** (encaminhamentos) | `juridico.ler` (quando ausente, usa só situação da unidade) |

Advogados e atendentes veem apenas condomínios/unidades do seu escopo.

## API

### `GET /api/indicadores`

- **Auth:** sessão + `relatorios.ler`
- **Query opcional:** `dataBase`, `limiteDias`
- **Resposta:** `{ painel: IndicadoresPainel }`

Agregação: `src/lib/indicadores/service.ts`.

## Indicadores (definições)

| KPI | Definição |
| --- | --- |
| Cobranças | Atendimentos registrados nos últimos 7 dias |
| Inadimplência total | Soma deduplicada em aberto na data-base |
| Retornos na semana | Retornos pendentes com data prevista nos últimos 7 dias |
| Produtividade recente | Valor de pagamentos registrados nos últimos 7 dias |

Variação percentual nos cards: comparação com os 7 dias anteriores (omitida quando não há base comparável).

Gráficos: composição por grupo de rubrica, meio de contato no período, taxa diária de resposta, volume diário de atendimentos.

Ranking: condomínios com saldo em aberto, fase operacional, unidades na fila de cobrança ativa, prioridade heurística por valor e volume.

## Fluxos

1. Usuário abre **Indicadores** no menu.
2. A tela carrega o painel via API (sem números estáticos).
3. **Acompanhar** abre o relatório **Carteira e unidades** filtrado pelo condomínio.

## Pendências

- Evolução mês a mês (fotografia mensal) depende de persistência histórica ainda não modelada.
- Prioridade e fase são heurísticas operacionais; regras formais podem ser refinadas em decisão de negócio.
