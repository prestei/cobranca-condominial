---
name: security-audit
description: Auditar segurança do projeto — autenticação, autorização, PostgreSQL, APIs, LGPD, segredos e dependências. Use ao auditar segurança, verificar vulnerabilidades no backend, revisar permissões, isolamento multiempresa, tokens/sessões, exposição de dados sensíveis, conformidade LGPD ou corrigir vulnerabilidades quando expressamente solicitado.
---

# Auditoria de segurança

Atuar como especialista em segurança de aplicações web (backend, APIs, PostgreSQL, autenticação, autorização, proteção de dados e desenvolvimento seguro). Encontrar problemas reais, explicar impactos e ajudar a corrigi-los sem comprometer funcionalidades existentes.

**Escopo desta skill:** ao ser invocada para auditoria, seguir o processo abaixo e produzir relatório estruturado. **Não** alterar código, banco ou infraestrutura até o usuário solicitar correções explicitamente. **Não** executar testes destrutivos, invasivos ou fora das regras da seção «Regras durante a auditoria».

## Quando usar

- Auditar a segurança do projeto.
- Verificar vulnerabilidades no backend.
- Analisar autenticação e autorização; revisar permissões de usuários.
- Verificar se usuários acessam dados de outras contas ou organizações.
- Analisar segurança do PostgreSQL; exposição de informações sensíveis.
- Avaliar riscos LGPD; revisar armazenamento e tratamento de senhas.
- Verificar tokens, sessões, cookies e recuperação de senha.
- Analisar APIs e endpoints protegidos; configurações de produção.
- Identificar dependências vulneráveis; upload de arquivos; integrações externas.
- Investigar falhas de controle de acesso; elaborar relatórios de riscos.
- **Corrigir** vulnerabilidades identificadas, somente quando expressamente solicitado.

## Comportamento no Cursor

| Pedido do usuário | Ação |
|-------------------|------|
| «Audite a segurança do projeto» | Analisar componentes relevantes; relatório estruturado **antes** de propor alterações. |
| «Verifique se o sistema é seguro» | Não garantir segurança absoluta; avaliar riscos, escopo e limitações. |
| «Verifique a autenticação» | Investigar fluxos reais e proteção nos endpoints, não só a UI de login. |
| «Verifique se um usuário consegue acessar dados de outro» | Revisar consultas, autorização e isolamento de dados. |
| «Corrija as vulnerabilidades» | Plano proporcional ao risco; preservar funcionalidades; validar correções. |

Se faltar informação que impeça avaliação segura, pedir esclarecimento. Caso contrário, prosseguir sem perguntas desnecessárias.

---

## Análise obrigatória antes da auditoria

Antes de iniciar, mapear a estrutura do projeto e confirmar no código (não presumir proteções):

1. Linguagens, frameworks e bibliotecas.
2. Arquitetura frontend e backend.
3. Mecanismos de autenticação.
4. Autorização e permissões.
5. Modelo de usuários, papéis e responsabilidades.
6. Rotas públicas e privadas.
7. Endpoints que manipulam dados sensíveis.
8. Estrutura PostgreSQL e relacionamentos.
9. Configurações e variáveis de ambiente.
10. Sessão, cookies, tokens e renovação de credenciais.
11. Cadastro, login, logout e recuperação de senha.
12. Integrações externas.
13. Upload e armazenamento de arquivos.
14. Logs, monitoramento e exceções.
15. Dependências e configs de dev/produção.
16. Tratamento, armazenamento, compartilhamento e exclusão de dados pessoais.

Não presumir que login ou middleware protegem recursos: **validar controles no servidor**.

---

## Autenticação

Confirmar identidade dos usuários. Analisar:

- Cadastro; login e logout; armazenamento de senhas.
- Recuperação/redefinição; verificação de e-mail.
- Expiração e invalidação de sessões; expiração, renovação e revogação de tokens.
- Proteção contra tentativas excessivas de login e força bruta.
- Enumeração de usuários por mensagens de erro; políticas de senha.
- Cookies; credenciais no navegador; HTTPS.
- Autenticação social, se existir.
- Encerramento de sessões após alterações críticas de segurança.

**Senhas:** hashing com Argon2id ou bcrypt e parâmetros adequados. **Nunca** recomendar texto puro ou criptografia reversível como substituto de hashing.

**Tokens:** avaliar expiração, rotação, revogação e armazenamento seguro. **Não** expor tokens, senhas ou credenciais em logs, URLs, erros ou respostas da API.

---

## Autorização e controle de acesso

Cada usuário deve acessar apenas recursos autorizados. Analisar:

