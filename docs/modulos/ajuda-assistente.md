# Assistente de ajuda (IA)

## Objetivo

Botão fixo no canto inferior esquerdo para o colaborador tirar dúvidas de **uso** do sistema. O modelo (OpenRouter) recebe manual, documentação do módulo da rota atual, matriz de permissões do cargo e um resumo textual do que está visível na tela.

## O que o assistente faz

- Prioriza **regras de negócio por tela** do manual (`/ajuda`), em linguagem simples; complementa com `docs/modulos/` quando necessário.
- Respeita o **perfil operacional** (administradora, atendente, advogado) e as permissões reais do cargo.
- Usa contexto da rota (`pathname`) e captura leve do DOM (títulos, **indicadores/KPIs** com valor e rótulo, filtros preenchidos, paginação da listagem, botões e colunas na área principal).

## O que o assistente não faz

- Não pesquisa na internet nem usa conhecimento fora do manual, da documentação do módulo e da captura da tela (chamada OpenRouter **sem** plugins/tools de web).
- Não revela código, SQL, variáveis de ambiente, deploy ou detalhes de integração interna.
- Não orienta acessar módulos ou ações sem permissão.
- Não substitui o manual estático nem o suporte da administradora.

## Rotas e API

| Recurso | Caminho |
| --- | --- |
| UI (botão + painel) | Global em `Providers` → `AssistenteFlutuante` |
| POST | `/api/ajuda/assistente` |

Corpo: `{ pergunta, pathname, contextoTela?, historico? }`. Resposta: `{ resposta }`. Exige sessão válida.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Para usar IA | Chave da API OpenRouter (somente servidor) |
| `OPENROUTER_MODEL` | Não | Modelo (padrão `google/gemini-2.5-flash`) |
| `OPENROUTER_SITE_URL` | Não | Referer opcional para ranking OpenRouter |
| `OPENROUTER_APP_NAME` | Não | Título da aplicação no OpenRouter |

Sem `OPENROUTER_API_KEY`, o painel responde HTTP 503 e o toast orienta a administradora.

## Conexões

- Manual: `src/lib/ajuda/manual-guias.ts`, páginas `/ajuda`.
- Permissões: `resolverPermissoesUsuario`, `resolverPerfilOperacional`.
- Implementação: `src/lib/ajuda/assistant-*.ts`, `src/lib/openrouter/client.ts`.
