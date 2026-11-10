# Dashboard

## Objetivo

Rota inicial (`/`) com indicadores operacionais **por perfil** (administradora, atendente, advogado), sempre derivados de dados persistidos e filtrados no servidor conforme escopo e permissões.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `dashboard`
- **Módulos relacionados:** [atendimentos](atendimentos.md), [debitos](debitos.md), [relatorios](relatorios.md), [juridico](juridico.md)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — §Dashboard e perfis

## Rotas e telas

- `/` — `src/app/page.tsx` → `src/components/dashboard/dashboard-home.tsx`
- Componentes por perfil: `dashboard-administradora-view.tsx`, `dashboard-atendente-view.tsx`, `dashboard-advogado-view.tsx`

## Perfis e permissões

| Perfil | Detecção (servidor) | Conteúdo principal |
| --- | --- | --- |
| **Administradora** | `usuarios.criar` | Carteira completa, fila de cobranças, inadimplência (KPIs e gráficos), operação dos últimos 7 dias, retornos da equipe (RE) |
| **Atendente** | demais com `atendimentos.ler` | Home exclusiva (sem `PageHeader` padrão): saudação + online, 4 métricas do dia (**Pendentes / Na fila / Atendimentos hoje / Taxa de resposta**), **Próximos atendimentos** com **Atender** e painel **Ações rápidas**. Sem gráficos, central de pendências nem tabelas extras nesta rota — detalhe fica em `/atendimentos` |
| **Advogado** | `juridico.ler` + `condominios.ler` | Condomínios vinculados, indicadores de débitos no escopo, ranking por condomínio, resumo jurídico |

Requer `dashboard.ler` em todos os casos. Sem permissão → API **403**; frontend exibe erro com retry.

## Dados e persistência

Agregações em `src/lib/dashboard/service.ts`, reutilizando:

- `listarDebitos` / `obterIndicadoresDebitos` ([debitos](debitos.md))
- `resumoFilaCobranca` / escopo de atribuição ([atendimentos](atendimentos.md))
- `listarAtendimentos` (autoria e escopo)
- `listarRetornosAgenda` ([atendimentos](atendimentos.md) — agenda T11)
- `listarEncaminhamentosJuridicos` ([juridico](juridico.md))

Não há tabela própria de dashboard; valores monetários usam totais persistidos (sem recalcular juros/multa).

## API e contratos

| Método | Path | Permissão | Resposta |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | `dashboard.ler` | `{ dashboard: DashboardPayload }` |
| GET | `/api/dashboard/pendencias` | `dashboard.ler` (atendente) | `{ pendencias: CentralPendenciasResultado }` — query: `categoria`, `tipo`, `ordenacao`, `ordem`, `page`, `pageSize` |
| GET | `/api/dashboard/busca` | `dashboard.ler` | `{ busca: BuscaGlobalResultado }` — query: `q` (mín. 2 caracteres). Categorias: RE, condomínios, unidades, cobranças na carteira, atendimentos. Escopo e permissões por categoria (`condominios.ler`, `unidades.ler`, `atendimentos.ler`). |
| GET | `/api/dashboard/export` | `dashboard.ler` + `atendimentos.ler` | CSV/XLS (`formato=csv\|xls`) — query: `listagem=fila\|atendimentos` + parâmetros opcionais de recorte (`periodo`, `de`/`ate`, `condominioId`, etc.; ver `src/lib/dashboard/filtros.ts`). Colunas monetárias só com `debitos.ler`; RE em vez de nome pessoal; meta com data/hora e filtros; limite 5.000 linhas; auditoria `dashboard_export`. |

Query opcional em `GET /api/dashboard`: `dataBase`, `limiteDias` (mesma validação dos indicadores de débitos).

`DashboardPayload` é união discriminada por `perfil`: `administradora` | `atendente` | `advogado`. Inclui `dataBase`, `limiteDias`, `cargoNome`, `meta.geradoEm` e blocos descritos na tabela de perfis acima.

## Fluxos principais

1. Usuário autenticado abre `/`.
2. Cliente chama `GET /api/dashboard`.
3. Servidor resolve perfil, aplica escopo (`escopoCondominios`, carteira por RE, etc.) e monta payload.
4. UI renderiza apenas o layout do perfil; estados: carregamento, erro, dados vazios (gráficos/tabelas).

