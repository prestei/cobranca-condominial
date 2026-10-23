---
name: make-functional
description: Torna telas e módulos totalmente funcionais com PostgreSQL, APIs reais e regras no servidor — sem mocks, seeds em memória ou dados fictícios como fonte de verdade. Inclui filtros de listagem, exportação (CSV/XLS/PDF) e importação de arquivos quando a tela ou módulo expõe esses controles. Use ao implementar CRUD, migrations, auth, integração frontend-backend, substituir catalogo/arrays estáticos, ou corrigir fluxos que ainda não persistem de verdade.
disable-model-invocation: true
---

# make-functional

Atuar como desenvolvedor backend sênior: analisar o projeto existente, respeitar a arquitetura e implementar funcionalidades **completas, seguras, integradas e persistentes em PostgreSQL**.

**Escopo desta skill:** instruções de workflow e padrões. Não implementar funcionalidades específicas do sistema a menos que o usuário solicite explicitamente em outra mensagem.

**Documentação:** toda implementação deve seguir `.agents/skills/_shared/documentacao-modulo.md`, incluindo **`docs/mapa-do-projeto.md`**. Entrega sem doc de módulo, mapa e docs transversais atualizados quando couber está **incompleta**.

**Convenções de código:** `.agents/skills/_shared/code-conventions.md` — pastas, arquivos, variáveis, tipos, endpoints e chaves JSON em **inglês**; textos de UI e arquivos em `docs/` em **português**.

## Política de dados reais (obrigatória)

**Não conservar, não “conviver” e não deixar como atalho qualquer dado falso, mockado ou simulado** que alimente telas, APIs ou regras de negócio.

| Proibido como fonte de verdade | Obrigatório |
| --- | --- |
| Arrays estáticos, `catalogo.ts` em memória, `set*` no cliente como persistência | PostgreSQL + camada de acesso (repositório/serviço) já usada no projeto |
| Listagens/formulários preenchidos com JSON hardcoded na página | `fetch`/server actions → API → banco |
| Funções que retornam dados inventados ou “sucesso falso” | Resposta baseada em leitura/escrita real no banco |
| APIs que só atualizam estado em memória no servidor | Mutations que commitam no PostgreSQL |
| Seeds que reaparecem após delete/update (merge em memória) | Dados sob controle do banco; seed só via migration/seed versionado, se necessário |
| Comentários do tipo “até ligar PostgreSQL” deixando mock ativo | Módulo só encerra quando o fluxo usa o banco |

**Permitido (não é “dado de negócio”):**

- Placeholders em `.env.example` (sem segredos reais).
- Estados vazios de UI (“Nenhum registro”), loading e erro quando o banco está vazio.
- Seeds **no banco** via migration ou script de seed documentado (ambiente local/dev), nunca como lista fixa consumida pela aplicação em runtime.
- Testes automatizados com fixtures isoladas em arquivos de teste — não vazar para `src/app` ou APIs de produção.

**Definição de “funcional” nesta skill:** usuário executa o fluxo na UI → API valida e autoriza → **PostgreSQL persiste ou consulta** → UI reflete o estado real após reload ou refetch. Sem isso, a entrega está **incompleta**, mesmo com build e TypeScript ok.

## Quando aplicar

- Tornar uma tela funcional de ponta a ponta
- Implementar lógica de negócio persistida
- Criar ou integrar endpoints ligados ao banco
- Conectar o frontend ao backend real
- Operações CRUD com migrations
- Conectar e configurar PostgreSQL
- Autenticação e autorização com usuários reais no banco
- Filtros, buscas, paginação e ordenação (no servidor quando a listagem for grande)
- **Filtros** da `FilterBar` aplicando de verdade ao conjunto exibido (métricas, tabela e exportação)
- **Exportação** pelos formatos do menu **Exportar** da tabela (`csv`, `xls`, `pdf`)
- **Importação** de arquivos com processamento e persistência (módulo `/imports` ou fluxo equivalente)
- Formulários com persistência real
- **Eliminar** mocks, catálogo em memória e dados fictícios do módulo
- Integrar serviços externos
- Validações e tratamento de erros
- Investigar e corrigir problemas entre frontend, API e banco

