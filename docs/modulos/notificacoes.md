# Notificações internas (T34)

## Objetivo

Alertar colaboradores sobre retornos e redistribuição de cobrança **dentro do sistema**, sem depender de consulta manual à fila. Canais externos (WhatsApp, SMS, e-mail) permanecem **desativados** até aprovação de provedor.

## Rotas e API

| Recurso | Descrição |
| --- | --- |
| `/notificacoes` | Lista completa de alertas do usuário logado |
| Sino no header (`AppShell`) | Prévia (até 8 itens) e contagem de não lidas |
| `GET /api/notificacoes` | Lista (`limit`, `naoLidas=1`) |
| `GET /api/notificacoes/contagem` | Total de não lidas |
| `POST /api/notificacoes/marcar-todas-lidas` | Marca todas do destinatário |
| `POST /api/notificacoes/[id]/lida` | Marca uma como lida |
| `GET /api/notificacoes/[id]/abrir` | Valida escopo do registro, marca lida e devolve URL |

Código: `src/lib/notificacoes/service.ts`, `src/hooks/use-notificacoes.ts`.

## Regras de negócio

### Eventos aprovados (somente in-app)

| Evento | Quando | Destinatário |
| --- | --- | --- |
| `retorno_agendado` | Atendimento criado ou atualizado com `data_proxima_acao` e retorno não concluído | Atendente da **carteira vigente** da unidade; se não houver, autor do atendimento |
| `retorno_lembrete_hoje` | Retorno com data **hoje** (fuso `America/Sao_Paulo`), após horário configurado (padrão 08:00) | Mesma regra do retorno agendado |
| `cobranca_atribuida` | Nova linha em `collection_assignment` (distribuição/redistribuição) | Atendente do **novo** RE |

### Idempotência

Cada notificação possui `chave_idempotencia` única (`retorno_agendado:…`, `retorno_lembrete_hoje:…`, `cobranca_atribuida:…`). Reprocessar o mesmo evento **não duplica** alertas.

### Permissões

- Consultar e marcar notificações: `dashboard.ler` (caixa pessoal do usuário logado).
- Receber alertas operacionais: exige `atendimentos.ler`.
- Abrir registro relacionado: validação de escopo de condomínio/carteira em `obterNotificacaoParaAbrir` (403 se fora do alcance).

### Falhas

Erros ao persistir notificação são registrados em `notificacao_falhas` e **não revertem** criação de atendimento nem distribuição.

### Preferências (protótipo)

Por usuário, em memória: lembrete diário de retorno (`lembreteRetornoHoje`, padrão `true`) e `horarioLembrete` (`HH:mm`, padrão `08:00`, fuso `America/Sao_Paulo`).

### Canais externos

`CANAIS_EXTERNOS_HABILITADOS` em `service.ts`: todos `false` até decisão formal.

## Fluxos principais

1. **Agendar retorno (T11):** `criarAtendimento` / `atualizarAtendimento` → `emitirNotificacaoRetornoAgendado`.
2. **Redistribuir (T09):** `distribuirUnidades` → `emitirNotificacaoCobrancaAtribuida` por nova atribuição.
3. **Lembrete:** ao listar/contar notificações, `processarLembretesRetornoHoje` (idempotente por dia).
4. **UI:** clique no sino → abrir registro (`/atendimentos?…`) ou mensagem de erro; marcar como lida atualiza contagem.

## Conexões

- [atendimentos.md](atendimentos.md) — retornos e fila
- [dashboard.md](dashboard.md) — visão de retornos (T18)
- [regra-negocio.md](../regra-negocio.md) — regra transversal T34

## Dados

Tipos em `src/data/catalogo.ts`: `NotificacaoInterna`, `NotificacaoFalha`. Modelo lógico: tabelas `internal_notification` e `notification_failure` em [banco.md](../banco.md).
