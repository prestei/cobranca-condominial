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

- `/importacoes` — `src/app/importacoes/page.tsx` — histórico e wizard (arquivo → conferência → resultado) para débitos, condomínios, unidades e responsáveis. Item **Importações** no menu lateral (Administradora em Análise; Atendente em Operação). Query `?modulo=debitos&abrir=1` abre o sheet já no módulo de inadimplência.
- Atalhos **Importar** (sem sair da tela) em **Inadimplência**, **Condomínios**, **Unidades** e na fila de **Atendimentos**: abrem `ImportacaoWizardSheet` no módulo correspondente (permissão `importacoes.criar`).

## Perfis e permissões

Mapeamento oficial (Ticket 12) em `src/lib/importacoes/permissoes.ts`. Toda ação é validada **no servidor** (serviços do centro de importação e rotas `/api/importacoes/*`), não apenas na UI. As checagens usam `resolverPermissoesUsuario` (PostgreSQL `role.permissao_json`), o mesmo critério de `requirePermissao` — assim o Atendente com Consultar/Cadastrar/Alterar no cargo consegue importar mesmo após alteração de permissão em outro worker.

| Ação do fluxo | Permissão | Onde |
| --- | --- | --- |
| Consultar histórico / detalhe | `importacoes.ler` | `GET /api/importacoes`, `GET /api/importacoes/:id` |
| Iniciar importação (upload) | `importacoes.criar` | `POST /api/importacoes/arquivo` |
| Visualizar prévia | `importacoes.criar` | `POST /api/importacoes/debitos/preview` |
| Corrigir registros na prévia | `importacoes.editar` | `POST …/preview/corrigir` |
| Aprovar e gravar | `importacoes.editar` | `POST …/debitos/confirmar`, `POST …/processo/:id/aprovacao` |
| Excluir registro de histórico | `importacoes.excluir` | `DELETE /api/importacoes/:id` |

| Perfil (`role.permissao_json` no banco) | `ler` | `criar` | `editar` | `excluir` |
| --- | --- | --- | --- | --- |
| Administradora | Sim | Sim | Sim | Sim |
| Atendente | Sim | Sim | Sim | Não |
| Advogado | Não | Não | Não | Não |

**Escopo de condomínio:** após o provisionamento, o parse/resolução de débitos usa o **catálogo completo** de condomínios e unidades (senão o atendente não enxerga o cadastro auxiliar recém-criado e a linha cai em “Condomínio inválido ou fora do escopo”). Débitos **já existentes** só entram no contexto de atualização se estiverem no escopo operacional (`idsCondominioEscopo`). Na aprovação, gravação é permitida no escopo da carteira **ou** em condomínio provisionado na importação (`IMPORT-…` / observação de criação automática); demais fora do escopo retornam `403`.

Quem executa fica registrado em `import.usuario_id` (colaborador logado).

## Dados e persistência

- Tabela `import`: origem, tipo (`debitos`), arquivo, `processo_id` (UUID do envio), status (ciclo completo — ver Ticket 11), quantidades (processados, importados, atualizados, ignorados, erros), `iniciado_em`, `usuario_id` (quem iniciou), `usuario_aprovacao_id`, `aprovado_em`, `observacao_interna` (JSON: hash, formato, relatório, resumo de inconsistências, resultado financeiro da prévia, trilha de ações).
- Tabela `debt`: débitos criados ou atualizados pela importação; **não** remove débitos ausentes do arquivo.
- **Persistência:** a importação grava no **PostgreSQL** via `salvarCatalogoNoPostgres` na **confirmação**. Na prévia de débitos, o provisionamento cadastral fica só no escopo da requisição (não grava condomínio/unidade no banco). Na confirmação, condomínio, unidade, responsável e débitos persistem juntos. Unidade nova fica em **Sem cobrança** até gravar débitos; então passa a **Em cobrança**. Importação em “Em conferência” não altera cadastros nem carteira. Unidades já em cobrança sem lançamentos na base aparecem como **Aguardando débitos** (não “Em dia”/quitada).

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

