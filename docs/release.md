# Release

Registro de entregas do **Lex Condominial — Cobrança**. Detalhes por módulo ficam em [modulos/](modulos/README.md).

## Em desenvolvimento

- Persistência PostgreSQL para cadastros e autenticação centralizada.
- Exportação CSV/XLS/PDF com geração real de arquivos (hoje parte do fluxo é visual no menu Exportar).

## 2026-10-23 — Listagens, colaboradores e merge main

### Listagens e design system

- Ordem padrão em `PageContent`: **`CardMetricRow` → `FilterBar` → tabela** (todas as listagens e relatórios com filtro).
- Documentação em [design-system.md](design-system.md) e skill `create-screen` alinhadas a essa ordem.
- Foco de campos (`Input`, `Select`, checkboxes): borda `primary-container` e anel `primary-fixed` (substitui destaque dourado no foco).

### Colaboradores (`/usuarios`)

- Sheet em painéis (identificação, contato, senha), ícones no título dos painéis, fechamento com baseline/dirty check.
- Filtros: cargo, telefone (com/sem), e-mail (com/sem).
- Coluna cargo com `BadgeCargo` (mesmo padrão visual dos badges em `/cargos`).
- Ver [modulos/usuarios.md](modulos/usuarios.md).

### Condomínios e exportação (merge)

- Resolução de merge: KPIs + filtros locais + `onExport` no `ResponsiveTable` para exportação na listagem.
- Ajustes em catálogo, login, exportação e tabela compartilhada (`src/components/table.tsx`).

### Outros

- Atualizações em [banco.md](banco.md), `.env.example` e constantes de autenticação conforme merge remoto.
- Build: `Suspense` em páginas com `useSearchParams` (acesso negado, atendimentos, unidades) e ajustes de tipagem no layout e relatórios.

---

## 2026-10-22 — CardMetricRow nas listagens

- Adoção de `CardMetricRow` em dashboard, atendimentos, auditoria, cargos, condomínios, débitos, importações e relatórios.
- Diretrizes do componente documentadas em [design-system.md](design-system.md).
