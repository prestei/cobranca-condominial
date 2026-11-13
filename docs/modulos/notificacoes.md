# Notificações internas (T34)

## Objetivo

Alertar colaboradores sobre retornos e redistribuição de cobrança **dentro do sistema**, sem depender de consulta manual à fila. Com Firebase configurado, o mesmo evento gera **push web** (navegador) além do sino in-app. WhatsApp, SMS e e-mail permanecem **desativados** até aprovação de provedor.

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
| `GET/PATCH /api/notificacoes/alertas-prazo-inadimplencia` | Antecedências dos alertas de prazo (T03; `usuarios.criar`) |
| `GET /api/notificacoes/push/config` | Config pública Firebase + VAPID (habilita cliente) |
| `POST|DELETE /api/notificacoes/push/registrar` | Vincula ou remove token FCM do usuário logado (`dashboard.ler`) |
| `/firebase-messaging-sw.js` | Service worker FCM (gerado pelo servidor) |

Código: `src/lib/notificacoes/service.ts`, `src/lib/notificacoes/alertas-prazo-inadimplencia-service.ts`, `src/lib/notificacoes/push-dispatch.ts`, `src/hooks/use-notificacoes.ts`, `src/hooks/use-firebase-push.ts` (registro no `WorkspaceShell`, **todos** os perfis com menu autenticado).

## Regras de negócio

### Eventos aprovados (somente in-app)

| Evento | Quando | Destinatário |
| --- | --- | --- |
| `retorno_agendado` | Atendimento criado ou atualizado com `data_proxima_acao` e retorno não concluído | Atendente da **carteira vigente** da unidade; se não houver, autor do atendimento |
| `retorno_lembrete_hoje` | Retorno com data **hoje** (fuso `America/Sao_Paulo`), após horário configurado (padrão 08:00) | Mesma regra do retorno agendado |
| `cobranca_atribuida` | Nova linha em `collection_assignment` (distribuição/redistribuição) | Atendente do **novo** RE |
| `inadimplencia_prazo_antecedencia` | Débito em acompanhamento atinge antecedência configurada (padrão 15/7/3 dias restantes) | Atendente da carteira vigente ou administração |
| `inadimplencia_prazo_atingido` | Dias de atraso = prazo do condomínio | Idem |
| `inadimplencia_prazo_ultrapassado` | Dias de atraso &gt; prazo do condomínio | Idem |

### Idempotência

Cada notificação possui `chave_idempotencia` única (`retorno_agendado:…`, `retorno_lembrete_hoje:…`, `cobranca_atribuida:…`, `inadimplencia_prazo:{debitoId}:{prazoDias}:{marco}`). Reprocessar o mesmo evento **não duplica** alertas.

### Permissões

- Consultar e marcar notificações: `dashboard.ler` (caixa pessoal do usuário logado).
- Receber alertas operacionais (in-app e push): `atendimentos.ler` **ou** `usuarios.criar` (administração quando não há RE).
- Registrar push no navegador: `dashboard.ler` (qualquer perfil do workspace: administrador, atendente, advogado).
- Abrir registro relacionado: validação de escopo de condomínio/carteira em `obterNotificacaoParaAbrir` (403 se fora do alcance).

### Falhas

Erros ao persistir notificação são registrados em `notificacao_falhas` e **não revertem** criação de atendimento nem distribuição.

### Preferências (protótipo)

Por usuário, em memória: lembrete diário de retorno (`lembreteRetornoHoje`, padrão `true`) e `horarioLembrete` (`HH:mm`, padrão `08:00`, fuso `America/Sao_Paulo`).

### Canais externos

`CANAIS_EXTERNOS_HABILITADOS` em `service.ts`: `push` segue variáveis Firebase (ver `docs/stack.md`); WhatsApp, SMS e e-mail permanecem `false`.

### Push Firebase

1. Colaborador autenticado no `WorkspaceShell` solicita permissão do navegador (se ainda `default`), registra o service worker e envia o token FCM para `user_push_token`.
2. Ao persistir `internal_notification` (retorno, carteira, prazo, lembrete), o servidor envia FCM para **todos** os tokens do `destinatario_id` (falha de push não grava `notification_failure` nem bloqueia o fluxo).
3. Clique na notificação do SO abre a URL do registro (mesma regra do deep link in-app) ou `/notificacoes`.
4. Tokens inválidos são removidos automaticamente após erro FCM.

## Fluxos principais

1. **Agendar retorno (T11):** `criarAtendimento` / `atualizarAtendimento` → `emitirNotificacaoRetornoAgendado`.
2. **Redistribuir (T09):** `distribuirUnidades` → `emitirNotificacaoCobrancaAtribuida` por nova atribuição.
3. **Lembrete:** ao listar/contar notificações, `processarLembretesRetornoHoje` (idempotente por dia).
4. **Prazo de inadimplência (T03):** job horário + `processarAlertasPrazoInadimplencia` ao listar/contar; deep link para `/debitos?condominio=…`.
5. **UI:** clique no sino → abrir registro (`/atendimentos?…` ou débitos) ou mensagem de erro; marcar como lida atualiza contagem.

## Conexões

- [atendimentos.md](atendimentos.md) — retornos e fila
- [dashboard.md](dashboard.md) — visão de retornos (T18)
- [regra-negocio.md](../regra-negocio.md) — regra transversal T34

## Dados

Tipos em `src/data/catalogo.ts`: `NotificacaoInterna`, `NotificacaoFalha`. Modelo lógico: tabelas `internal_notification` e `notification_failure` em [banco.md](../banco.md).
