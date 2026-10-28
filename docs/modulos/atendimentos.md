# Atendimentos (palitagem)

## Objetivo

Fila operacional de cobrança ativa (T08) e registro/consulta de tentativas de cobrança (palitagem), retornos e produtividade.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — §2 Palitagem; T08 em `TICKETS_CURSOR_DANIEL_JORGE.md`
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `atendimentos`
- **Módulos relacionados:** [condominios](condominios.md), [unidades](unidades.md), [debitos](debitos.md), [usuarios](usuarios.md), [relatorios](relatorios.md)
- **Dados:** `service_ticket`, `collection_assignment` (seed), `AtribuicaoCobranca`, `Atendimento` em `catalogo.ts`; ver [banco.md](../banco.md)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)

## Rotas e telas

| Rota | Descrição |
| --- | --- |
| `/atendimentos` | **Fila de cobranças** — tela operacional única: KPIs, filtros, tabela, distribuição automática (Administradora), atividade recente |
| `/atendimentos?retorno=hoje` (ou `atrasado`, `semana`, `sem`) | Filtro de retorno aplicado na fila (substitui a aba Retornos) |
| `/atendimentos?novo=1&unidade=` | Abre sheet de registro de contato (palitagem) |
| `/fila`, `/distribuicao` | Atalhos legados → `/atendimentos` |
| `/retornos` | Atalho legado → `/atendimentos?retorno=hoje` |

Arquivos: `src/app/atendimentos/page.tsx`; painel principal `src/components/atendimentos/fila-cobrancas-panel.tsx`; distribuição automática `src/components/atendimentos/distribuicao-automatica-panel.tsx`. Histórico de palitagem por unidade: menu **Histórico** → `HistoricoUnidadeSheet`. Painéis legados `distribuicao-panel.tsx` e `retornos-agenda-panel.tsx` permanecem no repositório para referência/API, mas não são abas da rota principal.

## Perfis e permissões

| Ação | Administradora | Atendente | Advogado |
| --- | --- | --- | --- |
| Ver fila (`atendimentos.ler`) | Carteira geral no escopo | Somente unidades com RE atribuído ao login | Sem acesso (sem `atendimentos.ler` no seed) |
| Registrar atendimento | Sim | Sim (autor = sessão) | Não |
| Filtro por RE | Sim | Não |
| Distribuir / redistribuir cobranças | Sim (`usuarios.criar`) | Não | Não |

Escopo de condomínios: `escopoCondominios` em `catalogo.ts`.

