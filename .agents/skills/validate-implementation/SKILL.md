---
name: validate-implementation
description: Verificar se a implementação está correta em código, banco, API, regras e documentação por módulo. Use após entregas, antes de merge ou para auditar conformidade com docs.
---

# validate-implementation

Verificar se a implementação está **correta e completa**, incluindo documentação.

**Referência de documentação:** `.agents/skills/_shared/documentacao-modulo.md` e **`docs/mapa-do-projeto.md`**.

## Escopo da validação

### Código e arquitetura

- Compilação, tipos e lint (quando configurados).
- Padrões do repositório (pastas, nomenclatura, componentes globais).
- Contratos de API (método, status, body) vs consumo no frontend.

### Banco e dados

- Schema/migrations vs **`docs/banco.md`**.
- Integridade, FKs, índices e tipos (valores monetários, datas).
- Sem SQL injection; consultas eficientes em listagens.

### Regras de negócio

- Comportamento vs **`docs/regra-negocio.md`** e **`docs/proposta-oficial.md`**.
- Permissões testadas por perfil quando aplicável.
- Regras críticas no backend, não só no cliente.

### Documentação por módulo (obrigatório na validação)

Para cada módulo tocado pela mudança:

- [ ] Existe **`docs/modulos/<slug>.md`** listado em **`docs/modulos/README.md`**
- [ ] Rotas e caminhos de arquivo citados existem no repositório
- [ ] Campos, fluxos e endpoints descritos batem com o código entregue
- [ ] **`docs/banco.md`** atualizado se houve migration ou modelo novo
- [ ] **`docs/regra-negocio.md`** atualizado se houve mudança de regra transversal
- [ ] Nenhuma contradição entre módulo, regras globais e banco
- [ ] **`docs/mapa-do-projeto.md`** reflete rotas, dependências e tabelas entregues
- [ ] Seção **Conexões** em cada `docs/modulos/<slug>.md` afetado, com links válidos

**Falha de documentação ou mapa desatualizado** = implementação **não aprovada**, mesmo se o código compilar.

### Testes

- Executar testes existentes; não afirmar sucesso sem rodar comandos.
- Fluxos manuais críticos (CRUD, importação, auth) quando não houver teste automatizado.

## Relatório

Formato sugerido:

1. **Módulos verificados** (slugs)
2. **Conforme** — itens OK
3. **Divergências** — código vs doc, ou vs regra de negócio
4. **Documentação pendente** — arquivos em `docs/` que faltam atualizar
5. **Testes** — comandos e resultados
6. **Veredito** — Aprovado / Aprovado com ressalvas / Reprovado
