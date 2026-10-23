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

## PostgreSQL

| Peça | Pacote | Função |
| --- | --- | --- |
| Driver | `pg` | Tabelas `role` e `user` (cargos, colaboradores, login) |

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim (cargos e rotas autenticadas) | URL de conexão PostgreSQL. Ver `.env.example`. |

| Comando | Função |
| --- | --- |
| `npm run db:up` | Sobe PostgreSQL no Docker (porta **5433**; exige Docker Desktop em execução) |
| `npm run db:migrate` | Aplica SQL em `db/migrations/` (schema) |
| `npm run db:seed` | Dados iniciais: 3 cargos + colaborador Prestei (código/senha `1234`) — ver `scripts/seed.ts` |

**Windows com PostgreSQL instalado (ex.: porta 5432):** use no `.env` a senha do usuário `postgres` (não confundir com o login do sistema `1234` após o seed). Prefira host **`127.0.0.1`** em vez de `localhost` — no Windows o Node costuma falhar com `28P01` em `localhost` por IPv6/`pg_hba`, mesmo com senha certa no DBeaver. Opcional: PowerShell **como Administrador** `npm run db:windows-bootstrap` (senha `postgres` + banco `cobranca_condominial`). Docker (opcional): `npm run db:up` e porta **5433**.

Módulos que já usam o banco: **cargos** (`/api/roles`, permissões em `proxy`/`requirePermission`) e **usuários/colaboradores** (`/api/users`, `/api/auth/login`). Demais entidades seguem em `src/lib/catalog` até migração própria.

## Autenticação e sessão

| Peça | Pacote | Função |
| --- | --- | --- |
| Sessão assinada | `jose` | JWT em cookie HTTP-only `lc_session` |
| Senha | `bcryptjs` | Hash e verificação de senha de colaboradores |

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `AUTH_SECRET` | Produção | Segredo com pelo menos 32 caracteres para assinar a sessão. Em desenvolvimento, há fallback local documentado em `.env.example`. |
| `DATABASE_URL` | Quando usar PostgreSQL | URL `postgresql://…` do banco do projeto. Copie `.env.example` → `.env`. |

## PostgreSQL (desenvolvimento)

Banco dedicado via Docker na porta **5433** (não usa a instância do sistema na 5432):

```bash
cp .env.example .env   # se ainda não existir
npm run db:up
npm run db:logs        # opcional
npm run db:down        # parar container
```

Credenciais padrão do compose: usuário `cobranca`, senha `cobranca_dev`, banco `cobranca_condominial`. A aplicação ainda persiste cadastros em memória (`catalogo.ts`) até a entrega da T02 (migrations + repositórios); a URL já fica pronta no `.env`.

Rotas: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`. Cadastro de unidades: `GET|POST /api/unidades`, `GET|PATCH|DELETE /api/unidades/[id]`, vínculos em `/api/unidades/[id]/vinculos`. Proteção de rotas em `src/proxy.ts` (convenção Proxy do Next.js 16). Tela de entrada: `/login`.

Credenciais iniciais vêm do `db:seed` (tabela `user`): código `1234`, senha `1234` — ver [usuarios](modulos/usuarios.md). Cargos e permissões de rota/API leem `role` no PostgreSQL.
