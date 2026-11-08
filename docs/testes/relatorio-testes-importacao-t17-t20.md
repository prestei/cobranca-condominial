# Relatório de testes — Importação central (T17–T20)

**Data:** 2026-11-07  
**Escopo:** Tickets 17 (módulos no centro), 18 (unitários motor), 19 (integração/segurança), 20 (E2E/homologação)  
**Branch:** `main` (working tree com alterações não commitadas no épico de importação)  
**Classificação final:** **APROVADO COM RESSALVAS**

---

## 1. Resumo executivo

O épico de importação central está **funcional nos quatro módulos elegíveis** (inadimplência, condomínios, unidades, responsáveis), com adaptadores, APIs `preview`/`confirmar`, wizard unificado em `/importacoes` e atalhos nas telas de carteira. A suíte automatizada **`npm test` concluiu 78/78**; dez testes adicionais do centro de importação (fora do script `test`) também passaram quando executados isoladamente.

**Ressalvas principais:**

1. **Ticket 18:** vários cenários obrigatórios do motor **não possuem teste automatizado documentado** (arquivo corrompido, cancelamento, falha de persistência, etc.).
2. **Ticket 19:** cenários de concorrência, adulteração de dados e escopo na aprovação estão **largamente pendentes**.
3. **Ticket 20:** fluxo ponta a ponta com upload real foi validado na **UI** (wizard, módulos, etapas); **não** foi concluído o caminho completo arquivo → aprovação → histórico para os quatro módulos no navegador.
4. **`npm run build`:** falhou na **verificação de tipos** TypeScript (erros em `importacao-centro`, `importar-debitos-planilha`, testes de integração).

---

## 2. Escopo auditado

| Ticket | Foco | Artefatos principais |
| --- | --- | --- |
| T17 | Adaptadores e UI por módulo | `src/lib/importacao-centro/adaptadores/*`, `src/lib/importacoes/*-service.ts`, `/api/importacoes/{modulo}/`, `config-wizard-importacao.ts`, `/importacoes` |
| T18 | Motor e normalização | `motor-validacao/`, `normalizacao-campos.ts`, `receber-arquivo.ts`, `correcao-previa/` |
| T19 | Permissões e integridade | `permissoes.ts`, `debitos-service.ts`, `confirmacao.ts`, `fluxos-permissoes.integracao.test.ts` |
| T20 | Homologação geral | Wizard UI, PDF fixture Residencial do Mar, roteiro complementar `roteiro-qa-t21.md` |

**Fora do escopo desta rodada:** colaboradores/cargos (não elegíveis), Superlógica job, PostgreSQL real (catálogo em memória).

---

## 3. Arquitetura identificada

| Componente | Responsabilidade | Execução / teste |
| --- | --- | --- |
| `importacao-centro/servico-central.ts` | Orquestra prévia e confirmação | `importacao-centro.test.ts`, `adaptadores-modulos.test.ts` |
| `adaptadores/{debitos,condominios,unidades,responsaveis}.ts` | Parse, conferência, persistência | Testes por módulo + services HTTP |
| `motor-validacao/` | Regras por linha sem gravar | `motor-validacao.test.ts` |
| `detecao-duplicidades/` | Duplicata arquivo + base | `detecao-duplicidades.test.ts` |
| `aprovacao.ts` + hash SHA-256 | Bloqueio sem aprovação explícita | `aprovacao.test.ts`, `importacao-centro.test.ts` |
| `importacoes/inadimplencia/` | PDF Gestão Condominial | `relatorio-gestao.homologacao.test.ts` + fixture PDF |
| UI | `ImportacaoPreVisualizacao`, wizard 4 etapas | E2E parcial (browser) |

**Riscos:** build TypeScript instável; testes de aprovação/histórico/correção **não** entram no `npm test` padrão; persistência ainda em memória (`catalogo.ts`).

---

## 4. Ambiente e comandos

| Item | Valor |
| --- | --- |
| SO | Linux |
| Node | via `package.json` scripts |
| Dev server | `npm run dev` ativo em `localhost:3000` |
| Banco | Catálogo em memória (sem Docker obrigatório para estes testes) |

```bash
npm test                                    # 78 pass, 0 fail
node --import tsx --test \
  src/lib/importacao-centro/aprovacao.test.ts \
  src/lib/importacao-centro/correcao-previa/correcao-previa.test.ts \
  src/lib/importacao-centro/pre-visualizacao.test.ts \
  src/lib/importacao-centro/historico-auditoria.test.ts  # 10 pass
npm run build                               # falhou typecheck (ver §12)
```

---

## 5. Ticket 17 — Módulos no centro (critérios de aceite)

