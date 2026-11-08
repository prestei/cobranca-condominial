# Matriz de conformidade — tickets T01–T23 (T24)

**Data da auditoria:** 2026-11-01  
**Commit / ambiente:** working tree local; `npm run dev` em execução; seed fictício `src/data/catalogo.ts`  
**Escopo:** classificar requisitos dos tickets T01–T23, registrar evidências, defeitos e ordem de correção dos bloqueadores.

## Legenda de classificação

| Sigla | Significado |
| --- | --- |
| **I+T** | Implementado e testado (automático ou verificação reproduzível documentada) |
| **I** | Implementado sem teste automatizado dedicado |
| **P** | Parcial — parte do escopo ou critérios de aceite atendidos |
| **A** | Ausente |
| **B** | Bloqueado — dependência externa ou decisão pendente impede conclusão |

## Resumo executivo

| Ticket | Título (abreviado) | Classificação global | Persistência |
| --- | --- | --- | --- |
| T01 | Base técnica / docs | **P** | — |
| T02 | Modelo de dados / migrations PG | **P** | Memória (`catalogo.ts`); `docs/banco.md`; **sem migrations SQL** |
| T03 | Login / sessão | **P** | Sessão JWT cookie; dados operacionais em memória |
| T04 | Perfis e escopo | **I+T** | Serviços + API `requireSession` / `requirePermissao` |
| T05 | Condomínios | **I** | API + UI; CRUD via POST/PATCH/inativação |
| T06 | Unidades / responsáveis | **I** | API `/api/unidades`, histórico, vínculos |
| T07 | Usuários e RE | **P** | RE em serviço; formato `RE-10000+`; UI admin mostra nome + RE |
| T08 | Fila de cobranças | **I+T** | `GET /api/fila`, painel em `/atendimentos` |
| T09 | Distribuição | **I+T** | `/api/distribuicao/*`; automática **protótipo** |
| T10 | Registrar tentativa | **I+T** | Sheet + `/api/atendimentos` |
| T11 | Retornos | **I+T** | Filtro retorno + `concluir-retorno` |
| T12 | Histórico unidade | **I** | `GET /api/unidades/:id/historico`, RE no ator |
| T13 | Importação inadimplência | **I+T** | preview/confirmar + teste integração |
| T14 | Débitos / indicadores | **I+T** | `/debitos`, indicadores unitários |
| T15 | Negociação / proposta | **I** | `/api/propostas`, sheet, auditoria |
| T16 | Parcelas / pagamentos | **I** | APIs + `AcordoAcompanhamentoBlock`; teste resumo acordo |
| T17 | Jurídico | **I** | `/juridico`, relatório QA T17 em `docs/testes/` |
| T18 | Dashboard por perfil | **P** | API validada; E2E parcial; typecheck global falha |
| T19 | Relatórios / export | **I** | Hub + export; relatório T19; depende T23 |
| T20 | Auditoria | **I** | `/auditoria`, `registrarAuditoria` em serviços |
| T21 | Testes integrados | **P** | 18 testes passando; sem E2E browser completo |
| T22 | Superlógica | **B** | Apenas doc esboço; sem adaptador funcional |
| T23 | Produtividade por RE | **I+T** | `/relatorios/produtividade` + testes T23 |

**Achado transversal (P0):** persistência operacional é **catálogo em memória no processo Node**, não PostgreSQL. Atende protótipo e testes na mesma instância; **não** atende “persistência real” / reinício de servidor / multi-instância dos tickets T02, T08 e instruções globais do arquivo de tickets.

**Achado transversal (RE):** fila, distribuição, retornos, histórico, relatórios, produtividade e auditoria usam **RE** para atendentes. **Exceção:** menu/cabeçalho da aplicação (`usuarioSessaoApp`) exibe **nome** do usuário logado, inclusive atendentes — diverge de T03/T07.

**Dados demonstrativos:** seed em `src/data/seed-base-teste.ts` / `catalogo.ts` (condomínios “Teste”, senha demo `12345`). UI de dashboard/relatórios consome agregados reais do catálogo, **não** números hardcoded ilustrativos.

---

