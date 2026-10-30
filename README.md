# Cobrança condominial

Sistema de cobrança condominial (Next.js 16, TypeScript, Tailwind). Documentação funcional em [`docs/README.md`](docs/README.md).

## Desenvolvimento

```bash
npm install
cp .env.example .env   # se ainda não existir
npm run dev
```

Banco PostgreSQL opcional em desenvolvimento: `npm run db:up` (ver [`docs/stack.md`](docs/stack.md)). Cadastros operacionais usam o catálogo em memória no servidor até a persistência completa em PostgreSQL.

## Testes

Os testes **não** dependem de credenciais reais nem de serviços externos. Usam o seed fictício de `src/data/catalogo.ts` e a senha de demonstração `12345` (hash bcrypt no seed).

| Comando | Escopo |
| --- | --- |
| `npm test` | Unitários (`.test.mjs`) + integração T21 (serviços) |
| `npm run test:unit` | Apenas regras puras (indicadores, RE, auditoria) |
| `npm run test:integracao` | Fluxos e permissões — `src/test/fluxos-permissoes.integracao.test.ts` |

Variáveis usadas nos testes de integração (defaults embutidos se ausentes):

- `NODE_ENV=test`
- `AUTH_SECRET` com pelo menos 32 caracteres

Roteiro manual complementar (login pela UI, navegação): [`docs/testes/roteiro-qa-t21.md`](docs/testes/roteiro-qa-t21.md).
