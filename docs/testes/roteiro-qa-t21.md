# T21 — Roteiro de QA (complemento E2E)

Cenários cobertos por **`npm run test:integracao`** exercitam serviços e permissões no catálogo em memória. Use este roteiro para validar a **interface** e cookies de sessão quando necessário.

**Pré-requisitos:** `npm run dev`, navegador, seed padrão (`catalogo.ts`). Senha demo: `12345`. Códigos: `MILENA` (admin), `RAQUEL` / `TASSIA` (atendentes), `ADRYELLE` (advogado).

| # | Cenário | Passos resumidos | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Login/logout por perfil | Entrar com cada código; sair em `/login` | Redirecionamento correto; sessão encerrada |
| 2 | Cadastro administradora | Condomínios → novo; Unidades → nova; Usuários → atendente | Registros na listagem; RE gerado para atendente |
| 3 | RE único | Conferir coluna RE após criar atendente | Formato `RE-#####`, sem duplicata |
| 4 | Distribuição | Fila/distribuição: atribuir e redistribuir unidade | RE responsável atualizado; histórico de atribuição |
| 5 | Tentativa + retorno | Atendimentos: registrar; agendar retorno | Item pendente na agenda |
| 6 | Concluir retorno | Retornos: marcar realizado | Histórico da unidade com retorno concluído |
| 7 | Unidade quitada | Confirmar quitação da unidade | Some da fila ativa; histórico preservado |
| 8 | Escopo advogado | Vincular condomínio ao advogado; abrir unidade permitida e outra | 403 ou bloqueio na unidade proibida |
| 9 | Produtividade | Relatórios → **Produtividade por RE** (`/relatorios/produtividade`); filtrar RE e período | Linhas só do RE/período; gráfico e exportação coerentes |
| 10 | Importação inválida | Importar planilha com linhas inválidas | Erros na prévia; dados existentes intactos |
| 11 | Correção + auditoria | Editar débito ou registro corrigível | Evento em Auditoria |
| 12 | Exportação no escopo | Exportar relatório como advogado | Sem dados de condomínios fora da carteira |

## Evidências

Anote data, build/commit, perfil usado e capturas de tela para falhas. Não registre senhas reais nem dados de clientes.

## Automação

```bash
npm test
```

Mapeamento cenário → teste: [`fluxos-permissoes.integracao.test.ts`](../../src/test/fluxos-permissoes.integracao.test.ts).
