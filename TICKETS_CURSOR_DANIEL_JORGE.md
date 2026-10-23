# Daniel Jorge Advocacia — Especificação de tickets para Cursor
**Versão:** 1.0  
**Objetivo:** transformar o escopo conhecido em tickets implementáveis, com critérios de aceite verificáveis.  
**Base:** documento “Painel jurídico de cobrança condominial” e apresentação comercial “Daniel Jorge — Sistema de Gestão”.

## Instruções gerais para o Cursor (ler antes de executar qualquer ticket)

1. **Inspecione o repositório antes de alterar código.** Identifique framework, estrutura, ORM, banco, autenticação, convenções, componentes existentes, testes e migrations. Não substitua tecnologias nem recrie o projeto se já houver uma base funcional.
2. **Faça alterações pequenas e compatíveis com a arquitetura existente.** Reutilize padrões já adotados. Não apague telas, rotas, dados ou funcionalidades existentes para simplificar a implementação.
3. **Não invente regras de negócio ausentes.** Quando um requisito depender de uma decisão não documentada, implemente a estrutura preparada e registre a dúvida em `docs/DECISOES_PENDENTES.md`. Não invente juros, multa, prazo de entrada na cobrança, regra de acordo quebrado, algoritmo de distribuição ou fórmula de produtividade.
4. **Não use dados reais de clientes em seeds, logs ou testes.** Use dados fictícios.
5. **Toda informação operacional precisa ser rastreável:** quem realizou a ação, data/hora, condomínio/unidade quando aplicável, alteração anterior e nova quando houver edição relevante.
6. **A aplicação deve funcionar em computador e celular**, respeitando os padrões de responsividade já existentes.
7. **Autorização deve ser verificada no backend**, não apenas ocultando botões no frontend. Negar acesso indevido com resposta adequada e sem vazar dados.
8. **Persistência real:** não simule funcionalidades com arrays locais ou dados estáticos quando o ticket exigir CRUD, histórico ou relatórios persistentes.
9. Ao terminar cada ticket: execute os testes pertinentes, verifique lint/typecheck se existirem, liste arquivos alterados, descreva o que foi feito e indique dúvidas ou bloqueios. Não marque o ticket como concluído se os critérios de aceite não estiverem atendidos.
10. **Não implementar automaticamente todos os tickets de uma vez.** Trabalhe apenas no ticket solicitado, respeitando dependências. Se detectar dependência ausente, informe antes de fazer mudanças arriscadas.

## Requisitos globais do negócio

- Sistema de gestão da cobrança extrajudicial/judicial de inadimplência de aproximadamente 35 condomínios.
- Dois pilares: **Gestão da Cobrança (palitagem, distribuição, tentativas, retornos e histórico)** e **Gestão da Inadimplência (débitos, saldos, dados de administradoras, indicadores e visão jurídica)**.
- Perfis: **Administradora**, **Atendente/colaborador** e **Advogado**.
- A Administradora gerencia cadastros, equipe, distribuição, relatórios/exportações, produtividade e auditoria; pode corrigir registros, preservando histórico.
- Atendente registra tentativas, acompanha sua carteira, consulta seus atendimentos e agenda de retornos e marca retornos como realizados.
- Advogado consulta histórico, relatórios e inadimplência apenas dos condomínios sob sua responsabilidade.
- Cada registro de cobrança deve permitir identificar autor, data/hora, condomínio, unidade, meio de contato, resultado/motivo, observação e próximo contato/retorno quando aplicável.
- Unidade quitada deixa a fila ativa de cobrança, mas seu histórico deve permanecer consultável.
- Integração/importação com Superlógica e outras administradoras é desejada. A integração concreta depende de credenciais, APIs, formatos e mapeamento confirmados.
- **Novo requisito — código RE:** colaboradores/atendentes não serão identificados pelo nome na interface. Cada colaborador deve possuir código único sequencial no padrão `RE-001`, `RE-002` etc. A Administradora e os Advogados são exceções e continuam identificados conforme o cadastro existente/nome. O código RE deve ser gerado pelo backend, ser único e imutável, não depender do nome e aparecer nas telas, registros, filtros e relatórios que identificam o colaborador. Não exibir nome de atendente nos locais em que a identidade operacional deve ser apresentada por RE. Não inventar números retroativos sem uma estratégia de migração; para usuários existentes, preparar migração segura e documentar como serão atribuídos os códigos.
- **Novo requisito — produtividade:** a Administradora deve visualizar produtividade individual por RE, com filtros por período e, quando aplicável, condomínio. Exibir métricas objetivas e auditáveis, como atendimentos registrados, tentativas por meio, retornos previstos/concluídos/atrasados e acordos registrados se esse dado existir. Não criar pontuação, ranking ou meta automática sem regra aprovada. Mostrar contagens e período de referência; definir a fórmula de “produtividade” como decisão pendente se for além das contagens objetivas.

## Convenções de gestão dos tickets

