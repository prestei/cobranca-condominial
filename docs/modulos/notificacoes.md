# Notificações internas (T34)

## Objetivo

Central de alertas in-app para o atendente (e demais colaboradores com `atendimentos.ler`), cobrindo carteira, retornos, pendências e distribuição — sem depender de consulta manual. Canais externos (WhatsApp, SMS, e-mail) permanecem **desativados** até aprovação de provedor.

## Rotas e API

| Recurso | Descrição |
| --- | --- |
| `/notificacoes` | Histórico completo (até 100 itens, mais recentes primeiro) |
| Sino no header (`AppShell`) | Prévia (até 8 itens) e contagem de não lidas |
| `GET /api/notificacoes` | Lista (`limit`, `naoLidas=1`) |
| `GET /api/notificacoes/contagem` | Total de não lidas |
| `POST /api/notificacoes/marcar-todas-lidas` | Marca todas do destinatário |
| `POST /api/notificacoes/[id]/lida` | Marca uma como lida |
| `GET /api/notificacoes/[id]/abrir` | Valida escopo do registro, marca lida e devolve URL |

Código: `src/lib/notificacoes/service.ts`, `src/hooks/use-notificacoes.ts` (atualização automática a cada 45s e ao voltar à aba).

## Tipos de notificação

| Evento | Quando | Destinatário |
| --- | --- | --- |
| `cobranca_atribuida` | Nova atribuição de carteira (distribuição) | Novo atendente do RE |
| `carteira_transferida` | Redistribuição com atendente anterior | Atendente que **deixou** a unidade |
| `atendimento_atribuido` | Atendimento criado por outro colaborador na unidade | Atendente da carteira vigente |
| `retorno_agendado` | Retorno agendado ou data alterada | Carteira vigente ou autor |
| `retorno_proximo` | Retorno em até 7 dias (um alerta/dia) | Idem retorno |
| `retorno_atrasado` | Retorno com data passada (um alerta/dia) | Idem retorno |
| `retorno_lembrete_hoje` | Retorno com data **hoje**, após `horarioLembrete` (padrão 08:00 `America/Sao_Paulo`) | Idem retorno |
| `movimentacao_atendimento` | Atualização relevante em atendimento por outro colaborador | Carteira vigente |
| `situacao_alterada` | Mudança na situação de cobrança da unidade | Atendente da carteira vigente |
| `pendencia_atencao` | Pendência prioritária, atrasada ou do dia (T30) — um alerta/dia/unidade | Atendente da carteira |

## Idempotência

Cada notificação possui `chave_idempotencia` única. Reprocessar o mesmo evento **não duplica** alertas.

## Permissões

- Consultar e marcar notificações: `dashboard.ler` (caixa pessoal do usuário logado).
- Receber alertas operacionais: exige `atendimentos.ler`.
- Abrir registro relacionado: validação de escopo em `obterNotificacaoParaAbrir` (403 se fora do alcance).

## Falhas

Erros ao persistir notificação são registrados em `notificacao_falhas` e **não revertem** criação de atendimento nem distribuição.

## Preferências (protótipo)

Por usuário, em memória: lembrete diário de retorno (`lembreteRetornoHoje`, padrão `true`) e `horarioLembrete` (`HH:mm`, padrão `08:00`, fuso `America/Sao_Paulo`).

## Canais externos

`CANAIS_EXTERNOS_HABILITADOS` em `service.ts`: todos `false` até decisão formal.

## Fluxos principais

1. **Atendimentos (T10/T11):** criação/edição → atribuição, movimentação, retorno agendado.
2. **Distribuição (T09):** `distribuirUnidades` → nova carteira e transferência.
3. **Unidades (T06):** alteração de situação → alerta ao atendente da carteira.
4. **Agendados:** ao listar/contar notificações, `processarNotificacoesAgendadas` (lembretes, retornos próximo/atrasado, pendências T30).
5. **UI:** sino + `/notificacoes`; clique abre o registro; marcar lida persiste em `lida_em`.

## Conexões

- [atendimentos.md](atendimentos.md) — retornos e fila
- [dashboard.md](dashboard.md) — central de pendências (T30)
- [regra-negocio.md](../regra-negocio.md) — regra transversal T34

## Dados

Tipos em `src/data/catalogo.ts`: `NotificacaoInterna`, `NotificacaoFalha`. Modelo lógico: tabelas `internal_notification` e `notification_failure` em [banco.md](../banco.md).
