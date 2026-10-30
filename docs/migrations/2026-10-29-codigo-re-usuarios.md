# Migração — código RE dos atendentes (T07)

**Data:** 2026-10-29  
**Escopo:** colaboradores com cargo Atendente em memória (`catalogo.ts` / futuro `user` no PostgreSQL).

## Objetivo

Atribuir códigos no padrão `RE-10000`, `RE-10001`, … aos atendentes existentes, sem duplicatas e sem alterar vínculos com atendimentos ou atribuições de carteira.

## Regras

1. Ordenação por `user.id` ascendente.
2. Primeiro atendente da fila recebe `RE-10000`, o seguinte `RE-10001`, e assim por diante.
3. RE já válido (`RE-` + cinco dígitos ≥ 10000) e único é preservado.
4. Formatos legados (`RE-001`, ausência de RE) são reatribuídos na sequência.
5. Administrador e Advogado **não** recebem `codigo_re`; valor existente é removido do registro lógico.
6. Códigos de inativos **não** são reutilizados.

## Implementação atual

Função `migrarCodigosReUsuarios` em `src/lib/colaboradores/re-sequencia.ts`, aplicada ao montar a lista de usuários (`usuariosComSeed` em `src/data/catalogo.ts`).

Quando o PostgreSQL substituir a memória, reproduzir a mesma lógica em migration SQL versionada (UPDATE ordenado + constraint UNIQUE em `codigo_re`).