**Prioridades:** P0 = bloqueia o núcleo do sistema; P1 = essencial para a operação; P2 = evolução importante; P3 = melhoria posterior.  
**Status sugeridos:** A fazer → Em andamento → Em revisão/teste → Concluído; usar Bloqueado quando houver dependência externa.  
**Regra:** não atribuir nomes de pessoas ou status real sem confirmação da equipe. O responsável deve ser preenchido no gerenciador de tarefas.

---

# T01 — Inspecionar o projeto e estabelecer a base técnica
**Prioridade:** P0  
**Dependências:** nenhuma

### Objetivo
Compreender e documentar a arquitetura atual antes de implementar funcionalidades.

### Escopo
- Inspecionar estrutura de pastas, scripts, rotas, telas, autenticação, banco/ORM, migrations, testes e variáveis de ambiente.
- Identificar funcionalidades já implementadas, parcialmente implementadas e ausentes.
- Confirmar como executar localmente frontend, backend e testes.
- Criar ou atualizar `README` com instalação, configuração por `.env.example` sem segredos, execução, testes e typecheck.
- Criar `docs/ARQUITETURA_ATUAL.md` e `docs/DECISOES_PENDENTES.md` sem duplicar documentação já existente.
- Registrar dependências técnicas que bloqueiam os próximos tickets.

### Critérios de aceite
- O projeto pode ser iniciado seguindo o README ou os impedimentos estão claramente documentados.
- A documentação descreve tecnologias realmente encontradas, sem presumir stack.
- Nenhuma funcionalidade foi removida ou reescrita neste ticket.
- Decisões de negócio ausentes foram listadas como pendentes.

### Não fazer
Não migrar framework, ORM ou banco; não redesenhar o sistema inteiro; não adicionar serviços externos sem necessidade.

---

# T02 — Revisar e implementar o modelo de dados central
**Prioridade:** P0  
**Dependências:** T01

### Objetivo
Garantir uma estrutura de dados consistente para usuários, condomínios, unidades, inadimplência, cobranças, retornos e auditoria.

### Escopo
Inspecionar o modelo existente e adaptar, sem recriar entidades equivalentes. Confirmar entidades e relacionamentos para:
- usuários e perfis/permissões;
- código RE para colaboradores;
- condomínios;
- unidades;
- proprietários/condôminos e responsáveis financeiros, quando fornecidos;
- vínculos de advogados aos condomínios;
- débitos/posição de inadimplência e origem/importação;
- distribuição e histórico de responsáveis pela cobrança;
- atendimentos/tentativas de contato;
- retornos;
- negociações/acordos/parcelas/pagamentos, caso já façam parte do escopo implementado;
- documentos e encaminhamentos jurídicos, quando suportados;
- logs/auditoria de alterações.

Usar chaves e restrições adequadas, relacionamentos explícitos, timestamps e estados consistentes. Preservar histórico: evitar exclusão física de registros operacionais que precisam ser auditados; preferir inativação ou mecanismo equivalente conforme padrão existente.

### Critérios de aceite
- Relações e restrições impedem referências inválidas e duplicidades identificáveis.
- Migrações são versionadas e executáveis; não destruir dados existentes.
- Registros operacionais podem ser relacionados a condomínio, unidade e autor quando aplicável.
- Há estratégia documentada para atribuir RE aos colaboradores já cadastrados.
- O modelo não contém cálculos de juros/multa ou regras não aprovadas.

### Não fazer
Não inventar campos financeiros obrigatórios sem fonte de dados confirmada; não executar reset destrutivo de banco.

---

# T03 — Login, sessão e encerramento de sessão
**Prioridade:** P0  
**Dependências:** T01, T02

### Objetivo
Permitir que usuários autorizados entrem e saiam do sistema de forma segura.

### Escopo
- Usar o mecanismo de autenticação existente; se não houver, implementar conforme stack atual.
- Validar credenciais no backend, proteger rotas privadas e persistir a sessão conforme o padrão seguro do projeto.
- Disponibilizar login, logout e tratamento de sessão expirada.
- Não revelar se uma conta específica existe por meio de mensagens excessivamente específicas.
- Não registrar senhas, tokens ou segredos em logs.
- Após login, carregar perfil e escopo de acesso do usuário.
- Para atendentes, exibir o código RE como identificação visível; para Administradora e Advogados, manter a identificação prevista para essas funções.

### Critérios de aceite
- Credenciais inválidas não dão acesso.
- Rotas privadas não podem ser acessadas sem autenticação.
- Logout invalida/encerra a sessão conforme a arquitetura.
- A interface trata erros e carregamento sem travar.
- Testes cobrem sucesso, falha, sessão ausente e acesso a rota privada.

### Não fazer
Não criar um sistema paralelo se já existe autenticação funcional.

---

# T04 — Perfis, permissões e escopo por condomínio
**Prioridade:** P0  
**Dependências:** T02, T03

### Objetivo
Aplicar separação real de acesso entre Administradora, Atendente e Advogado.

