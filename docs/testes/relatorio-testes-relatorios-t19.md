# Relatório de testes — T19 Relatórios, filtros e exportações

**Data:** 2026-10-27  
**Escopo:** API de exportação, escopo por perfil, RE em exportações, remoção de dados ilustrativos.

## Verificações automatizadas

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` (arquivos `relatorios/*`, `app/relatorios/page.tsx`) | OK — sem erros nos arquivos T19 |

## Checklist manual sugerido

- [ ] Administradora: filtrar por RE, exportar CSV — colunas incluem RE; cabeçalho com data/hora e filtros.
- [ ] Advogado: condomínio fora do vínculo não aparece em filtros; exportação 403 se forçar `condominio` inválido na query.
- [ ] Usuário sem `relatorios.exportar`: botão de exportação oculto; API export retorna 403.
- [ ] Acentos em descrições de débito exportadas corretamente no Excel (BOM CSV).

## Pendências

- Teste E2E no navegador não executado nesta entrega (sem sessão automatizada configurada).