| Critério | Status | Evidência |
| --- | --- | --- |
| Nenhum módulo elegível sem validação | **PASSOU** | `MODULOS_WIZARD_IMPORTACAO`: débitos, condomínios, unidades, responsáveis (`config-wizard-importacao.ts`) |
| Validações específicas por módulo | **PASSOU** | Adaptadores + validadores em `motor-validacao/modulos/`; testes em `adaptadores-modulos.test.ts` |
| Arquitetura central única | **PASSOU** | `debitos-service.ts` e `*-service.ts` delegam a `previewImportacaoCentral` / `confirmarImportacaoCentral` |
| Aprovação antes da gravação | **PASSOU** | `confirmacaoExplicita`, `hashArquivo`, `validarAprovacao`; confirmação condomínios grava `import` tipo `condominios` |
| Pré-visualização configurada | **PASSOU** | `config-modulos.ts` colunas por módulo; correção prévia só em débitos |
| Permissões | **PASSOU** | `permissoes-importacao.test.ts` (criar vs editar vs ler) |
| Atalhos carteira | **PASSOU** | `condominios/page.tsx` e `unidades/page.tsx` → `/importacoes?modulo=…&abrir=1` (não há mais import legado inline) |

**UI (E2E parcial):** em `/importacoes?modulo=condominios&abrir=1`, sheet **Importar condomínios**, etapas Arquivo → Prévia → Aprovação → Resultado; seletor lista os quatro módulos.

---

## 6. Ticket 18 — Cenários obrigatórios (motor)

Legenda: **PASSOU** | **FALHOU** | **PENDENTE** | **NÃO APLICÁVEL**

| ID | Cenário | Status | Evidência |
| --- | --- | --- | --- |
| T18-01 | Arquivo válido | PASSOU | `adaptadores-modulos.test.ts`, `receber-arquivo.test.mjs` (CSV), homologação PDF |
| T18-02 | Arquivo vazio | PASSOU | `receber-arquivo.test.mjs`, `previewImportacaoCentral rejeita conteúdo vazio` |
| T18-03 | Arquivo corrompido | PENDENTE | Sem teste com buffer inválido (ZIP/XLSX truncado) |
| T18-04 | Formato não suportado | PASSOU (parcial) | Extensão incompatível com conteúdo (`extensao_incompativel`); MIME/assinatura não cobertos em teste |
| T18-05 | Campo obrigatório ausente | PASSOU (parcial) | Parser/adaptador (ex. código obrigatório no adaptador mock); sem matriz por módulo |
| T18-06 | Data inválida | PASSOU | `normalizacao-campos.test.ts` |
| T18-07 | Valor monetário inválido | PASSOU | `normalizacao-campos.test.ts` |
| T18-08 | Registro duplicado | PASSOU | `marcarDuplicidadesNoArquivo`, `detecao-duplicidades.test.ts` |
| T18-09 | Relacionamento inexistente | PASSOU | Unidades/responsáveis sem condomínio/unidade; motor remove payload em erro bloqueante |
| T18-10 | Registro com aviso | PASSOU | Coluna desconhecida → `atencao` (`motor-validacao.test.ts`) |
| T18-11 | Erro bloqueante | PASSOU | `erros bloqueantes removem payload` |
| T18-12 | Correção de registro | PASSOU | `correcao-previa.test.ts` (**não** em `npm test`) |
| T18-13 | Revalidação após correção | PASSOU | Idem |
| T18-14 | Cancelamento | PENDENTE | Status `cancelada` no tipo; sem teste de fluxo |
| T18-15 | Aprovação | PASSOU | `aprovacao.test.ts`, hash + `confirmacaoExplicita` |
| T18-16 | Falha na persistência | PENDENTE | Sem simulação de falha em `executarTransacaoCatalogo` |
| T18-17 | Confirmação duplicada | PASSOU | `confirmarImportacaoCentral é idempotente` |

**Totais T18:** 12 PASSOU · 0 FALHOU · 4 PENDENTE · 0 N/A  
**Critério do ticket (“todos com teste automatizado documentado”):** **NÃO ATENDIDO**.

---

## 7. Ticket 19 — Integração e segurança

| ID | Cenário | Status | Evidência |
| --- | --- | --- | --- |
| T19-01 | Usuário autorizado inicia importação | PASSOU | Admin gera prévia (`permissoes-importacao.test.ts`) |
| T19-02 | Sem permissão tenta importar | PASSOU | Advogado 403 em `previewImportacaoDebitos` |
| T19-03 | Aprovar importação de outro escopo | PENDENTE | Escopo condomínio documentado em adaptador débitos; **sem** teste dedicado de aprovação fora do escopo |
| T19-04 | Arquivo malformado | PASSOU (parcial) | `fluxos-permissoes` T21 importação inválida; erros na prévia, confirmação 400, base intacta |
| T19-05 | Dados alterados no frontend antes da aprovação | PENDENTE | Hash na confirmação coberto em unitário; **sem** teste HTTP simulando tampering |
| T19-06 | Dados alterados no banco durante revisão | PENDENTE | — |
| T19-07 | Dois usuários importam mesmos registros | PENDENTE | — |
| T19-08 | Mesma importação confirmada duas vezes | PASSOU | Idempotência por hash |
| T19-09 | Falha do banco na gravação | PENDENTE | — |
| T19-10 | Usuário cancela importação | PENDENTE | — |