### Regras de acesso
- **Administradora:** gerencia usuários, condomínios, unidades, motivos/status configuráveis existentes, carteira/distribuição, relatórios, exportações, produtividade e auditoria; pode corrigir registros com trilha de alteração.
- **Atendente:** registra atendimentos, consulta sua carteira e seu histórico operacional, vê atendimentos do dia e agenda de retornos e marca retornos como realizados. Não pode administrar usuários ou acessar a carteira completa sem autorização.
- **Advogado:** consulta inadimplência, histórico e relatórios apenas dos condomínios associados à sua responsabilidade. Não pode ver condomínios fora do seu escopo.
- As permissões devem ser validadas no backend e refletidas na interface.
- O RE não concede privilégios: é apenas identificador do colaborador.

### Critérios de aceite
- Testes automatizados ou verificações reproduzíveis demonstram que cada perfil só executa ações permitidas.
- Advogado não consegue acessar dados de outro condomínio manipulando URL/ID.
- Atendente não consegue executar ações administrativas chamando a API diretamente.
- Alterar o perfil no frontend não altera permissões reais.
- A Administradora consegue gerir os vínculos de responsabilidade necessários.

### Não fazer
Não tratar ocultar botão como controle de segurança; não presumir que todos os advogados veem todos os condomínios.

---

# T05 — Cadastro e gestão de condomínios
**Prioridade:** P0  
**Dependências:** T02, T04

### Objetivo
Manter o cadastro central dos condomínios atendidos pelo escritório.

### Escopo
- Listar, consultar, cadastrar, editar e inativar condomínios.
- Reutilizar os campos já existentes no projeto. No mínimo, manter identificador e nome; outros dados cadastrais devem seguir o modelo já documentado.
- Permitir vincular um ou mais advogados responsáveis, conforme o modelo de permissões definido.
- Disponibilizar busca, filtros e paginação se o volume justificar.
- Impedir duplicidade conforme identificador confiável disponível; não assumir que o nome isolado é sempre único.
- Não apagar histórico de cobranças ao inativar condomínio.

### Critérios de aceite
- Administradora consegue gerenciar os condomínios.
- Atendente/Advogado não altera cadastro administrativo sem permissão.
- Inativação preserva cobranças e relatórios históricos.
- O escopo do advogado passa a respeitar os vínculos cadastrados.
- Erros de validação são claros.

---

# T06 — Cadastro de unidades, condôminos e responsáveis financeiros
**Prioridade:** P0  
**Dependências:** T02, T05

### Objetivo
Relacionar cada unidade ao condomínio correto e manter os dados disponíveis para cobrança.

### Escopo
- CRUD de unidades vinculadas a um condomínio.
- Registrar proprietário/condômino e responsável financeiro quando esses dados forem fornecidos pela origem.
- Permitir consultar a unidade e seu histórico de cobrança.
- Validar os campos obrigatórios definidos no modelo atual e prevenir duplicidade de unidade dentro do mesmo condomínio usando o identificador disponível.
- Preservar vínculos e histórico ao inativar unidade ou corrigir cadastro.
- Evitar exibir dados pessoais a perfis sem necessidade de acesso.

### Critérios de aceite
- Não é possível criar unidade sem condomínio válido.
- Não há duplicidade de unidade dentro do mesmo condomínio quando o identificador já existir.
- A unidade permite chegar ao histórico de atendimentos e débitos associados.
- Correções importantes são auditáveis.
- Dados pessoais não são usados como identificador primário.

### Não fazer
Não inventar formato de unidade nem dados obrigatórios que não existam na fonte; documentar mapeamentos faltantes.

---

# T07 — Gestão de usuários e geração do código RE
**Prioridade:** P0  
**Dependências:** T02, T03, T04

### Objetivo
Permitir à Administradora gerenciar acessos e implementar a identificação numérica dos colaboradores.

### Regras do código RE
- Cada usuário com perfil de Atendente/colaborador recebe um código exclusivo no padrão `RE-001`, `RE-002`, `RE-003` etc.
- O código é gerado no backend, nunca confiando em um código enviado pelo frontend.
- A geração deve ser segura contra criação simultânea de dois usuários e garantir unicidade no banco.
- O código não muda quando o usuário é editado, desativado ou reativado.
- Não reutilizar código de usuário desativado.
- A interface operacional, atendimentos, distribuição, produtividade e relatórios identificam atendentes por RE, sem exibir nome pessoal.
- A exceção vale para Administradora e Advogado: suas identificações seguem o cadastro atual e não recebem RE, a menos que a regra seja alterada explicitamente.
- O código RE é identificador interno, não senha nem mecanismo de autenticação.

### Escopo
- Listar usuários, criar usuário, editar perfil/acesso, ativar/desativar e associar escopo de condomínio conforme permissão.
- Definir fluxo seguro de criação/alteração de credenciais sem expor senhas.
- Para usuários antigos, criar migração controlada e documentada para atribuição de RE sem colisões.
- Exibir claramente o RE atribuído após criação.
- Não permitir que usuários comuns alterem o próprio RE.

