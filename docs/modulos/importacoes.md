# Importações

## Objetivo

Importar relatórios e dados das administradoras para alimentar débitos e carteira, com validação, prévia e confirmação antes de gravar.

## Conexões

- **Requisitos:** [proposta-oficial.md](../proposta-oficial.md) — Projeto 2 (T13)
- **Mapa:** [mapa-do-projeto.md](../mapa-do-projeto.md) — linha `importacoes`
- **Módulos relacionados:** [integracao-superlogica](integracao-superlogica.md), [debitos](debitos.md), [unidades](unidades.md)
- **Dados:** `import`, `debt` em [banco.md](../banco.md); `Importacao`, `Debito` em `catalogo.ts`

## Rotas e telas

- `/importacoes` — `src/app/importacoes/page.tsx` — histórico e wizard **Importar inadimplência** (arquivo → prévia → resultado)

## Perfis e permissões

| Ação | Permissão |
| --- | --- |
| Listar histórico | `importacoes.ler` |
| Validar / confirmar importação de débitos | `importacoes.criar` |
| Excluir registro de histórico | `importacoes.excluir` |

Quem executa fica registrado em `import.usuario_id` (colaborador logado).

## Dados e persistência

- Tabela `import`: origem, tipo (`debitos`), arquivo, status, quantidades, `observacao_interna` (JSON com hash SHA-256 do arquivo, formato e relatório de erros).
- Tabela `debt`: débitos criados ou atualizados pela importação; **não** remove débitos ausentes do arquivo.
- Estado atual: persistência em memória via `getCadastros` / `set*` (protótipo); contratos de API prontos para PostgreSQL.

## API e contratos

| Método | Path | Permissão | Descrição |
| --- | --- | --- | --- |
| GET | `/api/importacoes` | `importacoes.ler` | Lista histórico `{ importacoes }` |
| POST | `/api/importacoes/debitos/preview` | `importacoes.criar` | Body: `{ origem, arquivo, conteudo }` → `{ preview }` |
| POST | `/api/importacoes/debitos/confirmar` | `importacoes.criar` | Body: `{ origem, arquivo, conteudo, hashArquivo? }` → `{ resultado, debitos }` |

Códigos comuns: `400` (validação), `401`, `403`, `409` (hash não confere com a prévia).

## Fluxos principais

1. Usuário escolhe **origem** (Superlógica, PDF, Outra administradora) e arquivo **CSV (;)** ou **XLS** (XML Spreadsheet, como nas exportações do sistema).
2. **Prévia** classifica cada linha: novo, atualização, duplicado, erro ou manual protegido.
3. **Confirmação** grava débitos válidos, registra `import` e auditoria; reimportação do **mesmo arquivo** (mesmo hash) não duplica débitos.
4. **Resultado** exibe relatório (novos, atualizados, duplicados, erros, manuais protegidos).

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

**Formatos ainda não implementados:** PDF e layouts proprietários de administradoras (ex.: relatório “Inadimplência com composição (detalhado)”) — registrar em [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md).

## Regras de negócio

- Linhas inválidas **não** são gravadas; aparecem na prévia e no relatório.
- Deduplicação: hash do arquivo + `identificador_externo` ou chave natural (unidade + referência + vencimento + valor atualizado).
- Débitos **manuais** (sem identificador externo) **não** são sobrescritos por importação; linha marcada como *manual protegido*.
- Importação **não** altera situação de cobrança da unidade (Sem cobrança → Em cobrança continua pendente de decisão — ver DECISOES_PENDENTES).
- Importação **não** cancela débitos que sumiram do arquivo da administradora.

## Integrações

Superlógica e demais administradoras — leitores adicionais em [integracao-superlogica](integracao-superlogica.md).

## Estados de interface

- Wizard: Arquivo → Prévia → Resultado.
- Histórico: filtros por tipo e situação; métricas de total, concluídas e com erro.

## Pendências e decisões

Ver [DECISOES_PENDENTES.md](../DECISOES_PENDENTES.md): formato oficial por administradora, política de atualização de saldo, débitos ausentes na fonte, entrada automática na fila ao importar.