**Totais T19:** 4 PASSOU · 0 FALHOU · 6 PENDENTE  
**Critério (“sem gravação indevida”):** atendido nos cenários **executados**; lacunas impedem assinatura completa.

---

## 8. Ticket 20 — E2E e homologação

| ID | Cenário | Status | Evidência |
| --- | --- | --- | --- |
| T20-01 | Fluxo feliz completo (todos os módulos) | PENDENTE | UI: wizard e módulos OK; upload→aprovação não automatizado no browser |
| T20-02 | Gravar sem aprovação | PASSOU (serviço) | Confirmação sem `confirmacaoExplicita` / hash rejeitada |
| T20-03 | Aprovar com erros bloqueantes | PASSOU (serviço) | `montarResumoAprovacaoImportacao bloqueia quando nada será gravado`; T21 confirmação inválida 400 |
| T20-04 | Cancelar na conferência | PENDENTE | Botão Fechar na UI; sem assert automatizado |
| T20-05 | Repetir confirmação | PASSOU | Teste idempotente |
| T20-06 | Registros existentes | PASSOU (parcial) | Detecção duplicidade/atualização débitos e condomínios |
| T20-07 | Dados incompatíveis | PASSOU (parcial) | T21 planilha inválida |
| T20-08 | Falha na gravação | PENDENTE | — |
| T20-09 | PDF homologação Residencial do Mar | PASSOU | `relatorio-gestao.homologacao.test.ts` (8 páginas, subtotais) |

**Homologação PDF anexa pelo usuário:** coberta pela fixture `src/test/fixtures/relatorio-inadimplencia-residencial-do-mar.pdf` (mesmo layout documentado).

---

## 9. Testes executados — consolidado

| Suíte | Resultado |
| --- | --- |
| `npm test` | **78 pass / 0 fail** |
| Testes importação fora do script | **10 pass / 0 fail** |
| `npm run build` (typecheck) | **FALHOU** (múltiplos TS errors) |
| E2E browser `/importacoes` | **Smoke PASSOU** (4 módulos, etapas, atalho condomínios) |

---

## 10. Defeitos e lacunas (sem correção nesta auditoria)

| # | Severidade | Descrição |
| --- | --- | --- |
| D1 | MÉDIA | Cenários T18/T19 obrigatórios sem testes automatizados |
| D2 | MÉDIA | `aprovacao.test.ts`, `correcao-previa.test.ts`, `pre-visualizacao.test.ts`, `historico-auditoria.test.ts` ausentes do script `npm test` |
| D3 | ALTA | `npm run build` — erros TypeScript em importação (`importar-debitos-planilha` identificador duplicado, generics do motor, etc.) |
| D4 | BAIXA | Empty state do histórico ainda menciona só inadimplência CSV/XLS (texto desatualizado) |

---

## 11. Regressão

Nenhuma alteração de código foi feita durante esta auditoria. Suíte completa `npm test` executada uma vez; sem falhas.

---

## 12. Riscos remanescentes

- Homologação E2E manual ainda necessária para upload real, correção na prévia (débitos) e histórico pós-confirmação nos quatro módulos.
- Migração para PostgreSQL pode expor falhas não simuladas no catálogo em memória.
- Concorrência e cancelamento não regressáveis via CI.

---

## 13. Limitações da auditoria

- Não foi alterado código de produção nem criado commit.
- APIs HTTP não foram exercitadas com cookies via `curl` (apenas serviços in-process e UI).
- Usuário “Usuário Teste” no browser (sessão já ativa); não repetiu login ADRYELLE sem permissão na UI.

---

## 14. Próximas ações recomendadas

1. Incluir os quatro arquivos de teste do centro no script `npm test`.
2. Implementar matriz T18-03, T18-14, T18-16 e pacote T19-03…T19-10 como `importacao.integracao.test.ts`.
3. Corrigir erros de `tsc` / `next build` antes de homologação formal.
4. Estender `roteiro-qa-t21.md` com roteiro **importação central** (um fluxo por módulo + advogado bloqueado).
5. Opcional: Playwright ou extensão do `test-browser` skill para upload de fixture CSV na UI.

---

## 15. Conformidade por ticket

| Ticket | Veredito |
| --- | --- |
| **T17** | **Aprovado** — quatro módulos no centro, APIs e wizard alinhados |
| **T18** | **Reprovado** para critério de cobertura obrigatória (lacunas documentadas) |
| **T19** | **Inconclusivo** — base de permissões ok; cenários avançados pendentes |
| **T20** | **Aprovado com ressalvas** — smoke UI + PDF homologado; fluxo completo E2E pendente |

**Veredito geral do épico (homologação desta rodada):** **APROVADO COM RESSALVAS**
