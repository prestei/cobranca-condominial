# Importações

## Objetivo

Importar relatórios e dados das administradoras para alimentar débitos e carteira, com validação, prévia e confirmação antes de gravar.

## Auditoria (Épico — Fase 1)

Matriz completa de abas, entidades, formatos, permissões e lacunas: [MATRIZ_AUDITORIA_IMPORTACAO_FASE1_T01.md](../MATRIZ_AUDITORIA_IMPORTACAO_FASE1_T01.md).

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (T13)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `importacoes`
- **Módulos relacionados:** [integracao-superlogica](integracao-superlogica.md), [debitos](debitos.md), [unidades](unidades.md)
- **Dados:** `import`, `debt` em [banco.md](../banco.md); `Importacao`, `Debito` em `catalogo.ts`

## Rotas e telas

- **Tela removida.** A rota `/importacoes` e os componentes de UI do wizard/histórico não estão mais no produto. O backend (`/api/importacoes/*`, `src/lib/importacoes/*`, `src/lib/importacao-centro/*`) permanece disponível para uso programático ou futura reintrodução da interface.

## Perfis e permissões

Mapeamento oficial (Ticket 12) em `src/lib/importacoes/permissoes.ts`. Toda ação é validada **no servidor** (serviços do centro de importação e rotas `/api/importacoes/*`), não apenas na UI.

| Ação do fluxo | Permissão | Onde |
| --- | --- | --- |
| Consultar histórico / detalhe | `importacoes.ler` | `GET /api/importacoes`, `GET /api/importacoes/:id` |
| Iniciar importação (upload) | `importacoes.criar` | `POST /api/importacoes/arquivo` |
| Visualizar prévia | `importacoes.criar` | `POST /api/importacoes/debitos/preview` |
| Corrigir registros na prévia | `importacoes.editar` | `POST …/preview/corrigir` |
| Aprovar e gravar | `importacoes.editar` | `POST …/debitos/confirmar`, `POST …/processo/:id/aprovacao` |
| Excluir registro de histórico | `importacoes.excluir` | `DELETE /api/importacoes/:id` |

**Escopo de condomínio:** conferência e parse usam `escopoCondominios` / `escopoUnidades`; na aprovação, linhas que seriam gravadas fora do escopo retornam `403`. Débitos existentes fora do escopo não entram no contexto de atualização (`adaptadores/debitos.ts`).

Quem executa fica registrado em `import.usuario_id` (colaborador logado).

## Dados e persistência

- Tabela `import`: origem, tipo (`debitos`), arquivo, `processo_id` (UUID do envio), status (ciclo completo — ver Ticket 11), quantidades (processados, importados, atualizados, ignorados, erros), `iniciado_em`, `usuario_id` (quem iniciou), `usuario_aprovacao_id`, `aprovado_em`, `observacao_interna` (JSON: hash, formato, relatório, resumo de inconsistências, resultado financeiro da prévia, trilha de ações).
- Tabela `debt`: débitos criados ou atualizados pela importação; **não** remove débitos ausentes do arquivo.
- Estado atual: persistência em memória via `getCadastros` / `set*` (protótipo); contratos de API prontos para PostgreSQL.

