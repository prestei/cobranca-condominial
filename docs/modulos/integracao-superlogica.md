# Integração Superlógica / administradoras

## Objetivo

Sincronizar débitos e dados de condomínios a partir da Superlógica e outras administradoras.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `integracao-superlogica` e fluxo de dados
- **Módulos relacionados:** [importacoes](importacoes.md), [debitos](debitos.md)
- **Dados:** `debt`, `import` em [banco.md](../banco.md)
- **Stack:** credenciais em [stack.md](../stack.md) (quando definidas)

## Rotas e telas

Sem tela dedicada — consumido por `importacoes` e `debitos`. Serviços em `src/lib/` ou backend a documentar.

## Perfis e permissões

A documentar.

## Dados e persistência

Ver `docs/banco.md`.

## API e contratos

Endpoints externos, autenticação, limites e mapeamento de campos — a documentar na implementação.

## Fluxos principais

A documentar.

## Regras de negócio

Ver `docs/proposta-oficial.md` Projeto 2.

## Integrações

Superlógica API; arquivos PDF/CSV quando aplicável.

## Estados de interface

Erros de integração expostos em importações.

## Pendências e decisões

Esboço inicial — completar na skill `create-integration` / `make-functional`.
