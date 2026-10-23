# Condomínios

## Objetivo

Cadastro e gestão dos condomínios da carteira do escritório, base compartilhada para unidades, débitos e atendimentos.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — cadastro compartilhado (Projeto 1 e 2)
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — “um sistema só”; vínculo com advogado responsável
- **Módulos relacionados:** [unidades](unidades.md), [debitos](debitos.md), [atendimentos](atendimentos.md), [relatorios](relatorios.md)
- **Dados:** tabela `condominium` em [banco.md](../banco.md); tipo `Condominio` em `src/data/catalogo.ts`
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) (linha `condominios`)

## Rotas e telas

- `/condominios` — `src/app/condominios/page.tsx` — listagem, filtros, métricas, criação e edição em `Sheet`.

## Perfis e permissões

Conforme `docs/regra-negocio.md` e `docs/proposta-oficial.md` (Administradora com CRUD completo; demais perfis conforme regras do produto).

## Dados e persistência

Entidade condomínio — ver `docs/banco.md` quando o schema estiver definido.

## API e contratos

A documentar quando o backend substituir dados em `src/data/catalogo.ts`.

## Fluxos principais

Listar → filtrar → novo/editar no sheet → salvar → atualizar listagem.

## Regras de negócio

Vínculo com advogado responsável para relatórios; mesmo cadastro usado por palitagem e inadimplência.

## Integrações

Nenhuma direta neste módulo.

## Estados de interface

Loading, lista vazia (`EmptyState`), paginação (20 itens por página).

## Pendências e decisões

Persistência PostgreSQL e API — ver skill `make-functional`.
