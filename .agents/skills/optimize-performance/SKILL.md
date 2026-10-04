---
name: optimize-performance
description: Analisar gargalos e otimizar desempenho — frontend, backend, APIs, PostgreSQL, cache, paginação, recursos estáticos e animações. Use ao otimizar o sistema, melhorar carregamento de páginas, reduzir latência de API, otimizar consultas SQL, corrigir lentidão em telas/dashboards/listagens, reduzir CPU/memória/requisições ou implementar melhorias mensuráveis quando solicitado.
---

# Otimização de desempenho

Atuar como engenheiro especializado em performance de aplicações web: identificar gargalos reais e implementar melhorias **mensuráveis**, sem comprometer segurança, estabilidade, UX ou funcionalidades existentes.

**Princípio fundamental:** medir antes de otimizar, corrigir a causa raiz e validar o resultado depois da mudança.

**Escopo padrão:** investigar e diagnosticar antes de alterar código. Implementar otimizações somente quando o usuário solicitar (ou após apresentar plano e obter concordância em mudanças arriscadas). Não inventar métricas nem afirmar ganhos não comprovados.

## Quando usar

- Otimizar o desempenho do sistema; melhorar velocidade de carregamento das páginas.
- Reduzir tempo de resposta da API; otimizar consultas PostgreSQL.
- Corrigir lentidão em telas, componentes, dashboards e relatórios.
- Otimizar tabelas, listagens, filtros e pesquisas.
- Reduzir consumo de memória e CPU; requisições desnecessárias.
- Melhorar renderização do frontend; imagens, fontes, scripts e estilos.
- Desempenho em mobile; reduzir payload ao navegador.
- Otimizar animações e transições; operações repetitivas no backend.
- Alta utilização; vazamentos de memória; gargalos de processamento e banco.
- Implementar cache quando apropriado.
- Melhorar performance **sem reescrever** o projeto.

## Comportamento no Cursor

| Pedido do usuário | Ação |
|-------------------|------|
| «Otimize o sistema» | Investigar gargalos reais **antes** de modificar código. |
| «A página está lenta» | Carregamento, renderização, requisições e dados recebidos. |
| «O dashboard está lento» | Consultas, agregações, API, gráficos e volume de dados. |
| «Otimize o PostgreSQL» | Consultas, planos de execução, índices e conexões. |
| «Reduza o consumo de recursos» | O quê, quais componentes e em quais condições. |
| «Melhore a performance sem mudar o visual» | Preservar layout, animações e identidade; só o necessário. |
| Otimização específica | Focar no escopo; avaliar impacto em funcionalidades relacionadas. |

Escopo claro: prosseguir sem perguntas desnecessárias. Falta de informação para mudança arriscada: pedir esclarecimento.

---

## Análise obrigatória antes de otimizar

Antes de implementar qualquer otimização:

1. Estrutura do projeto; tecnologias e frameworks.
2. Arquitetura frontend e backend; principais fluxos de dados.
3. Componentes e endpoints envolvidos; comunicação frontend ↔ API ↔ PostgreSQL.
4. Dependências que afetem desempenho.
5. Gargalos prováveis: renderização, rede, processamento, banco.
6. Cache, paginação, lazy loading e otimizações já existentes.
7. Operações repetitivas, consultas excessivas e processamento desnecessário.
8. Métricas, logs e ferramentas de diagnóstico disponíveis.
9. Impacto das alterações em outras funcionalidades.

Não presumir que o problema está no frontend ou no banco **sem evidências**.

Não introduzir bibliotecas ou ferramentas novas antes de avaliar se a stack atual já resolve.

---

## Diagnóstico e medição

Priorizar identificação objetiva de gargalos. Sempre que possível, estabelecer **referência inicial** antes de mudanças.

Métricas relevantes (quando aplicável):

- Carregamento inicial; tempo até primeira renderização.
- Tempo de resposta de APIs; latência PostgreSQL.
- Quantidade de requisições HTTP; volume transferido.
- Tamanho de JS/CSS; CPU e memória; tempo de tarefas.
- Consultas por operação; taxa de erros; conexões do banco.
- Frequência de re-renderizações; Core Web Vitals.

Usar perfis, métricas de navegador, logs, ferramentas do framework e análise do banco quando disponíveis.

**Não** inventar números ou resultados. Sem ambiente adequado para medição: explicar limitação e usar evidências técnicas, sem afirmar ganhos não comprovados.

---

## Frontend

Identificar e corrigir problemas no navegador. Analisar:

- Re-renderizações desnecessárias; componentes complexos; estado que dispara updates.
- Processamento repetido na renderização; listas grandes sem virtualização quando necessária.
- Dependências pesadas; scripts bloqueantes; imagens pesadas ou mal dimensionadas.
- Fontes e recursos bloqueantes; CSS/JS não utilizados.
- Requisições repetidas; bloqueio da thread principal; operações síncronas custosas.
- Vazamentos de memória; DOM ineficiente; componentes que podem carregar depois.

Quando apropriado (cada uma resolve problema identificado):

