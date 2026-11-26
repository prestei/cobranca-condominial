# Débitos

## Objetivo

Consultar e acompanhar débitos por unidade e condomínio, com valores e situações coerentes com a origem (importação ou correção manual auditada).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (inadimplência); ticket T14
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `debitos`
- **Módulos relacionados:** [unidades](unidades.md), [importacoes](importacoes.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md), [integracao-superlogica](integracao-superlogica.md)
- **Dados:** `debt` em [banco.md](../banco.md); `Debito` em `catalogo.ts`

## Rotas e telas

- `/debitos` — `src/app/debitos/page.tsx` — painel **Inadimplência**: KPIs globais na data-base, filtros, bloco de gráficos com **abas** — **Por situação**, **Por unidade** e **Por faixa de atraso** — e listagem em **abas** — **Por condomínio** (padrão: relatório financeiro por unidade somente no recorte **Em aberto**) e **Geral** (tabela por situação). Barra **Em aberto** (padrão) · **Em negociação** · **Quitadas** · **Prescritas** · **Histórico** (`InadimplenciaRecorteSituacaoTabs`, classificação em `painel-situacao.ts` na data-base). Cada recorte exibe **colunas próprias** (`InadimplenciaRecorteListagem`), **indicadores do recorte** (sem duplicar o mesmo débito nas somas) e exportação alinhada à seção. **Histórico** com unidade filtrada: painel `InadimplenciaHistoricoPainel` (períodos `GET /api/unidades/:id/periodos-inadimplencia` + linha do tempo). Filtro **Responsável (RE)** em **Em aberto** e **Em negociação**. Ação do cabeçalho **Nova inadimplência**; **Importar** / **Exportar**; cadastro/edição em sheet; confirmação de unidade quitada.

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Ver listagem e indicadores | `debitos.ler` |
| Cadastrar débito manual | `debitos.criar` |
| Corrigir débito | `debitos.editar` |
| Excluir débito | `debitos.excluir` |
| Confirmar unidade quitada | `debitos.editar` ou `unidades.editar` |
| Importar inadimplência (atalho na listagem) | `importacoes.criar` |

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
| GET | `/api/debitos` | `debitos.ler` | Query: `condominioId`, `unidadeId`, `status`, `situacaoInadimplencia`, `origem`, `q`, `vencimentoDe`, `vencimentoAte` → `{ debitos }` |
| GET | `/api/debitos/[id]` | `debitos.ler` | Detalhe para edição → `{ debito }` |
| POST | `/api/debitos` | `debitos.criar` | Body: campos do débito → `{ debito }` (201) |
| PATCH | `/api/debitos/[id]` | `debitos.editar` | Body: campos do débito → `{ debito }` |
| DELETE | `/api/debitos/[id]` | `debitos.excluir` | → `{ ok: true }` |
| GET | `/api/debitos/indicadores` | `debitos.ler` | Query: `dataBase`, `limiteDias`, filtros como listagem, `cidade` → `{ indicadores, dataBase, limiteDias }` |
| POST | `/api/debitos/unidade/[unidadeId]/confirmar-quitacao` | `debitos.editar` ou `unidades.editar` | Body opcional `{ forcar: true }` → `{ unidade, debitosAbertos }`; 409 se ainda há débitos em aberto |

Importação em lote: [importacoes](importacoes.md) — `POST /api/importacoes/debitos/confirmar` retorna `{ debitos }` atualizados.

Serviço: `src/lib/debitos/service.ts`. Sincronização cliente: `src/lib/debitos/sync-cliente.ts`. Indicadores (deduplicação por ID externo): `src/lib/debitos/indicadores.ts`.

## Fluxos principais

