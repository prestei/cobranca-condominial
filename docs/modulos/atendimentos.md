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
| `/atendimentos` | **Fila de cobranças** — KPIs, filtros e listagem em abas: **Por condomínio** (padrão) e **Geral**; Administradora também tem **Por atendente**; **Configurar Distribuição** no header (Administradora) |
| `/minha-agenda` | **Agenda do atendente** — calendário mensal com todos os dias; contatos realizados e retornos agendados; navegação mês a mês (somente perfil atendente) |
| `/atendimentos?retorno=hoje` (ou `atrasado`, `semana`, `sem`) | Filtro de retorno aplicado na fila (compromissos futuros na cobrança) |
| `/atendimentos?novo=1&unidade=` | Abre sheet de registro de contato (palitagem) |
| `/atendimentos?novo=1&unidade=&canal=` | Mesmo sheet com canal pré-selecionado (`WhatsApp`, `E-mail`, …) — usado pelos atalhos do atendente |
| `/fila`, `/distribuicao` | Atalhos legados → `/atendimentos` |
| `/retornos` | Atalho legado → `/atendimentos?retorno=hoje` |

Arquivos: `src/app/atendimentos/page.tsx`; agenda do atendente `src/app/minha-agenda/page.tsx` + `src/components/atendimentos/agenda-historico-visual.tsx` + `src/lib/atendimentos/agrupar-historico-por-dia.ts`; painel principal `src/components/atendimentos/fila-cobrancas-panel.tsx`; agrupamentos `src/components/atendimentos/fila-por-grupos-lista.tsx`; atalhos do atendente `src/components/atendimentos/atalhos-contato-atendente.tsx` + `src/lib/contato-responsavel.ts`; sheet de distribuição `src/components/atendimentos/distribuicao-automatica-sheet.tsx`. **Agendar atendimento** (sistema-wide): `AgendarAtendimentoProvider` em `Providers` (`src/app/providers.tsx`) + `AgendarAtendimentoSheet` (`src/components/atendimentos/agendar-atendimento-sheet.tsx`) — disponível no histórico/detalhe da unidade, unidades, débitos, minha agenda, home do atendente e central de pendências; na **fila** o fluxo permanece **Registrar contato** (palitagem). Histórico de palitagem por unidade: menu **Histórico** → `HistoricoUnidadeSheet`.

## Perfis e permissões

| Ação | Administradora | Atendente | Advogado |
| --- | --- | --- | --- |
| Ver fila (`atendimentos.ler`) | Carteira geral no escopo; abas Por condomínio / Por atendente / Geral | Somente unidades com RE atribuído ao login; abas **Por condomínio** / **Geral** | Sem acesso (sem `atendimentos.ler` no seed) |
| Registrar atendimento | Sim | Sim (autor = sessão) | Não |
| Filtro por RE | Sim | Não |
| Distribuir / redistribuir cobranças | Sim (`usuarios.criar`) | Não | Não |

Escopo de condomínios: `escopoCondominios` em `catalogo.ts`.

