# Negociações (propostas, acordos, parcelas e pagamentos — T15 / T16)

## Objetivo

Registrar tratativas de negociação vinculadas à unidade e aos débitos pertinentes, com histórico auditado. **Proposta não equivale a pagamento recebido.** Após acordo confirmado (T15), acompanhar parcelas previstas e pagamentos informados ou confirmados (T16), sem marcar acordo como “quebrado” sem regra oficial.

## Conexões

- **Requisitos:** `TICKETS_CURSOR_DANIEL_JORGE.md` — T15, T16
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md)
- **Módulos relacionados:** [atendimentos](atendimentos.md), [unidades](unidades.md), [debitos](debitos.md), [auditoria](auditoria.md)
- **Dados:** `PropostaNegociacao`, `ParcelaAcordo`, `PagamentoAcordo` em `catalogo.ts`; tabelas em [banco.md](../banco.md)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — § Negociação e pagamentos
- **Decisões pendentes:** [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md)

## Rotas e telas

| Onde | Descrição |
| --- | --- |
| **`/negociacoes`** | Tela exclusiva **sem tabela**: painel `NegociacoesPainel` (carteira em cards + detalhe fixo no desktop), `PropostaNegociacaoCard` — **Advogado:** botão **Assumir juridicamente** quando a negociação exige intervenção (`juridico.editar`); **demais perfis:** link «Encaminhar p/ jurídico» (`juridico.criar`); `PropostaNegociacaoDetalheConteudo`, sheet mobile (`PropostaDetalheSheet`), **Novo** (`NegociacaoNovaPropostaSheet`) |
| Fila de cobranças | Ação **Proposta** por unidade → `PropostaNegociacaoSheet` |
| Histórico da unidade | Botão **Proposta** no sheet de linha do tempo |
| Acordo confirmado | Bloco **Acompanhamento do acordo** no sheet (parcelas + pagamentos) |
| Linha do tempo (T12) | Negociação, pagamentos de acordo, alerta de potencial descumprimento |

Query útil: `?proposta=<uuid>` abre o detalhe; `?novo=1` abre o sheet de nova proposta.

Arquivos: `src/app/negociacoes/page.tsx`, `src/components/negociacoes/proposta-detalhe-sheet.tsx`, `negociacao-nova-proposta-sheet.tsx`, `proposta-negociacao-sheet.tsx`, `acordo-acompanhamento-block.tsx`, `src/lib/negociacoes/*`, `src/lib/acordos/*`.

## Perfis e permissões

Reutiliza o módulo **atendimentos** (palitagem na mesma carteira):

| Ação | Permissão |
| --- | --- |
| Listar propostas / parcelas / pagamentos | `atendimentos.ler` **ou** `negociacoes.ler` |
| Registrar proposta, parcela ou pagamento | `atendimentos.criar` / `negociacoes.criar` |
| Confirmar acordo (`Aceita`) | `negociacoes.confirmar` |
| Recusar proposta (`Recusada`) | `negociacoes.recusar` |
| Cancelar proposta (`Cancelada`) | `negociacoes.cancelar` |
| Corrigir parcela / pagamento | `atendimentos.editar` **ou** `negociacoes.editar` |
| Configurar alçada por advogado | `usuarios.criar` (administradora) — `PATCH /api/negociacoes/regras-advogado` |

## API

### Propostas (T15)

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/propostas` | `atendimentos.ler` | Query: `unidadeId`, `status` |
| POST | `/api/propostas` | `atendimentos.criar` | Nova proposta — status **Em análise** |
| GET | `/api/propostas/[id]` | `atendimentos.ler` | Detalhe |
| PATCH | `/api/propostas/[id]` | Status: `negociacoes.confirmar` / `recusar` / `cancelar` conforme destino. Conteúdo (**Em análise**): `negociacoes.editar` ou `atendimentos.editar` | Status; `termosAprovados` obrigatório se **Aceita**. Ajuste: `valorProposto`, `debitoIds`, `quantidadeParcelas`, `observacoes` |
| POST | `/api/propostas/[id]/assumir-juridicamente` | Perfil **advogado** + `juridico.editar` + `negociacoes.ler` | Registra advogado e data/hora da assunção, cria `legal_case_referral` (**Encaminhado**) e grava vínculo na proposta — **não** altera status do acordo |

### Parcelas e pagamentos (T16)

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/propostas/[id]/parcelas` | `atendimentos.ler` | Proposta **Aceita**: parcelas + `resumo`; caso contrário `200` com `{ parcelas: [], resumo: null }` (sem 409 na leitura) |
| POST | `/api/propostas/[id]/parcelas` | `atendimentos.criar` ou `negociacoes.criar` ou `editar` no módulo equivalente | Body: `{ parcelas: [{ numero, valorPrevisto, vencimentoEm }] }` — só proposta **Aceita** |
| GET | `/api/propostas/[id]/pagamentos` | `atendimentos.ler` | Pagamentos + `resumo` |
| POST | `/api/propostas/[id]/pagamentos` | `atendimentos.criar` | Body: `parcelaId`, `valor`, `dataPagamento`, `referenciaComprovante?`, `confirmacao?` (`Informado` \| `Confirmado`) |
| PATCH | `/api/parcelas-acordo/[id]` | `atendimentos.editar` | Correção auditada: `valorPrevisto`, `vencimentoEm` |
| PATCH | `/api/pagamentos-acordo/[id]` | `atendimentos.editar` | Correção auditada: valor, data, referência, confirmação |