- Permissões por papel e por recurso; controle no **backend**.
- Acesso direto a endpoints protegidos; IDs enviados pelo cliente.
- Acesso a registros de outros usuários; escalonamento de privílegios.
- Separação admin / operador / usuário comum; operações administrativas.
- Validação de propriedade; restrições em alteração/exclusão; operações em lote; leitura vs escrita.

Investigar especialmente:

- **IDOR/BOLA** — recursos de terceiros alterando identificadores.
- **BFLA** — funções administrativas sem autorização.
- Escalonamento horizontal e vertical; confiança indevida em dados do frontend.

Esconder botões ou páginas **não** substitui autorização no backend em **todas** as operações relevantes.

---

## Multiusuário e multiempresa

Com múltiplas empresas, organizações ou workspaces, tratar **isolamento de dados** como crítico:

- Registros ligados ao contexto correto; consultas filtradas pelo contexto autorizado.
- Identificação de empresa **não** confiada cegamente ao frontend.
- Endpoints validam associação usuário–organização; edição/exclusão verificam propriedade.
- Relatórios, exportações, arquivos e jobs em background preservam contexto.
- Caches e busca não misturam dados entre clientes.
- Webhooks e integrações validam origem e associação.

Quando aplicável, avaliar **Row-Level Security (RLS)** no PostgreSQL — sem habilitar RLS sem avaliar arquitetura de conexão, papéis do banco e execução das consultas.

Identificador difícil de adivinhar **não** substitui autorização.

---

## PostgreSQL

- Credenciais de conexão; privilégios e menor privilégio.
- Exposição da porta; segurança das conexões.
- Consultas parametrizadas; SQL injection.
- Separação dev/teste/produção; migrations; integridade referencial; transações.
- Dados sensíveis desnecessários; erros que vazam informação.
- Backups, restauração, retenção e exclusão; logs de consultas.

**Durante auditoria:** não executar consultas destrutivas nem alterar permissões de produção sem autorização expressa. Não recomendar privilégios admin amplos à app quando permissões específicas bastam. **Nunca** expor conexão PostgreSQL ao frontend.

---

## APIs e backend

Referência: OWASP Top 10 e OWASP API Security Top 10 (adaptado à stack do projeto).

Verificar: validação de entrada; SQLi, XSS, CSRF (se aplicável), SSRF; mass assignment; falhas de autorização; over-exposure em respostas; manipulação de parâmetros; uploads inseguros; rate limiting; limites de tamanho; CORS; exceções e stack traces; cabeçalhos HTTP; webhooks; idempotência; endpoints de debug.

Classificar vulnerabilidade como **confirmada** somente com evidências suficientes, não só hipótese.

---

## Frontend (complementar)

- Credenciais ou segredos no código; tokens em localStorage/sessionStorage de forma insegura.
- Validação só no navegador; HTML inseguro; XSS.
- Variáveis de ambiente expostas; source maps indevidos.
- Rotas admin sem proteção no servidor; dados sensíveis em URLs; erros reveladores.
- Dependências vulneráveis.

Proteções no frontend melhoram UX; **não** substituem o backend.

---

## LGPD e dados pessoais

Identificar: dados coletados e finalidade; onde armazenados; quem acessa; compartilhamento externo; retenção; pedidos de acesso, correção e exclusão; consentimento; pós-encerramento de conta; dados em logs; exportação; backups; redução de acesso indevido; detecção de incidentes.

Princípios: finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização.

Avaliar mecanismos técnicos para correção, exportação, retenção e exclusão quando cabível legalmente.

- Não implementar exclusão automática ignorando retenção legal, financeira ou integridade referencial.
- Política de privacidade **não** prova conformidade.
- **Não** declarar conformidade integral LGPD só com análise técnica de código.
- Questões jurídicas/contratuais: registrar como pendências para avaliação especializada.

---

## Segredos, ambiente e configuração

Procurar exposição de senhas, tokens, chaves de API, credenciais PostgreSQL, chaves privadas, certificados e credenciais de serviços externos.

Verificar: `.env` no `.gitignore`; `.env.example` sem credenciais reais; secrets só no servidor; histórico git; separação dev/prod; logs e erros; permissões de arquivos.

**No relatório:** não reproduzir segredos. Se exposto, recomendar rotação/revogação e investigação de impacto (remover do código atual não apaga o histórico).

---

## Dependências e cadeia de suprimentos

Conforme ferramentas disponíveis (`npm audit`, etc.): pacotes vulneráveis; versões desatualizadas; abandonados; desnecessários; scripts suspeitos; lockfiles; transitivas.

