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
| Fila de cobranças | Ação **Proposta** por unidade → `PropostaNegociacaoSheet` |
| Histórico da unidade | Botão **Proposta** no sheet de linha do tempo |
| Acordo confirmado | Bloco **Acompanhamento do acordo** no sheet (parcelas + pagamentos) |
| Linha do tempo (T12) | Negociação, pagamentos de acordo, alerta de potencial descumprimento |

Arquivos: `src/components/negociacoes/proposta-negociacao-sheet.tsx`, `acordo-acompanhamento-block.tsx`, `src/lib/negociacoes/*`, `src/lib/acordos/*`.

## Perfis e permissões

Reutiliza o módulo **atendimentos** (palitagem na mesma carteira):

| Ação | Permissão |
| --- | --- |
| Listar propostas / parcelas / pagamentos | `atendimentos.ler` |
| Registrar proposta, parcela ou pagamento | `atendimentos.criar` (unidade na carteira vigente ou visão administradora) |
| Alterar status da proposta; corrigir parcela ou pagamento | `atendimentos.editar` |

## API

### Propostas (T15)

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/propostas` | `atendimentos.ler` | Query: `unidadeId`, `status` |
| POST | `/api/propostas` | `atendimentos.criar` | Nova proposta — status **Em análise** |
| GET | `/api/propostas/[id]` | `atendimentos.ler` | Detalhe |
| PATCH | `/api/propostas/[id]` | `atendimentos.editar` | Status; `termosAprovados` obrigatório se **Aceita** |

### Parcelas e pagamentos (T16)

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/propostas/[id]/parcelas` | `atendimentos.ler` | Parcelas + `resumo` (valores acordado/pago/saldo) |
| POST | `/api/propostas/[id]/parcelas` | `atendimentos.criar` | Body: `{ parcelas: [{ numero, valorPrevisto, vencimentoEm }] }` — só proposta **Aceita** |
| GET | `/api/propostas/[id]/pagamentos` | `atendimentos.ler` | Pagamentos + `resumo` |
| POST | `/api/propostas/[id]/pagamentos` | `atendimentos.criar` | Body: `parcelaId`, `valor`, `dataPagamento`, `referenciaComprovante?`, `confirmacao?` (`Informado` \| `Confirmado`) |
| PATCH | `/api/parcelas-acordo/[id]` | `atendimentos.editar` | Correção auditada: `valorPrevisto`, `vencimentoEm` |
| PATCH | `/api/pagamentos-acordo/[id]` | `atendimentos.editar` | Correção auditada: valor, data, referência, confirmação |

Regras: `src/lib/negociacoes/service.ts`, `src/lib/acordos/service.ts`, cálculos em `src/lib/acordos/resumo.ts`.

## Regras de negócio

### Proposta (T15)

- Vinculada à unidade, autor e débitos da mesma unidade.
- Estados: **Em análise**, **Aceita**, **Recusada**, **Cancelada**.
- **Aceita** grava termos e origem do acordo; não baixa débito nem registra pagamento.

### Acordo — parcelas e pagamentos (T16)

- Parcelas e pagamentos só para proposta **Aceita**; ligados à proposta e à unidade.
- **Previsto:** valor e vencimento da parcela (`agreement_installment`).
- **Informado / Confirmado:** nível do pagamento registrado (`agreement_payment`). Pagamento **Informado** não quita parcela nem reduz saldo confirmado.
- **Quitada / Vencida / Prevista:** status da parcela calculado (quitação só com pagamentos **Confirmados** ≥ valor previsto).
- **Potencial descumprimento:** indício quando há parcela **Vencida** sem quitação confirmada — **não** equivale a “acordo quebrado” (regra oficial pendente).
- **Saldo restante:** valor acordado (soma das parcelas ou, se ausentes, `valorProposto`) menos pagamentos **Confirmados** — regra financeira definitiva pendente; **não** altera saldo de débitos automaticamente.
- Correções administrativas geram `audit_log` com estado anterior (`agreement_installment`, `agreement_payment`).

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
