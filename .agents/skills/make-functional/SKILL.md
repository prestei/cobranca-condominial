Skill de Telas — Fidelidade Absoluta + Qualidade Visual

Esta skill tem duas responsabilidades, nesta ordem de prioridade:

Fidelidade: executar exatamente o que o usuário pediu.
Qualidade: entregar uma interface bem construída, consistente, acessível, responsiva e verificada.

Qualidade nunca autoriza contrariar o pedido. Quando o pedido deixa espaço livre, use este documento para preencher esse espaço com excelência.

REGRA MÁXIMA — FIDELIDADE ABSOLUTA À SOLICITAÇÃO

Executar exatamente o que o usuário solicitou, respeitando escopo, referências, restrições e resultado esperado.

O agente não substitui a solicitação por sua própria interpretação ou preferência técnica.

Autonomia técnica não significa autonomia para alterar requisitos. Use a capacidade técnica para descobrir a melhor forma de executar o pedido, nunca para decidir o que o usuário deveria ter pedido.

1. Entender antes de executar

Antes de qualquer alteração, transformar o pedido em requisitos objetivos:

O que exatamente foi pedido.
Qual o resultado final esperado.
O que deve ser alterado.
O que deve permanecer intacto.
Restrições explícitas e implícitas.
Arquivos, componentes e funcionalidades envolvidos.

Não confundir o objetivo geral do projeto com o escopo da tarefa atual.

Escreva a lista de requisitos (mentalmente ou no plano) e use-a como checklist na validação final. Se o pedido tiver várias partes, numere cada uma e trate cada uma como requisito independente.

2. Proibição de alterações não solicitadas

É expressamente proibido:

Alterar funcionalidades que não fazem parte da solicitação.
Modificar outras telas por conveniência.
Criar funcionalidades adicionais sem autorização.
Remover elementos existentes sem solicitação.
Alterar textos, nomes, regras de negócio ou comportamentos sem necessidade.
Substituir componentes existentes por alternativas desnecessárias.
Mudar arquitetura ou tecnologias sem justificativa técnica.
Simplificar a implementação eliminando requisitos solicitados.
Inventar dados, informações, estados ou comportamentos.
Fazer melhorias adicionais que modifiquem o resultado esperado.
Reformatar, renomear ou reorganizar código fora do trecho tocado.

Se identificar uma melhoria relevante, não implemente. Registre-a como sugestão separada no fim da entrega.

3. Hierarquia de requisitos

Em caso de conflito, respeitar esta ordem:

Instruções explícitas do usuário na solicitação atual.
Arquivos, imagens, documentos e referências fornecidos pelo usuário.
Requisitos e decisões anteriores ainda válidos para o projeto.
Arquitetura, padrões e convenções existentes (design system, tokens, componentes).
Boas práticas técnicas e as diretrizes de qualidade desta skill.

Boas práticas não autorizam contrariar uma decisão explícita do usuário.

Se houver conflito real entre requisitos, não escolher em silêncio: identificar o conflito e pedir esclarecimento quando ele impedir uma implementação correta. Se o conflito for menor, escolher a opção que respeita o nível mais alto da hierarquia e registrar a decisão na entrega.

4. Execução sem desvios

Quando o pedido estiver suficientemente claro:

Executar diretamente, trabalhando nos arquivos existentes do projeto.
Não ficar apenas explicando como fazer.
Não entregar somente exemplos ou pseudocódigo.
Não substituir a implementação por recomendações.
Não parar após analisar ou planejar.
Não considerar implementação parcial como concluída.
Não fazer perguntas desnecessárias. Se uma dúvida puder ser resolvida lendo o código, a referência ou o histórico, resolva lá.

Só pergunte quando a ambiguidade mudaria materialmente o resultado e não puder ser resolvida pelo contexto. Nesse caso, faça uma pergunta objetiva, com a sua melhor hipótese já proposta.

Se encontrar impedimento técnico, investigar a causa e resolver dentro do escopo autorizado. Se não for possível, explicar o impedimento com precisão.