### Critérios de aceite
- Dois colaboradores nunca recebem o mesmo RE, inclusive em criações simultâneas.
- RE não muda após edição nem é reaproveitado.
- Atendentes aparecem por RE nos pontos operacionais.
- Administradora e Advogados continuam identificados como exceções.
- Somente a Administradora pode gerenciar usuários, salvo permissões já deliberadas no sistema.
- Testes cobrem criação, edição, desativação, concorrência e usuário sem permissão.

### Ponto de atenção
Se o banco já contém atendimentos com referência ao usuário, a migração deve preservar os relacionamentos. Não criar usuários duplicados para contornar a migração.

---

# T08 — Fila de cobranças (“palitagem”)
**Prioridade:** P1  
**Dependências:** T02, T05, T06, T13

### Objetivo
Apresentar as unidades/devedores que estão em cobrança ativa e precisam de ação.

### Escopo
- Criar lista de cobranças pendentes/ativas com condomínio, unidade, situação de inadimplência disponível, responsável atual (RE para atendente), último atendimento e próximo retorno quando houver.
- Permitir busca e filtros por condomínio, responsável, estado da cobrança e retorno, de acordo com dados existentes.
- Separar itens ativos de unidades quitadas/inativadas; unidades quitadas não entram na fila ativa, mas continuam no histórico.
- Mostrar estados de carregamento, lista vazia e erro.
- Paginação no backend quando necessário.

### Critérios de aceite
- A fila usa dados persistidos, não mock.
- Atendente visualiza apenas sua carteira; Administradora visualiza a carteira geral; Advogado vê informações apenas dentro do escopo jurídico e sem funções de operação não autorizadas.
- Filtros combinados funcionam.
- Unidade quitada não aparece como cobrança ativa depois de o estado de quitação ter sido confirmado.
- O histórico da unidade quitada permanece acessível a perfis autorizados.

### Não fazer
Não definir automaticamente a regra que determina quando um débito entra em cobrança; essa regra está pendente de aprovação.

---

# T09 — Distribuição e redistribuição de cobranças
**Prioridade:** P1  
**Dependências:** T04, T07, T08

### Objetivo
Permitir à Administradora atribuir cobranças aos colaboradores e acompanhar mudanças de responsável.

### Escopo
- Distribuição manual de uma ou mais cobranças a um atendente identificado por RE.
- Redistribuição com registro de responsável anterior, novo responsável, autor da mudança, data/hora e motivo quando fornecido.
- Mostrar a carteira atual por RE.
- Manter histórico de atribuições para auditoria e produtividade.
- Preparar a arquitetura para distribuição automática, mas não implementar algoritmo automático sem regra aprovada.

### Critérios de aceite
- Apenas perfis autorizados distribuem/redistribuem.
- Cada mudança preserva o histórico.
- A cobrança aparece na carteira do novo responsável e deixa de aparecer como atual na carteira do anterior, sem apagar os atendimentos anteriores.
- Relatórios históricos continuam atribuindo cada ação ao RE que a realizou, mesmo após redistribuição.
- Falha parcial em distribuição múltipla não deixa estado inconsistente.

### Decisão pendente
Critério de distribuição automática (rodízio, carga, condomínio, volume ou outro) precisa ser definido antes de implementar automação.

---

# T10 — Registrar tentativa de cobrança/atendimento
**Prioridade:** P1  
**Dependências:** T04, T06, T07, T08

### Objetivo
Permitir registrar cada tentativa de contato com poucos passos e com rastreabilidade.

### Campos e comportamento
- Condomínio e unidade vinculados à cobrança.
- Atendente autor identificado por RE; data/hora geradas pelo servidor.
- Meio utilizado: WhatsApp, telefone, e-mail ou outro meio configurável já suportado.
- Resultado da tentativa e motivo/pendência por opções cadastradas, quando disponíveis.
- Observações em texto.
- Indicação de retorno necessário e data/hora do próximo contato quando aplicável.
- Registrar se houve contato/retorno do condômino ou da administradora, conforme o significado já adotado no sistema.
- Validar que a unidade pertence ao condomínio selecionado e que o atendente tem acesso à cobrança.
- O registro de uma nova tentativa não deve sobrescrever tentativas anteriores.

### Critérios de aceite
- Formulário responsivo e rápido de preencher.
- Campos obrigatórios e validações coerentes.
- Ao salvar, registro persiste e aparece no histórico da unidade e na lista de atendimentos.
- Autor e timestamp não podem ser falsificados pelo cliente.
- Erro de salvamento é informado sem criar duplicidade por clique repetido.
- Atendente não consegue registrar tentativa em carteira alheia sem permissão.

### Não fazer
Não enviar mensagens reais por WhatsApp/e-mail automaticamente neste ticket; registrar o meio e a tentativa. Integração de envio é separada e depende de aprovação.

---

# T11 — Agenda de retornos e conclusão de retorno
**Prioridade:** P1  
**Dependências:** T10