## Normalização (pré-validação — Ticket 04)

Antes das regras de negócio, campos extraídos passam por `aplicarNormalizacaoRegistro` / `normalizacao-campos.ts`. Cada campo gera um `ResultadoNormalizacao` em `camposNormalizados` da linha:

- `original` — célula do arquivo, inalterada, para rastreabilidade;
- `normalizado` — valor padronizado ou `null` se vazio ou não interpretável;
- `vazio`, `ambiguo` e `erro` — ausência, interpretação duvidosa ou falha de conversão.

O motor (`inconsistenciasDeNormalizacao`) emite `normalizacao.campo_ambiguo` (atenção) e `normalizacao.interpretacao_rejeitada` **antes** das regras cadastrais/financeiras. Não inventa dado ausente nem substitui classificação desconhecida por valor fictício. Defaults de cadastro (ex.: situação vazia → Ativo/Ativa/Vencido) só ocorrem depois, no adaptador, com o original preservado.

Tipos: data (`AAAA-MM-DD`; `DD/MM/AAAA` com dia e mês ≤ 12 fica **ambíguo**), monetário/decimal (ponto e casas fixas; agrupamento inválido como `1.2.3` é rejeitado; `1.250` fica **ambíguo**), telefone e CPF/CNPJ (dígitos; quantidade inválida de CPF/CNPJ não vira valor normalizado), e-mail (minúsculas), nome e código (espaços colapsados, caixa preservada), categoria/classificação, vazio/`n/a`/`null`. Default de cadastro (ex.: status vazio → Vencido) só entra se o **adaptador** passar `padraoSeVazio`; o normalizador sozinho não inventa.

Exemplos: `19/09/2026` → `2026-09-19`; `R$ 1.250,50` → `1250.50`; `"  JOÃO DA SILVA  "` → `"JOÃO DA SILVA"`. Débitos, condomínios, unidades e responsáveis aplicam o mesmo conjunto. A prévia distingue original e normalizado no detalhe da linha.

## Fluxos principais

1. Usuário escolhe **origem** (Superlógica, PDF, Outra administradora) e envia arquivo **CSV (;)**, **XLSX**, **XLS** (XML Spreadsheet) ou **PDF** via `POST /api/importacoes/arquivo` (validação de extensão, MIME, assinatura, tamanho e limites **antes** da prévia). O módulo de destino vem da abertura do sheet (ex.: **Nova importação**, atalho em Inadimplência ou `?modulo=…&abrir=1`) — não há campo “O que importar” no formulário. Se esse módulo não bater com o conteúdo (ex.: PDF de inadimplência aberto em outro contexto), o recebimento **detecta o destino real** (`detectarModuloImportacaoPorConteudo`), grava o processo no módulo efetivo e a UI ajusta — condomínio, unidade, responsável e débitos seguem cada um para o cadastro certo via provisionamento na inadimplência.
2. **Conferência** (Ticket 07 — `ImportacaoPreVisualizacao` + resumo/`ImportacaoAprovacao` **na mesma etapa** do wizard) no sheet `size="xl"`: etapas **Arquivo → Conferência → Resultado**. A conferência ocorre **dentro da importação** (não há etapa separada de “aprovação”). Tabela com colunas do módulo; na inadimplência, linhas **agrupadas por unidade** e coluna **Unidade** com o código do arquivo (ex.: `MB-0102`, `A-0104`). **Detalhes** abre o Dialog da linha (identificação, duplicidade/conflito, inconsistências, correção). No final da etapa, o resumo e a confirmação explícita permitem **Confirmar e gravar**. Classifica cada linha: novo, atualização, duplicado, **revisão**, erro ou manual protegido; conflitos expõem `conflito.acoesPermitidas` (Ticket 06). Decisões da conferência vão em `decisoesLinha` na gravação.
3. **Confirmar e gravar** revalida no servidor, grava débitos válidos, histórico `import` e auditoria em **transação atômica** (`confirmacao.ts` + `executarTransacaoCatalogo`); **atualizações exigem `decisoesLinha` explícitas**; `linhasIgnoradas` só afeta linhas marcadas. Na inadimplência, reutiliza as linhas conferidas (`processoId`) e o formato PDF do upload; a gravação **mescla** o escopo sem apagar débitos de outros condomínios. Reconfirmação do **mesmo hash** só é idempotente quando a importação anterior gravou ao menos um débito.
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

