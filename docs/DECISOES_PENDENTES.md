# Decisões pendentes

Registro de requisitos que dependem de aprovação antes de implementação completa. Ver também `TICKETS_CURSOR_DANIEL_JORGE.md`.

| Tema | Status | Notas |
| --- | --- | --- |
| Algoritmo de **distribuição automática** da carteira (rodízio, carga, condomínio, volume ou outro) | Pendente | T09 entrega apenas distribuição **manual**; extensão preparada em `src/lib/distribuicao/service.ts` (`distribuicaoAutomaticaDisponivel`). |
| Regra de **entrada automática** na cobrança ao importar débitos | Pendente | T08/T13 — unidade permanece fora da fila até movimentação operacional ou importação futura. |
| **Formato(s) oficial(is)** de relatório por administradora (PDF, Excel proprietário, colunas) | Pendente | T13 entrega `planilha-inadimplencia-v1` (CSV/XLS genérico); leitores por modelo a definir. |
| **Política de atualização** quando o saldo da fonte difere do cadastro | Pendente | T13 atualiza só com identificador externo ou equivalência explícita; não sobrescreve manual sem ID. |
| **Débitos que desaparecem** do arquivo da administradora | Pendente | T13 não cancela nem exclui débitos ausentes na importação. |
| **Proposta / acordo (T15):** campos obrigatórios além de valor e débitos; fluxo de aprovação; entrada; quantidade de parcelas na proposta; juros/descontos; transição automática da unidade para **Em acordo** | Pendente | T15 entrega registro, status auditados e termos textuais ao aceitar. |
| **Parcelas / pagamentos (T16):** regra de quebra; tolerância de atraso; estorno; abatimento; cálculo oficial do saldo de débitos; fonte confiável para **Confirmado** | Pendente | T16 entrega parcelas previstas, pagamentos Informado/Confirmado, saldo do acordo (confirmado), potencial descumprimento e auditoria; não marca “acordo quebrado” nem baixa débito automaticamente. |
