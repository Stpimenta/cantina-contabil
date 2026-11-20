# Experiência compartilhada

Leia ao alterar comportamento, navegação, buscas, paginação ou resumos. [Mapa](../README.md). Aparência/tokens em [DESIGN](DESIGN.md); envio/modal/erros em [formulários](formularios-e-feedback.md). Regras e exceções específicas ficam em funcionalidades/.

## Resumos e agrupamento

- Resumo mostra campos essenciais da tarefa, não todos os dados do model. Nome/valor são principais; origem/estado próximos e discretos. Dado completo/autoria/datas ficam nos detalhes/histórico conforme a área. Evitar rótulos redundantes e uma linha por campo.
- Preservar composições aprovadas: listas com separadores nas áreas existentes, cards discretos somente em insumos, blocos suaves nos produtos do pedido e painéis somente na Home. Não converter outras telas por iniciativa própria.
- Somente card de insumo tem clique de detalhes aprovado: botão semântico com área estendida, link do caixa/menu independentes, sem controles aninhados. Nas demais áreas, manter o alvo e destino definidos em seu contrato.
- Truncamento é visual quando previsto: conservar dado original e texto completo acessível. Proteger nome, valores, estados e ações; não resolver overflow ocultando controles ou retirando operações. Alteração de layout não muda regra financeira, validação, histórico, confirmação ou navegação.

## Busca e filtros

- Usar SearchForm compartilhado: label acessível, placeholder curto, lupa Buscar e Limpar busca no campo. Busca automática após 350ms sem digitar; Enter/lupa antecipam e limpar aplica imediatamente. Não buscar durante composição de texto, nem criar debounce por tela.
- Digitar/limpar continua disponível durante carregamento. Resposta anterior não substitui texto mais recente; última consulta aguarda navegação em andamento. Anunciar Buscando. Não navegar se o texto normalizado já corresponde à consulta.
- URL usa q, filtros e page. Busca/limpeza reinicia página e preserva filtros. Automática usa replace/scroll=false; envio explícito usa a navegação/rolagem da página. Aplicar filtro preserva q e reinicia a página; paginar preserva todos os critérios.
- Caixas/Eventos/Pedidos: Buscar pelo nome (nome da pessoa em pedidos); Doações: Buscar por doador, somente doador, não caixa. Fallback usa os mesmos textos. Insumos não têm busca. Filtros particulares ficam no documento da área.
- Busca ocupa a largura do conteúdo (768px); abaixo de 768px fica na primeira linha e Filtros abaixo. Field appearance=search e Button shape=search são donos: foco envolve o conjunto com radius-pill, borda/pseudo-elemento não intercepta clique e hover do X não apaga a borda. Não sobrescrever controles por tela.
- Ausência de resultados segue [carregamento e estados](carregamento-e-estados.md), com controles disponíveis, sem erro disfarçado de vazio ou rodapé duplicado de zero resultados.

## Paginação, navegação e foco

- DEFAULT_PAGE_SIZE=15; LIMIT/OFFSET no servidor, ajuste de página fora do intervalo, sem scroll infinito nas listas gerais. Exceções aprovadas: lançamentos no modal de estoque de Produtos usam rolagem contínua por cursor; histórico de eventos/grupos carrega lotes ao rolar no modal, com alternativa Carregar mais registros, conforme os contratos das áreas. Anterior/Próxima, Página X de Y e contagem; controles de troca quando há mais de uma página. Total zero não gera rodapé redundante.
- Página/filtros ficam na URL. Paginar no celular volta ao início do documento após resolver; histórico usa scroll=false e preserva o fundo. Modais aninhados fecham somente a camada superior e devolvem foco ao gatilho; cancelar não propaga ao pai.
- Breakpoints de controles/layout e nomes acessíveis em [DESIGN](DESIGN.md). Não remover funcionalidade para compactar. Confirmações mantêm texto, mesmo onde as ações diretas viram ícone.
- Histórico do caixa tem duas linhas (ação/autor), categoria automática/reverter e detalhes separados; consultar [Caixas e saldos](../funcionalidades/caixas-e-saldos.md), sem espalhar seus filtros por todas as telas.
