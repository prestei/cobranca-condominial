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

`tsconfig.json` segue o modelo que o Next.js gera, com `strict` ligado. O alias `@/*` aponta para a raiz do projeto.

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