- Code splitting; lazy loading; importações dinâmicas.
- Memoização só em cálculos **realmente** custosos.
- Debounce/throttle; virtualização de listas.
- Otimização de imagens; carregamento progressivo; preload seletivo.
- Redução de dependências; remoção de código morto; divisão de componentes grandes.
- Cache no cliente adequado.

**Não** aplicar memoização, lazy loading ou técnicas similares indiscriminadamente. Evitar complexidade sem benefício mensurável.

---

## Interface e experiência do usuário

Preservar aparência, usabilidade e identidade visual. Verificar:

- Travamentos em interações; modais, menus e dropdowns lentos.
- Filtros e pesquisas; dashboards; gráficos; listagens extensas.
- Formulários com validação custosa; animações com queda de FPS.
- Layout shift; recursos que bloqueiam interação; comportamento mobile.

Objetivo: sistema **parecer** rápido e responder rápido.

Quando apropriado: loading states, feedback imediato, atualização otimista — com consistência no backend e tratamento de falhas.

**Não** simplificar interface ou remover recursos visuais só para inflar métricas.

---

## GSAP, Motion.dev, Three.js e Anime.js

Se o projeto usar animação ou gráficos 3D, avaliar impacto:

- Animações simultâneas; custo de render; propriedades que causam layout/paint.
- Blur, sombras e filtros excessivos; GPU; objetos animados.
- Animações fora da viewport; init desnecessária de cenas; cleanup ao desmontar.
- Listeners; loops; vazamentos; dispositivos menos potentes.

Quando possível:

- Preferir `transform` e `opacity`; `requestAnimationFrame` quando adequado.
- Pausar animações custosas fora da viewport; limpar timelines e listeners.
- Reduzir complexidade Three.js; evitar render contínuo desnecessário.
- Respeitar `prefers-reduced-motion`.

**Não** remover animações sem necessidade técnica ou autorização.

---

## Backend

Analisar processamento no servidor:

- Operações repetitivas; loops com consultas (N+1 no app).
- Chamadas externas sequenciais paralelizáveis; processamento pesado síncrono.
- Serialização de grandes volumes; validações redundantes; consultas repetidas em serviços.
- Gargalos de escrita; bloqueios; CPU/memória; vazamentos; conexões não liberadas.
- Tarefas que deveriam ser background; concorrência; relatórios e exportações.

Quando apropriado:

- Reutilizar resultados válidos; reduzir chamadas; lotes; paralelismo independente.
- Filas para tarefas longas; paginação; streaming; payloads menores.
- Controle de concorrência; limites; liberação de recursos.

**Não** introduzir filas, microserviços ou distribuição quando solução simples bastar. Preservar consistência, ordem e regras de negócio.

---

## APIs

Por endpoint:

- Tempo de resposta; consultas por requisição; payloads grandes.
- Consultas duplicadas; integrações lentas; campos desnecessários.
- Ausência de paginação; filtros no lugar errado; falta de limites.
- Processamento repetido; contenção; cache ausente onde faz sentido; compressão.

Implementar quando apropriado:

- Paginação no servidor; seleção de campos; filtros/ordenação no banco.
- Respostas menores; cache com invalidação correta; compressão HTTP.
- Timeouts em integrações; deduplicação; atualização incremental; limites de concorrência.

**Não** remover validação, autenticação ou autorização por latência.

**Não** reduzir dados retornados incompatível com contratos existentes sem avaliar consumidores.

---

## PostgreSQL

Gargalos em consultas, índices, conexões e estrutura:

- Consultas lentas; full table scans; índices ausentes, inadequados, duplicados ou ociosos.
- N+1; JOINs ineficientes; ordenações custosas; filtros sem índice.
- Subconsultas desnecessárias; `SELECT *` excessivo; bloqueios; transações longas.
- Pool mal configurado; consultas repetidas; tabelas/índices grandes.
- Paginação ineficiente.

Quando apropriado (ambientes seguros):

- `EXPLAIN` / `EXPLAIN ANALYZE`; revisar planos.
- Índices direcionados a consultas reais; compostos; parciais quando justificado.
- Otimizar JOINs e agregações; colunas necessárias; paginação; lotes.
- Ajustar pool; revisar isolamento; estatísticas do PostgreSQL.
- Particionamento **somente** quando volume e padrão de acesso justificarem.

Considerar seletividade, cardinalidade, distribuição e padrões de acesso antes de índices.

**Não** criar índices indiscriminadamente.

**Não** alterar tipos, chaves, constraints ou relacionamentos sem impacto em dados existentes.

**Não** manutenção bloqueante em produção sem autorização e planejamento.

---

## Cache e gerenciamento de dados

Avaliar cache para trabalho repetitivo. Considerar:

- Navegador; HTTP; consultas; backend; sessões; relatórios.
- Revalidação; invalidação após alterações; expiração; consistência entre instâncias.

Antes de implementar, definir:

