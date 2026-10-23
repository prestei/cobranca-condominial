# Auditoria

## Objetivo

Histórico de alterações e trilha de auditoria para ações sensíveis.

## Conexões

- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `auditoria`
- **Módulos relacionados:** todos os módulos com mutação de dados; [usuarios](usuarios.md)
- **Dados:** `audit_log` em [banco.md](../banco.md); `Auditoria` em `catalogo.ts`
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — correções com histórico

## Rotas e telas

- `/auditoria` — `src/app/auditoria/page.tsx`

## Perfis e permissões

A documentar conforme `docs/regra-negocio.md`.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

A documentar.

## Fluxos principais

Consulta filtrada de eventos de auditoria.

## Regras de negócio

Registro de correções pela administradora com histórico.

## Integrações

Nenhuma.

## Estados de interface

A documentar.

## Pendências e decisões

Esboço inicial — completar na próxima alteração deste módulo.
