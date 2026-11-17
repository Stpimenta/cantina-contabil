# Carregamento e estados vazios

Leia para loading.tsx, RouteLoading, Skeleton, PageTransition e SectionFeedback. [Mapa](../README.md).

## Carregamento de rotas

- Usar loading.tsx/RouteLoading com o JSX/CSS e breakpoints reais da tela, títulos, busca/filtros e ações nas posições finais. Skeleton substitui somente dados ainda desconhecidos: nomes, valores, contagens, datas e linhas. Sem saldo zero fictício, spinner, bolinha, ilustração ou frase visível de espera; sr-only/role=status anuncia e a região usa aria-busy.
- Layout/menu persistem. Desabilitar controles dependentes dos dados somente no fallback inicial; SearchForm disabled reutiliza a geometria, mas busca/filtros já montados na mesma rota continuam editáveis e preservam texto. Detalhes reutilizam breadcrumbs/saldos/informações dos donos; listas mantêm separadores, cards somente onde aprovados.
- Home usa HomeOverview sem data, com o próprio JSX/CSS final: resumo Real/Pendente, contagem, atalhos e painéis. Só dados/linhas viram Skeleton; links estáticos continuam disponíveis. Não criar dashboard paralelo nem vazio enquanto data é indefinida. Atalhos em duas colunas desde 600px e resumo/painéis desde 1024px. Altura final pode variar por nomes/quantidades; não prometer ausência absoluta de saltos.
- Mínimo único de 300ms por pathname no PageTransition, desde a montagem no navegador, inclusive entrada inicial e todos os ambientes. Corre junto da consulta: exibir conteúdo após mínimo e dados prontos, diretamente, sem entrada/fade/deslocamento/espera de saída. Cancelar timer ao sair; não reiniciar em query/busca/filtro/paginação/histórico/refresh da mesma rota, nem criar timer por tela. page-enter e duration-page foram removidos.
- O fallback não promete aparecer antes de ser obtido nem cobre a verificação inicial da sessão do layout. Falhas seguem PageFailure/error; resolver sem registros encerra o skeleton normalmente. Demais movimentos respeitam redução de movimento.

## Resultados vazios

- Array renderizado vazio em listas, histórico e seções da Home usa SectionFeedback + SectionIllustration com frase específica da área. Busca/filtros/cadastro continuam disponíveis; sem ação nova, skeleton, aria-busy ou anúncio de espera. Falha, ausência e carregamento são estados distintos. Pagination não mostra rodapé duplicado de zero resultados; renderiza para total positivo.
- Ilustrações autorais SVG ficam em public/illustrations/empty-states/, nunca ícone pronto/menu ampliado ou desenho inline. Reutilizar cenas existentes: casa, caixa/moeda, mão/envelope/coração, livro-caixa/bandeja, calendário/bandeirola, comandas, sacola/folhas e documentos/relógio. Mesma paleta, traço terracota e superfícies claras; viewBox 180×128, largura 144px (space-12 × 3), altura proporcional, sem animação/referência externa/foco.
- Grupo centralizado/flexível, sem altura mínima ou largura particular por tela; desenho cabe no espaço e frase quebra no celular sem overflow. SVG decorativo e sem controle novo. Frases: Nenhum caixa/evento/pedido/insumo encontrado; Nenhuma doação/movimentação encontrada; Nenhum registro no histórico; Nenhum evento próximo.