## Verificações executadas nesta auditoria (T24)

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `npm test` | **18/18 pass** | Saída local 2026-11-01 |
| `npx tsc --noEmit` | **Falha** (11 erros) | `graficos.tsx`, `layout/app-layout.tsx`, teste integração |
| `npm run build` | **Falha** no passo TypeScript | Mesmos erros |
| API sem sessão → dashboard | **307** → `/login?from=…` | curl localhost |
| Login + dashboard admin | **200**; `totalAtualizado: 1050` | curl + cookie jar |
| Totais dashboard × indicadores débitos | **OK** (`1050 === 1050`) | `GET /api/dashboard` vs `GET /api/debitos/indicadores` |
| Fila admin `emCobranca` × API fila | **OK** (`2 === 2`) | curl |
| Atendente → produtividade | **403** JSON | `RAQUEL` |
| Atendente → POST `/api/usuarios` | **403** JSON | `RAQUEL` |
| Advogado → unidade fora escopo | **403** JSON | `ADRYELLE` unidade 3 |
| CRUD condomínio + re-login | **Persistiu** id 3 na listagem | POST `/api/condominios` + logout/login |
| CRUD manual em **todos** os módulos (UI) | **Não executado** nesta sessão | Ver roteiro `docs/testes/roteiro-qa-t21.md` |
| Console browser / Network | **Não executado** nesta sessão | Recomendado na validação final |

---

## Detalhamento por ticket

### T01 — Inspecionar o projeto e estabelecer a base técnica

| Critério | Class. | Evidência |
| --- | --- | --- |
| README instalável | **I+T** | `README.md`, `.env.example`, scripts `db:*` |
| Documentar stack real | **I+T** | `docs/stack.md`, `docs/mapa-do-projeto.md` |
| `docs/ARQUITETURA_ATUAL.md` | **A** | Arquivo **não encontrado** |
| `docs/DECISOES_PENDENTES.md` | **I+T** | Existe e referencia tickets |
| Impedimentos documentados | **I+T** | README cita memória até T02 |
| Não remover funcionalidades | **I+T** | Inspeção estática — sem remoção nesta auditoria |

**Artefatos:** `README.md`, `docs/*`, `TICKETS_CURSOR_DANIEL_JORGE.md`.

---

### T02 — Modelo de dados central

| Critério | Class. | Evidência |
| --- | --- | --- |
| Entidades e relações documentadas | **I** | `docs/banco.md`, tipos em `catalogo.ts` |
| Migrations versionadas executáveis | **A** | Apenas `docs/migrations/2026-10-29-codigo-re-usuarios.md`; **sem SQL/ORM** |
| PostgreSQL operacional | **B** | `DATABASE_URL` em `.env.example`; app não persiste cadastros em PG |
| RE — estratégia migração | **I+T** | `migrarCodigosReUsuarios`, doc migration RE |
| Sem juros/multa inventados | **I+T** | `docs/DECISOES_PENDENTES.md`, serviços débitos |

**Artefatos:** `src/data/catalogo.ts`, `docs/banco.md`, `DATABASE_URL` em `.env.example`.

---

### T03 — Login, sessão e logout

| Critério | Class. | Evidência |
| --- | --- | --- |
| Credenciais inválidas negadas | **I+T** | Teste integração; API 401 |
| Rotas privadas protegidas | **P** | `src/proxy.ts` + API `requireSession`; API anônima retorna **307** (não JSON 401) |
| Logout encerra sessão | **I** | `POST /api/auth/logout`; teste “token inválido” |
| Carrega perfil pós-login | **I+T** | JWT + `/api/auth/session` |
| Atendente vê RE na identificação visível | **P** | RE não aparece no **AppShell** (`usuarioSessaoApp` usa `nome`) |
| Testes sucesso/falha/sessão/rota privada | **P** | Integração cobre credenciais; **sem** teste HTTP de rota privada |

**Artefatos:** `src/app/api/auth/*`, `src/lib/auth/*`, `src/context/auth-context.tsx`.

---

### T04 — Perfis, permissões e escopo