Regras: `src/lib/negociacoes/service.ts`, `src/lib/acordos/service.ts`, cálculos em `src/lib/acordos/resumo.ts`.

## Regras de negócio

### Proposta (T15)

- Vinculada à unidade, autor e débitos da mesma unidade.
- Estados: **Em análise**, **Aceita**, **Recusada**, **Cancelada**.
- **Aceita** grava termos e origem do acordo; não baixa débito nem registra pagamento. Decisões **Em análise** usam flags do cargo em `role.permissao_json`: `negociacoes.confirmar`, `negociacoes.recusar`, `negociacoes.cancelar` (matriz em `/cargos`). Padrão de fábrica: **Administrador** e **Advogado** com as três; atendente sem decisão até a gestão liberar. Consultar e ajustar proposta usam `negociacoes.ler` / `negociacoes.editar` (advogado já tem no seed). Com proposta **Aceita** ou unidade em acordo, o caso **sai** de `/atendimentos`, da agenda de retornos e de **Próximos atendimentos** — acompanhamento só em `/negociacoes` (`unidadeEmNegociacaoOperacional`, `unidade-fila-atendimento.ts`). Ao confirmar o acordo, a `collection_assignment` vigente é encerrada (`encerrar-carteira-vigente.ts`).
- **Alçada do advogado:** ao registrar ou aprovar, o servidor valida desconto máximo (`lawyer_negotiation_rule`, padrão 30%) e quantidade máxima de parcelas (padrão 24) do advogado principal do condomínio. Administradora ignora limites.
- **Responsáveis:** `valores_definidos_por_id` (registro), `valores_aprovados_por_id` (confirmação), `advogado_responsavel_id` (condomínio).
- **Detalhe:** valores original/atualizado da dívida, desconto, quantidade de parcelas, cronograma opcional ao confirmar (`primeiroVencimento` + geração automática).

### Acordo — parcelas e pagamentos (T16)

- Parcelas e pagamentos só para proposta **Aceita**; ligados à proposta e à unidade.
- **Previsto:** valor e vencimento da parcela (`agreement_installment`).
- **Informado / Confirmado:** nível do pagamento registrado (`agreement_payment`). Pagamento **Informado** não quita parcela nem reduz saldo confirmado.
- **Pendente / Paga / Vencida / Cancelada:** status calculado (quitação só com pagamentos **Confirmados** ≥ valor previsto; cancelamento sem pagamento confirmado).
- **Integridade:** soma das parcelas ativas = valor negociado (±1 centavo); pagamento confirmado duplicado na mesma parcela é rejeitado.
- **Potencial descumprimento:** indício quando há parcela **Vencida** sem quitação confirmada — **não** equivale a “acordo quebrado” (regra oficial pendente).
- **Assunção jurídica (advogado):** botão **Assumir juridicamente** só quando `negociacaoExigeIntervencaoAdvogado` — **Em análise**; acordo **Aceita** com parcelas vencidas ou potencial descumprimento. Uma assunção por proposta (`legal_assumption_at`). O histórico da negociação permanece; o acordo **não** é cancelado automaticamente.
- **Saldo restante (T25):** ao confirmar acordo, o sistema grava snapshot financeiro por débito em `negotiation_proposal_debt` (valor original registrado, valor negociado alocado, desconto, pago confirmado e saldo restante) e atualiza o **valor atualizado exibido** no painel `/debitos` sem nova importação. Pagamentos **Confirmados** recalculam o saldo; **Informado** não conta. Importação não sobrescreve `valor_original` nem `valor_atualizado` de débitos em acordo formalizado (`Aceita`). Histórico em `negotiation_proposal_debt_financial_change` e `audit_log` (`debt`).
- Correções administrativas geram `audit_log` com estado anterior (`agreement_installment`, `agreement_payment`).

### Próximo passo após registrar proposta (T26)

- Após `POST /api/propostas`, o atendente confirma o destino em `POST /api/propostas/:id/proximo-passo` (diálogo na fila e em **Nova proposta** em `/negociacoes`).
- **Encaminhar para negociação:** encerra atribuição vigente; proposta com `negotiation_queue_at` visível em `/negociacoes`.
- **Continuar atendimento:** sem alterar `collection_assignment`.
- **Encaminhar para análise:** encerra carteira após confirmação; destino advogado (proposta) ou `legal_case_referral` (exige `juridico.criar`).
- Uma decisão por proposta (`negotiation_next_step_decision`); duplicidade bloqueada por `idempotency_key` e validação no servidor.

## Fluxos

1. Atendente registra proposta → administradora **confirma acordo** com termos textuais.
2. Operador define parcelas (cronograma previsto) no bloco de acompanhamento.
3. Registra pagamentos por parcela, classificando **Informado** ou **Confirmado**.
4. Linha do tempo exibe pagamentos de acordo e alerta de potencial descumprimento quando aplicável.

## Estados de interface

- Resumo: acordado, pago confirmado, pago informado, saldo (confirmado).
- Badges de parcela: Prevista, Vencida, Quitada.
- Aviso **Potencial descumprimento** (não “acordo quebrado”).

## Pendências e decisões

Quebra oficial de acordo, tolerância de atraso, estorno, abatimento, fonte confiável para **Confirmado** e impacto no saldo de débitos — ver [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).
