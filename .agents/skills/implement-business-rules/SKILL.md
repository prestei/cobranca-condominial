---
name: implement-business-rules
description: Implementar e ajustar regras e fluxos do sistema. Atualiza docs/regra-negocio.md e docs/modulos/<slug>.md na mesma entrega. Use ao implementar validações, permissões, estados de processo, cálculos ou fluxos de negócio.
---

# implement-business-rules

Implementar ou corrigir **regras de negócio** no código (backend preferencialmente; frontend só para UX, nunca como única barreira). Preservar arquitetura e padrões do repositório.

**Documentação obrigatória:** `.agents/skills/_shared/documentacao-modulo.md`.

**Convenções de código:** `.agents/skills/_shared/code-conventions.md` — serviços, validadores e nomes de regra no código em **inglês**; mensagens exibidas ao usuário e docs em **português**.

## Antes de implementar

1. Ler **`docs/proposta-oficial.md`** e **`docs/regra-negocio.md`**.
2. Ler **`docs/modulos/<slug>.md`** de cada módulo afetado.
3. Mapear onde a regra vive hoje (API, service, validação de formulário, etc.).
4. Se a regra for ambígua ou conflitar com a proposta, **parar e confirmar** com o usuário.

## Implementação

- Regras **enforçadas no servidor**; o frontend espelha mensagens e fluxo.
- Transações quando várias tabelas dependem da mesma decisão.
- Permissões alinhadas a perfis (Administradora, Atendente, Advogado).
- Mensagens de erro claras, sem vazar detalhes internos.
- Não desativar validação existente para “passar” teste.

## Documentação na mesma entrega (obrigatório)

| Alteração | Atualizar |
| --- | --- |
| Regra transversal, perfil, permissão, validação global | `docs/regra-negocio.md` |
| Comportamento específico de um módulo | `docs/modulos/<slug>.md` (seção **Regras de negócio** e **Fluxos principais**) |
| Schema ou constraints no banco | `docs/banco.md` |
| Novo módulo ou renomeação | `docs/modulos/README.md` + arquivo do módulo |
| Novo vínculo entre módulos, requisito ou tabela | `docs/mapa-do-projeto.md` + seção **Conexões** nos módulos afetados |

A documentação deve descrever o comportamento **após** o código, não o comportamento antigo.

## Validação

- Cenários de sucesso, falha e borda cobertos por testes quando o projeto tiver infraestrutura.
- Conferir que `docs/regra-negocio.md` e o módulo não se contradizem.

## Entrega

Resumir: regras alteradas, arquivos de código, **arquivos em `docs/` atualizados**, testes executados.