### Objetivo
Garantir que retornos solicitados sejam acompanháveis e não se percam.

### Escopo
- Listar retornos do dia, atrasados e próximos, com filtros por período e estado.
- Exibir condomínio, unidade, RE responsável, data prevista, origem/último atendimento e observação pertinente.
- Permitir ao atendente marcar retorno como realizado, registrando autor e data/hora reais da conclusão.
- Ao concluir, preservar o agendamento original e o registro de conclusão.
- Permitir registrar novo próximo passo/retorno por meio de um novo atendimento ou fluxo existente, sem apagar o anterior.

### Critérios de aceite
- Retornos atrasados, de hoje e futuros são separados corretamente usando fuso horário configurado no projeto.
- Marcar como realizado atualiza o estado e registra quem concluiu e quando.
- Atendente só conclui retornos autorizados da sua carteira; Administradora acompanha a equipe.
- Retorno concluído não desaparece do histórico.
- Estados vazios e erros são tratados.

### Não fazer
Não inventar regras de lembrete por SMS/e-mail/push nem enviar notificações sem especificação.

---

# T12 — Histórico completo da unidade e da cobrança
**Prioridade:** P1  
**Dependências:** T06, T10, T11

### Objetivo
Consolidar a linha do tempo de cada unidade para permitir entender o que ocorreu.

### Escopo
- Exibir dados de referência da unidade e condomínio, situação atual da cobrança e débitos disponíveis.
- Linha do tempo cronológica com tentativas, retornos, redistribuições, negociações/pagamentos quando existirem e correções auditadas relevantes.
- Cada evento operacional deve identificar atendente por RE; Administradora/Advogado conforme sua identificação.
- Exibir data/hora, meio, resultado/motivo, observação e próximo passo quando aplicável.
- Preservar histórico após quitação, inativação da unidade ou redistribuição.
- Respeitar permissões por perfil e escopo de condomínio.

### Critérios de aceite
- Eventos são ordenados de forma consistente e mostram a origem da informação.
- Nenhuma redistribuição ou edição apaga eventos anteriores.
- Usuários sem permissão não veem dados pessoais ou condomínios fora do escopo.
- O histórico é consultável por computador e celular.
- Estado sem eventos é tratado sem erro.

---

# T13 — Importação de dados de inadimplência
**Prioridade:** P1  
**Dependências:** T02, T05, T06

### Objetivo
Permitir carregar dados de inadimplência fornecidos por administradoras, com validação antes de atualizar a carteira.

### Escopo
- Inspecionar formatos já usados no projeto; se não houver formato definido, criar fluxo de importação extensível e registrar os formatos pendentes.
- Permitir selecionar arquivo suportado, validar estrutura, apresentar prévia, identificar linhas inválidas e duplicadas e solicitar confirmação antes de gravar.
- Mapear condomínios/unidades usando identificadores confiáveis.
- Registrar origem, data/hora da importação, usuário responsável, quantidade lida, aceita, rejeitada e erros.
- Evitar duplicação ao importar o mesmo arquivo/dados novamente.
- Não apagar débitos ausentes do arquivo sem regra aprovada.
- Tratar importação como operação transacional ou com estratégia de recuperação consistente.

### Critérios de aceite
- O usuário vê prévia e erros antes da confirmação final.
- Linhas inválidas não são gravadas silenciosamente.
- Uma reimportação idêntica não duplica débitos.
- Há relatório do resultado da importação.
- Débitos e unidades ficam associados ao condomínio/unidade corretos.
- Dados importados não sobrescrevem registros manuais sem regra clara.

### Decisões pendentes
Formato(s) oficial(is), colunas de origem, identificadores, política de atualização de saldo e tratamento de débitos que desaparecem da fonte.

---

# T14 — Gestão de débitos, saldo e situação de inadimplência
**Prioridade:** P1  
**Dependências:** T02, T06, T13

### Objetivo
Consultar e acompanhar débitos por unidade e condomínio, mantendo valores e estados coerentes com a origem.

### Escopo
- Listar débitos por condomínio/unidade, situação, faixa de atraso se houver datas confiáveis e origem dos dados.
- Exibir valores importados e data da última atualização.
- Registrar origem e histórico de atualização para permitir rastrear mudanças.
- Diferenciar valor recebido da origem de qualquer valor calculado pelo sistema.
- Quando unidade for confirmada como quitada, removê-la da cobrança ativa e manter histórico.
- Criar indicadores de valores em aberto a partir de dados disponíveis, sem somar registros duplicados.
- Permitir correção administrativa apenas com auditoria.

### Critérios de aceite
- Valores e status são consistentes com os dados persistidos.
- A interface mostra a data/origem da última atualização.
- Quitação não apaga atendimentos e eventos anteriores.
- Alterações manuais são auditadas.
- Cálculos são testados e não presumem juros/multas ausentes.

### Não fazer
Não inventar cálculo de juros, multa, correção monetária, encargos ou regra de entrada na cobrança. Registrar como decisão pendente.

---

