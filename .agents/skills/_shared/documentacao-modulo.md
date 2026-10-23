# Documentação por módulo (obrigatório em implementações)

Toda entrega de implementação **deve** incluir documentação atualizada **e** manter o **mapa de conexões** do projeto. Código sem doc correspondente ou sem vínculos atualizados está **incompleto**.

## Mapa central

**[`docs/mapa-do-projeto.md`](../../../docs/mapa-do-projeto.md)** — hub que conecta:

- Requisitos ([`docs/proposta-oficial.md`](../../../docs/proposta-oficial.md))
- Regras globais ([`docs/regra-negocio.md`](../../../docs/regra-negocio.md))
- Módulos ([`docs/modulos/`](../../../docs/modulos/README.md))
- Banco ([`docs/banco.md`](../../../docs/banco.md))
- Telas (`src/app/...`) e dados (`src/data/catalogo.ts` ou API)
- Integrações externas

Ao implementar: atualizar o módulo **e**, se mudou rota, dependência, tabela, endpoint ou fluxo entre áreas, a **tabela e diagramas** em `mapa-do-projeto.md`.

## Onde documentar

| Tipo de mudança | Arquivo |
| --- | --- |
| Conexões entre módulos, telas, dados e requisitos | `docs/mapa-do-projeto.md` |
| Módulo funcional (tela, fluxo, CRUD, API do domínio) | `docs/modulos/<slug>.md` |
| Índice e lista de módulos | `docs/modulos/README.md` |
| Regras transversais, perfis, permissões, validações de negócio | `docs/regra-negocio.md` |
| Tabelas, colunas, FKs, índices, migrations | `docs/banco.md` |
| Tokens, componentes globais, padrões de UI | `docs/design-system.md` |
| Stack, variáveis de ambiente, comandos | `docs/stack.md` |
| Escopo comercial / requisitos de produto (só se o escopo mudou) | `docs/proposta-oficial.md` |

**Cada módulo do produto tem um arquivo em `docs/modulos/`.** Se o módulo ainda não existir no índice, criar o arquivo e registrar em `docs/modulos/README.md` na mesma entrega.

### Slugs oficiais (usar estes nomes de arquivo)

| Módulo | Slug | Rota principal (referência) |
| --- | --- | --- |
| Dashboard | `dashboard` | `/` |
| Condomínios | `condominios` | `/condominios` |
| Unidades | `unidades` | `/unidades` |
| Débitos | `debitos` | `/debitos` |
| Atendimentos (palitagem) | `atendimentos` | `/atendimentos` |
| Importações | `importacoes` | `/importacoes` |
| Relatórios | `relatorios` | `/relatorios` |
| Usuários | `usuarios` | `/usuarios` |
| Cargos / perfis | `cargos` | `/cargos` |
| Auditoria | `auditoria` | `/auditoria` |
| Integração Superlógica / administradoras | `integracao-superlogica` | (serviços, jobs, webhooks) |

Integrações externas adicionais: `docs/modulos/integracao-<nome>.md` (ex.: `integracao-superlogica.md`).

## Modelo de `docs/modulos/<slug>.md`

Copiar ao criar um módulo novo e manter atualizado:

```markdown
# <Nome do módulo>

## Objetivo
Uma ou duas frases sobre o que o módulo resolve no produto.

## Conexões
- **Requisitos:** link para seção em `docs/proposta-oficial.md`
- **Regras globais:** link para seções em `docs/regra-negocio.md`
- **Módulos relacionados:** slugs e natureza do vínculo (ex.: lê débitos de `debitos`)
- **Dados:** tabelas em `docs/banco.md` e tipos/API usados
- **Mapa:** confirmar linha em `docs/mapa-do-projeto.md`

## Rotas e telas
- `/rota` — `src/app/.../page.tsx` — breve descrição

## Perfis e permissões
Quem acessa, o que pode ver, criar, editar, excluir e exportar.

## Dados e persistência
Entidades/tabelas usadas; campos principais; relacionamentos. Link para seção em `docs/banco.md` quando existir.

## API e contratos
Método, path, query/body, respostas e códigos de erro relevantes. Omitir se ainda for só mock/local.

## Fluxos principais
Passo a passo dos fluxos críticos (criar, editar, filtrar, importar, etc.).

## Regras de negócio
Regras específicas deste módulo (detalhe fino). Regras globais ficam em `docs/regra-negocio.md` — atualizar os dois quando mudar comportamento.

## Integrações
Serviços externos, arquivos, webhooks, filas — ou "Nenhuma".

## Estados de interface
Loading, vazio, erro, sucesso; mensagens importantes.

## Pendências e decisões
O que falta implementar ou o que foi decidido temporariamente.
```

## Quando atualizar (checklist)

Na **mesma entrega** do código:

1. **Criar ou atualizar** `docs/modulos/<slug>.md` (incluir **Conexões** com links reais).
2. **Atualizar** `docs/mapa-do-projeto.md` se mudou qualquer aresta do grafo (dependência entre módulos, rota, tabela, arquivo de código, rastreio requisito).
3. **Atualizar** `docs/modulos/README.md` se for módulo novo ou renomeação.
4. **Sincronizar** `docs/regra-negocio.md` se alterou regra, perfil, permissão ou validação transversal.
5. **Sincronizar** `docs/banco.md` se alterou schema, migration ou modelo de dados.
6. **Sincronizar** `docs/design-system.md` (+ `/design-system` se novo componente) só quando a entrega alterar UI global.
7. **Não** duplicar texto longo: regra global em `regra-negocio.md`; no módulo, resumo + link; visão integrada no mapa.

Correção de bug que **não** altera comportamento documentado: ajustar doc só se estava errada; revisar mapa se a doc descrevia conexão incorreta.

## Validação da documentação

Antes de encerrar a tarefa:

- O slug do módulo existe em `docs/modulos/` e está listado no README.
- A seção **Conexões** do módulo lista módulos, tabelas e requisitos corretos.
- A linha correspondente em **`docs/mapa-do-projeto.md`** bate com o código.
- Rotas e arquivos citados existem no repositório.
- Permissões e regras descritas refletem o código (ou o contrato API) entregue.
- `docs/banco.md`, `docs/regra-negocio.md` e o mapa não contradizem o módulo.
