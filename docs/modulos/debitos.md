# Débitos

## Objetivo

Visualização e gestão dos débitos das unidades (inadimplência).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (inadimplência)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `debitos`
- **Módulos relacionados:** [unidades](unidades.md), [importacoes](importacoes.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md), [integracao-superlogica](integracao-superlogica.md)
- **Dados:** `debt` em [banco.md](../banco.md); `Debito` em `src/lib/catalog`

## Rotas e telas

- `/debts` — `src/app/debts/page.tsx`. Legado: `/debitos` → redirect.

## Perfis e permissões

A documentar conforme `docs/regra-negocio.md`.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

A documentar.

## Fluxos principais

A documentar.

## Regras de negócio

Débito da unidade como origem do atendimento de cobrança.

## Integrações

Importação via administradoras — ver `integracao-superlogica.md`.

## Estados de interface

A documentar.

## Pendências e decisões

Esboço inicial — completar na próxima alteração deste módulo.
