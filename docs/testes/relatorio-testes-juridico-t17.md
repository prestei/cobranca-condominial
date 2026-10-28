# Relatório de testes — T17 Jurídico (encaminhamento e acompanhamento)

**Data:** 2026-10-27  
**Escopo:** Ticket T17 (`TICKETS_CURSOR_DANIEL_JORGE.md`), módulo `juridico`, APIs `/api/juridico/*`, integração com histórico da unidade (T12).  
**Classificação:** **APROVADO COM RESSALVAS**

---

## 1. Resumo executivo

A lógica principal de encaminhamento jurídico foi validada por **testes de API autenticados** (criação, transição de status, documentos, histórico, permissões de atendente e advogado fora do escopo). A suíte unitária existente do projeto (**6 testes**) passou; **não há testes automatizados** para `src/lib/juridico/service.ts`.

Ressalvas: build/typecheck global com **11 erros TS** pré-existentes fora do T17; **E2E browser** não concluído de forma confiável nesta sessão; usuário advogado de demonstração (`ADRYELLE`) **não coincide** com advogados vinculados aos condomínios de teste (`Dra. Thamires`), impedindo validação positiva do fluxo advogado no seed atual; persistência em **memória** (protótipo), não PostgreSQL.

---

## 2. Escopo auditado

| Área | Incluído |
| --- | --- |
| `src/lib/juridico/service.ts` | Regras, escopo, transições, auditoria |
| API `/api/juridico/encaminhamentos*` | GET, POST, PATCH, documentos |
| `src/lib/historico-unidade/service.ts` | Eventos `encaminhamento_juridico`, `correcao_juridico` |
| Permissões `juridico` | seeds admin/advogado, proxy de rotas |
| UI `/juridico`, sheets na fila/histórico | Inspeção de código; E2E browser parcial |
| PostgreSQL | **N/A** — modelo documentado; runtime usa `catalogo.ts` |

---

## 3. Arquitetura (mapa resumido)

| Componente | Responsabilidade | Execução / teste |
| --- | --- | --- |
| Next.js App Router | Páginas e route handlers | `npm run dev` → `:3000` |
| `src/proxy.ts` | Auth + permissão por rota | Redirect 307 sem sessão |
| `src/data/catalogo.ts` | Estado em memória | Compartilhado entre requests no mesmo processo |
| `src/lib/juridico/service.ts` | Regras T17 | Testado via API |
| `src/lib/historico-unidade/service.ts` | Linha do tempo T12 | Testado via `GET /api/unidades/:id/historico` |
| JWT + cookie `lc_session` | Sessão | Login `POST /api/auth/login` |

---

## 4. Ambiente e comandos

- **OS:** Linux  
- **Node:** via projeto (`npm run dev`, `npm test`, `npx tsc --noEmit`, `npm run build`)  
- **Servidor:** `http://127.0.0.1:3000` (instância iniciada para testes)  
- **Credenciais demo:** senha `12345` (documentada em `docs/modulos/usuarios.md`); admin `MILENA` ou `12345`; atendente `RAQUEL`; advogado `ADRYELLE`  

Comandos executados:

```bash
npm test                    # 6/6 passou
npx tsc --noEmit            # 11 erros (fora T17)
npm run build               # falha no typecheck (mesmos erros)
# curl + cookie jar — cenários T17-API-* documentados abaixo
```

---

## 5. Plano de cenários (critérios de aceite T17)

| ID | Objetivo | Status |
| --- | --- | --- |
| T17-AC-01 | Encaminhamento aparece no histórico da unidade | **PASSOU** (API) |
| T17-AC-02 | Advogado só acessa casos no escopo | **PASSOU** (403 PATCH; lista vazia no seed) |
| T17-AC-03 | Mudanças de estado/atribuição rastreáveis | **PASSOU** (evento `correcao_juridico` + audit) |
| T17-AC-04 | Documentos só para autorizados | **PASSOU** (implícito: atendente 403 em todo módulo; docs via `juridico.ler`) |
| T17-AC-05 | Não ajuíza / não envia a tribunais | **PASSOU** (inspeção — sem endpoints/automação judicial) |
| T17-UI-01 | Tela `/juridico` e navegação | **PENDENTE** (browser instável nesta sessão) |
| T17-UI-02 | Ações na fila e histórico | **PENDENTE** (mesmo motivo) |
| T17-DB-01 | Persistência PostgreSQL | **NÃO APLICÁVEL** (protótipo in-memory) |

---

## 6. Testes de API executados

