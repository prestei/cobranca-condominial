# DANIEL JORGE ADVOCACIA

**Projetos de tecnologia para o jurídico de cobrança condominial**

*Documento de requisitos para orçamento e desenvolvimento*

- **Projeto 1** · Sistema de palitagem e acompanhamento das cobranças
- **Projeto 2** · Painel de inadimplência integrado à Superlógica e às demais administradoras

*Setembro de 2026*

---

## 1. Contexto e necessidades do escritório

O escritório presta assessoria jurídica de cobrança a **35 condomínios**, distribuídos entre três advogados responsáveis. A cobrança amigável é feita por uma equipe de atendentes, coordenada por uma administradora interna. Os dados de débito vêm das administradoras dos condomínios, principalmente em relatórios PDF extraídos de sistemas como a Superlógica.

| Item | Situação atual |
|------|----------------|
| Condomínios atendidos | 35 (lista completa no Anexo A) |
| Advogados responsáveis | Dra Adryelle Lima |
| Equipe de cobrança | **Administradora:** Milena · **Atendentes:** Raquel, Tássia e Atendente nº 3 |
| Origem dos débitos | Relatórios das administradoras (ex.: "Inadimplência com composição (detalhado)"), sistema Superlógica e outros |
| Principais problemas | Contatos sem registro padronizado; retornos combinados se perdem; indicadores de inadimplência montados à mão, relatório por relatório |

Por isso, o escritório precisa de **duas ferramentas que conversam entre si**:

1. **Projeto 1:** registrar cada cobrança feita pela equipe (a "palitagem"), com alertas de retorno e relatórios de produtividade.
2. **Projeto 2:** puxar automaticamente os débitos das administradoras e mostrar a inadimplência de cada condomínio, separada por tempo de atraso e por tipo de cobrança.

Os dois podem ser entregues em fases separadas, mas formam **um único sistema**: o mesmo cadastro de condomínios, unidades e colaboradores, e o atendimento sempre parte do débito em aberto da unidade. Não há um cadastro separado de processo de cobrança.

---

## 2. Projeto 1 — Sistema de palitagem e acompanhamento das cobranças

### 2.1 Objetivo

Sistema web, acessível pelo computador e pelo celular, em que cada atendente registra em poucos cliques cada tentativa de cobrança. O sistema grava data e hora sozinho, avisa os retornos agendados e gera relatórios prontos, com gráficos, para a administradora e para os advogados.

> **Protótipo de referência:** O escritório já tem um protótipo funcional desta tela, usado para validar os campos e o fluxo. Ele deve ser usado como referência visual e de comportamento. O programador pode pedir acesso para demonstração.

### 2.2 Colaboradores e permissões

| Perfil | Quem | O que pode fazer |
|--------|------|------------------|
| Administradora | Milena | Tudo: cadastros de condomínios, atendentes e motivos; relatórios de toda a equipe; exportações; corrigir registros (com histórico da alteração) |
| Atendente | Raquel, Tássia, Atendente nº 3 | Registrar atendimentos; ver seus atendimentos do dia e sua agenda de retornos; marcar retorno como feito |
| Advogado(a) (opcional) | Dra. Adryelle | Consultar relatórios e histórico dos condomínios sob sua responsabilidade |

**Requisito:** login individual com senha para cada pessoa. O nome de quem registra o atendimento vem do login e **não pode ser escolhido livremente**, para garantir a autoria de cada registro.

### 2.3 Tela de palitagem (registro do atendimento)

A tela deve ser feita para **escolher, não para digitar**. As opções aparecem como botões ou listas, e o texto livre fica restrito ao nome, à unidade e à observação.