5. Referências visuais são especificações

Imagem, captura de tela, protótipo, Figma ou qualquer referência visual é especificação de implementação, não inspiração.

Reproduzir, conforme aplicável:

Estrutura e hierarquia dos elementos.
Quantidade e posição dos componentes.
Distribuição horizontal e vertical.
Proporções e dimensões.
Largura dos containers.
Espaçamentos internos e externos.
Alinhamentos.
Tipografia (família, tamanho, peso, altura de linha).
Cores.
Bordas, arredondamentos e sombras.
Organização de tabelas (colunas, ordem, alinhamento por tipo de dado).
Posição de botões, filtros e indicadores.
Ícones, estados visíveis e comportamento responsivo.

Não reinterpretar o layout, reorganizar componentes ou criar proposta visual alternativa quando o pedido é reproduzir uma referência.

Método de leitura de referência (faça antes de codar):

Descreva a imagem em regiões: cabeçalho, navegação, área de conteúdo, rodapé.
Para cada região, liste os elementos, a ordem e a quantidade.
Estime a grade: número de colunas, proporção entre colunas, largura máxima do conteúdo.
Extraia a escala de espaçamento (ex.: 4/8/12/16/24/32) e a escala tipográfica.
Extraia a paleta (fundo, superfícies, texto, texto secundário, borda, cor primária, estados).
Anote o que a imagem não mostra (hover, foco, vazio, erro, mobile) e preencha com os padrões do projeto, sem inventar identidade nova.

Se o usuário pedir uma melhoria visual sem referência, existe liberdade para aprimorar a apresentação, mas sem alterar finalidade, informações e estrutura funcional além do autorizado.

6. Preservação do contexto existente

Antes de modificar qualquer componente:

Entender sua responsabilidade.
Identificar onde é utilizado (buscar usos no projeto).
Verificar dependências.
Verificar se é compartilhado com outras telas.
Preservar funcionalidades e integrações existentes.

Preferir alterações localizadas a reconstruções completas.

Não modificar componentes globais ou estilos compartilhados para resolver problema específico de uma página quando houver alternativa localizada (prop, variante, classe local, wrapper). Se a alteração global for realmente necessária, listar todas as telas impactadas e verificá-las.

7. Regra contra interpretações criativas

A criatividade só é usada quando o usuário solicitar criação, exploração ou liberdade de design. Quando o usuário especifica o resultado, a prioridade absoluta é a fidelidade.

FASE EXTRA — IMPLEMENTAÇÃO DE FRONTEND E INTERFACES VISUAIS

Aplicar sempre que a solicitação envolver telas, componentes, páginas, dashboards, tabelas, formulários ou alterações visuais.

Etapa A — Diagnóstico do projeto

Antes de escrever código visual:

Localizar a página e seus componentes.
Identificar a stack (framework, biblioteca de UI, CSS/Tailwind/SCSS, ícones, gráficos).
Localizar tokens e tema: variáveis CSS, tailwind.config, arquivo de tema, design system.
Identificar componentes reutilizáveis (Button, Input, Table, Card, Modal, Badge, Tabs, EmptyState, Skeleton).
Entender a estrutura atual do DOM e dos containers.
Identificar grids, flexbox, larguras, alturas e espaçamentos em uso.
Identificar breakpoints e o comportamento responsivo atual.
Identificar como o projeto trata dados, carregamento, erro e vazio.

A regra de ouro: o projeto já tem uma linguagem visual; a tela nova deve parecer ter nascido nele.

Etapa B — Plano curto (antes de codar)

Produza um plano compacto, sem prolixidade:

Requisitos: a lista numerada do item 1 da regra máxima.
Estrutura: um wireframe ASCII da tela (desktop e, se relevante, mobile).
Tokens a usar: cores, tipografia, espaçamentos e raios, vindos do projeto.
Componentes: o que será reutilizado e o que será criado (e por quê).
Estados: carregando, vazio, erro, sucesso, desabilitado, foco.

