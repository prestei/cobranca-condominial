# Módulos do sistema

Documentação **por módulo funcional**. Cada implementação ou alteração relevante deve atualizar o arquivo do módulo afetado, as **conexões** com outros pontos e o [**mapa do projeto**](../mapa-do-projeto.md) (ver `.agents/skills/_shared/documentacao-modulo.md`).

| Módulo | Documento | Rota |
| --- | --- | --- |
| Dashboard | [dashboard.md](dashboard.md) | `/` |
| Condomínios | [condominios.md](condominios.md) | `/condominiums` |
| Unidades | [unidades.md](unidades.md) | `/units` |
| Débitos | [debitos.md](debitos.md) | `/debts` |
| Atendimentos (palitagem) | [atendimentos.md](atendimentos.md) | `/service-tickets` |
| Importações | [importacoes.md](importacoes.md) | `/imports` |
| Relatórios | [relatorios.md](relatorios.md) | `/reports` |
| Usuários | [usuarios.md](usuarios.md) | `/users` |
| Cargos / perfis | [cargos.md](cargos.md) | `/roles` |
| Auditoria | [auditoria.md](auditoria.md) | `/audit` |
| Integração Superlógica | [integracao-superlogica.md](integracao-superlogica.md) | (backend / jobs) |

Documentos marcados com link ainda podem estar em esboço — criar ou completar na primeira implementação do módulo.

**URLs legadas em português** (ex.: `/usuarios`, `/cargos`) redirecionam para as rotas acima via `next.config.ts`.