## Regra fundamental

Nunca recrie desnecessariamente uma estrutura que já existe, nunca substitua tecnologias sem justificativa e **nunca mantenha mocks ou dados fictícios** para “entregar mais rápido” ou preservar demonstrações.

**Não presuma a stack.** Descubra tecnologias, frameworks e bibliotecas antes de decidir.

## FASE 1 — Diagnóstico (obrigatório antes de implementar)

1. Analisar a estrutura completa do projeto
2. Identificar tecnologias, linguagens, frameworks e bibliotecas
3. Identificar arquitetura atual do frontend e backend
4. Verificar se já existe API e como está organizada
5. Identificar configuração do PostgreSQL ou **configurar** se ausente
6. Analisar modelos, tabelas, migrations, entidades e relacionamentos
7. Verificar padrões de autenticação, autorização e tratamento de erros
8. Identificar componentes, telas e funcionalidades existentes
9. **Inventariar e planejar remoção** de: mocks, `src/lib/catalog` (estado em memória), arrays estáticos, `useCatalog`/`set*` como persistência, merges de seed em memória, handlers que não tocam o banco
10. **Inventariar controles ainda decorativos:** `FilterBar` sem efeito, `Table`/`ResponsiveTable` com `onExport` vazio ou ausente, importação que só grava metadados sem ler o arquivo, exportação que ignora filtros ou permissão `exportar`
11. Verificar dependências e bibliotecas instaladas
12. Ler **`docs/modulos/<slug>.md`** do(s) módulo(s) afetado(s) e **`docs/banco.md`** / **`docs/regra-negocio.md`** quando existirem

Examinar arquivos relacionados, entender o funcionamento atual, componentes afetados, riscos e dependências. Se o módulo ainda lê dados fictícios, tratar isso como **bloqueador**, não como pendência opcional.

## FASE 2 — Planejamento

- Definir alterações no **schema** e migrations
- Definir endpoints, serviços/repositórios e regras de negócio no servidor
- Planejar **retirada** das fontes mockadas (incluindo atualizar `docs/mapa-do-projeto.md` para apontar tabelas/API, não `catalogo.ts`)
- Considerar impactos sobre outros módulos que ainda importam dados fictícios
- Planejar atualização de **`docs/modulos/<slug>.md`**, **`docs/banco.md`**, **`docs/regra-negocio.md`**, **`docs/stack.md`**

Se uma regra de negócio estiver ambígua e puder comprometer dados ou comportamento, explicar a dúvida e pedir esclarecimento antes de decisões irreversíveis.

## FASE 3 — Implementação

Fluxo ponta a ponta para cada funcionalidade solicitada:

1. Analisar a tela e o comportamento desejado
2. Identificar os dados necessários e tabelas em `docs/banco.md`
3. Criar ou adaptar modelos e **migrations**
4. Implementar regras de negócio no backend (não contornáveis pelo frontend)
5. Implementar serviços/repositórios com consultas parametrizadas ao PostgreSQL
6. Implementar endpoints da API (ou server actions, se for o padrão do projeto)
7. Validação de entrada e saída; nunca expor hash de senha ou segredos
8. Autenticação e autorização quando necessárias
9. Integrar o frontend **somente** via API/banco — remover leitura de mocks na página
10. Estados de carregamento, sucesso, erro e lista vazia
11. **Confirmar no PostgreSQL** (query ou ferramenta do projeto) que create/update/delete refletem no banco
12. Remover ou esvaziar uso de catálogo/mock no módulo; não deixar código morto “para depois”
13. Testes e verificações pertinentes
14. Corrigir problemas identificados
15. **Documentar** conforme `.agents/skills/_shared/documentacao-modulo.md`:
    - Atualizar ou criar **`docs/modulos/<slug>.md`** (rotas, API, fluxos, permissões, estados; persistência = PostgreSQL)
    - Atualizar **`docs/banco.md`** para schema, migrations e relacionamentos
    - Atualizar **`docs/regra-negocio.md`** para regras e validações alteradas
    - Atualizar **`docs/stack.md`** (`DATABASE_URL`, comandos de migrate/seed)
    - Registrar módulo novo em **`docs/modulos/README.md`**
    - Atualizar **`docs/mapa-do-projeto.md`** (linha do módulo sem “mock em catalogo” como fonte)