## API

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/fila` | `atendimentos.ler` | Fila paginada (filtros na listagem) + `resumo` global da carteira (KPIs, **sem** filtros da tabela): `page`, `pageSize`, `q`, `condominioId`, `situacao`, `atendente`, `codigoRe`, `semResponsavel=1`, `retorno`, `sort`, `order` |
| GET | `/api/atendimentos` | `atendimentos.ler` | Lista de palitagem no escopo: `unidadeId`, `status`, `canal`, `q` |
| POST | `/api/atendimentos` | `atendimentos.criar` | Body: condomínio, unidade, canal, respondeu, motivo?, status, observações, retorno — autor e `data_hora` no servidor |
| PATCH | `/api/atendimentos/[id]` | `atendimentos.editar` | Correção administrativa; preserva autor e timestamp originais |
| DELETE | `/api/atendimentos/[id]` | `atendimentos.excluir` | Exclusão com auditoria |
| GET | `/api/distribuicao/carteira` | `usuarios.criar` | Totais da carteira vigente por RE |
| GET | `/api/distribuicao/historico` | `usuarios.criar` | Histórico de `collection_assignment` (`unidadeId`, `limit`) |
| POST | `/api/distribuicao/atribuicoes` | `usuarios.criar` | Body: `{ unidadeIds, codigoRe, motivo? }` — distribuição atômica em lote |
| GET/PATCH | `/api/distribuicao/automatica` | `usuarios.criar` | Configuração (ativada, estrategia) e contagem aguardando atribuição |
| POST | `/api/distribuicao/automatica/executar` | `usuarios.criar` | Distribui unidades sem RE (estratégia **carga** = carteira equilibrada) |
| GET | `/api/retornos` | `atendimentos.ler` | Agenda paginada: `estado` (pendente/concluido/todos), `situacao`, `de`, `ate`, `condominioId`, `codigoRe`, `q`, `page`, `pageSize` |
| POST | `/api/atendimentos/[id]/concluir-retorno` | `atendimentos.editar` | Marca retorno agendado como realizado; grava `retorno_concluido_em` e autor; preserva `data_proxima_acao` |
| GET | `/api/unidades/:id/historico` | `unidades.ler` ou `atendimentos.ler` | Linha do tempo da unidade (T12); ver [unidades](unidades.md) |
| GET/POST | `/api/propostas` | `atendimentos.ler` / `criar` | Propostas de negociação (T15); ver [negociacoes.md](negociacoes.md) |
| GET/PATCH | `/api/propostas/[id]` | `atendimentos.ler` / `editar` | Detalhe e alteração de status da proposta |

Regras: `src/lib/fila/service.ts`, `src/lib/distribuicao/service.ts`, `src/lib/atendimentos/service.ts`, `src/lib/retornos/service.ts`, `src/lib/historico-unidade/service.ts`, `src/lib/negociacoes/service.ts`.

## Regras de negócio (fila)

- Unidade na fila: situação `Em cobrança`, `Em acordo`, `Notificada` ou `Ajuizada`; cadastro **Inativa** ou **Quitada** fora da fila.
- Inadimplência exibida a partir de débitos `Pendente`/`Vencido` da unidade.
- RE responsável: vigência em `AtribuicaoCobranca` / `collection_assignment` (`encerrado_em` nulo = vigente).
- Redistribuição encerra a vigência anterior, grava `anterior_atendente_id`, autor (`atribuido_por_id`), data/hora e motivo opcional; **não altera** `usuario_id` dos atendimentos já registrados.
- Distribuição múltipla: validação completa antes de persistir; falha em qualquer unidade cancela o lote.
- Não implementar regra automática de entrada na cobrança (decisão pendente).

## Fluxos

1. Operador abre **Atendimentos** (fila única) → identifica cobranças pelos KPIs e filtros. Barra de filtros (`FilterBar` variante `toolbar`): busca `q`, condomínio, situação, responsável (admin) e retorno; **Filtrar** aplica no servidor (`GET /api/fila`); **Limpar** zera critérios. Filtro de retorno aplicado também atualiza `?retorno=` na URL (atalhos legados `/retornos` continuam válidos).
2. **Administradora** — painel **Distribuição automática** (ativar regra, **Distribuir agora**) ou seleção manual na tabela + atribuição por RE.
3. **Retornos** — filtro `Retorno` na fila (ex.: Hoje, Atrasados); conclusão pelo menu de ações → `POST …/concluir-retorno`.
4. **Histórico** — menu de ações da linha → `HistoricoUnidadeSheet` (substitui aba Registros).
5. **Registrar contato** — menu de ações ou `?novo=1&unidade=` → `POST /api/atendimentos`.
6. Cada tentativa acrescenta um `service_ticket`; registros anteriores não são sobrescritos.

## Regras de negócio (agenda de retornos — T11)

- Retorno = atendimento (`service_ticket`) com `data_proxima_acao` preenchida.
- Classificação temporal (atrasado, hoje, próximos 7 dias, agendado) via `situacaoRetorno` / `hojeIso()` (fuso do ambiente Node/navegador). Valores de `data_proxima_acao` com hora (`…T15:00:00`) são comparados pelo **dia** (YYYY-MM-DD), preservando a hora na UI («Hoje, 15:00»).
- **Pendente:** sem `retorno_concluido_em`; entra em alertas e contador do menu (`retornoPendente`).
- **Concluído:** `POST …/concluir-retorno` preenche `retorno_concluido_em` e `retorno_concluido_por_id` no servidor; **não** apaga a data prevista nem o registro de palitagem.
- **Atendente:** vê e conclui retornos das unidades da carteira vigente (`collection_assignment`), independentemente de quem registrou a palitagem.
- **Administradora:** vê a equipe; filtros por condomínio e RE responsável (carteira vigente).
- Novo próximo passo: registrar **nova** tentativa (sheet de palitagem / botão “Nova tentativa”); tentativas anteriores permanecem.
- Sem notificações SMS/e-mail/push neste ticket.

## Regras de negócio (palitagem — T10)

- Autor (`usuario_id`) e `data_hora` definidos no servidor a partir da sessão; o cliente não pode enviá-los.
- Unidade deve pertencer ao condomínio informado e estar no escopo do usuário.
- **Atendente:** só registra em unidades da sua carteira (`collection_assignment` vigente com seu RE).
- **Administradora:** pode registrar em qualquer unidade no escopo.
- Validação de canal, resposta (Sim/Não), motivo (obrigatório se Sim) e situação conforme catálogos em `catalogo.ts`.
- Proteção contra duplicata por clique repetido (desabilita botão + janela curta no servidor).

## Pendências

- Persistir fila, atribuições, config de distribuição automática e tickets no PostgreSQL (hoje catálogo em memória compartilhado via API).
- Refinar estratégias `rodizio`, `condominio` e `volume` além da **carga equilibrada** já disponível; ver [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