**PDF (relatório Gestão Condominial / Condomínio21 / export Daniel Jorge Advocacia com o mesmo layout):** formato `relatorio-inadimplencia-gestao-v1` — extração via `pdftotext` (quando disponível no servidor) ou layout por coordenadas (FlateDecode); interpretação em `src/lib/importacoes/inadimplencia/` com colunas Condomínio, Unidade, Responsável, Categoria, Referência, Vencimento, componentes financeiros e Total (Proj. Rec.), página e linha de origem; reconciliação de subtotais por unidade e **TOTAL GERAL ACUMULADO** / total geral do relatório (valores do arquivo, sem recálculo de encargos). Unidades no formato `Unidade: MB-0102 — Nome` ou `Unidade: A-0104 — Nome` também são reconhecidas; nomes compostos (`Beatriz Souza & Fernando Maia`) permanecem como um responsável. Homologação: fixtures `relatorio-inadimplencia-residencial-do-mar.pdf` (8 páginas, marca Gestão Condominial), `relatorio-inadimplencia-solar-das-palmeiras.pdf` (Edifício Solar das Palmeiras) e `relatorio-inadimplencia-daniel-jorge-advocacia.pdf` (amostra 1 página). Demais layouts PDF permanecem pendentes — [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).

## Recebimento de arquivo (Fase 2 — Ticket 03)

Arquivos inválidos são recusados **antes** da validação de registros de negócio. A leitura não grava linhas importadas; a persistência definitiva só ocorre na aprovação (Ticket 09).

| Etapa | Implementação |
| --- | --- |
| Formatos | CSV, XLSX, XLS (XML Spreadsheet). PDF só no módulo débitos. Outros tipos (`.xlsm`, XLS binário/OLE, ZIP que não é OOXML de planilha, executáveis MZ/ELF) são rejeitados |
| Validação | Extensão, MIME declarado, assinatura real (não só a extensão; BOM UTF-8 ignorado), tamanho máx. 15 MiB (`Content-Length` e `File.size` antes de materializar), máx. 50.000 registros (abortando a leitura ao exceder), vazio, corrompido, protegido/criptografado, macros em XLSX |
| Identificador | UUID `processoId` por envio (`armazenamento-temporario.ts`) |
| Armazenamento | Diretório temporário do SO (`os.tmpdir()/lc-importacoes/`), diretório `0700`, arquivo `0600` com nome `{uuid}.bin` — **fora** de `public/` |
| Leitura | Parsers próprios (CSV/XML, ZIP OOXML restrito com limites de descompressão, PDF texto). Não abre o arquivo no Excel/LibreOffice e não executa macros |
| Retenção | 1 hora; limpeza periódica (memória + órfãos em disco), após confirmação e ao excluir o histórico |
| Erros técnicos | `log-tecnico.ts` (JSON no stderr, sem conteúdo do arquivo nem nome original) |
| Falhas na UI | Mensagem retornada em `{ error }` no `POST /api/importacoes/arquivo` e exibida no wizard |

Código: `src/lib/importacoes/receber-arquivo.ts`, `resolver-entrada-importacao.ts`, `src/app/api/importacoes/arquivo/route.ts`, integrado ao `servico-central.ts` antes da validação de registros.

## Regras de negócio