**Conclusão:** funcionalidade só está completa com **dados reais no PostgreSQL**, fluxo integrado, mocks eliminados do caminho do usuário **e** documentação alinhada.

### Filtros, exportação e importação

Quando a listagem ou o módulo já exibe `FilterBar`, menu **Exportar** na tabela ou fluxo de importação, **make-functional** exige que esses controles funcionem de ponta a ponta — não apenas CRUD em sheet.

#### Filtros (`FilterBar`)

- Seguir `docs/design-system.md` (seção **Filtros**) e o padrão de referência em **`src/app/condominiums/page.tsx`**: campos em estado de **rascunho**; **Filtrar** copia para estado **aplicado** e volta para a página 1; **Limpar** zera rascunho e aplicado e volta para a página 1.
- Métricas (`CardMetricRow`) refletem o **conjunto filtrado inteiro**, não só a página visível.
- Tabela e paginação operam sobre o mesmo conjunto filtrado; ordenação consistente com os filtros aplicados.
- Ao migrar para API: os mesmos critérios vão em **query params** (ou body de busca) no servidor; paginação e ordenação no PostgreSQL quando o volume exigir — não carregar tudo só para filtrar no cliente (ver também skill `optimize-performance`).
- `EmptyState` distingue “sem registros no sistema” de “nenhum resultado com estes filtros”.

#### Exportação (`Table` / `ResponsiveTable`)

- UI: prop `onExport` com tipo `TableExportFormat` (`"csv" | "xls" | "pdf"`) — menu **Exportar** em `@/components/table.tsx`.
- Implementação no cliente: reutilizar **`@/lib/export`** — `exportarCsv` (separador **`;`**, BOM UTF-8, Excel pt-BR), `exportarExcel` (`.xls`), `exportarPdf` (impressão / salvar como PDF no navegador).
- Exportar o **recorte filtrado completo** (todas as linhas que passam nos filtros aplicados), **não** só a página atual da paginação.
- Colunas e rótulos alinhados à tabela e à proposta; nome de arquivo com data (`entidade-AAAA-MM-DD`).
- Lista vazia após filtro: toast informativo (ex.: “Nada para exportar”), sem arquivo vazio enganoso.
- **Permissão:** quando o módulo usa matriz de permissões, respeitar `exportar` (`usePermissao` / checagem no servidor em exportações via API). Sem permissão: ocultar exportação (`showExport={false}`) ou não expor endpoint.
- Volume muito grande: endpoint de exportação assíncrona ou streaming no servidor, com os **mesmos filtros** da listagem — não duplicar regra de filtro só no frontend.

Referência de comportamento (ainda que em catálogo): `aoExportar` e `linhasExportacao` em `src/app/condominiums/page.tsx`.

#### Importação

- Telas em **`/imports`** (`src/app/imports/page.tsx`) ou upload contextual no módulo: o arquivo enviado deve ser **lido, validado e processado**; efeito persistido no PostgreSQL (débitos, unidades, etc.), não apenas registro manual de nome/contadores no catálogo.
- Fluxo mínimo: seleção/upload → validação (tipo, tamanho, colunas) → processamento (transação quando várias tabelas) → feedback (importados, atualizados, erros por linha ou resumo) → listagem/histórico refletindo o banco após reload.
- Integrações com administradoras (Superlógica, etc.): skill **`create-integration`** + `docs/modulos/importacoes.md` / `integracao-*`.
- Erros de linha não devem corromper lote inteiro sem regra de negócio explícita; registrar auditoria quando o projeto já usar trilha de auditoria.

