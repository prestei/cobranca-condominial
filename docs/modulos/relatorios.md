# Relatórios

## Objetivo

Relatórios de produtividade, retornos, efetividade e carteira/inadimplência, com filtros alinhados ao escopo do usuário e exportação CSV/XLS/PDF.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — relatórios e gráficos
- **Regras globais:** [regra-negocio.md](../regra-negocio.md) — perfis, RE, escopo por advogado
- **Módulos relacionados:** [atendimentos](atendimentos.md), [debitos](debitos.md), [condominios](condominios.md), [dashboard](dashboard.md)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `relatorios`

## Rotas e telas

- `/relatorios` — hub e relatórios gerais (`?relatorio=produtividade|retornos|efetividade|carteira`) — `src/app/relatorios/page.tsx`
- `/relatorios/produtividade` — redireciona para `/relatorios?relatorio=produtividade` (URL legada); o relatório completo de produtividade por colaborador fica no hub
- URLs legadas `?relatorio=equipe` e `?aba=cobranca` redirecionam para `?relatorio=produtividade`
- `/indicadores` — painel operacional (KPIs, gráficos, ranking por condomínio) — ver [indicadores.md](indicadores.md)

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Ver hub e relatórios | `relatorios.ler` |
| Exportar | `relatorios.exportar` |
| Filtrar por colaborador (toda a equipe) | tipicamente administradora (`usuarios.criar`) |

Advogados veem apenas condomínios vinculados (`escopoCondominios`). Atendentes veem a própria operação conforme escopo de atendimentos/débitos.

## Dados e persistência

Agregações sobre cadastros persistidos (atendimentos, débitos, unidades, condomínios) via serviços:

- `listarAtendimentos`, `listarDebitos`, `listarRetornosAgenda`
- Escopo: `escopoCondominios` / `escopoUnidades`

Na interface, atendentes aparecem pelo **nome do colaborador**. O filtro e a API continuam usando o código RE interno (`usuario.codigo_re`).

## API e contratos

### `GET /api/relatorios/opcoes`

- **Auth:** sessão + `relatorios.ler`
- **Resposta:** `{ opcoes: { condominios, advogados, atendentesRe, podeFiltrarPorRe } }`

### `GET /api/indicadores/conferencia`

- **Auth:** sessão + `relatorios.ler`; consulta detalhada por indicador exige administradora (`usuarios.criar`)
- **Query:** `indicador`, filtros iguais à produtividade (`de`, `ate`, `condominio`, `advogado`, `codigoRe`) ou catálogo sem indicador
- Ver [conferencia-indicadores.md](conferencia-indicadores.md)

### `GET /api/relatorios/produtividade`

- **Auth:** sessão + `relatorios.ler` + administradora (`usuarios.criar`)
- **Query:** filtros de período (`de`, `ate` obrigatórios), `condominio`, `advogado`, `codigoRe`
- **Resposta:** `{ painel: { periodo, definicoes, meta, linhas, totais } }`

### `GET /api/relatorios/export`

- **Auth:** sessão + `relatorios.exportar`
- **Query:** `tipo` (`produtividade`|`equipe`|`retornos`|`efetividade`|`carteira`), filtros (`de`, `ate`, `dataBase`, `condominio`, `advogado`, `codigoRe`, `respondeu`, `motivo`, `canal`, `busca`), `formato` (`csv`|`xls`|`json`)
- **Resposta:** arquivo CSV/XLS (UTF-8 com BOM no CSV) ou JSON `{ payload }` para PDF no cliente
- **Metadados:** data/hora de geração (pt-BR) e filtros aplicados no início do arquivo
- **Erros:** mensagens genéricas (403 fora de escopo, sem stack trace)

## Fluxos principais

1. Usuário abre relatório no hub e aplica filtros (período ou data-base na carteira).
2. A tela calcula indicadores somente sobre dados no escopo do usuário (sem números ilustrativos).
3. No cabeçalho do relatório aberto: **Voltar** (hub) e **Exportar** (`TableExport`, se `relatorios.exportar`) — CSV/XLS/PDF via `GET /api/relatorios/export` com os filtros aplicados.
4. Exportação chama a API; o servidor reaplica os mesmos filtros e permissões antes de gerar o arquivo.

## Regras de negócio

- Filtros exibidos = parâmetros usados na exportação.
- Exportação não inclui condomínios fora do vínculo do advogado.
- Administradora pode segmentar por RE.
- **Produtividade por colaborador:** relatório completo em `/relatorios?relatorio=produtividade` — métricas de volume/resposta, mapa de horários, comparativos, resumo por condomínio e lista detalhada. Colunas e filtros de pessoa usam o **nome do colaborador** (código RE só internamente). Exportação `tipo=equipe` ou `tipo=produtividade` na API.
- CSV usa `;` e BOM `\uFEFF` para acentuação em Excel pt-BR.

## Integrações

Nenhuma direta.

## Estados de interface

Carregamento implícito via cadastros sincronizados; exportação com toast de sucesso/erro.

## Pendências e decisões

- PDF via HTML/impressão no navegador (padrão do projeto); sem biblioteca PDF server-side.