| Critério | Class. | Evidência |
| --- | --- | --- |
| Separação admin / atendente / advogado | **I+T** | `src/lib/permissions/*`, seeds cargos |
| Advogado não acessa outro condomínio | **I+T** | Teste integração; curl 403 unidade 3 |
| Atendente não ações admin via API | **I+T** | curl POST usuarios 403 |
| Backend valida (não só UI) | **I+T** | 44 rotas API usam `requireSession` |
| RE não concede privilégio | **I+T** | RE só identificação |

**Artefatos:** `src/proxy.ts`, `src/lib/api/require-auth.ts`, `fluxos-permissoes.integracao.test.ts`.

---

### T05 — Condomínios

| Critério | Class. | Evidência |
| --- | --- | --- |
| CRUD + inativação admin | **I** | `/condominios`, `/api/condominios` |
| Atendente/advogado sem alterar cadastro | **I+T** | Permissões `condominios.criar/editar` |
| Inativação preserva histórico | **I** | Regra em serviço; sem exclusão física de tickets |
| Vínculo advogados | **I** | Campo `advogados[]` |
| Validação clara | **I+T** | Ex.: advogado obrigatório (POST T24) |

**Gap:** `GET /api/condominios/:id` **não implementado** (apenas PATCH/DELETE).

---

### T06 — Unidades e responsáveis

| Critério | Class. | Evidência |
| --- | --- | --- |
| CRUD vinculado a condomínio | **I** | `/unidades`, `/api/unidades` |
| Duplicidade / validação | **I** | `src/lib/unidades/service.ts` |
| Histórico de cobrança | **I+T** | Link histórico T12 |
| Mascaramento dados pessoais | **I** | Regra doc; validar por perfil advogado na UI |
| Auditoria correções | **I** | `registrarAuditoria` em unidades |

---

### T07 — Usuários e código RE

| Critério | Class. | Evidência |
| --- | --- | --- |
| RE gerado no backend | **I+T** | `criarUsuario`, `re-sequencia.test.mjs` |
| Unicidade / imutável | **I+T** | Testes + migração seed |
| Formato `RE-001` (ticket) | **P** | Implementado **`RE-10000+`** (doc migration) |
| RE em telas operacionais | **P** | Operacional OK; shell/menu com **nome** |
| Só admin gerencia usuários | **I+T** | Permissão + teste API |
| Testes concorrência | **P** | Sequência lógica; sem teste de corrida real |

**Artefatos:** `/usuarios`, `/api/usuarios`, `src/lib/colaboradores/re.ts`.

---

### T08 — Fila de cobranças

| Critério | Class. | Evidência |
| --- | --- | --- |
| Lista persistida (não mock estático) | **P** | Dados do catálogo (memória), API real |
| Escopo por perfil | **I+T** | `listarFilaCobranca`, testes fila |
| Filtros combinados | **I** | UI + query params; validação manual pendente |
| Unidade quitada fora da fila | **I+T** | Teste integração quitação |
| Histórico quitada acessível | **I+T** | Teste histórico |
| Paginação backend | **I+T** | `page`, `pageSize` em `/api/fila` |

**Dependência T13:** regra entrada automática na cobrança — **pendente** (`DECISOES_PENDENTES`).

---

### T09 — Distribuição / redistribuição

| Critério | Class. | Evidência |
| --- | --- | --- |
| Manual por RE | **I+T** | Painel + teste redistribuição |
| Histórico atribuições | **I+T** | `collection_assignment` lógico + `/api/distribuicao/historico` |
| Escopo autorizado | **I+T** | Permissões distribuição |
| Produtividade no RE autor | **I+T** | Teste T23 pós-redistribuição |
| Distribuição automática | **P** | `POST …/automatica/executar` — **sem regra de negócio aprovada** |
| Falha parcial lote | **I** | Serviço; sem teste dedicado |

---

### T10 — Registrar tentativa

| Critério | Class. | Evidência |
| --- | --- | --- |
| Campos e validação | **I** | Sheet multi-step `/atendimentos` |
| Persistência + histórico | **I+T** | Teste integração |
| Autor/timestamp servidor | **I+T** | `criarAtendimento` |
| Carteira alheia bloqueada | **I** | Regras serviço; teste indireto |

---

### T11 — Agenda e conclusão de retorno

