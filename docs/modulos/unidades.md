# Unidades

## Objetivo

Cadastro e consulta de unidades por condomínio.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `unidades`
- **Módulos relacionados:** [condominios](condominios.md), [debitos](debitos.md), [atendimentos](atendimentos.md)
- **Dados:** `unit`, `responsible_party`, `unit_responsible_party` em [banco.md](../banco.md); `Unidade`, `Responsavel`, `Vinculo` em `src/lib/catalog`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md)

## Rotas e telas

- `/unidades` — `src/app/unidades/page.tsx`

## Perfis e permissões

A documentar conforme `docs/regra-negocio.md`.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

A documentar.

## Fluxos principais

A documentar.

## Regras de negócio

Unidade vinculada ao condomínio; compartilhada com débitos e atendimentos.

## Integrações

Nenhuma.

## Estados de interface

A documentar.

## Pendências e decisões

Esboço inicial — completar na próxima alteração deste módulo.
