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
| **Atendente** | demais com `atendimentos.ler` | Fila da carteira (RE), atendimentos do dia, semana de contatos, retornos próprios |
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

Query opcional: `dataBase` (ISO date), `limiteDias` (padrão 60).

`DashboardPayload` é união discriminada por `perfil`: `administradora` | `atendente` | `advogado`. Inclui `dataBase`, `limiteDias`, `cargoNome` e blocos descritos na tabela de perfis acima.

## Fluxos principais

1. Usuário autenticado abre `/`.
2. Cliente chama `GET /api/dashboard`.
3. Servidor resolve perfil, aplica escopo (`escopoCondominios`, carteira por RE, etc.) e monta payload.
4. UI renderiza apenas o layout do perfil; estados: carregamento, erro, dados vazios (gráficos/tabelas).

## Regras de negócio

- Totais de inadimplência seguem deduplicação por `identificador_externo` (mesma regra de `/api/debitos/indicadores`).
- Atendente vê apenas unidades na sua carteira (atribuição vigente) e atendimentos de sua autoria.
- Advogado vê condomínios em que seu **nome** está em `advogados` do cadastro.
- Não exibir metas, pontuações ou previsões inventadas; métricas sem fonte ficam omitidas ou com empty state.

## Integrações

Nenhuma direta.

## Estados de interface

- Carregamento: empty state com spinner.
- Erro de API: alerta + “Tentar novamente”.
- Ausência de dados: empty states em gráficos e tabelas (sem números ilustrativos).

## Pendências e decisões

- Produtividade por RE (ticket T19+) permanece em relatórios, não no dashboard.
- Advogado sem `debitos.ler` veria indicadores omitidos — seed atual concede leitura de débitos.
