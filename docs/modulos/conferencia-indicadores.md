# Conferência de indicadores (T35)

## Objetivo

Garantir que dashboard, painel `/indicadores`, produtividade por RE e exportações apresentem números conciliáveis, com fórmulas documentadas, filtros visíveis e consulta de referência auditável.

## Atribuição (RE)

| Papel | Significado |
| --- | --- |
| **RE autor do evento** | Quem registrou o atendimento ou criou a proposta (`usuario_id`). |
| **RE que concluiu** | Quem marcou retorno concluído ou confirmou acordo. |
| **RE responsável atual** | Atendente com atribuição vigente na unidade (carteira hoje). |
| **RE responsável na data** | Atendente com atribuição vigente no instante do evento (histórico de `atribuicoes_cobranca`). |

Redistribuição altera apenas carteira vigente; autoria histórica permanece no RE que registrou.

## Tratamento de eventos

| Situação | Regra |
| --- | --- |
| Atendimentos | Contam se persistidos; não há estado cancelado no protótipo. |
| Proposta cancelada/recusada | Excluídas de negociações criadas. |
| Acordo confirmado | Apenas proposta **Aceita** com `acordo_confirmado_em`. |
| Correção de registro | Contagem reflete o estado atual do registro (sem dupla contagem automática). |

## Indicadores não oficiais

Sem aprovação de negócio **não** são apresentados como oficiais: taxa de resposta, eficiência semanal, média móvel, ranking/score de RE, taxa de sucesso. Na UI aparecem como **referência operacional** quando exibidos.

Catálogo completo (oficiais): `src/lib/indicadores/catalogo-oficial.ts` e `GET /api/indicadores/conferencia?indicador=catalogo`.

## API

### `GET /api/indicadores/conferencia`

- **Auth:** sessão + `relatorios.ler` + administradora (`usuarios.criar`) para consulta por indicador.
- **Query (catálogo):** omitir `indicador` ou `indicador=catalogo` → `{ catalogo }`.
- **Query (referência):** `indicador` (ver catálogo), `de`, `ate`, filtros de relatório (`condominio`, `advogado`, `codigoRe`, …).
- **Resposta:** `{ consulta: { total, porRe, linhas, meta, conciliacaoPainel, definicao } }`.
- Cada linha traz RE contabilizado, RE autor, RE carteira atual e RE na data do evento.

## Conciliação

O painel `/relatorios/produtividade` e a exportação `tipo=produtividade` usam a mesma agregação que a consulta de referência (`src/lib/indicadores/produtividade-eventos.ts`). Campo `conciliacaoPainel.coincide` compara total de linhas com totais do painel.

Dashboard e `/indicadores` exibem `meta.geradoEm` e filtros aplicados; débitos seguem deduplicação compartilhada com `/api/debitos/indicadores`.

## Conexões

- [relatorios.md](relatorios.md) — produtividade e exportação  
- [dashboard.md](dashboard.md) — meta e operação semanal  
- [indicadores.md](indicadores.md) — KPIs operacionais  
