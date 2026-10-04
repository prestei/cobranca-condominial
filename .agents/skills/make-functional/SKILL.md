---
name: make-functional
description: Transforma interfaces visuais em funcionalidades reais com PostgreSQL, APIs, regras de negócio, autenticação, validações e integração frontend-backend. Use ao tornar tela funcional, implementar CRUD, migrations, conectar banco, substituir mocks, criar endpoints, autenticação, filtros/paginação, formulários com persistência, integrações externas ou corrigir falhas entre frontend, API e banco.
disable-model-invocation: true
---

# make-functional

Atuar como desenvolvedor backend sênior: analisar o projeto existente, respeitar a arquitetura e implementar funcionalidades completas, seguras, integradas e persistentes.

**Escopo desta skill:** instruções de workflow e padrões. Não implementar funcionalidades específicas do sistema a menos que o usuário solicite explicitamente em outra mensagem.

## Quando aplicar

- Tornar uma tela funcional
- Implementar lógica de negócio
- Criar ou integrar endpoints
- Conectar o frontend ao backend
- Operações CRUD
- Tabelas, relacionamentos e migrations
- Conectar e configurar PostgreSQL
- Autenticação e autorização
- Sistemas administrativos
- Filtros, buscas, paginação e ordenação
- Formulários com persistência real
- Substituir dados fictícios por integrações reais
- Integrar serviços externos
- Validações e tratamento de erros
- Investigar e corrigir problemas entre frontend, API e banco

## Regra fundamental

Nunca recrie desnecessariamente uma estrutura que já existe, nunca substitua tecnologias sem justificativa e nunca remova funcionalidades existentes para facilitar uma implementação.

**Não presuma a stack.** Descubra tecnologias, frameworks e bibliotecas antes de decidir.

## FASE 1 — Diagnóstico (obrigatório antes de implementar)

1. Analisar a estrutura completa do projeto
2. Identificar tecnologias, linguagens, frameworks e bibliotecas
3. Identificar arquitetura atual do frontend e backend
4. Verificar se já existe API e como está organizada
5. Identificar configuração do PostgreSQL ou necessidade de configurar
6. Analisar modelos, tabelas, migrations, entidades e relacionamentos
7. Verificar padrões de autenticação, autorização e tratamento de erros
8. Identificar componentes, telas e funcionalidades existentes
9. Localizar mocks, arrays estáticos e funções simuladas a substituir
10. Verificar dependências e bibliotecas instaladas

Examinar arquivos relacionados, entender o funcionamento atual, componentes afetados, riscos e dependências.

## FASE 2 — Planejamento

- Definir alterações necessárias
- Identificar mudanças no banco
- Identificar endpoints e regras de negócio
- Considerar impactos sobre funcionalidades existentes

Se uma regra de negócio estiver ambígua e puder comprometer dados ou comportamento, explicar a dúvida e pedir esclarecimento antes de decisões irreversíveis.

## FASE 3 — Implementação

Fluxo ponta a ponta para cada funcionalidade solicitada:

1. Analisar a tela e o comportamento desejado
2. Identificar os dados necessários
3. Definir ou adaptar modelos de dados
4. Criar migrations quando necessário
5. Implementar regras de negócio (no backend, não contornáveis pelo frontend)
6. Criar ou adaptar serviços/repositórios conforme a arquitetura existente
7. Implementar endpoints da API
8. Validação de entrada e saída
9. Autenticação e autorização quando necessárias
10. Integrar o frontend à API real
11. Estados de carregamento, sucesso, erro e ausência de dados
12. Validar dados persistidos no PostgreSQL
13. Testes e verificações pertinentes
14. Corrigir problemas identificados
15. Documentar o que foi implementado

**Conclusão:** funcionalidade só está completa quando o fluxo de dados está integrado e funcionando — não basta botão responder ou tela exibir dados estáticos.

### PostgreSQL (banco principal)

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
- Respostas JSON consistentes
- Tratamento centralizado de exceções quando o projeto usar
- Paginação/filtros no servidor
- Documentação e versionamento se já existirem na arquitetura
- Proteção contra requisições não autorizadas; rate limiting em operações sensíveis quando necessário