# T15 — Registrar proposta de negociação e acordo
**Prioridade:** P2  
**Dependências:** T02, T06, T14

### Objetivo
Registrar tratativas de negociação relacionadas à unidade/debito.

### Escopo
- Associar proposta à unidade e aos débitos pertinentes.
- Registrar data, autor, estado da proposta, valor proposto e observações, apenas conforme campos suportados pelo modelo.
- Distinguir proposta em análise, aceita, recusada ou cancelada se esses estados forem aprovados/compatíveis com o sistema.
- Quando acordo for confirmado, guardar os termos aprovados e permitir identificar sua origem.
- Não considerar uma proposta como pagamento recebido.

### Critérios de aceite
- Proposta fica vinculada à unidade e ao autor.
- Alterações de status ficam auditadas.
- Propostas anteriores continuam no histórico.
- Os dados aparecem no histórico e relatórios adequados.
- Não há cálculo financeiro automático com regras não aprovadas.

### Decisões pendentes
Campos obrigatórios, aprovação de acordo, valor de entrada, quantidade de parcelas, juros/descontos permitidos e estados oficiais.

---

# T16 — Parcelas, pagamentos e acordos quebrados
**Prioridade:** P2  
**Dependências:** T15

### Objetivo
Permitir acompanhar pagamentos e parcelas de acordos sem confundir promessa com recebimento confirmado.

### Escopo
- Registrar acordo confirmado e suas parcelas quando os termos forem definidos.
- Registrar pagamento com valor, data e referência/comprovante se disponível.
- Diferenciar previsto, informado e confirmado conforme a fonte de confirmação disponível.
- Identificar parcelas vencidas e acordos potencialmente descumpridos com base em datas e estados registrados.
- Manter histórico de alteração e permitir correção administrativa auditada.
- Atualizar saldo apenas por regra financeira aprovada e claramente documentada.

### Critérios de aceite
- Pagamento não é inferido apenas porque houve proposta ou promessa.
- Parcelas e pagamentos ficam ligados ao acordo e à unidade.
- Ajustes preservam valores anteriores e autor da alteração.
- O sistema não marca acordo como quebrado sem regra validada.
- Relatórios distinguem valor acordado, valor pago e saldo calculado quando os dados permitirem.

### Decisões pendentes
Regra oficial de quebra, tolerância de atraso, estorno, abatimento, cálculo do saldo e fonte confiável para confirmação de pagamento.

---

# T17 — Encaminhamento e acompanhamento jurídico
**Prioridade:** P2  
**Dependências:** T04, T05, T06, T12, T14

### Objetivo
Permitir encaminhar casos para análise jurídica e consultar sua evolução pelos advogados responsáveis.

### Escopo
- Registrar encaminhamento de cobrança para análise jurídica com data, autor, unidade/condomínio e informações disponíveis.
- Associar o caso ao advogado responsável conforme vínculo do condomínio ou atribuição autorizada.
- Exibir estado de acompanhamento jurídico e observações/documentos existentes.
- Restringir consulta de advogado aos condomínios sob sua responsabilidade.
- Preservar o histórico extrajudicial e as tentativas anteriores.
- Permitir consulta e relatórios sem expor casos fora do escopo.

### Critérios de aceite
- Encaminhamento aparece no histórico da unidade.
- Advogado só acessa casos dentro do seu escopo.
- Mudanças de estado/atribuição são rastreáveis.
- Documentos são acessíveis apenas a usuários autorizados.
- O sistema não ajuíza ações nem envia documentos a tribunais automaticamente.

### Decisões pendentes
Estados jurídicos oficiais, checklist de documentos, campos processuais, permissões de edição e integrações judiciais.

---

# T18 — Dashboard por perfil
**Prioridade:** P1  
**Dependências:** T04, T08, T11, T14

### Objetivo
Mostrar indicadores relevantes para cada tipo de usuário sem misturar permissões.

### Conteúdo
- **Administradora:** visão geral da carteira, cobranças ativas, retornos atrasados/hoje/próximos, valores em aberto e indicadores por condomínio/responsável conforme dados existentes.
- **Atendente:** sua carteira, atendimentos do dia, retornos de hoje/atrasados e próximos passos.
- **Advogado:** visão dos condomínios sob sua responsabilidade, histórico e indicadores de inadimplência disponíveis.
- Cada indicador deve ser derivado de dados reais e mostrar período/filtro aplicável.
- Usar estados de carregamento, erro e ausência de dados.
- Não apresentar números ilustrativos como se fossem reais.

### Critérios de aceite
- Dashboard muda de acordo com o perfil autenticado.
- Consultas respeitam escopo e permissões no backend.
- Totais correspondem às consultas/listas correspondentes.
- Valores monetários são formatados corretamente para pt-BR.
- Layout é responsivo.

### Não fazer
Não inventar metas, pontuações ou previsões. Métricas sem fonte confiável devem ser omitidas ou marcadas como indisponíveis.

---