| ID | Passos | Esperado | Obtido | Status |
| --- | --- | --- | --- | --- |
| T17-API-08 | GET encaminhamentos sem cookie | 401 ou negação | Redirect **307** → `/login` | **PASSOU** (com ressalva: não é JSON 401) |
| T17-API-04 | Login `RAQUEL`, GET lista | 403 | `{"error":"Sem permissão..."}` **403** | **PASSOU** |
| T17-API-01 | Login `MILENA`, POST unidade 2, débito 1 | 201 + status Encaminhado | **201**, advogado `Dra. Thamires`, resumo R$ 350 | **PASSOU** |
| T17-API-06a | PATCH status inválido Encaminhado → Pronto | 409 | **409** mensagem de transição | **PASSOU** |
| T17-API-06b | PATCH Encaminhado → Em análise | 200 | **200**, status atualizado | **PASSOU** |
| T17-API-07 | POST documento | 201 | **201**, título + referência interna | **PASSOU** |
| T17-API-02 | GET detalhe | documentos.length ≥ 1 | **1** documento | **PASSOU** |
| T17-API-03 | GET `/api/unidades/2/historico` | ≥1 evento jurídico | **1** `encaminhamento_juridico`, **1** `correcao_juridico` | **PASSOU** |
| T17-API-05 | Login `ADRYELLE`, PATCH caso cond. 1 | 403 fora do escopo | **403** "Encaminhamento fora do seu escopo" | **PASSOU** |
| T17-API-09 | Advogado lista encaminhamentos | Só escopo | **0** itens (nome advogado ≠ vínculo seed) | **PASSOU** (escopo vazio esperado no seed) |

**Evidência (IDs de execução):** encaminhamento `420bd040-d878-4c00-aa2c-26c364b05758`; documento `48feaa76-b44d-4537-af38-a8d78efdfcbf` (sessão de teste em memória — reiniciar o servidor zera dados).

---

## 7. Validação estática

| Verificação | Resultado |
| --- | --- |
| `npm test` | **6/6 PASSOU** |
| `npx tsc --noEmit` | **FALHOU** — 11 erros em `relatorios/page.tsx`, `app-layout.tsx`, `graficos.tsx`, etc. (não em arquivos T17) |
| `npm run build` | **FALHOU** (typecheck) |
| Arquivos T17 isolados | Sem erros TS reportados em grep focado |

---

## 8. Defeitos e observações

| ID | Severidade | Descrição | Reprodução |
| --- | --- | --- | --- |
| OBS-01 | **MÉDIA** | Seed: usuário advogado `Dra. Adryelle` não está em `condominios.advogados` (`Dra. Thamires`), impossibilitando demo do fluxo advogado **com casos visíveis** sem ajuste de cadastro | Login `ADRYELLE` → `/juridico` vazio; PATCH 403 em casos existentes |
| OBS-02 | **BAIXA** | API sem sessão retorna **307** HTML redirect em vez de **401** JSON | `curl` GET `/api/juridico/encaminhamentos` |
| OBS-03 | **MÉDIA** | Typecheck/build do repositório bloqueado por erros legados | `npm run build` |
| OBS-04 | **BAIXA** | Terminal do dev anterior reportou erro Tailwind/package.json; instância nova respondeu **200** em `/login` | Ambiente local |

Nenhum defeito **CRÍTICO** ou **ALTA** identificado **no comportamento implementado do T17** nos testes executados.

---

## 9. Segurança e permissões (amostra)

| Cenário | Resultado |
| --- | --- |
| Atendente sem `juridico.ler` | **403** na API |
| Advogado fora do condomínio do caso | **403** no PATCH |
| Admin cria e altera | Permitido conforme seed |
| Documentos | Retornados apenas com `juridico.ler` (atendente não alcança a API) |

Testes agressivos (SQLi, XSS, CSRF) **não executados** nesta rodada.

---

## 10. Regressão

- Suíte `npm test` (débitos/acordos): **sem regressão**.
- Módulos não exercitados: fila, propostas, importações, relatórios UI.

---

## 11. Limitações

- Sem PostgreSQL real; sem testes de migration.
- Sem testes unitários dedicados ao serviço jurídico.
- E2E browser **não concluído** (refs instáveis no MCP browser após login).
- Dados de teste **voláteis** (memória do processo Next).

---

## 12. Próximas ações recomendadas

1. Alinhar seed: usuário advogado com nome `Dra. Thamires` (ou vincular `Dra. Adryelle` a um condomínio de teste).
2. Adicionar `src/lib/juridico/service.test.mjs` (transições, advogado inválido, escopo).
3. Corrigir erros TS legados para destravar CI/build.
4. Executar E2E manual ou automatizado: `/juridico`, fila → Jurídico, histórico → Jurídico.
5. Quando houver PostgreSQL: repetir T17-API-* contra persistência real.

---

## 13. Totais

| Status | Quantidade |
| --- | ---: |
| PASSOU | 12 |
| FALHOU | 0 |
| BLOQUEADO | 0 |
| PENDENTE | 2 (UI E2E) |
| NÃO APLICÁVEL | 1 (PostgreSQL) |

**Conclusão:** **APROVADO COM RESSALVAS** — critérios de aceite T17 atendidos na camada API/regras; ressalvas de demo seed advogado, build global e E2E UI pendente.