## API

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/fila` | `atendimentos.ler` | Fila paginada (filtros na listagem) + `resumo` global da carteira (KPIs, **sem** filtros da tabela): `page`, `pageSize`, `q`, `condominioId`, `situacao`, `atendente`, `codigoRe`, `semResponsavel=1`, `retorno`, `sort`, `order` |
| GET | `/api/atendimentos` | `atendimentos.ler` | Lista de palitagem no escopo: `unidadeId`, `status`, `canal`, `q`; **T28:** `operacional` (`pendentes`, `aguardando_retorno`, `resolvidos_periodo`, `atencao`) com `de`/`ate` opcionais — carteira vigente, mesma regra do dashboard |
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

- Unidade na fila: situação `Em cobrança`, `Em acordo`, `Notificada` ou `Ajuizada`; cadastro **Inativa**, **Quitada** ou **Unidade prescrita** fora da fila.
- Inadimplência exibida a partir de débitos `Pendente`/`Vencido` da unidade.
- RE responsável: vigência em `AtribuicaoCobranca` / `collection_assignment` (`encerrado_em` nulo = vigente).
- Redistribuição encerra a vigência anterior, grava `anterior_atendente_id`, autor (`atribuido_por_id`), data/hora e motivo opcional; **não altera** `usuario_id` dos atendimentos já registrados.
- Distribuição múltipla: validação completa antes de persistir; falha em qualquer unidade cancela o lote.
- **Início automático após importação:** com distribuição automática **ativada**, a confirmação de inadimplência promove a unidade a **Em cobrança** e dispara `dispararDistribuicaoAutomaticaSeAtivada` para atribuir RE às unidades daquele lote ainda sem responsável (estratégia configurada). Com a opção desativada, a unidade entra na fila sem RE até distribuição manual ou execução explícita.
- **Verificação periódica (5 min):** com a opção ativa, o processo Node agenda `executarCicloDistribuicaoAutomatica` a cada 5 minutos (`job-periodico.ts`, iniciado em `instrumentation.ts`) para pegar cobranças sem RE que tenham entrado por outros caminhos.

## Fluxos

1. Operador abre **Atendimentos** → identifica cobranças pelos KPIs e filtros. Abas **Por condomínio** (padrão — painéis recolhíveis) e **Geral** (tabela plana). **Administradora** também tem **Por atendente**. **Atendente:** só a própria carteira; cartões/linhas com visual brass/gold e atalhos **WhatsApp** / **E-mail**. Seção **Filtros**: busca, condomínio, situação, responsável (admin) e retorno; **Filtrar** no servidor (`GET /api/fila`).
2. **Administradora** — **Configurar Distribuição** (ativar regra/estratégia). Com a opção **ativa**, a confirmação de inadimplência distribui automaticamente; se quem importou for atendente com RE, as unidades do lote vão para a **carteira dele**. Job a cada 5 min cobre pendências restantes.
3. **Retornos** — filtro `Retorno` na fila (ex.: Hoje, Atrasados); conclusão pelo menu de ações → `POST …/concluir-retorno`.
4. **Histórico** — menu de ações da linha → `HistoricoUnidadeSheet` (substitui aba Registros).
5. **Registrar contato** — menu de ações, atalho WhatsApp/E-mail do atendente ou `?novo=1&unidade=` (`&canal=` opcional) → `POST /api/atendimentos`.
6. **Agendar atendimento** — ação com `atendimentos.criar` em unidades, débitos, detalhe/histórico da unidade, `/minha-agenda` e home do atendente (não na fila: lá o fluxo é **Registrar contato**). Abre sheet dedicado que cria um `service_ticket` com `data_proxima_acao` e `proxima_acao`; o compromisso entra na agenda e no filtro de retornos.
7. Cada tentativa acrescenta um `service_ticket`; registros anteriores não são sobrescritos.

## Regras de negócio (agenda de retornos — T11)

- Retorno = atendimento (`service_ticket`) com `data_proxima_acao` preenchida.
- Classificação temporal (atrasado, hoje, próximos 7 dias, agendado) via `situacaoRetorno` / `hojeIso()` (fuso do ambiente Node/navegador). Valores de `data_proxima_acao` com hora (`…T15:00:00`) são comparados pelo **dia** (YYYY-MM-DD), preservando a hora na UI («Hoje, 15:00»).
- **Pendente:** sem `retorno_concluido_em`; entra em alertas e contador do menu (`retornoPendente`).
- **Concluído:** `POST …/concluir-retorno` preenche `retorno_concluido_em` e `retorno_concluido_por_id` no servidor; **não** apaga a data prevista nem o registro de palitagem.
- **Atendente:** vê e conclui retornos das unidades da carteira vigente (`collection_assignment`), independentemente de quem registrou a palitagem.
- **Administradora:** vê a equipe; filtros por condomínio e RE responsável (carteira vigente).
- Novo próximo passo: registrar **nova** tentativa (sheet de palitagem / botão “Nova tentativa”); tentativas anteriores permanecem.
- **Agendar atendimento (atalho):** `POST /api/atendimentos` com resposta `Não`, status `Pendente`, assunto de agendamento e `data_proxima_acao` obrigatória — mesmo escopo/carteira da palitagem; não substitui a conclusão de retorno (`concluir-retorno`) nem a correção administrativa (`PATCH`).
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