# T19 — Relatórios, filtros e exportações
**Prioridade:** P2  
**Dependências:** T04, T12, T14, T18, T23

### Objetivo
Gerar relatórios úteis para a gestão e para os advogados, com filtros e exportação.

### Escopo
- Relatórios por condomínio, período, atendente/RE, advogado e estado, conforme o perfil e os dados disponíveis.
- Histórico de ações e visão de inadimplência por condomínio.
- Filtros devem refletir exatamente os parâmetros exibidos.
- Exportação para formatos já adotados no projeto; se ainda não houver formato definido, priorizar CSV e documentar a decisão antes de adicionar bibliotecas maiores.
- Exportação respeita as mesmas permissões da tela.
- Incluir data/hora de geração e filtros utilizados.
- Usar RE para identificar atendentes nos relatórios.
- Não exportar campos pessoais desnecessários.

### Critérios de aceite
- Resultado exportado corresponde aos filtros e ao que o usuário tem permissão para consultar.
- Advogado não consegue exportar dados de condomínios não vinculados.
- Administradora pode analisar dados por RE.
- Exportação trata acentos e caracteres pt-BR corretamente.
- Falhas de exportação são comunicadas sem expor stack traces ou dados sensíveis.

---

# T20 — Auditoria de alterações e correções administrativas
**Prioridade:** P2  
**Dependências:** T02, T04, T07, T10, T14

### Objetivo
Registrar ações importantes e permitir à Administradora investigar mudanças.

### Escopo
- Registrar eventos relevantes: criação/edição/inativação de cadastros, mudanças de responsável, correções de atendimentos, mudanças em débitos, negociações e permissões.
- Armazenar autor autenticado, data/hora, tipo de ação, entidade/registro afetado e valores anterior/novo quando aplicável.
- Não registrar senhas, tokens ou segredos.
- Exibir tela de consulta de auditoria apenas para Administradora ou perfis explicitamente autorizados.
- Correção de atendimento não deve apagar o valor anterior; deve gerar evento de auditoria.
- Identificar atendentes por RE nas entradas operacionais.
- Proteger logs contra edição comum pela aplicação.

### Critérios de aceite
- Ações auditáveis geram registro persistente.
- A consulta permite filtrar por período, autor/RE, tipo de ação e entidade quando disponível.
- Usuário sem permissão não consulta nem altera auditoria.
- A trilha permite saber o que mudou, por quem e quando.
- Dados sensíveis não aparecem em logs.

---

# T21 — Testes integrados de fluxos e permissões
**Prioridade:** P1  
**Dependências:** T03 a T20 conforme módulos implementados

### Objetivo
Validar os fluxos principais e reduzir regressões.

### Cenários mínimos
1. Login/logout de cada perfil.
2. Administradora cria condomínio, unidade e usuário atendente.
3. Sistema atribui RE único ao novo atendente.
4. Administradora distribui cobrança para um RE e a redistribui para outro.
5. Atendente registra tentativa e agenda retorno.
6. Atendente conclui retorno e histórico mantém os eventos.
7. Unidade quitada sai da fila ativa, mantendo histórico.
8. Advogado consulta condomínio permitido e recebe bloqueio ao tentar acessar outro.
9. Administradora consulta produtividade por RE e período.
10. Importação inválida mostra erros e não corrompe dados.
11. Correção de registro gera auditoria.
12. Filtros e exportações respeitam o escopo de acesso.

### Critérios de aceite
- Testes automatizados onde a arquitetura permitir; quando não for viável, fornecer roteiro reproduzível de QA.
- Testes não dependem de credenciais reais nem serviços externos ativos.
- Falhas críticas são corrigidas antes de declarar o fluxo pronto.
- README descreve como executar os testes.

---

# T22 — Integração com Superlógica e outras administradoras
**Prioridade:** P2  
**Dependências:** T13, T14

### Objetivo
Preparar e implementar a entrada de dados de inadimplência a partir de sistemas de administradoras, sem acoplar a aplicação a uma única origem.

### Escopo
- Antes de codificar integração real, confirmar API/documentação, credenciais, permissões, condomínio de teste, dados disponíveis e limites de uso.
- Criar adaptador por origem, normalizando os dados para o modelo interno.
- Registrar execução, data/hora, origem, resultado, quantidade importada/atualizada/rejeitada e erro técnico seguro.
- Prever falha de conexão, timeout, autenticação inválida, resposta incompleta e repetição segura.
- Não sobrescrever dados corretos com resposta incompleta/antiga sem regra de sincronização aprovada.
- Manter importação manual como caminho de contingência, se já suportada.
- Nunca colocar tokens no código, frontend, logs ou repositório.

### Critérios de aceite
- Uma integração só é considerada funcional quando testada com documentação e ambiente autorizado.
- Repetir sincronização não duplica débitos.
- Falha externa fica visível para a Administradora sem derrubar o sistema.
- Mapeamento de campos e regras de atualização ficam documentados.
- Se faltarem API/credenciais, entregar apenas a estrutura/adaptador e registrar o bloqueio — não simular sincronização real.