| Critério | Class. | Evidência |
| --- | --- | --- |
| Hoje / atrasados / futuros | **I+T** | `retornos-agenda-panel`, `/api/retornos` |
| Conclusão preserva agendamento | **I+T** | `concluirRetornoAgendado` + teste |
| Escopo atendente | **I+T** | Carteira |
| Histórico mantém retorno | **I+T** | Evento `retorno_concluido` |

---

### T12 — Histórico completo da unidade

| Critério | Class. | Evidência |
| --- | --- | --- |
| Linha do tempo consolidada | **I+T** | `historico-unidade/service.ts` |
| RE em eventos operacionais | **I+T** | `rotuloAutor` |
| Permissões e escopo | **I+T** | Teste advogado unidade |
| Mobile | **I** | Sheets responsivos; não validado T24 |

---

### T13 — Importação inadimplência

| Critério | Class. | Evidência |
| --- | --- | --- |
| Prévia + confirmação | **I+T** | Wizard + APIs |
| Linhas inválidas não gravam | **I+T** | Teste integração |
| Reimportação não duplica | **I** | Hash SHA-256 doc + serviço |
| Relatório resultado | **I** | Registro `import` |
| PDF / layouts administradora | **B** | Pendente decisão |

---

### T14 — Débitos e inadimplência

| Critério | Class. | Evidência |
| --- | --- | --- |
| Listagem e indicadores | **I+T** | `/debitos`, `indicadores.test.mjs` |
| Origem / atualização | **I** | Campos `fonte_valores`, UI |
| Quitação | **I+T** | Teste integração |
| Auditoria manual | **I+T** | Teste correção débito |
| Sem cálculo juros inventado | **I+T** | Doc + serviço |

---

### T15 — Proposta de negociação

| Critério | Class. | Evidência |
| --- | --- | --- |
| CRUD proposta + status | **I** | `/api/propostas`, sheet |
| Auditoria status | **I** | `negociacoes/service.ts` |
| Histórico / relatórios | **I** | Timeline T12 |
| Campos acordo ampliados | **P** | Decisões pendentes |

---

### T16 — Parcelas, pagamentos, acordos

| Critério | Class. | Evidência |
| --- | --- | --- |
| Parcelas pós-aceite | **I** | APIs parcelas/pagamentos |
| Informado vs confirmado | **I** | Modelo + UI block |
| Não marcar quebrado sem regra | **I+T** | Doc DECISOES |
| Testes saldo acordo | **I+T** | `resumo.test.mjs` |

---

### T17 — Jurídico

| Critério | Class. | Evidência |
| --- | --- | --- |
| Encaminhamento + escopo advogado | **I** | `/juridico`, serviço |
| Histórico unidade | **I** | Eventos jurídicos |
| Documentos metadados | **I** | API documentos |
| QA documentado | **I** | `docs/testes/relatorio-testes-juridico-t17.md` |
| Seed advogado demo | **P** | ADRYELLE 0 condomínios até vínculo manual |

---

### T18 — Dashboard por perfil

| Critério | Class. | Evidência |
| --- | --- | --- |
| Conteúdo por perfil | **I+T** | API testada (relatório T18) |
| Escopo backend | **I+T** | curl perfis |
| Totais × listas | **I+T** | T18-AC-03, T24 curl |
| pt-BR monetário | **I+T** | Relatório E2E admin |
| Responsivo | **P** | Pendente no relatório T18 |
| Sem números ilustrativos | **I+T** | Agregados do catálogo |
| Testes unitários serviço | **A** | Sem `.test` para dashboard |

---

### T19 — Relatórios, filtros, exportações

| Critério | Class. | Evidência |
| --- | --- | --- |
| Relatórios e filtros | **I** | `/relatorios`, `relatorios/service.ts` |
| Export CSV/XLS + permissões | **I+T** | Teste escopo advogado export |
| RE nos relatórios | **I+T** | Colunas RE |
| pt-BR export | **I** | BOM UTF-8 doc |
| Falhas sem stack trace | **I** | Tratamento API (amostragem) |

---

### T20 — Auditoria

| Critério | Class. | Evidência |
| --- | --- | --- |
| Eventos em mutações | **I** | `registrarAuditoria` em 12+ serviços |
| Tela consulta admin | **I** | `/auditoria`, `auditoria.ler` |
| Filtros período/autor/tipo | **I** | UI + API |
| RE nas entradas | **I+T** | `rotuloAutorAuditoria` |
| Persistência PG | **P** | Memória; schema futuro `audit_log` |