1. **Listagem (T29)** — ao abrir, sincroniza condomínios/unidades e carrega `/api/debitos` (com `negociacaoFinanceira` quando houver acordo). Abas de recorte situacional filtram cada registro em **uma** categoria; quitada não aparece em **Em aberto**; negociação formal não duplica como aberto (`situacao_operacional` / `painel-situacao.ts`). **Em aberto:** condomínio, unidade, original, saldo pendente, atraso, RE, último atendimento, próximo retorno. **Em negociação:** campos financeiros do acordo e parcelas. **Quitadas / Prescritas:** quitação ou classificação com responsável. **Histórico:** listagem consultiva; com unidade nos filtros, períodos e movimentações da unidade. Indicadores do topo da página continuam na data-base do recorte filtrado; cartões abaixo da barra de situação refletem **somente** o recorte ativo.
2. **Indicadores** — totais na data-base usam valores persistidos (incluindo débitos prescritos); soma deduplica registros com o mesmo `identificadorExterno`. Na aba **Por situação** (`src/lib/debitos/painel-situacao.ts`): rosca com contagem deduplicada por situação (**Em aberto**, **Em negociação** — unidade em acordo ou proposta ativa —, **Quitadas** — pago na data-base —, **Prescritas**); evolução dos últimos cinco meses; cartões com variação mês a mês. Na aba **Por unidade** (`src/lib/debitos/painel-unidade.ts`): rosca por unidade no recorte (**Com débito vencido**, **Em negociação**, **Sem débito vencido**, **Quitada**); evolução mensal alinhada ao critério operacional de unidade devedora (débito em aberto não prescrito); cartões com variação mês a mês. Na aba **Por faixa de atraso** permanece a distribuição de valor até/acima do prazo do condomínio. O % sobre valor emitido no período continua dependente de dado externo (API/cadastro) e não aparece até existir essa fonte.
3. **Cadastro/edição manual** — selects de condomínio/unidade usam escopo do usuário; ao editar, recarrega cadastros relacionados e `GET /api/debitos/[id]` antes de preencher o sheet; API + auditoria; `fonteValores` = `manual`. Ao gravar débito **Pendente** ou **Vencido**, unidade em **Sem cobrança** ou **Quitada** é promovida para **Em cobrança** (mesma regra da confirmação de importação), para refletir na coluna Situações de `/unidades` e na fila operacional.
4. **Importação** — atualiza `fonteValores` = `origem` e `atualizadoEm`; ver T13. O texto do relatório (ex.: `TAXA CONDOMINIAL`, `ACORDO EXTRAJUDICIAL`) vai para `debt.descricao` / `Debito.descricao` e é exibido na coluna **Lançamento** da visão por condomínio; agregações por grupo (`grupoDebito`) usam essa descrição só para classificação interna, sem substituir o rótulo na listagem.
5. **Quitação da unidade** — situação `Quitada` (fora da fila); atendimentos e débitos históricos permanecem.

## Regras de negócio

- **Prazo de acompanhamento (T02):** cada débito usa o prazo do condomínio (`delinquencyTrackingDays`, padrão 60). Na data-base do painel, exibe dias em atraso, dias restantes e situação (dentro do prazo, próximo do limite, atingido, ultrapassado). Alterar o prazo no condomínio não altera vencimentos nem valores persistidos.
- **Alertas de prazo (T03):** notificações in-app ao atendente responsável (ou administração sem RE) nas antecedências configuradas e nos marcos de prazo atingido/ultrapassado; ver [notificacoes.md](notificacoes.md).

