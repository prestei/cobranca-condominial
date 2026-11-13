# Débitos

## Objetivo

Consultar e acompanhar débitos por unidade e condomínio, com valores e situações coerentes com a origem (importação ou correção manual auditada).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (inadimplência); ticket T14
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `debitos`
- **Módulos relacionados:** [unidades](unidades.md), [importacoes](importacoes.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md), [integracao-superlogica](integracao-superlogica.md)
- **Dados:** `debt` em [banco.md](../banco.md); `Debito` em `catalogo.ts`

## Rotas e telas

- `/debitos` — `src/app/debitos/page.tsx` — painel **Inadimplência**: KPIs, filtros, gráficos de percentuais (rosca de unidades + barras de valor por faixa de atraso, sem título de seção) e listagem em **abas** — **Por condomínio** (padrão, à frente: todos os condomínios na tela, painel recolhível com **Prazo inadimplência: N dias** no subtítulo do bloco, tabela e paginação por condomínio) e **Geral** (tabela plana). Ação do cabeçalho **Nova inadimplência**; **Importar** / **Exportar** no `ResponsiveTable`; cadastro/edição em sheet; confirmação de unidade quitada.

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

1. **Listagem** — ao abrir, sincroniza condomínios (`/api/condominios`) e unidades (`/api/unidades`) no catálogo do cliente, depois carrega `/api/debitos`; layout: KPIs, **filtros**, percentuais e abas **Geral** / **Por condomínio**; filtros locais (período, data-base, cidade, origem, situação do débito, **situação de cobrança da unidade**); **Importar** (wizard in-place) e exportação conforme a aba ativa (CSV, XLS, PDF).
2. **Indicadores** — totais na data-base usam valores persistidos; soma deduplica registros com o mesmo `identificadorExterno`. Os gráficos de percentuais mostram: (1) % de unidades com débito vencido ÷ total de unidades do recorte (`GraficoRosca`); (2) distribuição do valor atualizado **até** vs **acima** do limite de dias (`GraficoBarras`). O resumo sob o gráfico de unidades informa quantas unidades **prescritas** existem no recorte filtrado (classificação em `unit.situacao`, sem alterar débitos). Sem título de seção “Percentuais”; cada gráfico mantém o próprio título. O % sobre valor emitido no período continua dependente de dado externo (API/cadastro) e não aparece até existir essa fonte.
3. **Cadastro/edição manual** — selects de condomínio/unidade usam escopo do usuário; ao editar, recarrega cadastros relacionados e `GET /api/debitos/[id]` antes de preencher o sheet; API + auditoria; `fonteValores` = `manual`. Ao gravar débito **Pendente** ou **Vencido**, unidade em **Sem cobrança** ou **Quitada** é promovida para **Em cobrança** (mesma regra da confirmação de importação), para refletir na coluna Situações de `/unidades` e na fila operacional.
4. **Importação** — atualiza `fonteValores` = `origem` e `atualizadoEm`; ver T13.
5. **Quitação da unidade** — situação `Quitada` (fora da fila); atendimentos e débitos históricos permanecem.

## Regras de negócio

- **Prazo de acompanhamento (T02):** cada débito usa o prazo do condomínio (`delinquencyTrackingDays`, padrão 60). Na data-base do painel, exibe dias em atraso, dias restantes e situação (dentro do prazo, próximo do limite, atingido, ultrapassado). Alterar o prazo no condomínio não altera vencimentos nem valores persistidos.
- **Alertas de prazo (T03):** notificações in-app ao atendente responsável (ou administração sem RE) nas antecedências configuradas e nos marcos de prazo atingido/ultrapassado; ver [notificacoes.md](notificacoes.md).

- Débito da unidade como origem do atendimento de cobrança.
- **Pagamento no cadastro manual:** na etapa *Pagamento* do sheet, **data do pagamento** e **valor pago** são obrigatórios somente quando a situação do débito é **Pago**; para **Pendente**, **Vencido** e **Cancelado** os campos ficam opcionais e o servidor grava `dataPagamento`/`valorPago` vazios. Validação espelhada na API (`src/lib/debitos/service.ts`).
- Não inventar juros/multa/correção: usar apenas campos gravados. Se **valor atualizado** vier vazio no cadastro manual, a API grava o **valor** (ou **valor original**) como saldo; totais em Unidades e indicadores usam `persistedDebtBalance` na mesma ordem.
- **Entrada na fila de cobrança:** na confirmação da importação de inadimplência **e** no cadastro/edição manual de débito em aberto, unidade em **Sem cobrança** ou **Quitada** passa para **Em cobrança** (`src/lib/debitos/promover-unidade-cobranca.ts`); unidade **prescrita** não é alterada. Demais transições operacionais: [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).

## Integrações

Importação via administradoras — ver `integracao-superlogica.md`.

## Estados de interface

- Carregamento inicial via API (débitos + condomínios + unidades); toasts em erro de save/delete; sheet de edição desabilita salvar enquanto carrega o débito.
- Sheet de cadastro em três etapas (identificação, valores, pagamento).
- Coluna **Origem / atualização** exibe fonte dos valores e data da última persistência.

## Pendências e decisões

- Cálculo automático de encargos e política de saldo divergente da fonte: [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