Quando o projeto não tem identidade visual definida e o usuário deu liberdade de design, defina um sistema enxuto antes de codar:

Cor: 4 a 6 valores nomeados (fundo, superfície, texto, texto secundário, borda, primária) mais cores semânticas (sucesso, alerta, erro, informação).
Tipografia: uma ou duas famílias com papéis claros e uma escala definida.
Layout: conceito em uma frase e alinhamento (esquerda, centro).
Princípio: uma ideia que dá personalidade à tela. Concentre a ousadia em um único ponto e mantenha o resto discreto e disciplinado.

Evite o genérico por padrão: fundo creme com serifa e terracota, preto com um único acento neon, cartões idênticos com a mesma sombra cinza, gradientes decorativos, rótulos em caixa-alta com espaçamento largo acima de todo título, → em todo botão. Esses recursos só entram se o pedido ou o projeto os pedir.

Etapa C — Implementação

Regras gerais

Preservar a identidade visual do projeto.
Respeitar as referências enviadas.
Reutilizar componentes existentes sempre que possível.
Não introduzir bibliotecas sem necessidade real e sem avisar.
Não substituir estrutura funcional por outra por preferência.
Não usar valores arbitrários (números mágicos) sem entender o layout; usar tokens e a escala do projeto.
Não comprometer outras páginas com alterações globais.
Preservar interações, estados e integrações existentes (handlers, chamadas de API, rotas, permissões).
Não remover nem renomear ids, classes, data-* ou atributos que testes ou outros códigos possam usar.

Estrutura e layout

HTML semântico: header, nav, main, section, table, button, label, form. Nada de div clicável no lugar de button.
Use CSS Grid para composição bidimensional e Flexbox para alinhamento em uma dimensão.
Defina largura máxima do conteúdo e use container centralizado onde o projeto já faz isso.
Siga uma escala de espaçamento consistente (múltiplos de 4 ou 8). Espaço entre grupos maior que dentro dos grupos.
Agrupamento por proximidade: itens relacionados juntos, seções separadas por espaço, e só por borda ou divisor quando isso transmitir informação.
Hierarquia clara: um elemento principal por região, ações primárias evidentes, secundárias discretas.
Evite alturas fixas em conteúdo dinâmico; prefira min-height e deixe o conteúdo crescer.
Evite z-index aleatório; use a escala do projeto.

Tipografia

Escala tipográfica definida e reutilizada (por exemplo 12/14/16/20/24/32), com no máximo 2 famílias.
Linhas de texto corrido com menos de ~80 caracteres.
Altura de linha: ~1.4 a 1.6 no corpo; mais apertada em títulos grandes.
Números em tabelas e indicadores: usar font-variant-numeric: tabular-nums quando disponível e alinhar à direita.
Não usar peso e tamanho ao mesmo tempo para diferenciar o que um só resolve.
Evitar destacar uma única palavra de título com cor ou itálico apenas por estilo.

Cor e contraste

Cores vêm de tokens. Não espalhar hex soltos pelo código.
Contraste mínimo WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande e componentes de interface.
Cor nunca é a única forma de transmitir estado: acompanhar de ícone, texto ou forma.
Suportar modo escuro somente se o projeto já suporta ou se foi pedido.

Componentes e padrões de tela

Dashboards e indicadores (KPIs)

Indicadores em linha única no desktop quando a referência assim mostrar (ex.: 4 cards numa linha com grid-template-columns: repeat(4, minmax(0, 1fr))), quebrando somente por necessidade responsiva.
Cada indicador: rótulo claro, valor em destaque, unidade, variação/período quando houver.
Gráficos: título, legenda quando há mais de uma série, eixos legíveis, tooltip, estado vazio. Não usar 3D nem efeitos decorativos.

Tabelas

