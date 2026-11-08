# Minha produtividade (T29)

## Objetivo

Permitir que o **atendente** acompanhe a própria evolução operacional — contagens, gráficos e detalhamento por indicador — com base no histórico persistido e na auditoria de alterações.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md)
- **Relacionados:** [atendimentos](atendimentos.md), [auditoria](auditoria.md), [relatorios](relatorios.md) (painel global T23), [dashboard](dashboard.md) (indicadores operacionais T28)

## Rotas e telas

- `/minha-produtividade` — `src/app/minha-produtividade/page.tsx`
- Menu do atendente: **Operação → Minha produtividade** (`workspace-shell.tsx`)

## Permissões

| Ação | Permissão | Quem |
| --- | --- | --- |
| Consultar painel e registros | `atendimentos.ler` | Atendentes (sem `usuarios.criar`) |
| Painel global por RE | `relatorios` + admin | [relatorios/produtividade](relatorios.md) |

A administradora **não** usa esta tela; o endpoint retorna **403**.

## API

| Método | Path | Query | Resposta |
| --- | --- | --- | --- |
| GET | `/api/minha-produtividade` | `de`, `ate` (obrigatórios) | `{ painel: PainelMinhaProdutividade }` |
| GET | `/api/minha-produtividade` | `de`, `ate`, `indicador` | `{ indicador, registros[] }` |

## Indicadores e fórmulas

Serviço: `src/lib/produtividade-individual/service.ts`

- Contagens limitadas à **autoria** do usuário autenticado (`usuarioId` do atendimento ou auditoria `UPDATE` executada pelo usuário).
- **Conclusões efetivas** combinam status `Resolvido` (criação ou auditoria) e retorno concluído; deduplicação por atendimento no período, permitindo nova conclusão após **reabertura** documentada na auditoria.
- **Taxa de conclusão:** `(atendimentos concluídos ÷ atendimentos realizados) × 100` quando realizados > 0.
- **Gráficos:** séries diárias alinhadas às contagens dos indicadores principal e concluídos.

Atalhos de período na UI: `PeriodInput` (Hoje, 7/30 dias, este mês, mês anterior, personalizado). Barra de filtros só com período (`hideSearch` no `FilterBar`). Indicadores principais e complementares usam o mesmo padrão de cards clicáveis (`RelatorioMetricas`); a listagem de drill-down abre logo abaixo dos cards.

## Regras explícitas (escopo T29)

- Sem metas, ranking, pontuação ou comparação com outros RE.
- Não confundir quantidade de interações (auditoria) com quantidade de atendimentos nos KPIs principais.
- Dados vazios exibem zero / empty state, sem valores ilustrativos.

## Testes

- `src/lib/produtividade-individual/service.test.ts` — permissão e coerência gráfico/indicador.
