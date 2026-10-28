# Relatórios

## Objetivo

Relatórios de produtividade, retornos, efetividade e carteira/inadimplência, com filtros alinhados ao escopo do usuário e exportação CSV/XLS/PDF.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — relatórios e gráficos
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — perfis, RE, escopo por advogado
- **Módulos relacionados:** [atendimentos](atendimentos.md), [debitos](debitos.md), [condominios](condominios.md), [dashboard](dashboard.md)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `relatorios`

## Rotas e telas

- `/relatorios` — hub e relatórios (`?relatorio=equipe|retornos|efetividade|carteira`) — `src/app/relatorios/page.tsx`

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Ver hub e relatórios | `relatorios.ler` |
| Exportar | `relatorios.exportar` |
| Filtrar por RE (toda a equipe) | tipicamente administradora (`usuarios.criar`) |

Advogados veem apenas condomínios vinculados (`escopoCondominios`). Atendentes veem a própria operação conforme escopo de atendimentos/débitos.

## Dados e persistência

Agregações sobre cadastros persistidos (atendimentos, débitos, unidades, condomínios) via serviços:

- `listarAtendimentos`, `listarDebitos`, `listarRetornosAgenda`
- Escopo: `escopoCondominios` / `escopoUnidades`

Atendentes são identificados por **RE** (`usuario.codigo_re`) em filtros e exportações.

## API e contratos

### `GET /api/relatorios/opcoes`

- **Auth:** sessão + `relatorios.ler`
- **Resposta:** `{ opcoes: { condominios, advogados, atendentesRe, podeFiltrarPorRe } }`

### `GET /api/relatorios/export`

- **Auth:** sessão + `relatorios.exportar`
- **Query:** `tipo` (`equipe`|`retornos`|`efetividade`|`carteira`), filtros (`de`, `ate`, `dataBase`, `condominio`, `advogado`, `codigoRe`, `respondeu`, `motivo`, `canal`, `busca`), `formato` (`csv`|`xls`|`json`)
- **Resposta:** arquivo CSV/XLS (UTF-8 com BOM no CSV) ou JSON `{ payload }` para PDF no cliente
- **Metadados:** data/hora de geração (pt-BR) e filtros aplicados no início do arquivo
- **Erros:** mensagens genéricas (403 fora de escopo, sem stack trace)

## Fluxos principais

1. Usuário abre relatório no hub e aplica filtros (período ou data-base na carteira).
2. A tela calcula indicadores somente sobre dados no escopo do usuário (sem números ilustrativos).
3. Exportação chama a API; o servidor reaplica os mesmos filtros e permissões antes de gerar o arquivo.

## Regras de negócio

- Filtros exibidos = parâmetros usados na exportação.
- Exportação não inclui condomínios fora do vínculo do advogado.
- Administradora pode segmentar por RE.
- CSV usa `;` e BOM `\uFEFF` para acentuação em Excel pt-BR.

## Integrações

Nenhuma direta.

## Estados de interface

Carregamento implícito via cadastros sincronizados; exportação com toast de sucesso/erro.

## Pendências e decisões

- PDF via HTML/impressão no navegador (padrão do projeto); sem biblioteca PDF server-side.