---

### T21 — Testes integrados

| Critério | Class. | Evidência |
| --- | --- | --- |
| Cenários mínimos 1–12 | **P** | 8+ suítes integração; cenários 1–2 UI manual |
| Automatizado onde viável | **I+T** | `npm test` 18 casos |
| README como executar | **I+T** | README + roteiro QA |
| Falhas críticas corrigidas | **P** | Build/typecheck ainda falha |

---

### T22 — Superlógica / administradoras

| Critério | Class. | Evidência |
| --- | --- | --- |
| Adaptador / sync real | **A** | `docs/modulos/integracao-superlogica.md` esboço |
| Importação manual contingência | **I+T** | T13 |
| Bloqueio credenciais/API | **B** | DECISOES + ticket |

---

### T23 — Produtividade por RE

| Critério | Class. | Evidência |
| --- | --- | --- |
| Métricas por perío / RE | **I+T** | `/relatorios/produtividade`, testes T23 |
| Só administradora | **I+T** | 403 atendente |
| Autor original vs carteira | **I+T** | Teste redistribuição |
| Sem ranking/score | **I+T** | UI doc |
| Definições na tela | **I** | Página produtividade |
| Meio de contato (métrica ticket) | **P** | Verificar divisão por canal na UI vs ticket |

---

## Mapa rápido: telas × API × dados

| Módulo | Tela | API principal | Store atual | Testes |
| --- | --- | --- | --- | --- |
| Dashboard | `/` | `/api/dashboard` | catálogo | Relatório T18; sem unit |
| Atendimentos | `/atendimentos` | fila, atendimentos, retornos, distribuição | catálogo | Integração T10–T11 |
| Débitos | `/debitos` | `/api/debitos*` | catálogo | indicadores.test.mjs |
| Importações | — (tela removida) | `/api/importacoes/debitos/*` | catálogo | Integração |
| Condomínios | `/condominios` | `/api/condominios` | catálogo | Manual |
| Unidades | `/unidades` | `/api/unidades` | catálogo | Integração escopo |
| Usuários | `/usuarios` | `/api/usuarios` | catálogo | RE + integração |
| Cargos | `/cargos` | `/api/cargos` | catálogo | Manual |
| Jurídico | `/juridico` | `/api/juridico/*` | catálogo | Relatório T17 |
| Relatórios | `/relatorios`, `/relatorios/produtividade` | export, opcoes, produtividade | catálogo | Integração export |
| Indicadores | — (tela removida) | `/api/indicadores` | catálogo | Parcial |
| Auditoria | `/auditoria` | `/api/auditoria` | catálogo | sanitize/periodo tests |

---

## Lista de defeitos