| Campo | Tipo | Opções e regras | Obrig. |
|-------|------|-----------------|--------|
| Atendente | Automático | Colaborador logado | Sim |
| Data, horário e mês | Automático | Gravados no momento em que o registro é salvo. Não editáveis pela atendente | Sim |
| Condomínio | Botões | Os 35 condomínios em ordem alfabética, sem separação por advogado. Cada condomínio fica vinculado internamente ao advogado responsável, para os relatórios | Sim |
| Unidade | Texto | Ex.: 104, B-203. Depois do Projeto 2: lista das unidades inadimplentes do condomínio | Sim |
| Nome do condômino | Texto | Depois do Projeto 2: preenchido automaticamente pela unidade | Sim |
| Meio de cobrança | Botões | Ligação · WhatsApp · E-mail · SMS · Presencial · Carta/notificação | Sim |
| O condômino respondeu? | Sim / Não | Se "Não", os campos de conversa ficam ocultos | Sim |
| Com quem falou? | Botões | Proprietário · Outro. Se "Outro", abre campo de texto para informar quem atendeu (esposa, filho, inquilino, procurador...) | Se respondeu |
| Motivo da pendência | Lista | Ver item 2.4. Lista editável pela administradora | Se respondeu |
| Pediu retorno? | Sim / Não | Quando não respondeu, o rótulo muda para "Agendar nova tentativa?" | Sim |
| Data e horário do retorno | Data / hora | Aparece só se "Sim". Data igual ou posterior a hoje. Gera alerta (item 2.5) | Se "Sim" |
| Observação | Texto livre | Opcional, para detalhes que não cabem nas opções | Não |

### 2.4 Motivos da pendência (lista inicial)

Lista editável pela administradora, sem precisar do programador:

- Dificuldade financeira
- Desemprego
- Doença / problema de saúde
- Esqueceu o vencimento
- Não recebeu o boleto
- Discorda do valor cobrado
- Aguarda proposta de acordo
- Já pagou (enviar comprovante)
- Inquilino é o responsável
- Falecimento / inventário
- Imóvel à venda ou em disputa
- Recusa-se a pagar
- Não informou o motivo
- Outro

> **Atenção à LGPD:** "Doença / problema de saúde" é dado pessoal sensível (Lei 13.709/2018, art. 11). O sistema deve registrar apenas a categoria, exibir um lembrete para não anotar diagnóstico ou detalhes e restringir a visualização desse motivo a quem precisa.

### 2.5 Alertas de retorno

- Painel **"Retornos agendados"** na tela inicial de cada atendente: atrasados (vermelho), de hoje (laranja) e dos próximos 7 dias.
- Contador de retornos pendentes visível no menu.
- Botão **"Feito"** para dar baixa. O sistema grava quem deu baixa e quando.
- A administradora vê os retornos de toda a equipe, inclusive os atrasados por atendente.
- **Desejável:** aviso diário por e-mail ou WhatsApp com os retornos do dia de cada atendente.

### 2.6 Histórico por unidade

Ao abrir uma unidade, o sistema mostra a **linha do tempo** de todos os contatos: data, atendente, meio, resposta, motivo e retornos. No topo, aparecem o total de tentativas, a data do último contato e a situação da unidade (em cobrança, em acordo, notificada, ajuizada ou quitada).

### 2.7 Relatórios (perfil administradora)

Relatórios prontos em um clique: **Hoje · Últimos 7 dias · Mês atual · Mês anterior**.

Filtros combináveis: período (de/até), advogado responsável, condomínio, atendente, respondeu (sim/não), motivo da pendência e meio de cobrança.

| Indicador ou gráfico | Descrição |
|----------------------|-----------|
| Totais do período | Atendimentos · % que responderam · unidades contatadas · retornos pendentes |
| Atendimentos por dia | Colunas por dia; por mês quando o período passa de 2 meses |
| Motivo da pendência | Ranking dos motivos, com quantidade e percentual |
| Respondeu x não respondeu | Taxa de contato efetivo |
| Por condomínio / atendente / advogado / meio | Barras comparativas |
| Resumo por condomínio | Atendimentos, % de resposta, unidades contatadas e último atendimento |
| Retornos pendentes | Lista com situação (atrasado, hoje, agendado) |
| Lista detalhada | Todos os registros do período, com todas as colunas |