## Regras de negócio

- Totais de inadimplência seguem deduplicação por `identificador_externo` (mesma regra de `/api/debitos/indicadores`).
- Atendente vê apenas unidades na sua carteira (atribuição vigente) e atendimentos de sua autoria. A home do atendente é **somente** o comando do dia (saudação, KPIs, próximos, atalhos); não inventa satisfação/NPS (usa **taxa de resposta**); “Você está online” reflete sessão logada, sem status persistido. Agenda → `/atendimentos?retorno=…`. Gráficos T32 / central T30 permanecem nas APIs e podem ser usados em outras telas, mas **não** na home do atendente.
- **Indicadores operacionais (T28)** — bloco `indicadoresOperacionais` no payload do atendente, calculado em `src/lib/dashboard/indicadores-operacionais-atendente.ts` sobre `service_ticket` na **carteira vigente** (`collection_assignment`). Classificação por prioridade (sem duplicidade): atenção (retorno atrasado ou motivos prioritários) → aguardando retorno (sem resposta ou retorno agendado em aberto) → pendentes (demais `Pendente`) → resolvidos no período (status `Resolvido` ou `retorno_concluido_em` nos últimos 7 dias, mesmo intervalo de `operacao`). Clique no card navega para `/atendimentos?operacional=…` com listagem via `GET /api/atendimentos?operacional=…`.
- **Central de pendências (T30)** — seção no dashboard do **atendente** (`DashboardCentralPendencias`), dados em `src/lib/dashboard/central-pendencias-atendente.ts` sobre unidades da **carteira vigente** na fila de cobrança. Categorias: hoje, atrasadas, próximos retornos, aguardando resposta, sem movimentação (≥ 7 dias sem atendimento, sem confundir com atraso de retorno), prioritárias (motivos sensíveis). Datas com `hojeEmFuso` (`America/Sao_Paulo`). API paginada: `GET /api/dashboard/pendencias` (`dashboard.ler`, perfil atendente). Ordenação por prioridade, data de retorno ou última movimentação; filtro por tipo; ações alinhadas à fila (histórico, novo contato, programar retorno, situação, unidade, débitos).
- **Busca global e exportação da carteira (T35)** — APIs `GET /api/dashboard/busca` e `GET /api/dashboard/export`; serviços `src/lib/dashboard/busca-global.ts`, `src/lib/dashboard/exportar-carteira.ts` e parsing de recorte em `src/lib/dashboard/filtros.ts`. Atendente exporta apenas a carteira vigente; administradora respeita parâmetros de exportação sem expor dados fora do escopo.
- **Gráficos da carteira (T32)** — bloco `graficos` no payload do atendente (`DashboardGraficosAtendente`), calculado em `src/lib/dashboard/graficos-atendente.ts` com escopo na **carteira vigente** (`collection_assignment`). Conteúdo: faixas de atraso (até 30, 31–60, 61–90, acima de 90 dias) com regra `diasDeAtraso` e deduplicação por `identificador_externo`; distribuição por situação operacional (aguardando atendimento, negociação, retorno, acompanhamento, jurídico quando aplicável, concluído); ranking/tabela por condomínio (original e atualizado); evolução mensal (saldo em aberto na data, recuperação financeira por pagamentos persistidos, variação de saldo). Cliques navegam para `/debitos` ou `/atendimentos` com filtros correspondentes.
- Advogado vê condomínios em que seu **nome** está em `advogados` do cadastro.
- Não exibir metas, pontuações ou previsões inventadas; métricas sem fonte ficam omitidas ou com empty state.

## Integrações

Nenhuma direta.

## Estados de interface

- Carregamento: `SkeletonDashboard` (métricas + painéis); busca global usa bloco `Skeleton` no campo.
- Erro de API: alerta + “Tentar novamente”.
- Ausência de dados: empty states em gráficos e tabelas (sem números ilustrativos).

## Pendências e decisões

- Produtividade por RE (ticket T19+) permanece em relatórios, não no dashboard.
- Advogado sem `debitos.ler` veria indicadores omitidos — seed atual concede leitura de débitos.