- Débito da unidade como origem do atendimento de cobrança.
- **Pagamento no cadastro manual:** na etapa *Pagamento* do sheet, **data do pagamento** e **valor pago** são obrigatórios somente quando a situação do débito é **Pago**; para **Pendente**, **Vencido** e **Cancelado** os campos ficam opcionais e o servidor grava `dataPagamento`/`valorPago` vazios. Validação espelhada na API (`src/lib/debitos/service.ts`).
- Não inventar juros/multa/correção: usar apenas campos gravados. Se **valor atualizado** vier vazio no cadastro manual, a API grava o **valor** (ou **valor original**) como saldo; totais em Unidades e indicadores usam `persistedDebtBalance` na mesma ordem.
- **Recorte da listagem:** na data-base do painel, cada débito do filtro cai em **Em aberto**, **Em negociação**, **Quitadas** (pago na data-base), **Prescritas** ou **Histórico** (demais casos no recorte, ex. cancelado ou vencimento futuro). Mesma lógica de `classificarDebitoSituacaoPainel` em `painel-situacao.ts`: quitação e prescrição na data-base antes da elegibilidade operacional (`debitoInadimplenciaAtiva`); negociação alinhada à fila de atendimentos (`unidade-em-negociacao.ts` — unidade em acordo, proposta na fila/aceita ou qualquer débito ativo com situação operacional **Em negociação**, incluindo débitos ativos da unidade ainda fora de `debitoIds` da proposta). **Acordo ativo prevalece sobre inadimplência prescrita** no recorte Em negociação (mesma prioridade de `operational-situation.ts`). KPIs e gráficos usam o filtro geral; tabela e exportação respeitam o recorte ativo. Nas abas **Em negociação**, **Quitadas**, **Prescritas** e **Histórico**, a visão **Por condomínio** usa painéis recolhíveis (como em **Em aberto**) e a visão **Geral** separa blocos por cabeçalho de condomínio.
- **Situação operacional do débito (T24):** `situacao_operacional` + histórico em `debt_operational_situation_change`; sincronização em `src/lib/debitos/operational-situation-sync.ts` após criar/editar débito ou alterar proposta de negociação. Fila e indicadores ativos consideram apenas **Em aberto** e **Em negociação** (`debitoInadimplenciaAtiva`).
- **Prescrição (T08):** situação da inadimplência por débito (`Ativa` | `Inadimplência prescrita`); classificação manual com justificativa, responsável e data; permissão `debitos.editar`. Atalho **Marcar como prescrita** no menu de ações (⋮) da linha, nas visões **Por condomínio** e **Geral**, com diálogo de justificativa; **Remover prescrição** quando já classificada. Também disponível no sheet **Editar débito** (etapa Valores). Filtro **Situação da inadimplência** na listagem; badge na coluna Situação.
- **Entrada na fila de cobrança:** na confirmação da importação de inadimplência **e** no cadastro/edição manual de débito **operacional** em aberto, unidade em **Sem cobrança** ou **Quitada** passa para **Em cobrança** (`src/lib/debitos/promover-unidade-cobranca.ts`). Demais transições operacionais: [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
- **Negociação formalizada (T25):** após acordo **Aceita**, o painel exibe valor original, negociado, desconto, pago confirmado e saldo restante (`negociacaoFinanceira` em `GET /api/debitos`; lógica em `src/lib/debitos/negotiation-financial-sync.ts`). Pagamentos confirmados no acordo atualizam saldo sem reimportação; importação não sobrescreve original/atualizado de débitos com acordo vigente.
- **Quitação automática (T28):** `reavaliarQuitacaoESituacaoUnidade` em `src/lib/debitos/settlement-sync.ts` (orquestrada por `operational-situation-sync.ts`) carrega propostas de negociação reais (`listNegotiationProposals`) para inferir **Em negociação**, aplica situação **Quitada** ao débito quando cabível, grava histórico em `debt_settlement`, encerra período de inadimplência quando cabível e promove a unidade a **Sem cobrança** somente sem outros débitos vencidos ativos. Pagamento **Informado** não dispara quitação.

## Integrações

Importação via administradoras — ver `integracao-superlogica.md`.

## Estados de interface

- Carregamento inicial via API (débitos + condomínios + unidades); toasts em erro de save/delete; sheet de edição desabilita salvar enquanto carrega o débito.
- Sheet de cadastro em três etapas (identificação, valores, pagamento).
- Coluna **Origem / atualização** exibe fonte dos valores e data da última persistência.

## Pendências e decisões

- Cálculo automático de encargos e política de saldo divergente da fonte: [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