**Exportação:** planilha Excel com todas as colunas e relatório em PDF com os gráficos, prontos para enviar a síndicos ou apresentar em assembleia.

### 2.8 Regras de negócio e segurança

- Registros **não podem ser apagados** pelas atendentes. Correções só pela administradora, com log de quem alterou, quando e o valor anterior (trilha de auditoria útil para prova em juízo).
- Cadastros de condomínios, atendentes e motivos editáveis apenas pela administradora.
- Hospedagem com HTTPS, backup diário e registro de acessos.
- Funcionar bem no **celular**, porque muitas cobranças são feitas por WhatsApp.

### 2.9 Entregas sugeridas

| Fase | Conteúdo |
|------|----------|
| **1 · Essencial** | Login e perfis · cadastros · tela de palitagem · atendimentos do dia · alertas de retorno · histórico por unidade |
| **2 · Gestão** | Relatórios com filtros e gráficos · exportação Excel e PDF · log de alterações |
| **3 · Automação** | Aviso diário de retornos · integração com o Projeto 2 (unidade e nome do condômino automáticos) · modelos de mensagem de cobrança |

---

## 3. Projeto 2 — Painel de inadimplência integrado às administradoras

### 3.1 Objetivo

Buscar automaticamente, na Superlógica e nos sistemas das demais administradoras, os débitos em aberto de cada condomínio atendido. Com isso, o painel deve mostrar, **sem trabalho manual**:

- percentual de inadimplência de cada condomínio e da carteira;
- inadimplência com **até 60 dias** e com **mais de 60 dias** de atraso;
- inadimplência de **cota condominial ordinária**, separada da inadimplência de taxa extra, de acordos e de multas.

### 3.2 Fontes de dados

#### a) Superlógica (integração por API)

- A Superlógica oferece uma API REST para condomínios, com endereço-base `https://api.superlogica.net/v2/condor/` e autenticação pelos cabeçalhos `app_token` e `access_token`.
- Os tokens são criados pela administradora dentro do sistema, em *"Todos os usuários › API (Integração com outros sistemas) › Aplicativos › Novo App Token"*.
- O token herda as permissões do usuário que o criou. Por isso, cada administradora deve criar um usuário só de leitura, restrito aos condomínios atendidos pelo escritório.
- Cabe ao programador confirmar na documentação oficial quais rotas trazem unidades, cobranças em aberto e composição dos débitos, e com qual frequência podem ser consultadas.

#### b) Administradoras sem API ou com outros sistemas

- Importação de relatórios em PDF, Excel ou CSV enviados pela administradora, por exemplo o relatório *"Inadimplência com composição (detalhado)"*.
- Um leitor por modelo de relatório, com prévia antes de gravar e conferência automática com os totais do próprio relatório.
- Guardar o arquivo original e a data-base de cada importação.

#### c) Dados que o relatório normalmente não traz

Para calcular o percentual de inadimplência, o sistema também precisa do **total de unidades** do condomínio e do **valor total emitido** no período. A Superlógica pode fornecer esses dados pela API. Para as outras administradoras, eles devem ser informados no cadastro ou importados à parte.

### 3.3 Conceitos e cálculos

| Conceito | Definição para o sistema |
|----------|---------------------------|
| Data-base | Data a que se referem os valores (ex.: "valores atualizados até 25/09/2026") |
| Dias de atraso | Data-base menos data de vencimento de cada cobrança |
| Valor original x atualizado | Original: valor da cobrança. Atualizado: com juros, multa, correção e honorários. Os dois devem ser exibidos |
| Inadimplência de até 60 dias | Cobranças com até 60 dias de atraso na data-base (cobrança recente, fase amigável). O limite deve ser configurável |
| Inadimplência acima de 60 dias | Cobranças com mais de 60 dias de atraso, fase típica de encaminhamento jurídico |
| % de inadimplência (valor) | Valor vencido e não pago ÷ valor total emitido no mesmo período × 100 |
| % de inadimplência (unidades) | Unidades com débito vencido ÷ total de unidades do condomínio × 100 |
| Cota condominial ordinária | Taxa mensal para as despesas ordinárias do condomínio (no relatório: "Cotas do Mês") e, quando cobrado junto, o "Fundo de Reserva" |
| Taxa extra | Cobrança extraordinária (ver quadro abaixo) |
| Acordo | Parcelas de acordos firmados e não pagas, com juros, multas e correção da parcela |
| Multa por infração | Penalidades por descumprimento da convenção ou do regimento interno |