- Linhas inválidas **não** são gravadas; aparecem na prévia e no relatório.
- **Provisionamento cadastral na inadimplência:** se o arquivo referencia condomínio, unidade ou responsável ainda não cadastrados, `provisionarCadastrosImportacaoDebitos` cria o cadastro **antes** do parse dos débitos (`antesDeInterpretar` do adaptador). Idempotente (não altera existentes: não sobrescreve CPF, e-mail, telefone nem vínculos já gravados). Condomínio novo recebe advogado padrão (usuário logado quando for opção válida; senão o primeiro da lista), administradora = origem do arquivo, identificador `IMPORT-…` e observação de criação automática. O parse seguinte usa o catálogo completo (não só a carteira), para o atendente não receber “Condomínio inválido ou fora do escopo” no cadastro que acabou de ser criado. Unidade nova recebe tipo Apartamento, status Ativa e situação **Sem cobrança** na prévia; na **confirmação**, ao gravar débitos, unidade em Sem cobrança passa a **Em cobrança**. Responsável novo (só nome no PDF) recebe documento provisório `IMPORT-…` e vínculo **Proprietario** na unidade (principal apenas se a unidade ainda não tiver principal). A prévia e a confirmação devolvem `condominios`/`unidades`/`responsaveis`/`vinculos` do escopo para sincronizar o cliente (`sincronizarCondominiosDoServidor` / `sincronizarUnidadesDoServidor` mesclam por id e **aceitam cadastros novos** ainda ausentes no catálogo local — sem isso a UI descartava o provisionamento). Módulos dedicados **Condomínios**, **Unidades** e **Responsáveis** no wizard continuam disponíveis para planilhas só de cadastro.
- Deduplicação (Ticket 06): hash do arquivo + regras por entidade — condomínio (ID externo / nome normalizado), unidade (condomínio + bloco + código), responsável (documento / ID origem), débito (`identificador_externo` ou chave natural: condomínio + unidade + categoria + referência + vencimento + **valor principal**; mesma referência com vencimentos distintos **não** é duplicata).
- Débitos **manuais** (sem identificador externo) **não** são sobrescritos por importação; linha marcada como *manual protegido*.
- Na inadimplência, a prévia só provisiona cadastro; unidade em **Sem cobrança** passa a **Em cobrança** na confirmação, junto com a gravação dos débitos. Se a **distribuição automática** estiver ativada, nessa mesma confirmação o sistema atribui RE às unidades do lote ainda sem responsável (regra vigente da distribuição automática já salva).
- Importação **não** cancela débitos que sumiram do arquivo da administradora.

## Arquitetura central (`src/lib/importacao-centro`)

Ticket 02: todas as abas usam a **mesma infraestrutura**. Processamento, validação e gravação são etapas distintas. A leitura do arquivo **não** grava linhas importadas; persistência só ocorre após aprovação, em `persistencia.ts`. Novo módulo = novo adaptador + registro (`registro-adaptadores.ts`), sem alterar o orquestrador. Fachada dos nove serviços: `servicos.ts`. APIs de aba usam `previewImportacaoPorModulo` / `confirmarImportacaoPorModulo` (somente módulos registrados).

