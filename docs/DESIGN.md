---
version: alpha
name: Ministério Contábil
description: Painel discreto para gestão de caixas e eventos, com terracota e fundos claros.
colors:
  primary: "#A9432E"
  secondary: "#C58B65"
  background: "#FAF7F2"
  surface: "#FFFFFF"
  text: "#35312D"
  border: "#E7DDD3"
typography:
  sans:
    fontFamily: "Manrope, system-ui, sans-serif"
rounded:
  control: "0.5rem"
  panel: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
omitted:
  - section: components
    reason: Tokens e padrões globais ficam em src/app/globals.css; geometria e estados privados ficam no CSS Module do componente.
---

# Design — contrato atual

Consolidado em 01/11/2026. Estado de publicação em STATUS.md; o contrato descreve os padrões atuais e não autoriza novas mudanças. [UX-CONTRACT.md](UX-CONTRACT.md) define o comportamento e [ARCHITECTURE.md](ARCHITECTURE.md) as regras técnicas. Não tratar o histórico de ajustes como catálogo de alternativas.

## Direção

Ministério Contábil: painel discreto para caixas, doações, eventos e movimentações. Menos é mais: sem gradientes, decoração de fundo, cards estatísticos fictícios, excesso de bordas/botões ou informações redundantes. Usar conteúdo real e destacar saldo e ações necessárias.

Tema modernizado com terracota, superfícies claras e fundo quente. Manrope local, pesos 400/500/600. O dono dos valores é src/app/globals.css: cores semânticas, fontes/escala, espaçamento, dimensões, bordas, foco, z-index, movimento e disabled. Não copiar valores para temas paralelos.

## Preferências consolidadas

As correções do responsável estabelecem estes critérios; não são autorização para redesenhar telas fora do pedido.

- **Agrupar sem pesar:** um item deve ser percebido como uma unidade. Nos insumos, card branco com borda discreta, sem sombra; nos produtos do pedido, bloco de fundo suave. Não usar cards estatísticos fora da composição da Home explicitamente aprovada, bordas aninhadas ou aplicar cards a toda lista. Caixas, doações, eventos e histórico mantêm os donos atuais.
- **Pouca informação, bem organizada:** ícone junto do nome; valor destacado e origem/estado em plano secundário. Resumo não é ficha completa. Remover textos redundantes em vez de apenas aumentar gaps; não acrescentar informações técnicas/versões ao resumo cotidiano. Autoria permanece onde já foi aprovada, como na lista de doações e nos históricos.
- **Proporção pelo conteúdo:** nome/descrição têm largura flexível; ícone/X usam o espaço do controle; dinheiro não quebra. Não dividir em metades um campo longo e um botão pequeno. Não deixar item, ícone ou botão solto no centro de uma faixa vazia.
- **Hierarquia antes de espaço:** separar identificação, valores e informações cadastrais por grupos e títulos discretos. Aumentar somente o espaçamento não resolve informações com o mesmo peso ou sem relação clara. Cor forte identifica ação principal/seleção e danger nas exclusões diretas aprovadas; ações em menus continuam discretas.
- **Modal na medida:** altura natural, largura compartilhada adequada ao formulário. Formulários completos usam form; insumos usa formCompact. Não maximizar modal curto nem manter altura fixa vazia; nome/textos longos em linha própria, campos curtos relacionados lado a lado quando aprovados.
- **Mobile é composição própria:** preservar leitura, não apenas empilhar tudo. Agrupar Valor/Ícone e Preço/Ícone/X nos contextos já aprovados, com 44px de toque. Reticências são visuais e preservam conteúdo completo acessível; valores, tamanho de arquivo e controles permanecem legíveis. Categorias podem rolar na própria faixa, nunca fazer a página inteira transbordar.
- **Desktop também precisa de revisão:** após qualquer ajuste mobile, conferir a largura e distribuição desktop e a faixa intermediária de 600–1023px. Não esticar botões pequenos nem reaproveitar colunas fixadas para uma disposição antiga.

### Revisão estática obrigatória da composição

Antes de encerrar alterações visuais, ler JSX/CSS e conferir os cenários abaixo. Isso não autoriza iniciar servidores, usar navegador, gerar screenshots ou recriar testes.

1. Celular abaixo de 600px; faixa de 600–767px; tablet de 768–1023px; notebook/PC a partir de 1024px. Considerar a largura disponível dentro do modal, não só a tela.
2. Nome curto/longo, um/vários itens, valor grande, compra/doação, pendente/recebido, arquivo longo com tamanho e erros abaixo dos campos, quando aplicáveis.
3. Item agrupado, alinhamento dos controles/rótulos, ausência de colunas vazias, nome com espaço proporcional e ações acessíveis. Não remover funções para resolver espaço sem decisão do responsável.
4. Ordem do DOM, teclado e primeiro erro coerentes com a leitura; ícones com nomes acessíveis; seleção de texto sem fechamento acidental; movimento reduzido respeitado.
5. Mudança feita no dono correto, tokens existentes, documentação atual sem contradições. Se a proposta exigir novo padrão, perguntar antes de implementá-lo; reutilizar o já aprovado não exige nova confirmação.

## CSS e medidas

