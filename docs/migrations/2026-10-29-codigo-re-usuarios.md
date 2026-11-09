# Migração — código RE dos colaboradores (T07)

**Data:** 2026-10-29 (atualizado: RE para todos os cargos)  
**Escopo:** todos os colaboradores em memória (`catalogo.ts` / futuro `user` no PostgreSQL).

## Objetivo

Atribuir códigos no padrão `RE-10000`, `RE-10001`, … a **todos** os colaboradores existentes, sem duplicatas e sem alterar vínculos com atendimentos ou atribuições de carteira.

## Regras

1. Ordenação por `user.id` ascendente.
2. Primeiro colaborador sem RE válido recebe o próximo livre a partir de `RE-10000`.
3. RE já válido (`RE-` + cinco dígitos ≥ 10000) e único é preservado.
4. Formatos legados (`RE-001`, ausência de RE) ou duplicados são reatribuídos na sequência.
5. Administrador, Advogado e demais cargos **também** recebem `codigo_re`.
6. Códigos de inativos **não** são reutilizados.

## Implementação atual

Função `migrarCodigosReUsuarios` em `src/lib/colaboradores/re-sequencia.ts`, aplicada ao montar a lista de usuários (`usuariosComSeed` em `src/data/catalogo.ts`).

Quando o PostgreSQL substituir a memória, reproduzir a mesma lógica em migration SQL versionada (UPDATE ordenado + constraint UNIQUE em `codigo_re`).