#### O que é inadimplência de taxa extra

**Taxa extra** (ou cota extraordinária, rateio extra) é a cobrança aprovada em assembleia para cobrir despesas que não fazem parte do custeio mensal: obras e reformas estruturais, benfeitorias, pintura de fachada, instalação de equipamentos, indenizações, recomposição do fundo de reserva, entre outras. **Inadimplência de taxa extra** é o valor dessas cobranças vencido e não pago.

Ela precisa aparecer **separada da cota ordinária** por três motivos:

1. **Obrigação:** na locação, as despesas extraordinárias cabem ao proprietário (Lei 8.245/1991, art. 22, X), e as ordinárias podem ser repassadas ao inquilino (art. 23, XII). Isso muda de quem cobrar.
2. **Finalidade:** o dinheiro da taxa extra tem destino específico, aprovado em assembleia. A falta dele atrasa aquela obra ou despesa, e não o custeio do mês.
3. **Prestação de contas:** síndico e assembleia costumam acompanhar a arrecadação de cada chamada extra separadamente.

### 3.4 Classificação das cobranças

Cada administradora nomeia as cobranças de um jeito. O sistema deve ter uma **tabela de correspondência**, editável pelo escritório, que ligue cada descrição a um grupo. Proposta inicial, a partir das descrições do relatório real do Condomínio Azaleias:

| Grupo | Descrições encontradas no relatório |
|-------|-------------------------------------|
| Cota condominial ordinária | Cotas do Mês · Fundo de Reserva |
| Taxa extra | Taxa Extra · Rateio Extra · Taxa Limpeza de Terreno |
| Acordo | Acordo · Juros · Multas · Atualização Monetária · Honorário Advocatício (linhas que compõem as parcelas de acordo) |
| Multa por infração | Multas Infrações |
| Outros | Reembolso ao condomínio · Reserva Salão de Festas · Taxa de Cobrança · Pagamentos a Menor |

### 3.5 Exemplo com dados reais (Azaleias, data-base 25/09/2026)

Valores atualizados, calculados a partir do relatório da administradora, para mostrar ao programador o resultado esperado:

| Grupo | Total atualizado | % do total | Acima de 60 dias | Até 60 dias |
|-------|------------------|------------|------------------|-------------|
| Cota condominial ordinária | R$ 722.720,89 | 68,4% | R$ 663.573,91 | R$ 59.146,98 |
| Acordo | R$ 207.742,10 | 19,7% | R$ 174.385,98 | R$ 33.356,12 |
| Taxa extra | R$ 114.077,48 | 10,8% | R$ 114.077,48 | R$ 0,00 |
| Multa por infração | R$ 9.158,21 | 0,9% | R$ 9.060,15 | R$ 98,06 |
| Outros | R$ 2.304,36 | 0,2% | R$ 2.304,36 | R$ 0,00 |
| **Total** | **R$ 1.056.003,04** | **100%** | **R$ 963.401,88 (91,2%)** | **R$ 92.601,16 (8,8%)** |

Corte usado: vencimentos até 27/07/2026 contam como acima de 60 dias. O valor original em aberto é de R$ 638.283,10, em 249 unidades. O percentual sobre o valor emitido depende do total emitido no período, que não consta no relatório.

### 3.6 Painel e relatórios

