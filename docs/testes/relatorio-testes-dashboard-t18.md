# Relatório de testes — T18 Dashboard por perfil

**Data:** 2026-10-28  
**Escopo:** Ticket T18 (`TICKETS_CURSOR_DANIEL_JORGE.md` L516–540), módulo `dashboard`, `GET /api/dashboard`, UI `/` e componentes `src/components/dashboard/*`.  
**Classificação:** **APROVADO COM RESSALVAS**

---

## 1. Resumo executivo

O dashboard por perfil foi validado principalmente por **testes de API autenticados** (três perfis, consistência com `/api/debitos/indicadores` e `/api/fila`) e **E2E parcial no browser** (visão administradora com valores em pt-BR). Critérios de aceite essenciais de **escopo no backend** e **payload por perfil** foram atendidos.

Ressalvas: **build/typecheck global** continua falhando por **11 erros TS** fora do T18; **não há testes automatizados** para `src/lib/dashboard/service.ts`; perfil **advogado demo** (`ADRYELLE`) permanece com **0 condomínios** no seed (nome não vinculado — mesmo tema do T17); **responsividade** não foi exercida em múltiplos viewports; persistência em **memória** (`catalogo.ts`), não PostgreSQL.

---

## 2. Escopo auditado

| Área | Incluído |
| --- | --- |
| `src/lib/dashboard/service.ts` | Agregação, resolução de perfil, escopo |
| `GET /api/dashboard` | Auth, permissão, query `dataBase` / `limiteDias` |
| UI `dashboard-home.tsx` + views por perfil | Loading, erro, layout admin |
| Critérios T18 (ticket) | Perfil, escopo, totais, pt-BR, responsivo |
| Regressão global | `npm test`, `tsc`, `build` |
| PostgreSQL | **N/A** — protótipo in-memory |

---

## 3. Arquitetura (mapa resumido)

| Componente | Responsabilidade | Teste aplicado |
| --- | --- | --- |
| Next.js App Router | Página `/`, route handler | Browser + curl |
| `src/lib/dashboard/service.ts` | Regras T18, reutiliza fila/débitos/retornos/jurídico | API indireta |
| `src/proxy.ts` | Sessão + redirect sem cookie | HTTP 307 |
| `src/data/catalogo.ts` | Estado demo | Compartilhado no processo |
| JWT cookie `lc_session` | Sessão | Login `POST /api/auth/login` |

---

## 4. Ambiente e comandos

- **OS:** Linux  
- **Servidor:** `http://127.0.0.1:3000` (já em execução na máquina local)  
- **Senha demo:** `12345` (usuários `MILENA`, `RAQUEL`, `ADRYELLE` — ver `docs/modulos/usuarios.md`)

Comandos executados nesta auditoria:

```bash
npm test                    # 6/6 passou
npx tsc --noEmit            # 11 erros (fora T18)
npm run build               # falha no typecheck (mesmos erros)
# curl + cookie jar — cenários T18-API-* abaixo
# browser MCP — snapshot em `/` (admin)
```

---

## 5. Plano de cenários (critérios de aceite T18)

| ID | Objetivo | Status |
| --- | --- | --- |
| T18-AC-01 | Dashboard muda conforme perfil autenticado | **PASSOU** (API: administradora / atendente / advogado) |
| T18-AC-02 | Consultas respeitam escopo e permissões no backend | **PASSOU** (atendente fila=1 vs admin=2; advogado escopo vazio; retornos `null` sem `atendimentos.ler`) |
| T18-AC-03 | Totais batem com consultas/listas correspondentes | **PASSOU** (admin `totalAtualizado` = indicadores; atendente `fila.emCobranca` = `/api/fila` total) |
| T18-AC-04 | Valores monetários formatados pt-BR | **PASSOU** (browser: `R$ 1.050,00`, `R$ 700,00`, `50%`) |
| T18-AC-05 | Layout responsivo | **PENDENTE** (não testado em breakpoints 640/961px nesta sessão) |
| T18-UI-01 | Estados loading / erro / vazio | **PASSOU** (browser: loading; gráficos “Sem dados” com 0 contatos; inspeção de código para erro+retry) |
| T18-UI-02 | Atendente e advogado na UI | **PENDENTE** (browser ficou na sessão admin; perfis atendente/advogado validados só via API) |
| T18-UNIT-01 | Serviço dashboard isolado | **PENDENTE** (sem testes `.mjs`/`.test.ts`) |
| T18-DB-01 | PostgreSQL | **NÃO APLICÁVEL** |

**Totais por status (cenários acima):** PASSOU 6 · PENDENTE 3 · NÃO APLICÁVEL 1 · FALHOU 0 · BLOQUEADO 0

---

## 6. Testes de API executados