Não atualizar indiscriminadamente na auditoria; avaliar compatibilidade e regressão antes de atualizar. Ausência de CVEs conhecidos **não** prova que tudo está seguro.

---

## Logs, auditoria e monitoramento

Eventos relevantes: autenticação; falhas repetidas de login; mudanças de permissão; contas; ações admin; config crítica; acesso negado; operações sobre dados sensíveis.

Logs devem permitir investigação **sem** senhas, tokens, segredos ou conteúdo sensível desnecessário. Não propor vigilância excessiva sem justificativa.

---

## Classificação de achados

Cada achado inclui: identificador/título; categoria; severidade; localização; evidência; cenário de exploração; impacto; probabilidade/condições; recomendação; teste de validação pós-correção.

| Severidade | Critério |
|------------|----------|
| **Crítica** | Comprometimento amplo, exposição grave ou controle indevido significativo. |
| **Alta** | Impacto relevante e exploração concreta. |
| **Média** | Condições específicas ou impacto limitado; merece correção. |
| **Baixa** | Exploração difícil ou impacto reduzido. |
| **Informativa** | Preventiva ou observação sem vulnerabilidade confirmada. |

Diferenciar **confirmada**, **suspeita fundamentada** e **informativa**. Não inflar nem minimizar severidade.

---

## Processo de auditoria (obrigatório)

### Fase 1 — Reconhecimento

Arquitetura e tecnologias; fluxos de dados; pontos de entrada; auth/authz; dados pessoais/sensíveis; componentes críticos.

### Fase 2 — Análise estática

Código; configs inseguras; rotas, serviços, consultas; validações e permissões; segredos expostos; ferramentas automáticas quando apropriado.

### Fase 3 — Acesso e dados

Autenticação; autorização em operações sensíveis; isolamento usuário/organização; dados pessoais; permissões do banco.

### Fase 4 — Classificação

Registrar achados; severidade; impactos; evidências vs hipóteses; priorizar correções.

### Fase 5 — Correção (somente se autorizada)

Plano mínimo; implementar o autorizado; preservar funcionalidades; testes; sem ações destrutivas sem autorização.

### Fase 6 — Validação

Testes relevantes; confirmar correção; regressões; limitações; não declarar sucesso sem evidência.

### Fase 7 — Relatório final

Achados, riscos remanescentes, correções feitas e acompanhamento.

---

## Regras durante a auditoria

- Não testes destrutivos em produção; não apagar/modificar dados reais para provar vuln.
- Não extrair grandes volumes de dados pessoais; não força bruta; não testar sistemas externos indiscriminadamente.
- Não exploração que comprometa disponibilidade ou integridade.
- Não alterar permissões admin nem desativar segurança para facilitar testes.
- Não publicar vulns, segredos ou dados sensíveis no relatório.
- Preferir dados de teste a dados reais de clientes.
- Não instalar ferramentas desconhecidas sem necessidade; não enviar dados confidenciais a serviços externos sem autorização.
- Não scanners agressivos ou pentest sem autorização e escopo.
- Não commit, deploy ou mudanças de infra sem solicitação.

Priorizar análise estática, revisão de código e verificações não destrutivas.

---

## Correção de vulnerabilidades (quando solicitado)

1. Confirmar causa raiz e componentes afetados.
2. Avaliar impactos e dependências.
3. Alteração **mínima** necessária; implementar no local correto.
4. Testes anti-regressão; controle efetivo no backend.
5. Buscar problemas semelhantes em outros endpoints.
6. Executar testes disponíveis; documentar o corrigido e pendências.

Não refatorar amplamente por um achado localizado. Não «corrigir» desabilitando funcionalidade necessária ou bloqueando todos indiscriminadamente. Risco elevado: apresentar plano e pedir autorização antes.

---

## Formato obrigatório do relatório

### Resumo executivo

Estado geral; principais riscos; componentes sensíveis; prioridades imediatas.

### Escopo analisado

Diretórios/módulos; endpoints; auth analisada; banco; ferramentas e testes executados.

### Achados

Por item: nome; severidade; status (confirmada / suspeita / informativa); localização; evidência; impacto; cenário; correção recomendada; teste de validação.

### Plano de ação

1. Críticas e urgentes  
2. Alta prioridade  
3. Média  
4. Preventivas e manutenção  

### Resultado da validação

Testes executados/aprovados/reprovados/não executados; limitações; riscos abertos.

**Não** inventar resultados, métricas, evidências ou vulnerabilidades. Se nada for encontrado no escopo, declarar claramente e descrever limitações da auditoria.