| Visão | Conteúdo |
|-------|----------|
| Carteira | Todos os condomínios: total em aberto, % de inadimplência, até 60 x acima de 60 dias, ranking de condomínios |
| Por advogado responsável | Mesmos indicadores para os condomínios de cada advogado |
| Por condomínio | % de inadimplência (valor e unidades) · cota ordinária x taxa extra x acordo x multa · faixas de atraso (até 30, 31–60, 61–90, 91–180, 181–365 dias, 1–2 anos, mais de 2 anos) · 10 maiores devedores |
| Evolução | Fotografia mensal de cada condomínio, para comparar mês a mês se a inadimplência sobe ou cai |
| Alertas jurídicos | Débitos perto de 5 anos (prescrição, CC art. 206, §5º, I) · acordos descumpridos · unidades que passaram de 60 dias de atraso no mês |
| Exportação | PDF com gráficos para assembleia e Excel com a lista de unidades e débitos |

### 3.7 Integração com o Projeto 1

- Na palitagem, ao escolher o condomínio, aparece a lista de unidades inadimplentes, com nome do titular, valor e dias de atraso.
- Unidade quitada sai da lista de cobrança automaticamente, sem apagar o histórico.
- Relatório que cruza atendimentos com resultado: unidades contatadas que pagaram ou fizeram acordo no mês seguinte.

### 3.8 Segurança e LGPD

- Tokens das administradoras guardados **cifrados no servidor**, nunca no navegador, com acesso só de leitura.
- Contrato com o programador ou empresa com cláusulas de confidencialidade e de tratamento de dados como operador (LGPD, arts. 37 a 40).
- Acesso aos valores por perfil: advogados veem seus condomínios; atendentes, apenas o necessário para a cobrança.

### 3.9 Entregas sugeridas

| Fase | Conteúdo |
|------|----------|
| **1** | Importação do relatório PDF/Excel da administradora · classificação das cobranças · painel por condomínio com até 60 x acima de 60 dias e cota x taxa extra |
| **2** | Integração por API com a Superlógica · atualização automática (diária ou semanal) · painel da carteira e por advogado · fotografia mensal |
| **3** | Leitores para outras administradoras · alertas jurídicos · integração completa com o Projeto 1 |

---

## 4. O que o escritório fornece e pontos a definir

### 4.1 O escritório fornece

- Lista dos condomínios com advogado responsável (Anexo A) e a administradora de cada um.
- Exemplos reais dos relatórios de inadimplência de cada administradora.
- Acesso à API da Superlógica, com tokens criados pelas administradoras.
- Validação das telas em cada fase, com a administradora (Milena) e as atendentes.

### 4.2 Perguntas para a proposta do programador

- Tecnologia e hospedagem: sistema web responsivo? Onde fica hospedado? Quem mantém e faz backup?
- Integração Superlógica: quais rotas serão usadas e qual o limite de consultas? Frequência de atualização viável?
- Quantas administradoras e modelos de relatório serão atendidos na primeira versão?
- Prazo e custo por fase, com a manutenção mensal separada.
- Propriedade do código e dos dados, e como exportar tudo se o contrato terminar.
- Suporte: canal, prazo de resposta e correção de erros.
- Cláusulas de confidencialidade e LGPD no contrato.

---

## Anexo A — Condomínios atendidos

| Advogado(a) responsável | Condomínios |
|-------------------------|-------------|
| Dra. Thamires (13) | Francisca Perea, Jardins do Vale, Parque dos Pássaros, Residencial do Mar, Acqua Ville, Azaleias, Reserva Sim, Moradas Ville, Mariglória, Madrid, Solar Ondina, Lisboa, Salvador Life III |
| Dra. Jullyane (15) | Ideale, Floratta, Gardênia, Arbol, Parque das Orquídeas, Solar das Mangueiras, Casas de Turim, Reserva Humaitá, Esplanada do Sol, Moradas do Parque II, Morada Imperial, Alameda das Flores, Green Village, Quintas do Sol I, Recanto dos Pássaros |
| Dr. João (7) | Pedra de Aleluia, Santa Brígida, Villa Vina, Itapema, Vila Rica, Principado de Mônaco, Victória |

Na tela de palitagem, os condomínios aparecem **juntos, em ordem alfabética**. A divisão por advogado é usada só nos relatórios.