**Incompleto:** menu Exportar que só fecha; Filtrar que não altera métricas/tabela; importação que aceita arquivo mas não altera dados de negócio; exportação que ignora filtros ou permissão.

### PostgreSQL (banco principal — obrigatório)

- Conexões seguras; credenciais em variáveis de ambiente
- Reutilizar mecanismo de acesso a dados existente (Prisma, Drizzle, TypeORM, Sequelize, etc.)
- Não introduzir segundo ORM sem justificativa técnica concreta
- Tabelas, colunas, índices, PK/FK, relacionamentos, restrições de integridade
- Migrations versionadas e reproduzíveis; preservar dados existentes em alterações de estrutura
- CRUD; transações quando múltiplas alterações dependem umas das outras
- Paginação, filtros e ordenação no servidor quando necessário
- Consultas parametrizadas (SQL injection); evitar N+1 e consultas ineficientes
- Valores monetários com tipos adequados (evitar float inadequado para financeiro)
- Datas, horários, fusos e defaults corretos
- Soft delete somente quando fizer sentido para o negócio

**Configuração e segurança do banco**

- Nunca senhas ou URL de conexão no código ou expostas ao frontend
- `.env` fora do controle de versão; `.env.example` com valores fictícios
- Sem comandos destrutivos sem autorização explícita
- Não apagar tabelas/registros para contornar erros de implementação
- Não executar migrations destrutivas automaticamente em produção

### APIs e endpoints

Seguir padrões já estabelecidos no projeto:

- Métodos HTTP e códigos de status adequados
- Validação de params, body e query
- Respostas JSON consistentes com o que está no banco
- Tratamento centralizado de exceções quando o projeto usar
- Paginação/filtros no servidor quando aplicável
- Proteção contra requisições não autorizadas; rate limiting em operações sensíveis quando necessário

Evitar concentrar toda regra de negócio em controladores/rotas; separar responsabilidades proporcionalmente à complexidade, sem camadas desnecessárias.

### Autenticação, autorização e segurança

Requisito obrigatório quando aplicável:

- Autenticação segura; hash de senhas adequado; usuários e cargos no banco
- Autorização por permissões/papéis; verificação no servidor em toda mutação e leitura sensível
- Isolamento de dados (multiusuário/multiempresa) em todas as operações relevantes no servidor
- Validação e sanitização no backend — nunca confiar só no frontend
- Sessões/cookies/tokens adequados; logs sem senhas, tokens ou segredos

### Regras de negócio (antes de codar)

Identificar: regras obrigatórias, condições, informações necessárias, estados do processo, operações por estado, permissões, erros possíveis, operações atômicas, dados de auditoria/histórico.

### Integração com o frontend

- **Remover** mocks e sincronização com catálogo em memória no módulo entregue
- Formulários ligados a endpoints; carregar dados ao abrir páginas/componentes
- Atualizar UI após sucesso; listagens após create/update/delete (refetch ou resposta da API)
- Filtros, busca, paginação e ordenação alinhados ao que o servidor expõe
- Preservar layout e identidade visual; sem alterações visuais desnecessárias
- Erros da API compreensíveis para o usuário; sem credenciais no cliente

### Tratamento de erros e observabilidade

Tratar de forma consistente: dados inválidos, campos ausentes, não encontrado, duplicado, falha de auth, falta de permissão, conflito de estado, falha de DB/transação, serviços externos indisponíveis, erros inesperados.

Mensagens ao usuário claras, sem detalhes internos. Logs úteis para diagnóstico.

**Proibido:** sucesso falso, dados inventados na resposta, `catch` vazio, telas que “parecem” salvar sem persistir.

## FASE 4 — Validação