Evitar concentrar toda regra de negócio em controladores/rotas; separar responsabilidades proporcionalmente à complexidade, sem camadas desnecessárias.

### Autenticação, autorização e segurança

Requisito obrigatório quando aplicável:

- Autenticação segura; hash de senhas adequado
- Autorização por permissões/papéis; verificação de propriedade do recurso
- Isolamento de dados (multiusuário/multiempresa) em todas as operações relevantes no servidor
- Validação e sanitização no backend — nunca confiar só no frontend
- SQL injection, exposição de dados sensíveis, CORS restritivo e compatível
- Sessões/cookies/tokens adequados; logs sem senhas, tokens ou segredos
- Reutilizar mecanismo de auth existente; não reinventar sem necessidade técnica comprovada

### Regras de negócio (antes de codar)

Identificar: regras obrigatórias, condições, informações necessárias, estados do processo, operações por estado, permissões, erros possíveis, operações atômicas, dados de auditoria/histórico.

### Integração com o frontend

- Substituir mocks por chamadas reais quando solicitado
- Formulários ligados a endpoints; carregar dados ao abrir páginas/componentes
- Atualizar UI após sucesso; listagens após create/update/delete
- Filtros, busca, paginação e ordenação reais
- Preservar layout e identidade visual; sem alterações visuais desnecessárias
- Erros da API compreensíveis para o usuário; sem credenciais no cliente

### Tratamento de erros e observabilidade

Tratar de forma consistente: dados inválidos, campos ausentes, não encontrado, duplicado, falha de auth, falta de permissão, conflito de estado, falha de DB/transação, serviços externos indisponíveis, erros inesperados.

Mensagens ao usuário claras, sem detalhes internos. Logs úteis para diagnóstico. Proibido: sucesso falso, dados inventados, `catch` vazio.

## FASE 4 — Validação

- Usar mecanismos de teste existentes no projeto
- Priorizar: unitários (regras importantes), integração (endpoints/DB), auth/isolamento, validação, CRUD, cenários de erro, migrations
- Compilação, lint e tipos quando aplicável
- Não afirmar que testou sem executar; não usar produção em testes destrutivos
- Se não houver infraestrutura, informar limitação e o que falta validar

## FASE 5 — Entrega

Resumo obrigatório:

- O que foi implementado
- Arquivos criados ou modificados
- Alterações no PostgreSQL
- Endpoints criados ou alterados
- Testes executados e resultados
- Variáveis de ambiente necessárias
- Comandos manuais pendentes
- Pendências ou limitações

## Preservação do projeto

- Não recriar o projeto do zero
- Não apagar arquivos ou remover funcionalidades para contornar erros
- Não substituir componentes visuais sem justificativa
- Não alterar contratos de API silenciosamente
- Não introduzir dependências desnecessárias; não duplicar lógica
- Não usar dados estáticos como persistência real
- Não desativar validações ou segurança para “fazer funcionar”
- Sem alterações destrutivas em ambientes compartilhados/produção
- Compatibilidade com módulos existentes; convenções de nomenclatura e organização do repositório
- Se a alteração afetar outras partes, analisar impacto antes

## Qualidade do código

Legível, manutenível, tipado quando a linguagem permitir, seguro, testável, consistente com o projeto, responsabilidades separadas, erros explícitos, nomes expressivos. Arquitetura proporcional ao tamanho do projeto — sem abstrações complexas para casos simples.

## Comportamento no Cursor

| Pedido do usuário | Ação |
|-------------------|------|
| “Faça o cadastro funcionar” | Fluxo completo: entrada → persistência PostgreSQL → resposta na UI |
| “Crie editar” | Auth, validação, update no banco, reflexo na interface |
| “Corrija esse erro” | Causa raiz; não mascarar |
| “Conecte com o banco” | Config, modelos, conexão, consultas |
| “Implemente o backend” | Arquitetura da stack existente; padrões do projeto |

Se o escopo estiver claro, prosseguir sem perguntas desnecessárias. Perguntar quando faltar informação que altere significativamente arquitetura, segurança ou regras de negócio.

## Resultado esperado

Priorizar funcionalidade real, integridade dos dados, segurança, integração frontend-backend, qualidade do código e preservação da arquitetura existente, com PostgreSQL como banco principal.
