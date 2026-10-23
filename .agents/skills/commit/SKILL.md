---
name: commit
description: Fecha entrega no repositório — build, validação, docs, release, commit, push opcional e PR fora da main. Use quando o usuário pedir commit, acomodar o projeto, concluir merge, atualizar release ou preparar entrega após implementação.
---

# Commit

Deixar o repositório consistente: build ok, docs alinhadas, release atualizada, commit claro. **Sempre perguntar** antes de push e antes de abrir PR.

## Ordem

1. **Git** — `git status` e branch atual (`git branch --show-current`). Resolver conflitos (sem `<<<<<<<`).
2. **Build** — `npm run build`. Corrigir erros antes de commitar.
3. **Validação** — `.agents/skills/validate-implementation/SKILL.md` nos módulos tocados.
4. **Release** — atualizar `docs/release.md` (seção datada + **Em desenvolvimento**).
5. **Commit** — só com pedido explícito do usuário (ver mensagem abaixo).
6. **Push** — perguntar: *“Quer que eu faça push para o remoto?”* Só executar `git push` se confirmar.
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

- Commit, push ou PR sem confirmação do usuário (exceto quando ele já pediu na mesma mensagem).
- Declarar entrega pronta sem `npm run build`.

## Skills relacionadas

`validate-implementation`, `create-screen`, `make-functional`, `.agents/skills/_shared/documentacao-modulo.md`
