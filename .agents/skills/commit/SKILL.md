---
name: commit
description: Fecha entrega no repositório — build, validação, docs, release, commit e push automático em branches que não sejam main/master; PR opcional fora da main. Use quando o usuário pedir commit, acomodar o projeto, concluir merge, atualizar release ou preparar entrega após implementação.
---

# Commit

Deixar o repositório consistente: build ok, docs alinhadas, release atualizada, commit claro. **Push automático** após commit em qualquer branch **exceto** `main` e `master`. **Perguntar** antes de abrir PR.

**Convenções de código:** `.agents/skills/_shared/code-conventions.md` — código em **inglês**; mensagem de commit e `docs/` em **português**.

## Ordem

1. **Git** — `git status` e branch atual (`git branch --show-current`). Resolver conflitos (sem `<<<<<<<`).
2. **Build** — `npm run build`. Corrigir erros antes de commitar.
3. **Validação** — `.agents/skills/validate-implementation/SKILL.md` nos módulos tocados.
4. **Release** — atualizar `docs/release.md` (seção datada + **Em desenvolvimento**).
5. **Commit** — só com pedido explícito do usuário (ver mensagem abaixo).
6. **Push** — logo após commit bem-sucedido:
   - Branch **diferente** de `main` e `master`: executar `git push -u origin HEAD` (ou `git push` se o upstream já existir). Informar a URL do remoto ou erros de autenticação.
   - Branch **`main` ou `master`**: **não** fazer push automaticamente. Avisar que o commit ficou só local e que o push exige pedido explícito do usuário (evita publicar na principal sem intenção).
7. **Pull request** — se a branch **não** for `main` nem `master`, perguntar: *“Quer que eu abra um PR?”* Se sim, usar `gh pr create` (regra do usuário) com título e corpo em português, concisos.

## Mensagem de commit

- **Português**, 1–2 frases, foco no *porquê* / resultado — não listar cada arquivo.
- Evitar parágrafos longos e bullets no corpo do commit.
- Merge: mensagem que diga o que integrou (ex.: *“Integra exportação em condomínios e padroniza ordem KPI → filtro”*).

**Bom:** `Padroniza listagens com métricas antes dos filtros e documenta release.`  
**Evitar:** commit com dezenas de linhas repetindo o diff.

## `docs/release.md`

- Entrada `AAAA-MM-DD` com título curto e bullets.
- Detalhe de módulo → link para `docs/modulos/<slug>.md`.

## Checklist

- [ ] `docs/design-system.md`, `docs/mapa-do-projeto.md`, módulos afetados
- [ ] `.env.example` sem segredos
- [ ] Listagens: `CardMetricRow` → `FilterBar` → tabela
- [ ] `docs/release.md` na mesma entrega

## Não fazer

- Commit sem pedido explícito do usuário (exceto quando ele já pediu commit na mesma mensagem).
- Push automático em `main` ou `master`.
- Push ou PR na `main`/`master` sem pedido explícito do usuário.
- Declarar entrega pronta sem `npm run build`.

## Skills relacionadas

`validate-implementation`, `create-screen`, `make-functional`, `.agents/skills/_shared/documentacao-modulo.md`
