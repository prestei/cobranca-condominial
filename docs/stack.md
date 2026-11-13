# Stack

A aplicação usa Next.js, TypeScript e Tailwind CSS.

| Peça | Versão | Função |
| --- | --- | --- |
| [Next.js](#nextjs) | 16.3.8 | Framework da aplicação |
| [TypeScript](#typescript) | 7.0.2 | Linguagem tipada |
| [Tailwind CSS](#tailwind-css) | 4.3.3 | Estilo |
| React | 19.3.0 | Biblioteca de interface usada pelo Next.js |
| Node.js | 26.10.0 | Ambiente de execução |

Todas estão na última versão estável publicada.

## Next.js

Next.js é o framework. Ele empacota React, o servidor de desenvolvimento, o build de produção e a compilação.

Nesta versão o servidor de desenvolvimento usa Turbopack. A configuração fica em `next.config.ts`, na raiz do projeto. O React que acompanha o framework é o 19.3.0, o mesmo número em `react` e `react-dom`.

## TypeScript

TypeScript acrescenta tipos ao JavaScript. O compilador deste projeto é o TypeScript 7.0.2, a porta nativa estável. Arquivos com JSX usam `.tsx`; os demais, `.ts`.

`tsconfig.json` segue o modelo que o Next.js gera, com `strict` ligado. O código da aplicação fica em `src/` (`src/app`, `src/components`). O alias `@/*` aponta para `src/`.

`any` fica de fora. Valor de formato incerto entra como `unknown` e só é usado depois de estreitar o tipo.

## Tailwind CSS

Tailwind CSS 4.3.3 gera o CSS a partir de classes no código. O tema fica em CSS, com `tailwindcss` e `@tailwindcss/postcss` na mesma versão.

`postcss.config.mjs` na raiz registra o plugin:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

A folha global importa o Tailwind e declara os tokens em `@theme`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #5448c2;
  --font-sans: "Inter", sans-serif;
  --radius-md: 0.5rem;
}
```

`@theme` publica variável CSS e utilitário ao mesmo tempo. `--color-primary` vira `bg-primary`, `text-primary` e `border-primary`. Os valores acima mostram o formato do token; a paleta do produto entra nesse bloco quando existir.

O gerador inclui no CSS só a classe escrita por extenso no fonte. O processamento acontece no build, junto com o Next.js.

## Encaixe

O Next.js compila e entrega a aplicação React. O TypeScript verifica o código nessa compilação. O Tailwind, no mesmo build, transforma as classes em CSS.

## Autenticação e sessão

| Peça | Pacote | Função |
| --- | --- | --- |
| Sessão assinada | `jose` | JWT em cookie HTTP-only `lc_session` |
| Senha | `bcryptjs` | Hash e verificação de senha de colaboradores |

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `AUTH_SECRET` | Produção | Segredo com pelo menos 32 caracteres para assinar a sessão. Em desenvolvimento, há fallback local documentado em `.env.example`. |
| `DATABASE_URL` | Quando usar PostgreSQL | URL `postgresql://…` do banco do projeto. Copie `.env.example` → `.env`. |
| `OPENROUTER_API_KEY` | Assistente de ajuda | Chave OpenRouter no servidor (`POST /api/ajuda/assistente`). Ver [ajuda-assistente](modulos/ajuda-assistente.md). |
| `OPENROUTER_MODEL` | Não | Modelo OpenRouter (padrão `google/gemini-2.5-flash`). |

## Produção (VPS)

Deploy (Node + systemd + Caddy + PostgreSQL, **sem Docker**): ver [`deploy/README.md`](../deploy/README.md).

VPS limpa (só IP + senha SSH): `npm run vps:subir`. Atualizar: `npm run vps:push`. Auto-deploy: GitHub Actions em push `main` (secrets `VPS_*`) e/ou timer `cobranca-auto-deploy` na VPS.

## PostgreSQL (desenvolvimento)

PostgreSQL é **obrigatório** (sem Docker, sem `.data`, sem persistência só em memória).

```bash
cp .env.example .env
# Ajuste DATABASE_URL (Postgres nativo ou managed)
npm run db:migrate          # prisma migrate deploy
# ou, em dev: npm run db:migrate:dev
```

**Fonte da verdade = PostgreSQL via Prisma (tabelas normalizadas):**

- Schema e migrations: `prisma/schema.prisma` + `prisma/migrations/` (`npm run db:migrate`).
- Leitura do catálogo para a UI: rotas `GET /api/catalog` e repositórios Prisma em `src/lib/db/repositories/`.
- Gravação em lote (importação / flush): `saveCatalogBulkToPostgres` em `src/lib/db/repositories/catalog-bulk-persist.ts` (`$transaction` + upsert + remoção de órfãos).
- Catálogo em memória **somente** no pipeline de importação (AsyncLocalStorage / escopo de request); telas e APIs não dependem de módulos `*-pg` nem de `catalogo_snapshot`.
- Identidade: tabelas `role` e `user` (CRUD e login via Prisma).
- Config app: `app_setting` (ex.: `distribuicao_automatica` em `src/lib/distribuicao/service.ts`).
- Não há mais `catalogo_snapshot`, `pool.ts`, `operacional-pg.ts` nem drivers raw `pg` no `src/`.
- Deploy: Node + systemd + Caddy — ver [`deploy/README.md`](../deploy/README.md). Sem Docker.
- Anti-perda: `saveCatalogBulkToPostgres` recusa sobrescrever linhas operacionais existentes por estado operacional vazio; `TimeoutStopSec=30` no systemd para flush no restart.

Rotas: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`. Cadastro de unidades: `GET|POST /api/unidades`, `GET|PATCH|DELETE /api/unidades/[id]`, vínculos em `/api/unidades/[id]/vinculos`. Proteção de rotas em `src/proxy.ts` (convenção Proxy do Next.js 16). Tela de entrada: `/login`.

## Testes automatizados

| Script | Descrição |
| --- | --- |
| `npm test` | Unitários (`node --test` em `src/lib/**/*.test.mjs`) + integração T21 (`tsx` + `src/test/fluxos-permissoes.integracao.test.ts`) |
| `npm run test:unit` | Somente unitários |
| `npm run test:integracao` | Fluxos e permissões (catálogo em memória, sem HTTP) |

Importações (Ticket 03): arquivos temporários em `os.tmpdir()/lc-importacoes/` (não publicados via HTTP; `{uuid}.bin`, permissão `0600`, retenção 1 h com limpeza de órfãos). Nenhuma variável de ambiente extra. PDF de inadimplência: `pdftotext` quando disponível no servidor; senão `pdfjs-dist` (páginas separadas e ordem visual); fallback final FlateDecode. ZIP64 e macros em XLSX são recusados.

Detalhes e roteiro manual: [`README.md`](../README.md) e [`testes/roteiro-qa-t21.md`](testes/roteiro-qa-t21.md).

Credenciais de demonstração usam os e-mails de `catalogo.ts` e a senha inicial documentada no módulo [usuarios](modulos/usuarios.md). Persistência em PostgreSQL para `user` será ligada em tarefa posterior; o login valida o catálogo em memória no servidor.