### Decisões pendentes
API e versão de cada administradora, autenticação, frequência de sincronização, campos disponíveis, identificadores e regra de reconciliação.

---

# T23 — Painel de produtividade por colaborador (RE)
**Prioridade:** P1  
**Dependências:** T07, T10, T11, T09, T18

### Objetivo
Permitir que a Administradora acompanhe a produtividade individual dos colaboradores usando RE como identificação visível.

### Métricas objetivas iniciais
Para um período selecionado:
- quantidade de atendimentos/tentativas registrados pelo RE;
- divisão por meio de contato, quando o dado existir;
- retornos previstos;
- retornos concluídos;
- retornos atrasados/em aberto;
- cobranças atualmente atribuídas ao RE;
- acordos registrados, somente se o módulo de acordos estiver implementado e o dado for confiável.

### Regras
- Filtros por período são obrigatórios; filtro por condomínio pode ser oferecido quando aplicável.
- Exibir o intervalo consultado e a definição de cada indicador.
- Contar eventos pelo **autor que realmente realizou a ação**, não pelo responsável atual da cobrança. Redistribuir uma carteira não transfere a produtividade histórica para o novo responsável.
- Separar “atendimento registrado” de “retorno concluído”; não contar o mesmo evento duas vezes sem explicação.
- Não implementar score, ranking, metas, nota de desempenho ou avaliação automática sem definição expressa da Administradora.
- A tela deve ser visível somente para a Administradora, salvo autorização futura.
- Usar RE em gráficos, tabelas, filtros e exportações. Não mostrar nome pessoal de atendente.
- Os dados precisam vir de consultas reais e ser consistentes com o histórico.

### Critérios de aceite
- Administradora seleciona um período e visualiza métricas por RE.
- Cada métrica tem definição clara e é verificável a partir dos registros.
- Atendente não consegue acessar o painel global de produtividade.
- Ações antigas continuam atribuídas ao RE autor original.
- Retornos cancelados/inativos, se houver esse estado, não são contados como concluídos.
- Quando não houver dados, mostrar zero/estado vazio de maneira inequívoca, não dados fictícios.
- Testes cobrem filtro de período, mudança de responsável, escopo e permissões.

### Decisão pendente
Se a Administradora deseja apenas indicadores de volume (contagens) ou também metas, comparação, taxa de sucesso e pontuação. Implementar inicialmente apenas as métricas objetivas acima.

---

## Ordem sugerida de execução

1. T01 — Inspeção da base
2. T02 — Modelo de dados
3. T03 — Login e sessão
4. T04 — Permissões
5. T05 — Condomínios
6. T06 — Unidades e responsáveis
7. T07 — Usuários e RE
8. T08 — Fila de cobranças
9. T09 — Distribuição
10. T10 — Atendimentos
11. T11 — Retornos
12. T12 — Histórico
13. T13 — Importação
14. T14 — Débitos e saldos
15. T18 — Dashboards
16. T23 — Produtividade por RE
17. T20 — Auditoria
18. T19 — Relatórios e exportações
19. T15 — Negociações
20. T16 — Pagamentos e acordos quebrados
21. T17 — Jurídico
22. T21 — Testes integrados contínuos
23. T22 — Integrações externas

A ordem pode mudar conforme o estado real do repositório, mas as dependências de segurança e dados não devem ser ignoradas.

## Prompt curto para executar cada ticket no Cursor

> Leia `docs/TICKETS_CURSOR_DANIEL_JORGE.md` e execute somente o ticket **TXX — [título]**. Primeiro inspecione o código existente e suas dependências. Preserve a arquitetura e funcionalidades atuais. Não invente regras de negócio ausentes; registre dúvidas em `docs/DECISOES_PENDENTES.md`. Implemente a funcionalidade de ponta a ponta, incluindo persistência, validação, autorização no backend, interface responsiva e testes compatíveis com o projeto. Ao terminar, execute os testes/typecheck disponíveis e informe: arquivos alterados, comportamento implementado, critérios de aceite atendidos, comandos executados e pendências. Não marque como concluído o que não foi testado.

## Decisões de negócio ainda não especificadas — não presumir
1. Critério exato para uma unidade entrar/sair da cobrança, além da regra conhecida de que unidade quitada sai da fila ativa e mantém histórico.
2. Fórmula de juros, multa, correção e saldo devedor.
3. Algoritmo de distribuição automática da carteira.
4. Catálogo oficial de motivos, resultados e estados da cobrança.
5. Regras de proposta, aprovação, entrada, parcelamento, atraso e quebra de acordo.
6. Formatos de importação e campos oficiais de cada administradora.
7. APIs, credenciais e frequência das integrações.
8. Metas, ranking, taxa de sucesso ou pontuação de produtividade, caso desejados além das contagens objetivas.
9. Campos cadastrais obrigatórios de condomínio, unidade, condômino e responsável financeiro que não estejam definidos no projeto atual.
10. Regras de retenção e acesso a documentos jurídicos.