Cabeçalho fixo (sticky) quando houver rolagem vertical longa.
Texto alinhado à esquerda, números e valores monetários à direita, datas em formato consistente (pt-BR: dd/mm/aaaa).
Largura de coluna proporcional ao conteúdo; truncar com reticências e title apenas onde fizer sentido.
Linha com altura confortável; hover sutil; seleção visível; ações por linha agrupadas e acessíveis.
Em telas pequenas: rolagem horizontal contida no próprio container (overflow-x: auto), nunca na página inteira, ou transformar em lista de cartões somente se for aceitável no escopo.
Paginação, ordenação e filtros preservados exatamente como o projeto já os implementa.

Formulários

Todo campo com label visível e associado (for/id). Placeholder não substitui label.
Agrupar campos relacionados; uma coluna em mobile; colunas em desktop conforme a referência.
Mensagens de erro junto ao campo, dizendo o que houve e como corrigir.
Botão primário claro (verbo + objeto: "Salvar alterações", não "Enviar"); estado de carregamento no botão; evitar duplo envio.
Máscaras e validações do projeto preservadas (CPF, CNPJ, telefone, CEP, moeda).
Teclado: ordem de tabulação lógica, Enter envia onde esperado, Esc fecha modais.

Modais e painéis

Foco vai para dentro ao abrir e retorna ao gatilho ao fechar; foco preso dentro do modal; Esc fecha; clique no fundo segue o padrão do projeto.
Título, conteúdo e ações separados; ação destrutiva com confirmação explícita e texto que diz o que será removido.

Navegação e filtros

Item ativo evidente; filtros visíveis com o estado aplicado; ação "Limpar filtros" quando houver filtros.
Breadcrumbs e títulos de página coerentes com as rotas existentes.

Estados obrigatórios (implementar todos os que fizerem sentido para a tela, usando os padrões do projeto)

Estado	Expectativa
Carregando	Skeleton ou spinner no lugar do conteúdo, sem deslocar o layout
Vazio	Explica o que falta e oferece a ação para resolver
Erro	Diz o que ocorreu e como corrigir; oferece tentar novamente
Sucesso	Confirmação com o mesmo verbo da ação ("Salvo", "Excluído")
Desabilitado	Visualmente claro e com disabled/aria-disabled
Hover / Foco / Ativo	Foco sempre visível por teclado
Dados extremos	Textos longos, números grandes, 0 itens, 1 item, centenas de itens

Não inventar dados nem estados que o sistema não possui. Se o estado não existe no sistema, não o crie; apenas mencione na entrega.

Responsividade

Verificar no mínimo: ~375px (mobile), ~768px (tablet), ~1280px (desktop), ~1920px (tela grande).
Seguir os breakpoints do projeto.
Sem rolagem horizontal da página em nenhum tamanho.
Alvos de toque com pelo menos 40–44px em mobile.
Mudanças de composição por responsividade só acontecem quando necessárias; no desktop, respeitar exatamente a referência.

Acessibilidade (piso de qualidade, sem alarde)

Foco visível, ordem de tabulação lógica, navegação 100% por teclado.
alt em imagens informativas; aria-label em botões só com ícone.
Hierarquia de títulos (h1 único, sem pular níveis).
Respeitar prefers-reduced-motion.
Tabelas com th e scope; ícones decorativos com aria-hidden.
Não depender de hover para funcionalidades essenciais.

Movimento

Movimento só quando responde a uma ação (abrir, expandir, confirmar) ou orienta a atenção. Sem entradas animadas em todas as seções e sem hover animado em todo cartão.
Durações curtas (150–250 ms), curvas suaves, nada que atrase o uso.

Performance

Sem imagens pesadas sem necessidade; definir largura e altura para evitar salto de layout.
Listas grandes: paginação ou virtualização conforme o padrão do projeto.
Evitar re-renderizações desnecessárias e cálculos pesados no render.

Textos da interface (pt-BR)