- globals.css: tokens comentados, reset/base acessível, scrollbar, reduced-motion e utilitários realmente compartilhados.
- Componentes: <componente>.module.css junto ao TSX; telas: page.module.css somente para estrutura privada aprovada. Não criar arquivos vazios nem importar todos os módulos no global.
- Tokens em margens/paddings/gaps; escala 4/8/12/16/24/32/48px. Não usar medidas avulsas, inline styles ou sobrescrever a aparência interna de Button/Field/Modal pelo pai.
- Conteúdo centralizado até 768px. Título, ações, busca e lista pertencem a esse bloco. Busca voltou à largura anterior: --search-width referencia --content-width, sem limite de 672px.
- Controles: 44px; large: 52px; ícones: 20px. Raios: 8px controles, 12px painéis; busca usa --radius-pill. Modal padrão: até 480px; a partir de 1024px de tela, até 528px pelo mesmo token global --modal-width. Login: até 384px.
- Formulários de criação/edição de caixas, doações, eventos, pedidos e movimentações usam Modal size="form": largura até 896px (--modal-width-form) a partir de 1024px, altura natural conforme conteúdo e rolagem interna limitada ao viewport; rodapé permanece na base do modal. Insumos usa size="formCompact", até 704px (--modal-width-form-compact), conforme seção própria. Em telas menores, manter largura padrão. size="wide" permanece uma capacidade de altura fixa para contextos explicitamente aprovados, não o padrão de formulários.
- Cabeçalho 72px, lateral 240px, drawer até 288px. A partir de 768px, botão lateral centralizado na borda recolhe/reabre o menu: Button primary iconOnly de 44px, terracota e seta branca, usando --z-header. Fechado, permanece na borda esquerda; abaixo de 768px, permanece somente o controle do cabeçalho/drawer. O documento rola; modais longos têm rolagem interna. Scrollbar global e visível.
- Camadas globais base/header/popover/modal; popovers/dialogs usam também a top layer. Não corrigir problemas com z-index arbitrário. Sombra somente em overlays.
- Dentro do Modal, corpo rolável usa --z-modal-content e cabeçalho/rodapé usam --z-modal-chrome, definidos em globals.css e relativos ao contexto do diálogo. Cabeçalho/rodapé têm fundo --color-surface; rodapé reserva --space-4 acima das ações para não encostar nos controles recortados pela rolagem. Não criar z-index local numérico ou sobrescrita por formulário.

- Scrollbar horizontal usa altura global --space-1, mantendo trilho/cores compartilhados; sem barras próprias por tela.
- Modal compartilhado abre com foco programático no título, sem contorno no título nem destaque automático no X. O X mantém alvo de 44px e foco visível ao navegar por teclado; confirmações preservam o foco explícito em Cancelar.
- Modal compartilhado distingue clique intencional no fundo de seleção/arraste: início e fim fora do painel, sem seleção de texto. Mover o mouse ou copiar não fecha nem solicita descarte.

## Responsividade e ícones

Limites distintos por responsabilidade, sem generalizar um breakpoint para todos os controles:

| Largura            | Responsabilidade                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Abaixo de 600px    | mobileIcon padrão vira ícone; alvos de 44×44px. Ações Pedidos/Insumos/Histórico compactam mantendo texto; resumos truncam em uma linha. |
| A partir de 600px  | mobileIcon padrão mostra conteúdo completo; ações diretas Editar/Excluir ainda usam ícones até 1023px.                                  |
| Abaixo de 768px    | Drawer; busca ocupa a primeira linha e Filtros fica abaixo. PageHeader pode compactar ações.                                            |
| A partir de 768px  | Lateral recolhível e layout desktop, sem alterar os breakpoints dos controles.                                                          |
| A partir de 1024px | Editar/Excluir diretos mostram texto; form-grid usa duas colunas e modais form/formCompact ampliam para a largura aprovada.             |

- Padrão para ações com ícone inequívoco: compactar só a apresentação, nunca retirar a funcionalidade ou inventar um botão menor. Implementar pelo mobileIcon de Button, sem duplicar componentes ou usar regras por tela.
- Ações diretas Editar/Excluir em caixas, eventos e pedidos usam iconBreakpoint="tablet" do Button: ícones abaixo de 1024px, conteúdo completo a partir de 1024px; editar neutral e excluir danger com lixeira. Novo caixa e outras criações mantêm mobileIcon padrão de 600px. Menus de três pontos não mudam: gatilho iconOnly e opções com ícone/texto em todas as telas; confirmação de exclusão mantém rótulo completo.
- PageHeader compactActionsOnMobile mantém título e ações na mesma linha, com espaço flexível para nomes longos. Não deixar Novo caixa cair abaixo do cabeçalho no celular.
- Filtros de Doações permanece com ícone e texto, inclusive no celular, na linha abaixo da busca. A seta externa de limpeza foi revertida; não recolocá-la.

## Donos canônicos

