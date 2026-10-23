# Convenções de idioma (código vs produto)

Regra global para **todo código novo ou alterado** neste repositório. Skills de implementação devem seguir sem exceção.

## Inglês — código e estrutura técnica

Usar **inglês** (ASCII, `camelCase` / `PascalCase` / `kebab-case` conforme o ecossistema) para:

| Área | Exemplos |
| --- | --- |
| Pastas e rotas de código | `src/lib/users/`, `src/app/api/condominiums/` |
| Arquivos | `service.ts`, `validate-user.ts`, `use-permissions.ts` |
| Componentes React | `UserSheet`, `FilterBar` (nome do export) |
| Variáveis, parâmetros, props | `userId`, `isLoading`, `appliedSearch` |
| Funções e métodos | `listUsers`, `parseRequestBody`, `handleSubmit` |
| Tipos e interfaces | `UserInput`, `PublicUser`, `FieldErrors` |
| Constantes e enums | `PAGE_SIZE`, `SessionCookieName` |
| Classes e módulos de domínio | `DebtService`, `permissions` |
| Endpoints e query params | `/api/users`, `?page=1&sortBy=name` |
| Chaves JSON da API | `{ "users": [], "error": "..." }` — mensagens de `error` para o usuário em português (ver abaixo) |
| Nomes de tabelas/colunas no banco | alinhar a `docs/banco.md` (ex.: `user`, `role`, `condominium`) |
| Migrations, seeds técnicos | nomes descritivos em inglês |
| Comentários no código | inglês, curtos, só quando o “porquê” não é óbvio |
| Commits técnicos no histórico | ver skill `commit` — mensagens em português são convenção deste repo para commits; código permanece em inglês |

**Não** criar identificadores em português (`usuario`, `condominio`, `salvarUsuario`, pasta `usuarios` em código novo). Código legado em português: ao tocar o arquivo, **preferir renomear** de forma incremental e segura (exports, imports, rotas) na mesma entrega, sem quebrar contratos sem documentar.

## Português — interface e documentação

Usar **português** (Brasil, claro e profissional) para:

| Área | Exemplos |
| --- | --- |
| Textos visíveis na UI | títulos, labels, placeholders, botões, toasts, `aria-label`, empty states |
| Mensagens de validação ao usuário | `"Informe o e-mail."`, `"Código ou senha incorretos."` |
| Documentação em `docs/` | `docs/modulos/*.md`, `banco.md`, `regra-negocio.md`, `mapa-do-projeto.md` |
| `docs/release.md` e proposta comercial | conforme skills de commit e produto |
| Conteúdo de skills em `.agents/skills/` | instruções para o agente (como este arquivo) |

**Rotas públicas** seguem o mesmo inglês das pastas em `src/app/` (ex.: `/users`, `/condominiums`, `/service-tickets`). Redirecionamentos temporários de URLs antigas em português ficam em `next.config.ts` quando necessário.

## API: contrato técnico vs mensagem humana

- Campos e estruturas: inglês (`userId`, `roleId`, `birthDate`).
- Corpo de erro legível na UI: português (`error`, `fields.nome` com texto em PT — chave do campo pode ser inglês `email` com mensagem PT).

## Checklist rápido (antes de encerrar tarefa)

1. Nenhum arquivo/pasta/variável nova em português?
2. Labels e mensagens de tela em português?
3. `docs/modulos` e mapa atualizados em português?
4. Renomeações refletidas em imports, testes e documentação de API?
