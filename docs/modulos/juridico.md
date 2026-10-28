# Jurídico — encaminhamento e acompanhamento (T17)

## Objetivo

Registrar encaminhamentos de cobrança para análise jurídica, associar advogado responsável conforme o condomínio e acompanhar status, observações e metadados de documentos. **Não ajuíza ações nem envia documentos a tribunais automaticamente.**

## Conexões

- **Requisitos:** `TICKETS_CURSOR_DANIEL_JORGE.md` — T17
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md)
- **Módulos relacionados:** [condominios](condominios.md), [unidades](unidades.md), [debitos](debitos.md), [atendimentos](atendimentos.md), [auditoria](auditoria.md)
- **Dados:** `EncaminhamentoJuridico`, `DocumentoJuridico` em `catalogo.ts`; tabelas em [banco.md](../banco.md)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — § Jurídico e gestão
- **Decisões pendentes:** [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md) — estados oficiais, checklist documental, campos processuais

## Rotas e telas

| Onde | Descrição |
| --- | --- |
| `/juridico` | Listagem de encaminhamentos no escopo do perfil |
| Fila de cobranças | Ação **Jurídico** por unidade |
| Histórico da unidade (T12) | Botão **Jurídico** e eventos na linha do tempo |

Arquivos: `src/app/juridico/page.tsx`, `src/components/juridico/encaminhamento-juridico-sheet.tsx`, `src/lib/juridico/service.ts`.

## Perfis e permissões

Módulo **`juridico`** (`src/lib/permissions/modulos.ts`):

| Ação | Administradora | Advogado | Atendente |
| --- | --- | --- | --- |
| Ver listagem / detalhe / documentos | Sim | Sim (condomínios vinculados) | Não |
| Encaminhar caso | Sim | Não | Não |
| Atualizar status, observações, documentos | Sim | Sim (escopo) | Não |

Escopo de condomínio: `escopoCondominios` — advogado vê apenas condomínios em que consta em `advogados`.

## API

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/juridico/encaminhamentos` | `juridico.ler` | Query: `unidadeId`, `condominioId`, `status`, `advogado` |
| POST | `/api/juridico/encaminhamentos` | `juridico.criar` | Novo encaminhamento — status **Encaminhado** |
| GET | `/api/juridico/encaminhamentos/[id]` | `juridico.ler` | Detalhe (+ documentos se `ler`) |
| PATCH | `/api/juridico/encaminhamentos/[id]` | `juridico.editar` | `status`, `advogadoResponsavel`, `observacoes` |
| GET | `/api/juridico/encaminhamentos/[id]/documentos` | `juridico.ler` | Lista de metadados |
| POST | `/api/juridico/encaminhamentos/[id]/documentos` | `juridico.editar` | Registra título, descrição e referência interna |

Regras: `src/lib/juridico/service.ts`. Histórico da unidade: `src/lib/historico-unidade/service.ts` (tipo `encaminhamento_juridico`).

## Regras de negócio

- Advogado responsável deve constar no vínculo do condomínio (`advogados`).
- Débitos opcionais no encaminhamento; snapshot em `debitoIds` e `resumoContexto`.
- Transições de status controladas no servidor (estados provisórios em `statusEncaminhamentoJuridico`).
- Documentos: metadados apenas; acesso via API exige `juridico.ler`.
- Alterações auditadas em `audit_log` (`legal_case_referral`, `legal_document`).
- Histórico extrajudicial (palitagem, propostas, etc.) permanece intacto.

## Fluxos

1. **Encaminhar** — administradora na fila ou histórico → sheet → POST encaminhamento.
2. **Acompanhar** — advogado em `/juridico` ou sheet → PATCH status/observações; POST documentos.
3. **Consultar histórico** — linha do tempo da unidade inclui encaminhamento e alterações auditadas.