## API e contratos

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/importacoes` | `importacoes.ler` | Lista histórico `{ importacoes }` (campos sanitizados conforme perfil) |
| GET | `/api/importacoes/[id]` | `importacoes.ler` | Detalhe de uma importação (contadores, inconsistências, ações, aprovação) |
| POST | `/api/importacoes/processo/[processoId]/aprovacao` | `importacoes.editar` | Marca situação **Aguardando aprovação** ao entrar na etapa de aprovação |
| POST | `/api/importacoes/arquivo` | `importacoes.criar` | `multipart/form-data`: `modulo`, `arquivo` → `{ recebimento }` com `processoId` (UUID) |
| POST | `/api/importacoes/debitos/preview` | `importacoes.criar` | Body: `{ origem, processoId, hashArquivo? }` ou legado `{ origem, arquivo, conteudo }` → `{ preview }` (inclui `sessaoPreviaId` = `processoId`) |
| POST | `/api/importacoes/debitos/preview/corrigir` | `importacoes.editar` | Body: `{ sessaoPreviaId, hashArquivo, linha, campos }` → `{ preview, linha, historicoCorrecoes, correcaoAceita }` (Ticket 08) |
| POST | `/api/importacoes/debitos/confirmar` | `importacoes.editar` | Mesmo contrato da prévia + `hashArquivo` → `{ resultado, debitos }` |

Códigos comuns: `400` (validação), `401`, `403`, `409` (hash não confere com a prévia).

## Normalização (pré-validação)

Antes das regras de negócio, campos extraídos da planilha passam por `src/lib/importacao-centro/normalizacao-campos.ts`. Cada função devolve um `ResultadoNormalizacao` com:

- `original` — valor da célula, para rastreabilidade;
- `normalizado` — valor padronizado (`AAAA-MM-DD`, decimal com ponto, dígitos de CPF/CNPJ, etc.) ou `null` se vazio/não interpretável;
- `vazio`, `ambiguo` e `erro` — sinalizam linha sem conteúdo, interpretação duvidosa ou falha de conversão **sem inventar dados**.

Exemplos: `19/09/2026` → `2026-09-19`; `R$ 1.250,50` → `1250.50`; nomes com espaços extras colapsados preservando a caixa. Tipos auxiliares em `normalizacao-resultado.ts` e cabeçalhos em `normalizacao.ts`. A importação de débitos (`importar-debitos-planilha.ts`) aplica datas, moeda, status, identificadores e nomes antes das validações de negócio.

## Fluxos principais

1. Usuário escolhe **origem** (Superlógica, PDF, Outra administradora) e envia arquivo **CSV (;)**, **XLSX**, **XLS** (XML Spreadsheet) ou **PDF** via `POST /api/importacoes/arquivo` (validação de extensão, MIME, assinatura, tamanho e limites **antes** da prévia).
2. **Prévia** (Ticket 07 — tela padronizada `ImportacaoPreVisualizacao`) exibe cabeçalho com arquivo, módulo, usuário, data/hora e contadores (válidos, atenção, erros, duplicidades), tabela de conferência com colunas do módulo, busca, filtros por situação e tipo de inconsistência, detalhes com dados originais/normalizados, correção de campos editáveis na conferência e ações voltar/cancelar. Classifica cada linha: novo, atualização, duplicado, **revisão**, erro ou manual protegido; conflitos expõem `conflito.acoesPermitidas` (Ticket 06).
3. **Confirmação** revalida o arquivo no servidor, grava débitos válidos, histórico `import` e auditoria em **transação atômica** (`confirmacao.ts` + `executarTransacaoCatalogo`, contrato alinhado a `prisma.$transaction`); **atualizações exigem `decisoesLinha` explícitas**; `linhasIgnoradas` só afeta linhas marcadas na confirmação. Reconfirmação do **mesmo hash** é idempotente.
4. **Resultado** exibe relatório (novos, atualizados, duplicados, erros, manuais protegidos, revisões).

## Formato de planilha (v1)

Identificador interno: `planilha-inadimplencia-v1` (`FORMATO_IMPORTACAO_DEBITOS_V1`).

Colunas mínimas (cabeçalho flexível, acentos ignorados):

| Coluna | Obrigatória | Uso |
| --- | --- | --- |
| Unidade | sim | Identificação da unidade no condomínio |
| Condomínio / Condomínio ID / Identificador condomínio | sim | Mapeamento ao cadastro |
| Referência | sim | Ex.: `09/2026` |
| Vencimento | sim | `AAAA-MM-DD` ou `DD/MM/AAAA` |
| Valor atualizado ou Valor | sim | Monetário pt-BR |
| Bloco | condicional | Quando há unidades homônimas |
| Descrição, Valor original, Multa, Juros, Correção, Status, Identificador externo, Data pagamento, Valor pago | não | Enriquecimento e deduplicação |

**PDF (relatório Gestão Condominial / Condomínio21):** formato `relatorio-inadimplencia-gestao-v1` — extração via `pdftotext` (quando disponível no servidor) ou layout por coordenadas (FlateDecode); interpretação em `src/lib/importacoes/inadimplencia/` com colunas Condomínio, Unidade, Responsável, Categoria, Referência, Vencimento, componentes financeiros e Total (Proj. Rec.), página e linha de origem; reconciliação de subtotais por unidade e total geral do relatório (valores do arquivo, sem recálculo de encargos). Homologação: fixture `src/test/fixtures/relatorio-inadimplencia-residencial-do-mar.pdf` (8 páginas). Demais layouts PDF permanecem pendentes — [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).

## Recebimento de arquivo (Fase 2 — Ticket 03)

| Etapa | Implementação |
| --- | --- |
| Formatos | CSV, XLSX, XLS (XML), PDF (módulo débitos) |
| Validação | Extensão, MIME declarado, assinatura binária, tamanho máx. 15 MiB, máx. 50.000 registros, vazio/corrompido/protegido |
| Identificador | UUID `processoId` por envio (`armazenamento-temporario.ts`) |
| Armazenamento | Diretório temporário do SO (`lc-importacoes/`), permissão `0600`, sem exposição HTTP |
| Retenção | 1 hora; limpeza periódica e após confirmação |
| Erros técnicos | `log-tecnico.ts` (JSON no stderr, sem conteúdo do arquivo) |

Código: `src/lib/importacoes/receber-arquivo.ts`, `resolver-entrada-importacao.ts`, integrado ao `servico-central.ts` antes da validação de registros.

## Regras de negócio

- Linhas inválidas **não** são gravadas; aparecem na prévia e no relatório.
- Deduplicação (Ticket 06): hash do arquivo + regras por entidade — condomínio (ID externo / nome normalizado), unidade (condomínio + bloco + código), responsável (documento / ID origem), débito (`identificador_externo` ou chave natural: condomínio + unidade + categoria + referência + vencimento + **valor principal**; mesma referência com vencimentos distintos **não** é duplicata).
- Débitos **manuais** (sem identificador externo) **não** são sobrescritos por importação; linha marcada como *manual protegido*.
- Importação **não** altera situação de cobrança da unidade (Sem cobrança → Em cobrança continua pendente de decisão — ver DECISOES_PENDENTES).
- Importação **não** cancela débitos que sumiram do arquivo da administradora.

## Arquitetura central (`src/lib/importacao-centro`)

Todas as importações por planilha devem usar o **mesmo pipeline**, separando leitura, validação, conferência e gravação:

| Serviço | Arquivo | Responsabilidade |
| --- | --- | --- |
| Recebimento seguro | `importacoes/receber-arquivo.ts` | Validação binária + temp + `processoId` |
| Leitura de arquivo | `leitura-arquivo.ts`, `planilha/ler-xlsx.ts` | CSV, XLS XML ou XLSX → matriz, sem persistência |
| Normalização | `normalizacao.ts`, `normalizacao-campos.ts` | Cabeçalhos, datas, moeda, documentos (reutilizável pelos módulos) |
| Validação de entrada | `validacao.ts` | Origem e conteúdo obrigatório |
| **Motor central de validação** | `motor-validacao/` | Regras estruturais, cadastrais, relacionais, financeiras e de negócio por módulo (Ticket 05); **não grava** no banco |
| Duplicidades no arquivo | `duplicidades.ts` | Linhas repetidas no mesmo envio |
| **Detecção de duplicidades (Ticket 06)** | `detecao-duplicidades/` | Regras por entidade; correspondência exata vs possível; ações e decisões |
| Conferência / prévia | `conferencia.ts` | Classificação contra a base via adaptador |
| Aprovação | `aprovacao.ts`, `resumo-aprovacao.ts` (Ticket 09) | Hash SHA-256 da prévia, confirmação explícita (`confirmacaoExplicita`), resumo final, bloqueio por erros impeditivos, ciência de importação parcial, auditoria de quem aprovou e quando |
| Persistência transacional | `confirmacao.ts`, `persistencia.ts`, `transacao-confirmacao.ts` | Revalidação na confirmação, bloqueio por hash, `executarTransacaoCatalogo` (espelho de `prisma.$transaction`) |
| Histórico e auditoria (Ticket 11) | `historico-auditoria.ts`, `historico-service.ts`, `situacao-importacao.ts` | Rascunho no recebimento → prévia → aprovação → conclusão; `audit_log` nas confirmações; consulta com sanitização de metadados sensíveis |
| Orquestração | `servico-central.ts` | `previewImportacaoCentral` e `confirmarImportacaoCentral` |

Cada módulo expõe um **adaptador** em `adaptadores/` com regras próprias:

| Módulo | Adaptador | Situação |
| --- | --- | --- |
| Débitos / inadimplência | `adaptadores/debitos.ts` | Em produção (`debitos-service.ts` delega ao centro) |
| Condomínios | `adaptadores/condominios.ts` | Central (wizard + APIs `condominios/preview` e `confirmar`) |
| Unidades | `adaptadores/unidades.ts` | Central (wizard + APIs `unidades/preview` e `confirmar`) |
| Responsáveis | `adaptadores/responsaveis.ts` | Central (wizard + APIs `responsaveis/preview` e `confirmar`; vínculo com unidade existente) |

**Regras obrigatórias:** não persistir na leitura; não implementar importação paralela fora do centro; incluir novo módulo = novo adaptador, sem alterar o orquestrador.

### Correção na pré-visualização (Ticket 08)

- Sessão em memória (`correcao-previa/sessao.ts`), vinculada ao `processoId` do upload, retém linhas parseadas e conferidas até confirmação ou expiração (mesma retenção do arquivo temporário).
- Campos editáveis em débitos: `valorOriginal`, `multa`, `juros`, `correcao`, `valorAtualizado` (demais campos do módulo permanecem bloqueados).
- Cada correção passa por normalização monetária, **revalidação** no motor (`revalidar-linha.ts`), nova detecção de duplicidade no arquivo e nova classificação na base; `dadosOriginais` da planilha não são alterados.
- Histórico: `RegistroHistoricoCorrecaoPrevia` (original, corrigido, usuário, data, resultado da revalidação); na confirmação, entradas são serializadas em `observacaoInterna.relatorio.correcoesPrevia` do registro `import`.
- UI: detalhe da linha chama `POST …/preview/corrigir` e atualiza contadores/resumo da prévia.

Testes: `src/lib/importacao-centro/correcao-previa/correcao-previa.test.ts`.

### Motor central de validação (Ticket 05)

Após o parse da planilha e **antes** da conferência com a base, `aplicarMotorValidacaoImportacao` avalia cada registro:

| Classificação | Significado |
| --- | --- |
| `valido` | Pode seguir para conferência e aprovação |
| `atencao` | Exige conferência; **não** bloqueia sozinho |
| `erro` | Impede importação até correção |

Cada registro validado expõe: `identificador`, linha de origem, `dadosOriginais`, `dadosNormalizados`, `resultado`, lista de `inconsistencias` (com categoria e severidade) e `regrasAplicadas`. Novos módulos registram um validador em `motor-validacao/modulos/` e `registrarValidadorModuloImportacao`.

Testes: `src/lib/importacao-centro/importacao-centro.test.ts` (pipeline com adaptador mock) e `normalizacao-campos.test.ts`.

## Integrações

Superlógica e demais administradoras — leitores adicionais em [integracao-superlogica](integracao-superlogica.md).

## Estados de interface

- Wizard: Arquivo → Prévia → Aprovação (resumo + checkboxes) → Resultado.
- Histórico: filtros por tipo e situação (todas do Ticket 11); métricas de total, concluídas e com falha; sheet **Ver detalhes** com identificador, usuários, datas, contadores, inconsistências, resultado financeiro (débitos) e trilha de ações.

## Pendências e decisões

Ver [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md): formato oficial por administradora, política de atualização de saldo, débitos ausentes na fonte, entrada automática na fila ao importar.