| Serviço | Arquivo | Responsabilidade |
| --- | --- | --- |
| Serviço central | `servico-central.ts` | Orquestra prévia e confirmação (`previewImportacaoCentral`, `confirmarImportacaoCentral`, `*PorModulo`) |
| Processamento | `processamento.ts` | Leitura → parse do adaptador → motor de validação → duplicidades → conferência (sem gravar linhas) |
| Leitura de arquivo | `leitura-arquivo.ts`, `planilha/ler-xlsx.ts` | CSV, XLS XML ou XLSX → matriz, sem persistência |
| Recebimento seguro | `importacoes/receber-arquivo.ts` | Validação binária + temp + `processoId` |
| Normalização (Ticket 04) | `normalizacao.ts`, `normalizacao-campos.ts`, `inconsistencias-normalizacao.ts` | Cabeçalhos e campos tipados; original × normalizado; ambíguo/não interpretado |
| Validação de entrada | `validacao.ts` | Origem e conteúdo obrigatório |
| **Motor central de validação** | `motor-validacao/` | Regras estruturais, cadastrais, relacionais, financeiras e de negócio por módulo (Ticket 05); **não grava** no banco |
| Duplicidades no arquivo | `duplicidades.ts` | Linhas repetidas no mesmo envio |
| **Detecção de duplicidades (Ticket 06)** | `detecao-duplicidades/` | Regras por entidade; correspondência exata vs possível; ações e decisões |
| Conferência / prévia | `conferencia.ts`, `pre-visualizacao.ts` | Classificação contra a base via adaptador |
| Conferência / gravação | `aprovacao.ts`, `resumo-aprovacao.ts` (Ticket 09) | Hash SHA-256, confirmação explícita na mesma etapa da conferência (`confirmacaoExplicita`), resumo, bloqueio por erros impeditivos, ciência de importação parcial, auditoria de quem confirmou |
| Persistência transacional | `confirmacao.ts`, `persistencia.ts`, `transacao-confirmacao.ts` | Revalidação na confirmação, bloqueio por hash, `executarTransacaoCatalogo` (espelho de `prisma.$transaction`) |
| Histórico e auditoria (Ticket 11) | `historico-auditoria.ts`, `historico-service.ts`, `situacao-importacao.ts` | Rascunho no recebimento → prévia → aprovação → conclusão; `audit_log` nas confirmações; consulta com sanitização de metadados sensíveis |
| Registro de adaptadores | `registro-adaptadores.ts` | `registrarAdaptadorImportacao` / `obterAdaptadorImportacao`; `MODULOS_IMPORTACAO_CENTRAL` |

Cada módulo expõe um **adaptador** em `adaptadores/` com regras próprias (`politicaAprovacao`, parse, conferência, persistência). Ganchos opcionais (`antesDeInterpretar`, `aplicarMetadadosLeitura`, `aposConferencia`, `assertAntesDePersistir`, etc.) ficam no adaptador — o serviço central **não** ramifica por `modulo === "…"`. Fachadas de API: `criarServicoImportacaoModulo("<modulo>")` em `preview-importacao-modulo.ts`.

| Módulo | Adaptador | Situação |
| --- | --- | --- |
| Débitos / inadimplência | `adaptadores/debitos.ts` | Em produção (`debitos-service.ts` delega ao centro) |
| Condomínios | `adaptadores/condominios.ts` | Central (wizard + APIs `condominios/preview` e `confirmar`) |
| Unidades | `adaptadores/unidades.ts` | Central (wizard + APIs `unidades/preview` e `confirmar`) |
| Responsáveis | `adaptadores/responsaveis.ts` | Central (wizard + APIs `responsaveis/preview` e `confirmar`; vínculo com unidade existente) |

**Regras obrigatórias:** não persistir linhas importadas na leitura; não implementar importação paralela fora do centro; incluir novo módulo = novo adaptador + `registrarAdaptadorImportacao`, sem reconstruir o pipeline.

Testes da arquitetura: `src/lib/importacao-centro/arquitetura.test.ts`, `importacao-centro.test.ts`, `adaptadores-modulos.test.ts`.

### Correção na pré-visualização (Ticket 08)

- Sessão em memória (`correcao-previa/sessao.ts`), vinculada ao `processoId` do upload, retém linhas parseadas e conferidas até confirmação ou expiração (mesma retenção do arquivo temporário).
- Campos editáveis em débitos: `valorOriginal`, `multa`, `juros`, `correcao`, `valorAtualizado` (demais campos do módulo permanecem bloqueados).
- Cada correção passa por normalização monetária, **revalidação** no motor (`revalidar-linha.ts`), nova detecção de duplicidade no arquivo e nova classificação na base; `dadosOriginais` da planilha não são alterados.
- Histórico: `RegistroHistoricoCorrecaoPrevia` (original, corrigido, usuário, data, resultado da revalidação); na confirmação, entradas são serializadas em `observacaoInterna.relatorio.correcoesPrevia` do registro `import`.
- UI: o botão **Detalhes** abre a caixa de conferência; **Aplicar correções na prévia** chama `POST …/preview/corrigir` e atualiza contadores/resumo da prévia.

