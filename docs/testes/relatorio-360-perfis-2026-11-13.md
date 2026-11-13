# Relatório 360° — perfis, permissões e demonstração

**Data:** 2026-11-13  
**Ambiente:** `npm run dev` em `localhost:3000`, PostgreSQL com `DATABASE_URL`  
**Classificação:** **APROVADO COM RESSALVAS**

## Resumo executivo

Foi feita varredura por **Administrador**, **Atendente** e **Advogado** (browser + API), com correções de permissões no banco, seeds, login de demo e documentação da matriz por cargo.

A causa mais comum de “início parece tudo CRUD/admin” era o **login em localhost** pré-preencher o código `12345`, que apontava para um **administrador de teste** — não para um atendente.

## Evidências — browser

| Perfil | Login | Menu lateral | Início (`/`) |
| --- | --- | --- | --- |
| Atendente | RAQUEL / 12345 | Rotina + Cobrança (sem Colaboradores/Cargos) | Saudação atendente, KPIs do dia, ações rápidas |
| Advogado | ADRYELLE / 12345 | Jurídico, Negociações, Carteira, Relatórios | Saudação advogada; 2 condomínios no escopo após migration |
| Administrador | MILENA / 12345 | Menu completo (Operação com Colaboradores/Cargos) | Painel administrativo (validado via API) |

## Evidências — API (`POST /api/auth/login`, `password` no body)

| Código | `GET /api/dashboard` → `perfil` | `usuarios` | `cargos` | `juridico` |
| --- | --- | --- | --- | --- |
| MILENA | administradora | 200 | 200 | 200 |
| RAQUEL | atendente | 403 | 403 | 403 |
| ADRYELLE | advogado | 403 | 403 | 200 |

ADRYELLE: `condominios.total = 2` após vínculo `Dra. Adryelle` em `condominium.advogados_json`.

## Correções aplicadas

1. **Login:** removido autofill administrador; hint com códigos demo em localhost.
2. **Usuário confuso:** código `12345` renomeado para `USUARIOTST` (senha demo continua `12345`).
3. **Seeds:** condomínios de teste incluem `Dra. Adryelle` em `advogados`.
4. **PostgreSQL:** migration `docs/migrations/2026-11-13-permissoes-negociacoes-demo-advogado.sql` (negociações nos cargos + vínculo advogada + rename usuário).
5. **Dump:** `docs/migrations/dump-role-user.sql` alinhado a `seeds.ts` (módulo `negociacoes`).
6. **Testes:** `catalogo-store` / `request-catalog-state` sem bloqueio `server-only` em Node; `test:integracao` com `env -u DATABASE_URL`.
7. **Documentação:** [matriz-permissoes-por-cargo.md](../modulos/matriz-permissoes-por-cargo.md).

## Ressalvas

- **Testes de integração** (`fluxos-permissoes.integracao.test.ts`): várias falhas no catálogo em memória (pré-existentes / desalinhamento com serviços atuais); execução com `DATABASE_URL` definido quebra testes por Prisma.
- **360 completo** (todos os fluxos de salvar, jurídico ponta a ponta, importação, distribuição) não automatizado nesta sessão — roteiro manual em [roteiro-qa-t21.md](roteiro-qa-t21.md).

## Próximos passos sugeridos

1. Reexecutar roteiro T21 perfil a perfil após deploy da migration em staging.
2. Revisar falhas do `fluxos-permissoes.integracao.test.ts` com `env -u DATABASE_URL`.
3. Novo login após alterar cargo do próprio usuário (JWT de permissões).
