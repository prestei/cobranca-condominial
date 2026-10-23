# Importações

## Objetivo

Importar relatórios e dados das administradoras para alimentar débitos e carteira.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `importacoes`
- **Módulos relacionados:** [integracao-superlogica](integracao-superlogica.md), [debitos](debitos.md), [unidades](unidades.md)
- **Dados:** `import` em [banco.md](../banco.md); `Importacao` em `src/lib/catalog`

## Rotas e telas

- `/importacoes` — `src/app/importacoes/page.tsx`

## Perfis e permissões

A documentar conforme `docs/regra-negocio.md`.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

A documentar.

## Fluxos principais

Upload → validação → processamento → feedback.

## Regras de negócio

A documentar.

## Integrações

Superlógica e demais administradoras — ver `integracao-superlogica.md`.

## Estados de interface

A documentar.

## Pendências e decisões

Esboço inicial — completar na próxima alteração deste módulo.