Testes: `src/lib/importacao-centro/correcao-previa/correcao-previa.test.ts`.

### Motor central de validação (Ticket 05)

Após o parse da planilha e **antes** da conferência com a base, `aplicarMotorValidacaoImportacao` avalia **todo** registro. Sem validador específico, aplica-se um validador genérico — nenhum registro segue sem `validacao`. O motor **não grava** em tabelas de negócio.

| Classificação | Significado |
| --- | --- |
| `valido` | Pode seguir para conferência e aprovação |
| `atencao` | Exige conferência; **não** bloqueia sozinho (payload permanece) |
| `erro` | Impede importação até correção (payload retirado da linha) |

Cada inconsistência tem categoria, severidade (`erro` \| `atencao`), código estável e mensagem — erros e avisos não se misturam na classificação agregada (`classificarResultadoValidacao`: qualquer `erro` vence).

| Categoria | Exemplos de códigos |
| --- | --- |
| Estrutural | `estrutural.campo_obrigatorio_ausente`, `coluna_desconhecida` (atenção), `coluna_duplicada`, `formato_incompativel`, `tipo_dado_incorreto` |
| Cadastral | `cadastral.nome_ausente`, `codigo_invalido`, `email_invalido`, `documento_invalido` (quando informado), `registro_existente` (atenção) |
| Relacional | `relacional.condominio_inexistente` (unidade sem condomínio), `unidade_inexistente` (débito sem unidade), `registro_inexistente` (responsável sem cadastro), `vinculo_incompativel` |
| Financeira | `financeira.valor_invalido`, `valor_negativo`, `soma_divergente` (atenção), `vencimento_invalido`, `referencia_inconsistente` (atenção: pagamento sem valor ou data inválida; competência MM/AAAA **não** precisa coincidir com o vencimento em inadimplência), `registro_duplicado` (atenção) |
| Negócio | `negocio.regra_modulo`, `permissao`, `restricao_existente`, `estado_incompativel` (ex.: unidade inativa) |

Permissões de importação continuam no servidor (`permissoes.ts`); o motor trata o contexto já recortado por escopo e estados/restrições do cadastro. Formato/tipo incompatível na normalização (Ticket 04) entram como `normalizacao.interpretacao_rejeitada` / `campo_ambiguo` **antes** das regras de módulo. Datas em `DD/MM/AAAA` (barra) não geram `campo_ambiguo`; ambiguidade dia/mês só em separador `-`.

Cada registro validado expõe: `identificador`, `linha` (e `pagina` quando houver), `dadosOriginais`, `dadosNormalizados`, `resultado`, lista de `inconsistencias` e `regrasAplicadas`. Novos módulos registram um validador em `motor-validacao/modulos/` e `registrarValidadorModuloImportacao`.

Testes: `src/lib/importacao-centro/motor-validacao/motor-validacao.test.ts`, `normalizacao-campos.test.ts` e `importacao-centro.test.ts`.

## Integrações

Superlógica e demais administradoras — leitores adicionais em [integracao-superlogica](integracao-superlogica.md).

## Estados de interface

- Wizard: Arquivo (`SheetContent` padrão) → Conferência (`size="xl"`, tabela + confirmação na mesma etapa) → Resultado.
- Histórico: filtros por tipo e situação (todas do Ticket 11); métricas de total, concluídas e com falha; tabela com Data, Arquivo, **Usuário** (primeiro nome de quem iniciou), Tipo, Situação e Erros; sheet **Ver detalhes** com identificador, usuários, datas, contadores, inconsistências, resultado financeiro (débitos) e trilha de ações.

## Pendências e decisões

Ver [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md): formato oficial por administradora, política de atualização de saldo, débitos ausentes na fonte, entrada automática na fila ao importar.
