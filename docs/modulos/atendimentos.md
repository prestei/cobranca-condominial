# Atendimentos (palitagem)

## Objetivo

Registro de tentativas de cobrança, retornos agendados e produtividade da equipe.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — §2 Palitagem
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `atendimentos`
- **Módulos relacionados:** [condominios](condominios.md), [unidades](unidades.md), [debitos](debitos.md), [usuarios](usuarios.md), [relatorios](relatorios.md)
- **Dados:** `service_ticket` em [banco.md](../banco.md); `Atendimento` em `src/lib/catalog`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — autoria pelo login

## Rotas e telas

- `/atendimentos` — `src/app/atendimentos/page.tsx`

## Perfis e permissões

Ver `docs/proposta-oficial.md` §2.2 e `docs/regra-negocio.md`.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

A documentar.

## Fluxos principais

Registrar atendimento → agendar retorno → alertas de retorno.

## Regras de negócio

Atendente automático pelo login; campos por botões/listas conforme proposta.

## Integrações

Nenhuma direta.

## Estados de interface

A documentar.

## Pendências e decisões

Esboço inicial — completar na próxima alteração deste módulo.
