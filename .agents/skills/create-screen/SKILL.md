---
name: create-screen
description: Cria telas e páginas a partir do design system e do modelo inicial em HTML, com cores e tamanhos sempre via variáveis CSS, componentes globais reutilizáveis e poucas funções. Use ao criar tela, página, protótipo HTML ou componente de interface.
---

# Criar tela

A tela nova segue o design system e o modelo inicial em HTML do projeto. Não inventar layout, token, componente ou estilo paralelo.

## Antes de escrever

1. Localizar e ler o design system (`design-system.css` ou o arquivo de tokens e componentes globais).
2. Localizar e ler o modelo inicial em HTML: a tela que define o esqueleto (sidebar, barra superior, cabeçalho, área de conteúdo).
3. Listar os componentes globais que a tela vai usar.

Se o design system ou o modelo HTML não estiver no repositório, parar e pedir o caminho. Não prosseguir com um visual próprio.

## Esqueleto

- Copiar a estrutura do modelo HTML: mesmo `app-layout`, sidebar, top bar, page header e área de conteúdo.
- Ligar o mesmo `design-system.css` e as mesmas fontes e ícones do modelo.
- **Sempre** usar variáveis definidas para cor e tamanho (`var(--primary)`, `var(--radius-md)`, `var(--shadow-md)`, etc.). Proibido valor literal de cor (`#5448C2`, `rgb(...)`) ou de espaçamento/raio/tipografia quando existir token equivalente no design system.
- Se faltar token, adicionar no design system (`:root`) e usar `var(--nome)` na tela — não fixar o valor só na página.
- CSS exclusivo da tela fica num `<style>` na própria página, como no modelo. O que se repete entre telas vai para o design system.

## Componentes

Prezar por componentes reutilizáveis e globais.

- Usar o componente que já existe: classe do design system (botão, input, badge, card, modal, toast, tabela, toggle, banner) ou componente compartilhado do projeto.
- Não recriar, não copiar o markup para a página e não fazer variante local de algo que já é global.
- Bloco usado em mais de uma tela vira componente global. Não duplicar entre páginas.
- Uso único permanece na tela. Não criar componente global para um único uso.

## Funções

Padrão: poucas funções, sem muitas funções auxiliares.

- Uma função por ação da tela (renderizar a lista, filtrar, abrir o modal, salvar).
- Formatação, condição e atualização do DOM ficam dentro dessa função.
- Extrair função só quando o mesmo trecho é chamado em mais de um ponto.
- Não criar auxiliar de uma linha, wrapper ou getter usado uma vez só.

## Conferir

- A página usa o esqueleto e os tokens do modelo.
- Cores e tamanhos passam só por variáveis do design system (sem hex/rgb/px soltos onde há token).
- Nenhum componente visual foi recriado fora do design system.
- Não há função auxiliar de uso único.