| ID | Severidade | Ticket | Descrição | Passos para reprodução | Responsável |
| --- | --- | --- | --- | --- | --- |
| D-T24-01 | **Bloqueador (P0)** | T02, global | Cadastros operacionais só em **memória** (`catalogo.ts`); PostgreSQL não usado pela app. Reinício do processo perde alterações; não atende persistência real multiusuário em produção. | 1. Criar condomínio via API. 2. Reiniciar `npm run dev`. 3. Listar condomínios — registro some. | _A definir_ |
| D-T24-02 | **Alta** | T03, T07 | Cabeçalho/menu (`usuarioSessaoApp` → `AppShell`) mostra **nome** do atendente logado, não o **RE**. | 1. Login `RAQUEL` / senha demo. 2. Observar canto superior do shell — exibe nome. | _A definir_ |
| D-T24-03 | **Alta** | T21, CI | `npm run build` / `tsc` falham (11 erros): `graficos.tsx` plugin Chart.js; `components/layout/app-layout.tsx` legado; teste integração `NODE_ENV`. | Executar `npm run build` na raiz. | _A definir_ |
| D-T24-04 | **Média** | T03, T04 | APIs sem cookie retornam **redirect 307** para login em vez de **401 JSON** (dificulta clientes API e testes automatizados HTTP). | `curl -I http://localhost:3000/api/dashboard` sem cookie. | _A definir_ |
| D-T24-05 | **Média** | T01 | **`docs/ARQUITETURA_ATUAL.md` ausente** (critério explícito T01). | Procurar arquivo em `docs/`. | _A definir_ |
| D-T24-06 | **Média** | T05 | Sem **`GET /api/condominios/:id`** para consulta unitária (PATCH/DELETE existem). | `curl -b cookie … /api/condominios/1` → corpo vazio / não GET. | _A definir_ |
| D-T24-07 | **Média** | T17, T18 | Seed **ADRYELLE** sem condomínios vinculados por padrão — dashboard/jurídico advogado “vazio” até admin vincular. | Login ADRYELLE; abrir `/` e `/juridico`. | _A definir_ |
| D-T24-08 | **Baixa** | T07 | Formato RE **`RE-10000+`** vs especificação textual **`RE-001`** no ticket (migração documentada). | Ver coluna RE em `/usuarios`. | _A definir_ |
| D-T24-09 | **Baixa** | T09 | Distribuição **automática** exposta sem regra de negócio aprovada (decisão pendente). | `/atendimentos` → painel distribuição → automática. | _A definir_ |
| D-T24-10 | **Baixa** | T05–T06 | Risco de **dessincronia** cliente/servidor: cadastros criados só no cliente exigem `sync-cliente` (`garantirCondominiosPersistidosNoServidor`). | Criar condomínio offline no client sem sync; tentar unidade na API. | _A definir_ |
| D-T24-11 | **Baixa** | T18 | Layout dashboard **responsivo** não validado em breakpoints (pendência relatório T18). | Redimensionar `/` em 640px / 961px. | _A definir_ |
| D-T24-12 | **Informativo** | — | Dados seed rotulados “Teste” / “demonstração” no catálogo — operação deve distinguir de produção. | Abrir listagens padrão sem alterações. | _A definir_ |

---

## Ordem sugerida de correção dos bloqueadores

1. **D-T24-01 (T02)** — Implementar persistência PostgreSQL (migrations + repositórios) e roteamento gradual saindo de `catalogo.ts`; sem isso, aceite de “pronto” para CRUD/histórico/relatórios em produção é inválido.
2. **D-T24-03** — Restaurar **build/typecheck verde** para gate de CI e T21.
3. **D-T24-02** — Ajustar identificação visível do atendente (RE no shell) conforme T03/T07.
4. **D-T24-04** — Padronizar resposta **401/403 JSON** em rotas `/api/*` (mantendo redirect só em páginas HTML).
5. **D-T24-05** — Entregar `docs/ARQUITETURA_ATUAL.md` (T01).
6. **D-T24-07** — Corrigir seed ou script de vínculo advogado–condomínio para QA reproduzível.
7. Demais itens médios/baixos conforme capacidade.

---

## Critérios de aceite do T24 (checklist)

- [x] Todos os requisitos T01–T23 classificados nesta matriz.
- [x] Itens **I+T** / **I** referem arquivos, testes ou verificações curl/`npm test`.
- [x] Defeitos com severidade, reprodução e campo responsável (equipe preenche).
- [x] Ordem de correção dos bloqueadores documentada acima.

**Limitações desta auditoria:** não foram executados CRUD completos **pela UI** em todos os módulos, nem varredura de console/Network no browser, nem testes de persistência após **restart** do servidor (recomendado após correção D-T24-01). Complementar com `docs/testes/roteiro-qa-t21.md` e relatórios por ticket em `docs/testes/`.

---

## Referências

- Especificação: [`TICKETS_CURSOR_DANIEL_JORGE.md`](../TICKETS_CURSOR_DANIEL_JORGE.md)
- Mapa: [`docs/mapa-do-projeto.md`](mapa-do-projeto.md)
- Testes: [`docs/testes/roteiro-qa-t21.md`](testes/roteiro-qa-t21.md), [`src/test/fluxos-permissoes.integracao.test.ts`](../src/test/fluxos-permissoes.integracao.test.ts)
- Relatórios parciais: `docs/testes/relatorio-testes-dashboard-t18.md`, `relatorio-testes-juridico-t17.md`, `relatorio-testes-relatorios-t19.md`