1. Quais dados podem ser cacheados.
2. TTL e validade.
3. Como alterações invalidam.
4. Como evitar dados desatualizados.
5. Isolamento entre usuários (sem vazamento).
6. Comportamento quando o cache falha.

**Não** cachear sensíveis em caches públicos.

**Não** usar cache para contornar autorização.

**Não** introduzir Redis ou infra extra sem justificativa técnica concreta.

---

## Paginação, filtros e grandes volumes

Evitar carregar conjuntos desnecessários. Analisar:

- Listagens admin; clientes; histórico; transações; relatórios; dashboards; busca; exportações.

Quando apropriado:

- Paginação no servidor; limites máximos; cursor pagination em conjuntos grandes.
- Filtros no banco; não carregar tudo para filtrar no frontend.
- Endpoints sem limites indevidos; índices alinhados a filtros frequentes.
- Carregamento progressivo; virtualização no frontend.

Respeitar ordenação estável e requisitos funcionais.

Cuidado com perda/duplicação de registros em atualização concorrente, quando relevante.

---

## Imagens, arquivos e estáticos

- Imagens oversized; formatos inadequados; duplicatas; fontes extras.
- JS/CSS grandes; cache estático; lazy load fora da viewport.
- Vídeos/animações na inicialização; imagens sem dimensões (CLS).

Quando apropriado: formatos modernos; redimensionar; lazy load; cache; remover não usados; split de bundles; otimizar fontes.

**Não** degradar qualidade visual sem necessidade.

---

## Segurança durante otimizações

**Nunca:**

- Remover autenticação ou autorização por latência.
- Eliminar validações importantes ou proteção contra abuso sem avaliar risco.
- Expor mais dados para evitar chamadas.
- Cache compartilhado entre usuários sem isolamento.
- Cache público de senhas ou tokens.
- SQL inseguro; ignorar erros para inflar métricas; desligar logs críticos sem alternativa.

Otimização que afete permissões, isolamento ou integridade: avaliar risco antes.

---

## Preservação da arquitetura

Regras obrigatórias:

- Não recriar o projeto; não reescrever módulos inteiros sem justificativa.
- Não alterar design sem necessidade; não remover funcionalidades por métricas.
- Não dependências desnecessárias; não duplicar cache.
- Não alterar contratos de API silenciosamente.
- Não modificar banco sem avaliar migração; não remover índices/constraints sem evidência.
- Não mudar regras de negócio para facilitar otimização.
- Preservar compatibilidade; seguir convenções do projeto.

Priorizar alterações pequenas, direcionadas, reversíveis e fáceis de validar.

---

## Processo obrigatório

### Fase 1 — Diagnóstico

Problema relatado; componentes; fluxos; métricas; gargalos prováveis; causa vs sintoma.

### Fase 2 — Referência

Medir comportamento inicial quando possível; registrar métricas, cenários, ambiente, volume de dados e limitações.

### Fase 3 — Planejamento

Priorizar gargalos; estimar impacto; riscos de regressão; alternativas simples antes de mudança arquitetural; critérios de validação.

### Fase 4 — Implementação

Causa raiz; menor alteração eficaz; segurança e regras de negócio; evitar otimização especulativa; atualizar testes quando necessário.

### Fase 5 — Validação

Testes pertinentes; comparar com referência; funcionalidade; efeitos colaterais; regressão de segurança; documentar limitações e resultados.

### Fase 6 — Entrega

O que mudou, por quê, resultados observados e recomendações.

---

## Testes e regressões

Quando apropriado:

- Unitários; integração; endpoints; consultas; paginação; concorrência.
- Renderização; carregamento; regressão funcional; segurança afetada.

Otimização concluída **não** significa código menor ou mais simples — exige comportamento real e requisitos atendidos.

**Não** afirmar melhoria sem comparação confiável ou evidências suficientes.

---

## Priorização

| Prioridade | Critério |
|------------|----------|
| **Crítica** | Indisponibilidade, timeouts frequentes, consumo excessivo, falhas operacionais relevantes. |
| **Alta** | Fluxos principais, consultas frequentes, páginas mais usadas prejudicadas. |
| **Média** | Componentes específicos, relatórios, telas secundárias, operações menos frequentes. |
| **Baixa** | Ajustes menores, preventivos, benefício limitado. |

Considerar: frequência de uso, impacto, custo, risco de regressão, manutenção, evidências, ganho esperado.

Evitar micro-otimizações quando houver gargalo estrutural maior.

---

## Formato obrigatório do relatório

### Resumo

Problema; causa raiz (se confirmada); impacto; prioridade.

### Diagnóstico

Componentes; gargalos; evidências e métricas; limitações.

### Alterações realizadas

Arquivos; consultas/índices; componentes; estratégias; dependências adicionadas/removidas.

### Validação

Testes; resultados; comparação com referência; problemas remanescentes; efeitos colaterais.

### Próximos passos

Melhorias recomendadas; gargalos restantes; monitoramento; ações que dependem de infra ou autorização.

Se nenhuma melhoria relevante for identificada, declarar claramente — **não** introduzir alterações desnecessárias.
