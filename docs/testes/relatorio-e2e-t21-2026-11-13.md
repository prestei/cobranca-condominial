# E2E T21 — 2026-11-13 (run 1794581262057)

Base: http://127.0.0.1:3000

**Total:** 20 | **Passou:** 20 | **Falhou:** 0

| ID | Cenário | Status | Detalhe |
| --- | --- | --- | --- |
| 01 | Login MILENA | PASSOU | administradora |
| 01 | Login RAQUEL | PASSOU | atendente |
| 01 | Login ADRYELLE | PASSOU | advogado |
| 02 | POST condomínio | PASSOU | id=12 |
| 02 | POST unidade | PASSOU | id=38 |
| 03 | RE novo atendente | PASSOU | RE-10008 |
| 04 | Distribuir unidade (RAQUEL) | PASSOU | 1 |
| 05 | Registrar atendimento | PASSOU | id=9e30dec1-dadc-4189-b5d0-9a1c2d8faeaa |
| 06 | Concluir retorno | PASSOU |  |
| 06 | Histórico unidade | PASSOU | redistribuicao,retorno_concluido,tentativa |
| 04 | Redistribuir unidade | PASSOU | RE-10001 |
| JUR | Encaminhamento jurídico | PASSOU | Encaminhado |
| JUR | Advogado lista jurídico | PASSOU | count=3 |
| 10 | Importação inválida (prévia) | PASSOU | Corpo da requisição inválido. |
| 11 | PATCH débito | PASSOU | id=5 |
| 11 | Auditoria após PATCH | PASSOU | registros=169 |
| 08 | Advogado unidade permitida | PASSOU | status=200 |
| 08 | Advogado unidade proibida | PASSOU | status=404 |
| 09 | Produtividade admin | PASSOU |  |
| 09 | Produtividade atendente bloqueado | PASSOU | status=403 |

## Sem falhas

## Browser (amostra T21 — 13/11/2026)

| Fluxo | Perfil | Resultado |
| --- | --- | --- |
| Importações (lista + sheet “Nova importação”) | MILENA | OK |
| Jurídico (3 encaminhamentos E2E na grade) | MILENA | OK |
| Atendimentos (fila + “Registrar contato”) | RAQUEL | OK |
| Login via botão “Entrar” | MILENA/RAQUEL | Intermitente (fica em “Entrando…”); API `POST /api/auth/login` OK |
| Logout pelo menu | — | Usar `POST /api/auth/logout` ou novo login; redirect para `/login` às vezes não limpa UI |

**Observação:** hidratação em `empty-state.tsx` na tela de importações (overlay Next.js dev). `/atendimentos` como admin chegou vazio em uma navegação; como RAQUEL carregou a fila completa.