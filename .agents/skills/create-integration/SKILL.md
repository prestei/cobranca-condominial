---
name: create-integration
description: Criar integrações com APIs, Superlógica, arquivos, webhooks etc. Atualiza docs/modulos/integracao-<nome>.md, docs/banco.md e docs/stack.md. Use ao conectar serviços externos, importar dados ou expor webhooks.
---

# create-integration

Implementar integrações externas de forma segura, observável e alinhada à arquitetura do projeto.

**Documentação obrigatória:** `.agents/skills/_shared/documentacao-modulo.md`. Integrações usam **`docs/modulos/integracao-<nome>.md`** (ex.: `integracao-superlogica.md`).

## Antes de implementar

1. Ler **`docs/proposta-oficial.md`** (Projeto 2 e importações).
2. Ler **`docs/modulos/importacoes.md`**, **`docs/modulos/debitos.md`** e o doc da integração.
3. Ler **`docs/stack.md`** e padrões de API do repositório.
4. Credenciais só em variáveis de ambiente; documentar em **`docs/stack.md`** (nomes das vars, sem valores reais).

## Implementação

- Cliente HTTP/retry/timeout conforme necessidade; idempotência quando houver reprocessamento.
- Mapeamento explícito de campos externos → modelo interno.
- Logs sem tokens, senhas ou PII desnecessária.
- Tratamento de indisponibilidade e respostas inválidas.
- Não expor segredos ao frontend.

## Documentação na mesma entrega (obrigatório)

Atualizar **`docs/modulos/integracao-<nome>.md`** com:

- Objetivo e sistemas externos
- Autenticação (tipo, renovação, variáveis de ambiente)
- Endpoints ou arquivos consumidos (método, path, limites)
- Mapeamento de dados e regras de sincronização
- Fluxos (manual via importações, job agendado, webhook)
- Erros conhecidos e comportamento da UI

Também atualizar:

- **`docs/modulos/importacoes.md`** ou **`debitos.md`** se a UI ou fluxo do usuário mudar
- **`docs/banco.md`** se novas tabelas ou campos de staging
- **`docs/regra-negocio.md`** se regras de negócio da importação mudarem
- **`docs/modulos/README.md`** se for integração nova
- **`docs/mapa-do-projeto.md`** (fluxo importação → débito, diagramas, tabela de módulos)

## Validação

- Testar com credenciais de desenvolvimento ou mocks documentados.
- Verificar que a doc lista as mesmas variáveis de ambiente que o código exige.

## Entrega

Resumo técnico + lista de arquivos de código e **`docs/`** alterados.