| Capacidade    | Dono                                                                                     | Contrato visual                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botões        | components/ui/button.tsx + button.module.css                                             | primary/neutral/ghost/danger; standard/large; iconOnly; mobileIcon/iconBreakpoint; compactOnMobile; shape search. Links de ação usam buttonClassName.                |
| Campos        | field.tsx, textarea-field.tsx + field.module.css                                         | Label, valor, erro e foco; DateField e MoneyField reutilizam essa base.                                                                                              |
| Seletores     | select-field.tsx + select-field.module.css                                               | Lista suspensa própria, não select/option HTML.                                                                                                                      |
| Modais        | components/modals/modal.tsx + modal.module.css                                           | Uma base para título, fechar, corpo e rodapé; cada finalidade tem componente próprio.                                                                                |
| Busca         | search-form.tsx + search-form.module.css                                                 | Campo arredondado e lupa integrada em terracota; limpar busca no campo.                                                                                              |
| Filtros       | filter-form.tsx, DonationFiltersModal e OrderFilters                                     | Histórico automático com reverter; filtros de doações/pedidos com aplicação explícita.                                                                               |
| Listas        | record-list/record-row/record-title globais                                              | Listas de caixas/doações/eventos/pedidos/movimentações com separadores; insumos segue composição própria abaixo. record-row-centered alinha nome do caixa com saldo. |
| Menu de ações | components/ui/record-actions-menu.tsx + module                                           | Três pontos com Detalhes opcional, Editar/Excluir, teclado/foco e top layer compartilhados.                                                                          |
| Paginação     | pagination.tsx + pagination.module.css                                                   | Anterior/Próxima, página e contagem; quebra no celular.                                                                                                              |
| Saldo         | CashBoxBalance e balance-value                                                           | Real e pendente, inclusive zero, em caixas/eventos; variante prominent nos detalhes.                                                                                 |
| Notificações  | ToastProvider                                                                            | Um toast por vez, superior direito e compacto, sem sombra.                                                                                                           |
| Skeleton      | components/ui/skeleton.tsx + skeleton.module.css; RouteLoading/loading.tsx; HomeOverview | Estrutura final visível, apenas dados pendentes substituídos; mínimo central de 300ms em PageTransition.                                                             |
| Vazio         | SectionFeedback + SectionIllustration; public/illustrations/empty-states/*.svg           | Cena SVG autoral do setor e frase curta, centralizadas; nunca reutilizar como indicador de espera.                                                                   |
| Layout        | AppShell, Navigation, Brand, PageHeader                                                  | CSS privado de cada dono; AppShell persistente. Brand usa Ministério Contábil; identificadores técnicos e URL permanecem preservados.                                |

## Identificação discreta das seções

Cabeçalhos PageHeader separam identificação e conteúdo com linha inferior discreta e espaçamento compartilhado. Caixas, Doações, Eventos e Movimentações usam o mesmo ícone da navegação junto do título; detalhes de caixa/evento preservam essa identificação. Textos curtos contextualizam as listagens a partir de 600px. Abaixo de 600px, subtítulos explicativos de Home/Caixas/Doações/Eventos/Movimentações são ocultos por hideDescriptionOnMobile no PageHeader compartilhado. Contexto de Evento: nome em Pedidos/Insumos e identificação de detalhes permanecem visíveis; não ocultar conteúdo cadastral ou descrições dos registros. Título pode quebrar e ações preservam os controles e breakpoints aprovados. Menu ativo permanece sem preenchimento, com texto/ícone terracota e traço lateral curto de 2px (token --focus-width), além de aria-current. Hover usa somente o fundo quente claro; não combinar bloco preenchido e barra grossa para indicar seleção. Tema único, densidade e listas existentes permanecem; não há cores por seção.

## Home

Composição aprovada após revisão: saldo Real como foco em faixa de fundo suave, Pendente secundário; blocos de acesso a Doações e Movimentações; gráfico horizontal de saldo por caixa e próximos eventos. Home mantém somente o resumo financeiro e estes quatro blocos: Doações, Movimentações, Saldo por caixa e Próximos eventos. Listas de últimas movimentações e pedidos pendentes foram retiradas. A composição anterior com atalhos soltos e caixas recentes foi substituída. Home é exceção aprovada ao uso de painéis: superfícies brancas, borda simples/radius-panel, sem sombra, sem alterar listas de outras áreas. Tema e largura central existentes preservados. UI específica em presentation/home/components/home-overview, página apenas como fronteira.

Celular: sequência saldo, acessos a Doações/Movimentações, gráfico e eventos; sem rolagem horizontal. Acessos lado a lado a partir de 600px; painéis de gráfico/eventos em duas colunas somente a partir de 1024px. Nome/valor podem ocupar linhas diferentes, dinheiro permanece inteiro; valores totais muito longos usam fonte menor. Colunas minmax(0, 1fr), nomes quebráveis, ações de 44px, leitura/foco na ordem do DOM.

Barras SVG nativas usam tokens e dimensões de atributos, sem biblioteca ou estilos inline. Valores são escritos por extenso ao lado de cada nome/link, SVG decorativo aria-hidden; barra usa proporção ao maior saldo absoluto e, se houver negativo, eixo central com negativo à esquerda. Zero mantém valor visível e barra de largura zero; não inventar mínimo visual nem percentual de crescimento. Cada barra leva ao caixa. Links de cabeçalho levam às áreas completas. Vazios seguem o padrão de ilustração personalizada e frase da seção Carregamento e estados vazios.

## Marca

Monograma MC (opção 1 escolhida pelo responsável) em terracota, transparente, nos PNGs de public/brand. Brand compartilhado exibe símbolo ao lado de Ministério Contábil no cabeçalho e no login; ícone decorativo com alt vazio evita repetir o nome. Símbolo de 32px nas telas maiores e 24px abaixo de 600px, texto de 18px/14px respectivamente. Nome pode quebrar entre palavras se necessário para preservar botões de 44px e evitar overflow; ordem de leitura permanece Ministério Contábil. Ícone da aba 32px e Apple 180px declarados nos metadados da raiz, sem texto dentro do favicon. No login, Brand variant=login amplia símbolo para 64px/texto 24px (52px/18px abaixo de 600px). Nome é revelado uma vez em 1s com steps/clip-path, por --duration-brand global, mantendo a largura reservada e formulário utilizável desde o início. Movimento reduzido desativa a animação pela regra global; o texto completo permanece no DOM. Header mantém a variante compacta, sem animação.

logos/ conserva apenas o original transparente do MC aprovado; versões otimizadas de uso ficam em public/brand. Não manter propostas rejeitadas, cópias derivadas ou README na pasta logos/.

## Menu do usuário

Menu do usuário: popover compacto à direita, separado do cabeçalho por space-2, superfície branca, borda/radius-panel e shadow-overlay compartilhados. Nome completo acima de Meus dados/Sair em coluna, sem iniciais. Não substituir por iniciais, painel integrado ao cabeçalho ou faixa de largura total no celular. Identidade discreta somente no nome em terracota e linha inferior fina separando as ações; posição, largura e disposição originais preservadas. No celular mantém largura limitada ao viewport e afastamento lateral space-4; desktop usa space-6. Controles de 44px e Popover API preservados.

## Seletores

- SelectField é único no app. Opções value/label/disabled, valor controlado ou defaultValue e onValueChange. Preservar erro, foco, disabled e FormData.
- Campo neutral e opções ghost usam Button; seleção tem check e destaque semântico. A lista segue largura do campo, com rolagem interna e --select-list-height (18rem).
- Lista abaixo do campo, com Popover API e âncora CSS implícita. Pode inverter se faltar espaço. Top layer evita recorte pelo modal; sem coordenadas inline.
- Fallback sem âncoras/popover: mesma lista abaixo do campo no fluxo, dentro da rolagem do modal. Não voltar ao seletor do sistema nem abrir outro modal para escolher.
- Setas, Home/End, Enter/Espaço, digitação e Escape seguem o contrato de acessibilidade. Não criar variante por tela ou nova biblioteca sem aprovação.
- Referência: [Popover e âncora implícita](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using).

## Busca, filtros e listas

- Placeholder como orientação, label oculto acessível e lupa com nome Buscar. Field appearance=search e Button shape=search são donos da composição; SearchForm não sobrescreve internamente seus controles. O contorno de foco envolve a composição inteira, com radius-pill e tokens globais de foco; os donos Field/Button removem o contorno individual do input/lupa nesse modo, evitando borda quadrada no encontro dos controles. No Field de busca, a borda é desenhada pelo pseudo-elemento do control, sem interceptar cliques, acima da superfície da ação Limpar; o hover do X não apaga as linhas superior/inferior. Alvo de toque permanece 44px, sem sobrescrever Button. Busca automática compartilhada após 350 ms de pausa, mantendo o campo editável enquanto carrega.
- Doações: botão Filtros com contagem quando ativo abre modal padrão com Caixa/Ano e Cancelar/Aplicar filtros. Não há botão externo de reverter.
- Histórico: categoria aplica ao escolher; reverter ghost iconOnly volta a Tudo e permanece à direita do seletor na mesma linha, inclusive no celular; campo flexível com min-width: 0 reserva o alvo de 44px da ação. Não usar X de fechar nem voltar ao botão Filtrar.
- Descrição no resumo de Caixas tem truncamento visual por largura disponível: uma linha abaixo de 600px e até duas a partir disso, com reticências; dado original e texto completo no detalhe permanecem. Geometria no page.module.css da listagem, sem cortar nome ou saldos.
- Caixas/Eventos: linha inteira é Link e o título mantém aparência de navegação. Doações: corpo estático; nome do caixa usa botão textual sublinhado terracota para abrir detalhes em modal, sem navegar ao caixa. Títulos navegáveis e botões text-link recebem o destaque compartilhado de link. Ações de Doações ficam no menu próprio.
- Vazio usa a ilustração personalizada da área e frase do padrão compartilhado; não repetir 0 resultados no rodapé. Falha não se apresenta como lista vazia.

## Detalhes e histórico

- Saldo aparece antes da descrição. Criado por mostra só o nome, sem Última alteração ou data ao lado; autoria/datas continuam nos detalhes do histórico.
- Histórico centralizado abaixo de Criado por, usando large + wide-action: 240px limitados ao espaço disponível, altura padrão de 52px. É utilitário global, não tamanho oculto ou exclusivo dentro do componente.
- Histórico tem duas linhas por evento: ação e autor. Textos longos truncam só no resumo. Três pontos ghost iconOnly abre CashBoxHistoryEntryModal com valor/datas/doador/observação ou snapshots, sem expandir tudo na lista.
- Ações diretas de Caixas/Eventos/Pedidos seguem a seção Responsividade e ícones: neutral/danger, texto a partir de 1024px e ícones abaixo disso. Confirmação sempre mostra texto.

## Eventos, produtos e pedidos

- MoneyField é o dono da máscara monetária, reutilizando Field sem CSS próprio: todos os campos editáveis de dinheiro em reais, vírgula e duas casas decimais, agrupamento de milhares apenas na exibição e teclado numérico. Funções puras em shared/masks/input-masks.ts, também dono da máscara de DateField. Não criar máscara ou estilo local por tela.
- DateField é obrigatório para datas editáveis: máscara dd/mm/aaaa e botão de calendário no campo. DatePicker compartilhado usa @daypicker/react 10.0.2 com locale ptBR completo, Modal e Button existentes, sem tema externo. Geometria privada em date-picker.module.css; cores e medidas vêm dos tokens. Selecionado usa primary, hoje sublinhado; calendário permite rolagem horizontal em espaços menores que suas sete colunas de 44px, preservando o alvo de toque.

- Mesma largura, tipografia, listas e modais aprovados; nenhum tema ou painel paralelo. EventFormModal e OrderFormModal usam os componentes compartilhados e rolagem interna do Modal.
- CashBoxBalance é reutilizado em caixas e eventos: Real e Pendente lado a lado, cada rótulo acima do seu valor, ambos visíveis inclusive zero; Real mantém destaque nos detalhes. Permitir quebra somente quando faltar espaço. Subtotal dos produtos é referência textual, não um terceiro saldo ou card estatístico.
- Editar/Excluir evento seguem o padrão compartilhado de ações diretas: neutral/danger, texto completo a partir de 1024px e lápis/lixeira abaixo disso pelo mobileIcon com iconBreakpoint="tablet", área de 44px e nomes acessíveis. A antiga exceção iconOnly em todas as larguras foi substituída. ConfirmationModal mantém texto e danger.
- Detalhe do evento no celular abaixo de 600px agrupa saldos, Dinheiro/Pix/Insumos em três linhas discretas de rótulo/valor e depois Produtos vendidos em linha compacta com separador discreto, antes das ações. Mantém Real/Pendente no componente compartilhado; quantidade deixa de ocupar um bloco solto. DOM segue essa ordem; desktop mantém quantidade ao lado dos saldos e Dinheiro/Pix/Insumos abaixo pela grade do dono. Intervalo entre grupos da página de 24px no celular, 32px nas demais telas; dentro da seção financeira, 16px entre título/resumo, 12px entre Dinheiro/Pix e 24px antes das ações. Quantidade usa rótulo à esquerda e valor à direita, como as formas de pagamento; statistics/metric/payments são estruturas privadas, sem utilitários de direção/gap conflitantes.
- Detalhe do evento organiza identificação no cabeçalho, Situação financeira e Informações do evento. Blocos com --space-8; seção financeira começa após a linha única do PageHeader e termina com borda inferior discreta e padding-bottom --space-6, sem cards ou novos fundos. Data/Caixa/Descrição usam três colunas iguais, empilhadas abaixo de 600px, com --space-6 de intervalo. Estrutura privada no page.module.css da rota.
- ProductIcon reutiliza a linguagem SVG de 24 unidades, traço e dimensão do Icon compartilhado. Catálogo em shared/products/product-icons.ts, sem biblioteca, imagens externas ou uploads.
- Cadastro de produto: no notebook/PC, Nome do produto e Preço têm proporção 2:1, seguidos do seletor de ícone rotulado Ícone e X de remoção. Na tela menor, nome ocupa a primeira linha; preço/ícone/X compartilham a segunda, sem faixa vazia acima do nome. Botões neutral/ghost iconOnly mantêm 44px e nomes acessíveis; o ícone abre o seletor. Geometria privada em event-form-modal.module.css, sem sobrescrever aparência de Button/Field ou deslocar controles quando surge erro.
- ProductIconModal é o dono do novo seletor aprovado: abas por categoria usando Button; opções em grade cujo mínimo é --control-height, gap --space-3 e todas as demais medidas/cores herdadas. No celular abaixo de 600px, categorias ficam em faixa horizontal rolável sem quebra, acompanhando a seleção com rolagem suave (desativada com movimento reduzido), e opções em quatro colunas com altura large de 52px, preenchendo cada célula. Geometria privada em product-icon-modal.module.css. Seleção usa variante primary/neutral existente, sem sobrescrever aparência interna de Button.
- HistoryRecordList é o dono compartilhado do resumo de duas linhas em históricos de caixa/evento, com CSS Module próprio. Detalhes reutilizam Modal e detalhes/record-list existentes.
- Detalhe do evento mostra Pedidos (primary), Insumos e Histórico (neutral) lado a lado, alinhados à esquerda na seção financeira, os três large + wide-action nas larguras não compactas. Pedidos é Link para a página /eventos/[id]/pedidos, mantendo a lateral. Essa página tem PageHeader com título Pedidos, contexto Evento: nome e ação Adicionar pedido; busca/lista/paginação abaixo. Adicionar/editar e confirmar exclusão usam os modais existentes; não recriar modal de listagem.
- Nomes de produtos no formulário de pedido têm limite visual de 32ch com reticências e nome completo no title; cada produto usa bloco discreto com --color-background, --radius-control e padding --space-4, separado por --space-3. A lista não tem margem/recuo nativo, alinhando os blocos aos demais campos. Nome/preço ficam agrupados e quantidade ao lado; abaixo de 600px, controles passam para baixo dentro do mesmo bloco, conforme aprovação explícita. Geometria privada no CSS Module do formulário, sem alterar os dados.
- Novo/Editar pedido lista os produtos com ícone, nome, preço e quantidade entre botões −/+ neutral iconOnly (44px). Não usar seletor de produto nem botão genérico Adicionar produto nesse formulário. Produtos do pedido original preservam seus snapshots na edição.
- Formulário de pedido mantém um único campo monetário ajustável; dinheiro no pagamento misto é apenas uma parcela desse mesmo valor. Não transformar a tela simples em painel de recebíveis.

- Produtos vendidos aparece no resumo financeiro do evento junto de Real/Pendente, com rótulo discreto e quantidade em unidades, sem novo card ou saldo. Agrupamento flexível quebra conforme espaço disponível.
- Observação na lista de pedidos segue o truncamento responsivo já aprovado nos resumos: uma linha abaixo de 600px, até duas nas demais telas, com reticências. Texto completo permanece no formulário de edição e histórico; limite de entrada de 500 caracteres não muda. Conteúdo ocupa a largura disponível sem empurrar as ações.
- Detalhe do evento exibe Dinheiro e Pix em linha secundária discreta após o resumo financeiro, com quebra natural no celular. Somam somente as parcelas dos pedidos pagos ativos, incluindo pagamento misto; pendentes/excluídos ficam fora. São composição do Real, sem somar novamente ao saldo ou descontar insumos por meio de pagamento. Agregação em centavos no repository com precisão segura; sem novos campos persistidos ou migração.
- Ações Pedidos/Insumos/Histórico do detalhe do evento ficam em três colunas iguais abaixo de 600px, com gap space-2. Usam compactOnMobile do Button compartilhado (também em links), texto font-sm, padding space-2 e altura mínima de 44px; mantêm rótulos completos e alinhamento central, sem cortar Histórico. A partir de 600px preservam tamanho large e espaçamento anteriores. Não sobrescrever controles na página nem aplicar a todos os botões automaticamente.

## Carregamento e estados vazios

### Skeleton durante o carregamento

Padrão aprovado para as páginas autenticadas; reutilizar os donos abaixo em novas telas e correções, sem criar um loader particular por setor.

- Carregamento de rotas autenticadas usa loading.tsx e RouteLoading com estrutura específica de cada tela. Não mostrar ilustração, bolinha, spinner ou frase visível de espera. Preservar ícones normais do PageHeader e dos controles; o aviso de carregamento fica somente em sr-only/role=status e a região usa aria-busy. Skeleton compartilhado cobre nomes, valores, contagens, datas e linhas ainda desconhecidas, sem inventar zeros. Cabeçalho, busca/filtros e ações são posicionados como na tela final; controles que dependem dos dados ficam desabilitados apenas nesse estado inicial. SearchForm possui disabled para reutilizar sua geometria sem executar busca no fallback; buscas/filtros já montados na mesma rota preservam texto/interação pelo fluxo atual. Detalhes reutilizam breadcrumbs e CSS de saldos/financeiro/informações dos donos. Listas conservam separadores; cards somente em insumos.
- Na Home, HomeOverview sem data reutiliza o próprio JSX/CSS da apresentação final: Saldo real/Pendente, contagem de caixas, atalhos de Doações/Movimentações, painéis Saldo por caixa/Próximos eventos. Somente dados e linhas pendentes viram Skeleton; links estáticos continuam disponíveis. Não mostrar resultados vazios enquanto data está indefinida. Mesmos breakpoints do dono (atalhos em duas colunas a partir de 600px e resumo/painéis a partir de 1024px), sem recriar grids no loader. O comprimento de nomes longos ou quantidade de registros pode ajustar a altura final; não declarar ausência absoluta de saltos.

### Ilustração quando não há registros

- Ausência de registros usa SectionFeedback com ilustrações autorais de pequenas cenas em arquivos SVG separados em public/illustrations/empty-states/, selecionadas por SectionIllustration; não reutilizar os ícones de navegação como desenhos de vazio. A coleção usa somente a paleta existente, traço terracota e superfícies claras: casa, caixa aberta/moeda, mão com envelope/coração, livro-caixa/bandeja, calendário/bandeirola, comandas/bloco de pedidos, sacola/embalagem/folhas e documentos/relógio. Cada arquivo tem viewBox 180×128 e aparece com largura de 144px (space-12 × 3), altura proporcional, sem animação, sem foco e sem referências externas. Grupo centralizado, com frase específica (Nenhum caixa/evento/pedido/insumo encontrado; Nenhuma doação/movimentação encontrada; Nenhum registro no histórico; Nenhum evento próximo na Home). Não usar skeleton, aria-busy ou anúncio de carregamento no estado vazio. Preservar filtros/busca/cadastro e composição dos registros existentes. Pagination não exibe rodapé redundante de 0 resultados; só renderiza para total positivo. A composição usa flex com quebra: ilustração limitada à largura disponível e texto flexível, sem mínimo de altura nem largura por tela; em celular estreito a frase pode quebrar, sem overflow. SVG é decorativo, sem foco, e sem novos controles.

### Navegação e duração mínima

- Navegação entre páginas autenticadas usa PageTransition: somente deslocamento vertical sutil de 8px em --duration-page (180ms), com conteúdo visível desde o primeiro frame da sua entrada após o carregamento, sem fade a partir de opacidade zero. Antes dos dados finais, PageTransition mantém RouteLoading por no mínimo 300ms (0,3 segundo) a partir da montagem da rota no navegador, inclusive no acesso inicial, em todos os ambientes, por decisão de avaliação do responsável em 01/11/2026. A espera ocorre junto do carregamento real: se os dados demorarem mais, o loading.tsx permanece até resolver. Não reiniciar o mínimo em busca/filtros/paginação na mesma rota; cancelar timer ao sair. A duração controla apenas o movimento depois de o conteúdo chegar; não se soma artificialmente à resposta do Worker. Apenas o conteúdo anima; cabeçalho e lateral ficam estáveis. A chave é o pathname: busca, paginação, abertura de histórico e atualizações na mesma rota não repetem a animação nem remontam formulários. Movimento reduzido desativa animações/transições globalmente.

## Feedback e movimento

- Sucesso usa ToastProvider, nunca texto avulso no cabeçalho/URL. Canto superior direito, largura pelo conteúdo até 384px, fonte pequena, sem sombra, borda lateral semântica.
- success verde (--color-success), warning amarelo (--color-warning), critical vermelho (--color-danger). Uma mensagem por vez; 3s, pausa por foco/ponteiro e fechamento manual.
- Entrada/saída com opacidade e deslocamento de 8px em --duration-fast (120ms). Fechamento manual também anima. Respeitar reduced-motion.
- Validação de campos não abre modal: usar error de Field/MoneyField/DateField/SelectField/TextareaField. FieldError compartilha a mesma aparência para erro específico de grupo (por exemplo, lista sem produtos), logo abaixo do controle/grupo e com vínculo acessível. Não mostrar resumos genéricos acima de listas ou duplicar erros de linhas no grupo. Erros atualizam ao editar após a tentativa de envio. Demais falhas continuam no ErrorModal.
- Mensagem de validação dos produtos não deve mencionar o limite de 100 produtos; manter a orientação sobre nome, ícone e preço válidos, sem repetição.
- Erros gerais continuam em ErrorModal; referência selecionável e CopyButton para copiar mensagem/referência. PageFailure/fallback têm os seus contextos, sem padrões visuais paralelos.
- Menu/drawer tem movimento curto; no desktop recolhe sem overlay. X do drawer usa compensação de margem no dono Modal para alinhamento óptico, preservando o toque de 44px.

## Acessibilidade e consistência

Interface em pt-BR, foco visível, navegação por teclado, texto selecionável nos modais, contraste/estados sem depender só de cor e sem overflow horizontal em telas pequenas. Não usar alert/confirm/prompt para o produto.

Novas cores, dimensões, padrões ou exceções precisam de aprovação. O pai controla posicionamento; o componente controla sua aparência. Não alterar a identidade visual para introduzir uma funcionalidade.

## Orientação entre telas

Breadcrumbs compartilhado em components/layout substitui Voltar nos detalhes: Home / Eventos / nome e Home / Eventos / nome / Pedidos; caixas seguem Home / Caixas / nome. Links ancestrais e página atual com aria-current, separadores discretos e quebra para nomes longos. Preservar título legível e contexto: detalhes mostram Detalhes do evento/caixa, Pedidos mostra Evento: nome. Identidade continua minimalista, sem cores ou painéis exclusivos por página.

## Formulários responsivos

- Padrão compartilhado: form-grid em globals.css, duas colunas iguais a partir de 1024px e uma coluna abaixo disso, com --space-6, alinhamento pelo topo e min-width:0. Não inventar colunas por tela nem alterar aparência interna dos campos. Exceções já aprovadas de produtos e insumos usam geometria privada nos CSS Modules donos, descrita nas seções específicas.
- Agrupar campos pelo espaço e função, sem preencher colunas mecanicamente: nome principal e textos longos têm linha própria; caixa e data podem compartilhar linha. Preservar ordem de leitura/teclado. form-full ocupa a linha inteira para conteúdo longo quando necessário. Listas de produtos e observações continuam com espaço adequado, sem forçar todos os campos em duas colunas.
- Aplicação atual: doações agrupam caixa/valor e data/doador, observação em linha inteira; eventos deixam nome em linha inteira, caixa/data lado a lado e descrição em linha inteira; produtos usam linha compacta com ícone, nome, preço e X; pedidos agrupam valor/pagamento e forma/parcela em dinheiro; movimentações agrupam Caixa/Data e Tipo/Valor, com justificativa em linha própria. Caixa mantém nome/descrição em linhas próprias, pois é um formulário curto.
- Reutilizar Modal size="form" (formCompact para insumos) e os campos compartilhados. Login, confirmações, calendário e seletores não ganham largura de formulário automaticamente. Preservar erros abaixo dos campos, máscaras, estado de envio e recuperação de foco na ordem visual.

## Insumos

Página e formulário reutilizam a apresentação de Pedidos: Breadcrumbs/PageHeader, paginação sem busca e Modal size="formCompact" (até 704px a partir de 1024px, token global --modal-width-form-compact, altura natural) com Nome e Origem em linhas inteiras, Valor/Ícone lado a lado no notebook/PC (valor flexível e coluna do ícone limitada ao conteúdo), recebimento da doação, descrição opcional e comprovante em linhas inteiras. Descrição usa TextareaField compartilhado, sem ocupar o resumo do card; texto completo fica nos detalhes e histórico. Abaixo de 1024px, campos empilhados, com exceção aprovada abaixo de 600px: Valor e Ícone compartilham linha, valor flexível e botão mobileIcon compacto de 44px; Nome e Origem mantêm linhas próprias. Link Insumos usa Button neutral na seção financeira do evento. FileUploadField é o dono reutilizável da seleção de comprovantes: área clicável/arrastável, descrição discreta, nome/tamanho do arquivo, remoção por Button e erros por FieldError. Aparência própria da zona fica no CSS Module, usando somente tokens globais, sem sobrescrever componentes compartilhados. Origem reúne Doação e os caixas disponíveis em um único seletor, sem campo separado de caixa; escolher um caixa registra compra. Doação mostra estado de recebimento, nome de quem doou opcional em linha própria e valor de referência. No card, nome do doador preenchido aparece em linha secundária com tipografia record-meta e prefixo Doado por, sem ícone ou novo destaque. Listagem de insumos usa cards discretos aprovados: superfície global, borda simples, radius-panel, padding space-4, sem sombra. Ícone/nome, valor e caixa ou Doação · Pendente/Recebido ficam agrupados à esquerda, sem espalhar valor no extremo oposto. Ações ficam à direita no desktop e em coluna à direita abaixo de 600px, conforme a seção Card de insumo no celular: somente Mais ações (três pontos) visível, Button ghost iconOnly em todas as larguras por aprovação explícita. Mais ações abre popover discreto com Detalhes/Editar/Excluir, ícones e texto alinhados à esquerda em colunas regulares, usando conteúdo interno flexível sem sobrescrever Button; cores/borda/sombra e z-index vêm dos tokens globais. Detalhes usa Modal padrão; editar reutiliza formCompact. Removidos Compra/Pago, valor de referência e link de comprovante do resumo. A ação de marcar doação recebida permanece. Nenhum novo tema, cor ou z-index local.

- Insumos reutiliza ProductIconModal com título Ícone do insumo; botão neutral mostra ícone atual/rótulo a partir de 600px e apenas ícone abaixo disso. Catálogo único inclui sementes, grãos, carnes, legumes, bebidas, talheres/utensílios e eletrônicos; categorias derivadas do próprio catálogo. Na listagem, ícone fica junto do nome, sem outro sistema visual.

- Área de upload aprovada: borda tracejada, fundo global discreto, --radius-control, padding --space-6 e alvo amplo. Hover/arrastar usam cores existentes; foco global visível e disabled com token. Instrução curta Clique para selecionar, preservando suporte a arrastar, formatos JPEG/PNG/WebP/PDF, até 5 arquivos de 5 MB cada. Lista de anexos existentes e novos fica abaixo da área, com uma linha por arquivo, nome/tamanho e X de remoção. Anexos salvos abrem o visualizador existente; não adicionar outro sistema de cards ou upload. Em todas as larguras, nome usa reticências preservando texto completo acessível, tamanho não quebra e remoção usa Button ghost iconOnly X de 44px na mesma linha, exceção aprovada ao texto em desktop. Não criar zonas por tela nem z-index próprio.

- Imagens de comprovante abrem ImagePreviewModal compartilhado com Modal size="form", altura natural, imagem inteira centralizada e contida no viewport, sem distorção, iframe ou tema paralelo. Carregamento tem status; falha usa ErrorModal e permite tentar novamente. PDFs continuam para download. SupplyReceipt reutiliza essa abertura nos detalhes e na edição.

## Doações

- Doações mantém lista com separadores e aparência aprovada. Nome e valor ocupam a primeira linha no desktop, com menu à direita. Abaixo de 600px, nome e valor ficam agrupados à esquerda, valor abaixo do nome, seguido somente de data da doação/doador com intervalo de 4px; somente o menu ocupa a coluna direita, preservando 44px e espaço para textos longos. Observação, autor e horário do registro ficam somente em detalhes/histórico, em todas as larguras. Corpo sem navegação implícita; o nome abre detalhes conforme contrato. Três pontos disponibilizam apenas Editar/Excluir, com os mesmos ícones, alinhamento, teclado e foco do dono compartilhado. Edição reutiliza DonationFormModal size=form e sua grade atual, sem novo tema/card. Detalhes de snapshots completos permanecem no histórico do caixa.

## Movimentações

Reutiliza lista com separadores, PageHeader e paginação, sem nova variante de card/tema. Cabeçalho Nova movimentação vira + apenas abaixo de 600px via mobileIcon. Tipo/valor são principais; caixa/data e justificativa são secundários. Justificativa trunca em uma linha no celular e até duas nas demais telas, mantendo detalhes completos. Ações ficam em RecordActionsMenu compartilhado com insumos: três pontos, Detalhes/Editar/Excluir, mesmo teclado/foco, tokens e z-index globais.

Formulário segue Modal size=form e form-grid: Caixa/Data, depois Tipo/Valor no desktop a partir de 1024px, justificativa de largura inteira. Mobile/notebook abaixo desse limite empilham. Comprovantes opcionais usam o FileUploadField já aprovado abaixo da justificativa, em linha inteira, com lista de anexos e X; Detalhes usa ReceiptLink compartilhado. Sem estilo exclusivo de controle, calendário, máscara, upload ou modal. Detalhes e snapshots do histórico usam pares rótulo/valor e tipografia compartilhados; nenhuma informação financeira adicional ou gráfico.

### Card de insumo no celular

Abaixo de 600px, card mantém conteúdo à esquerda e ações em coluna à direita, no topo, com alvos compartilhados de 44px. Nome com ícone e peso semibold, valor logo abaixo e origem/recebimento/doador próximos, com intervalo de 4px. Não reservar uma faixa inteira abaixo para ações. Nome e metadados podem quebrar; dinheiro permanece inteiro. A partir de 600px, composição anterior preservada.

### Detalhes dos insumos e custo do evento

Card de insumo preserva a composição aprovada e abre o modal de detalhes, com área de botão estendida, foco no contorno, hover no nome e controles do caixa/menu independentes. Na situação financeira, Insumos acompanha Dinheiro e Pix com o mesmo tamanho, cor discreta e peso visual, em linha flexível no desktop e pares rótulo/valor no celular. Produtos vendidos permanece ao lado dos saldos no desktop e abaixo desse grupo no celular. Insumos representa compras ativas de qualquer caixa, sem doações ou cálculo de lucro.