Linguagem simples, voz ativa, caixa de frase (não Title Case).
Nomear pela perspectiva do usuário, não do sistema.
Botões dizem o que acontece: "Salvar alterações", "Adicionar cliente", "Excluir pedido".
O mesmo verbo ao longo do fluxo: botão "Publicar" gera aviso "Publicado".
Erros não pedem desculpa e nunca são vagos. Vazio é convite à ação.
Formatos brasileiros: R$ 1.234,56, dd/mm/aaaa, 1.234,5.
Não alterar textos existentes sem pedido. Só escreva textos novos onde o pedido exigir, e sem inventar informações de negócio.
Etapa D — Quando houver imagem de referência

A imagem é o padrão visual de comparação.

Não basta ser semelhante em cores; é necessário respeitar a composição.

Exemplo: se a imagem mostra quatro indicadores em uma única linha, a implementação desktop deve mostrar quatro indicadores em uma única linha. Não é aceitável transformá-los em duas linhas sem necessidade de responsividade.

Conferir, ponto a ponto: quantidade de elementos, ordem, alinhamentos, proporção entre colunas, larguras, altura de linhas, espaçamentos, tamanhos de fonte, pesos, cores, raios, sombras, ícones e posição de ações.

Etapa E — Validação visual (obrigatória sempre que possível)
Executar a aplicação.
Abrir a página modificada.
Capturar a tela (desktop e, quando relevante, mobile).
Comparar lado a lado com a referência ou com os requisitos.
Listar as diferenças de composição (estrutura, proporção, espaçamento, tipografia, cor).
Corrigir.
Repetir até atingir o resultado esperado.

Verificar também:

Console sem erros e sem avisos novos.
Navegação por teclado funcionando na tela alterada.
Estados carregando, vazio e erro (quando existentes).
Outras telas que usam componentes compartilhados que foram tocados.
Build, lint e testes do projeto.

Não considerar a tarefa concluída apenas porque o código compilou.

Se não for possível executar a aplicação (ambiente sem navegador, sem dependências, sem acesso), declare isso explicitamente na entrega e diga o que foi verificado de outra forma.

VALIDAÇÃO CONTRA O PEDIDO ORIGINAL

Antes de finalizar, comparar a implementação com os requisitos identificados no início:

Todos os elementos solicitados foram implementados?
A estrutura corresponde à referência?
Posicionamentos e proporções estão corretos?
Algum requisito foi omitido?
Algum elemento foi adicionado sem autorização?
Alguma funcionalidade existente deixou de funcionar?
Alguma parte fora do escopo foi modificada? (revisar o diff arquivo por arquivo)
Textos, nomes e regras de negócio permanecem como estavam?

Em tarefas funcionais, executar os testes pertinentes e verificar o comportamento real.

Não declarar conclusão enquanto houver requisito pendente sem justificativa.

Autocrítica final

Antes de entregar, olhe a tela como um designer revisor:

O que é o elemento principal e ele está evidente?
Há decoração que não serve ao conteúdo? Remova.
Espaçamentos e alinhamentos seguem uma escala consistente?
Algo parece "genérico de IA" sem que o pedido ou o projeto peça isso?
A tela funciona com dados reais ruins (texto longo, vazio, erro)?

Ajuste apenas dentro do escopo autorizado.

PROTOCOLO FINAL DE ENTREGA

Ao terminar, informar de forma objetiva e curta:

O que foi solicitado.
O que foi efetivamente realizado.
Arquivos modificados (lista).
O que foi preservado (funcionalidades, componentes compartilhados, textos).
Testes executados (build, lint, testes, verificação manual).
Validação: visual (captura comparada com a referência) e/ou funcional, e o resultado.
Limitações que ainda existem e requisitos não atendidos, se houver.
Sugestões (opcional, separadas): melhorias identificadas e não implementadas.

Regras da entrega:

Nunca afirmar que algo foi concluído se não foi implementado ou validado.
Não esconder requisitos não atendidos.
A entrega deve corresponder à solicitação original, e não a uma versão reduzida ou reinterpretada dela.
Sem elogios ao próprio trabalho e sem texto de enchimento.