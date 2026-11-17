# Home — contrato da área

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Consulta da Home

server/home/composition.ts monta GetHomeUseCase com os contratos de caixas e eventos, usando a mesma conexão D1. Use case verifica sessão/perfil antes de consultar; sem entrada externa, Action ou novo endpoint. CashBoxRepository.overview reutiliza as expressões de saldo de caixas, exclui caixas removidos e ordena criação/ID decrescentes. Use case valida inteiros seguros e soma todos os saldos com BigInt, verifica precisão antes de converter e envia apenas id/nome/saldos de todos os caixas ativos para o gráfico. Nesta implementação, a consulta lê os caixas ativos para somar sem usar ponto flutuante; não soma auditorias nem apenas a prévia.

EventRepository.upcoming recebe a data interna de São Paulo e consulta somente id/nome/data de até cinco eventos ativos de hoje em diante, por data/nome/ID crescentes. Data é gerada no servidor, sem parâmetros do navegador. Ambos os repositories usam seus adaptadores Drizzle e deixam falhas inesperadas propagarem; fronteira da página usa executeOperation/PageFailure. Sem nova tabela, migração, dependência ou mudança das fórmulas financeiras.

Gráfico nativo calcula apenas proporções com BigInt antes de converter coordenadas, sem alterar valores financeiros. A Home não consulta movimentações recentes nem pendências por evento; consultas e métodos exclusivos dessas prévias foram removidos após simplificação aprovada. Doações/Movimentações são apenas links de navegação.

## Fluxo e interação

### Home

- Após login, saudação e resumo de todos os caixas ativos, sem filtro de período. Real em destaque e Pendente secundário mantêm as regras financeiras existentes; o gráfico não altera totais. Contagem apenas de caixas ativos.
- Gráfico de barras compara saldo real de todos os caixas ativos, ordenados por criação/ID decrescentes; nome e valor são legíveis sem depender do desenho/cor. Cada item abre o caixa. Não é evolução temporal ou receita do período.
- Próximos eventos: até cinco não excluídos com data civil a partir de hoje, inclusive, em America/Sao_Paulo, por data/nome/ID crescentes. Linha leva ao evento; seta abre /events. Não filtrar por saldo ou presença de pedidos.
- Home mantém apenas resumo financeiro e quatro blocos: Doações, Movimentações, Saldo por caixa e Próximos eventos. Listas de movimentações recentes e de pedidos pendentes ficam fora da Home.
- Blocos de acesso levam a /donations e /movements, sem formulários ou gravações na Home. Falha na consulta usa PageFailure; nunca mostrar zero como substituto de erro. Valores zero são exibidos normalmente depois de resolver a consulta; áreas vazias usam ilustração personalizada e frase, conforme Resultados vazios.
- Sem lucro do evento, saldo previsto, variações percentuais, notificações ou dados fictícios. Preview de cinco itens não muda paginação de 15 nas áreas completas. Composição responsiva em DESIGN.md.

## Composição visual

### Home

Composição aprovada após revisão: saldo Real como foco em faixa de fundo suave, Pendente secundário; blocos de acesso a Doações e Movimentações; gráfico horizontal de saldo por caixa e próximos eventos. Home mantém somente o resumo financeiro e estes quatro blocos: Doações, Movimentações, Saldo por caixa e Próximos eventos. Listas de últimas movimentações e pedidos pendentes foram retiradas. A composição anterior com atalhos soltos e caixas recentes foi substituída. Home é exceção aprovada ao uso de painéis: superfícies brancas, borda simples/radius-panel, sem sombra, sem alterar listas de outras áreas. Tema e largura central existentes preservados. UI específica em presentation/home/components/home-overview, página apenas como fronteira.

Celular: sequência saldo, acessos a Doações/Movimentações, gráfico e eventos; sem rolagem horizontal. Acessos lado a lado a partir de 600px; painéis de gráfico/eventos em duas colunas somente a partir de 1024px. Nome/valor podem ocupar linhas diferentes, dinheiro permanece inteiro; valores totais muito longos usam fonte menor. Colunas minmax(0, 1fr), nomes quebráveis, ações de 44px, leitura/foco na ordem do DOM.

Barras SVG nativas usam tokens e dimensões de atributos, sem biblioteca ou estilos inline. Quando revelados pelo olhinho, valores são escritos por extenso ao lado de cada nome/link, SVG decorativo aria-hidden; barra usa proporção ao maior saldo absoluto e, se houver negativo, eixo central com negativo à esquerda. Zero mantém valor visível e barra de largura zero; não inventar mínimo visual nem percentual de crescimento. Cada barra leva ao caixa. Links de cabeçalho levam às áreas completas. Vazios seguem o padrão de ilustração personalizada e frase da seção Carregamento e estados vazios.