| ID | Passos | Esperado | Obtido | Status |
| --- | --- | --- | --- | --- |
| T18-API-01 | GET `/api/dashboard` sem cookie | Negação | **307** → `/login?from=%2Fapi%2Fdashboard` | **PASSOU** (ressalva: não é JSON 401) |
| T18-API-02 | Login `MILENA`, GET dashboard | `perfil: administradora`, indicadores | `totalAtualizado: 1050`, `fila.emCobranca: 2` | **PASSOU** |
| T18-API-03 | Mesma sessão, GET `/api/debitos/indicadores` | Igual total dashboard | **1050 === 1050** | **PASSOU** |
| T18-API-04 | Login `RAQUEL`, GET dashboard | `perfil: atendente` | `atendimentosHoje: 0`, `fila.emCobranca: 1` | **PASSOU** |
| T18-API-05 | Login `ADRYELLE`, GET dashboard | `perfil: advogado`, escopo jurídico | `condominios.total: 0`, `juridico.total: 0`, `retornos: null` | **PASSOU** (escopo vazio esperado no seed) |
| T18-API-06 | `RAQUEL`: dashboard vs GET `/api/fila` | Mesmo total carteira | **1 === 1** | **PASSOU** |
| T18-API-07 | GET `/` sem cookie | Redirect login | **307** → `/login` | **PASSOU** |

---

## 7. Testes E2E (browser)

| ID | Passos | Esperado | Obtido | Status |
| --- | --- | --- | --- | --- |
| T18-E2E-01 | Abrir `/` autenticado (admin) | KPIs reais, pt-BR | Título “Visão da carteira…”, **R$ 1.050,00**, seções Inadimplência / Equipe / Retornos | **PASSOU** |
| T18-E2E-02 | Login atendente/advogado e `/` | Layout distinto | Não executado (sessão browser admin) | **PENDENTE** |

---

## 8. Validação estática

| Verificação | Resultado |
| --- | --- |
| `npm test` | **6/6 PASSOU** |
| `npx tsc --noEmit` | **FALHOU** — 11 erros em `relatorios/page.tsx`, `app-layout.tsx`, `graficos.tsx` (nenhum em `dashboard/*`) |
| `npm run build` | **FALHOU** — mesmo typecheck |
| Lint dedicado | **N/A** — script não definido em `package.json` |

---

## 9. Segurança e permissões

| Cenário | Resultado |
| --- | --- |
| API dashboard sem sessão | Redirect **307** (proxy), sem vazamento de JSON |
| Dados agregados no servidor | **PASSOU** — UI não recalcula carteira global no cliente |
| Atendente vs administradora | Totais de fila divergem conforme carteira (**1 vs 2**) |
| Advogado sem atendimentos | `retornos: null` no payload |

---

## 10. Defeitos encontrados

Nenhum defeito **bloqueante do T18** reproduzido. Itens relacionados ao produto/ambiente:

| ID | Severidade | Descrição | Componente |
| --- | --- | --- | --- |
| DEF-STATIC-01 | **MÉDIA** | Typecheck impede build de produção | `relatorios`, `app-layout`, `graficos` |
| DEF-SEED-01 | **BAIXA** | Advogado demo sem condomínios vinculados | `catalogo.ts` / seed |
| DEF-TEST-01 | **BAIXA** | Ausência de testes automatizados do módulo dashboard | `src/lib/dashboard/service.ts` |

---

## 11. Regressão

| Verificação | Resultado |
| --- | --- |
| Suíte `npm test` | **PASSOU** (indicadores dedupe ainda válido para KPIs do dashboard) |
| Módulos jurídico/fila (APIs usadas pelo dashboard) | Não reexecutado integralmente nesta sessão |

---

## 12. Limitações da auditoria

- Estado **volátil** em memória; reiniciar o servidor pode alterar contagens se houver mutações na sessão.
- **E2E** completo para atendente/advogado e **responsividade** não cobertos.
- **Cobertura de código** não medida; não declarada cobertura “completa”.
- **PostgreSQL** e migrations não exercidos.

---

## 13. Próximas ações recomendadas

1. Adicionar testes Node (`node --test`) para `resolverPerfil` e consistência `obterDashboard` vs `obterIndicadoresDebitos` / `resumoFilaCobranca` com fixture mínima.
2. E2E browser: logout → `RAQUEL` / `ADRYELLE` → validar textos e ausência de blocos administrativos.
3. Corrigir erros TS pré-existentes para destravar `npm run build`.
4. Alinhar seed do advogado demo com advogados nos condomínios de teste (facilita validação positiva do perfil advogado).
5. Teste manual de responsividade (640px / 961px) nos grids do dashboard.

---

## 14. Conclusão

**APROVADO COM RESSALVAS:** critérios obrigatórios do T18 verificados por API e amostra E2E admin; pendências documentadas (build global, testes unitários do módulo, E2E dos outros perfis, responsivo, seed advogado).