- Compilação, lint e tipos quando aplicável
- Testes existentes no projeto; integração API + PostgreSQL para o módulo
- Cenários: CRUD, validação, auth/permissão, lista vazia, erro de rede/DB
- **Filtros:** aplicar, limpar, métricas e paginação coerentes; recarregar e manter critérios quando vierem da API
- **Exportação:** cada formato gera download ou fluxo PDF; conteúdo bate com filtros aplicados; sem permissão `exportar` não exporta
- **Importação:** arquivo real altera dados esperados no banco; mensagens de sucesso/erro; histórico persistido
- **Recarregar a página** ou repetir GET após mutação e confirmar dados no banco
- Teste no navegador quando o fluxo for de UI (skill `test-browser` se disponível)
- Não afirmar que testou sem executar; não usar produção em testes destrutivos
- Se PostgreSQL não estiver disponível no ambiente, **informar bloqueio** — não declarar módulo funcional com mock

## FASE 5 — Entrega

Resumo obrigatório:

- O que foi implementado
- Arquivos criados ou modificados
- Alterações no PostgreSQL (migrations, tabelas, seeds no banco se houver)
- Endpoints criados ou alterados
- **O que foi removido** de mocks/catálogo/arrays estáticos no módulo
- **Filtros / exportação / importação** — o que passou a funcionar e como (API, `@/lib/export`, permissões)
- Testes executados e resultados (incl. verificação no banco e, se couber, navegador)
- Variáveis de ambiente necessárias (`DATABASE_URL`, etc.)
- Comandos manuais pendentes (`migrate`, `seed`)
- Pendências honestas (apenas o que ficou fora do escopo pedido — não “depois ligamos o banco” no mesmo módulo)
- **Documentação atualizada** (lista de arquivos em `docs/` alterados)

## Preservação do projeto

- Não recriar o projeto do zero
- Não apagar funcionalidades de negócio para contornar erros — corrigir persistência
- Não substituir componentes visuais sem justificativa
- Não alterar contratos de API silenciosamente
- Não introduzir dependências desnecessárias; não duplicar lógica
- **Não** usar dados estáticos ou memória como persistência — nem temporariamente na entrega `make-functional`
- Não desativar validações ou segurança para “fazer funcionar”
- Sem alterações destrutivas em ambientes compartilhados/produção sem autorização
- Compatibilidade com módulos existentes; ao remover mock de um módulo, não quebrar outros sem plano (migrar ou isolar)

## Qualidade do código

Legível, manutenível, tipado quando a linguagem permitir, seguro, testável, consistente com o projeto, responsabilidades separadas, erros explícitos, nomes expressivos. Arquitetura proporcional ao tamanho do projeto — sem abstrações complexas para casos simples.

## Comportamento no Cursor

| Pedido do usuário | Ação |
| --- | --- |
| “Faça o cadastro funcionar” / “make-functional X” | Migration + API + UI; dados só do PostgreSQL; eliminar mock do módulo |
| “Crie editar” | Auth, validação, update no banco, reflexo na interface |
| “Corrija esse erro” | Causa raiz; não mascarar com dado falso |
| “Conecte com o banco” | Config, modelos, conexão, consultas; retirar fonte mock do fluxo |
| “Implemente o backend” | Persistência real; frontend não mantém cópia autoritativa em memória |
| “Faça exportar / importar / filtrar funcionar” | Filtros aplicados + export com `@/lib/export` (recorte filtrado) + import com processamento no PostgreSQL; permissão `exportar` quando couber |

Se o escopo estiver claro, prosseguir sem perguntas desnecessárias. Perguntar quando faltar informação que altere significativamente arquitetura, segurança ou regras de negócio.

## Resultado esperado

Módulo **100% operando com dados reais**: PostgreSQL como única fonte de verdade para o domínio entregue, APIs e telas integradas, **nenhum mock ou dado fictício conservado** no caminho do usuário, documentação e mapa do projeto atualizados.
