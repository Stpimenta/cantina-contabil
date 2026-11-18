# Caixas e saldos — contrato da área

Contrato atual. Leia somente ao alterar este assunto. [Escolher outra leitura](../README.md).

## Regras e implementação

### Caixas

Grupos de [Produtos recorrentes](produtos-recorrentes.md) compartilham o vínculo e o financeiro dos eventos. Seus pedidos pagos/pendentes e compras de insumos participam das somas existentes uma única vez; entrada/correção de estoque e retirada física não movimentam dinheiro. Histórico identifica o cadastro do grupo sem chamá-lo de evento.

- Cadastro, listagem/busca, consulta, edição e soft delete. Nome obrigatório até 100 caracteres; descrição opcional até 500.
- Nome ativo único por chave Unicode NFKC, espaços normalizados e minúsculas pt-BR; índice único parcial garante concorrência. Edição/exclusão verificam versão.
- created/updated/deleted preservam data, ID e nome do autor. Triggers gravam snapshots antes/depois em cash_box_audit na mesma operação; falha na auditoria desfaz a gravação.
- Caixa com doação, evento/grupo vinculado, compra de insumo ou movimentação ativa não pode ser excluído; triggers garantem a regra mesmo em concorrência. Não presumir proteção para outros módulos futuros.
- CashBoxSummary separa o modelo de leitura: balanceCents é o real (doações não excluídas + valores dos pedidos pagos dos eventos e grupos de produtos vinculados); pendingCents soma os valores dos pedidos pendentes. Compras de insumos são subtraídas do real do caixa de origem, inclusive quando financiam evento de outro caixa. Movimentações manuais ativas somam entradas e subtraem saídas do real, sem alterar pendente. Pedidos excluídos ficam fora de ambos os saldos. Não somar novamente a auditoria ou parcelas por forma de pagamento, não usar zero fixo nem permitir edição direta de saldo.

### Visibilidade visual dos saldos

BalanceVisibilityProvider em components/ui/balance-visibility.tsx mantém um estado React iniciado em false no AppShell, externamente ao PageTransition. BalanceVisibilityToggle e BalanceAmount consomem o contexto sem duplicar estado por página. A navegação preserva a escolha enquanto o shell existe; novo carregamento/sessão reinicia oculto. Sem dependência, cookie, localStorage, alteração de sessão, consultas, payloads ou cálculos financeiros.

Home usa BalanceAmount para resumo Real/Pendente e textos do gráfico; barras permanecem iguais. CashBoxBalance aceita concealable apenas na lista/detalhe de caixas; seu uso em eventos permanece visível. Valores ocultos não são renderizados no texto/aria/title, inclusive no HTML inicial; a política de autorização e os dados enviados à interface permanecem iguais.

## Fluxo e interação

### Caixas

- Novo caixa abre CashBoxFormModal. Sucesso fecha, mostra toast Caixa criado e atualiza lista preservando busca/página. Editar usa o mesmo formulário; sucesso atualiza os detalhes/histórico.
- Fechar com dados alterados pede confirmação de descarte. Erro preserva formulário, aponta campo e oferece recuperação de foco. Nome duplicado ou versão concorrente são conflitos esperados.
- Excluir pede confirmação curta no padrão compartilhado. Sucesso volta à lista com toast; falha mantém contexto. Caixa com doações, eventos/grupos, compras de insumos ou movimentações ativas não pode ser excluído. Dependências excluídas logicamente não bloqueiam; registros e auditoria permanecem armazenados.
- Toda a linha de um caixa é um Link semântico para seu detalhe, com Enter, nova aba e foco na linha inteira. Não usar onClick em div/li nem aninhar outro interativo no link.
- Descrição da listagem é resumo visual: uma linha no celular abaixo de 600px, até duas nas demais telas, com reticências conforme largura disponível. Não limitar caracteres armazenados nem alterar validação; abrir o caixa mostra o texto completo.
- Nome alinhado verticalmente ao saldo. Real e pendente aparecem na listagem e em destaque no detalhe, inclusive R$ 0,00. Criado por mostra só nome; datas e alterações ficam no histórico.
- Histórico centralizado abaixo de Criado por, large + wide-action. Não inventar tamanho local.

- Ao dispensar ErrorModal de exclusão de caixa, encerrar também a confirmação de exclusão ao fundo, retornando ao detalhe do caixa. Formulários de cadastro/edição continuam preservando dados ao fechar seus erros.

### Visibilidade dos saldos

Decisão aprovada em 03/11/2026: Home, lista de caixas e detalhe do caixa começam com os valores monetários ocultos por quatro pontos. Um único olhinho mostra/oculta todos esses valores: na Home fica na faixa creme no canto superior direito; nas telas de caixas fica no PageHeader; rótulos Real/Pendente e barras do gráfico da Home continuam visíveis. A escolha é compartilhada entre essas telas e preservada ao navegar/buscar/paginar enquanto AppShell permanece montado. Recarregar a aplicação ou iniciar outra sessão começa oculto; não há persistência em cookie ou armazenamento do navegador.

Controle usa Button ghost iconOnly de 44px, ícones eye/eyeOff, ação Mostrar valores/Ocultar valores e aria-pressed. Valor oculto não tem texto monetário ou título acessível com o valor real; leitores de tela recebem Valor oculto. Fallback inicial mantém o olhinho na posição final, desabilitado durante o carregamento. Skeletons continuam representando dados pendentes. Eventos, formulários, doações, movimentações e detalhes de histórico mantêm seus valores e regras atuais.

## Composição visual

### Olhinho dos saldos

Na Home, BalanceVisibilityToggle fica dentro da faixa creme de resumo, no canto superior direito em um grupo inline; não fica no PageHeader. Caixas e detalhes do caixa mantêm o controle no grupo de ações do PageHeader, antes das ações existentes. Reutiliza Button ghost iconOnly e Icon eye/eyeOff. O canto superior direito usa posicionamento privado no CSS Module da Home, com tokens existentes e espaço reservado nos rótulos para preservar o alvo de 44px sem sobreposição. HomeOverview sem dados e RouteLoading reservam o controle desabilitado na mesma posição da tela final. BalanceAmount apresenta quatro pontos no lugar do texto monetário; Real/Pendente, tipografia e composição permanecem. Na Home, texto dos valores do gráfico também é ocultado, mantendo barras/nomes. Comportamento e duração da escolha em UX.md.

## Histórico e detalhes da área

### Histórico e detalhes

- Histórico abre em CashBoxHistoryModal e mantém paginação/filtros na URL, sem rolar o fundo.
- Categorias Tudo/Eventos/Entradas/Saídas aplicam automaticamente ao escolher, com history=1. Seta de reverter volta a Tudo; desabilitada quando já está em Tudo. Sem botão Filtrar. Controles bloqueados durante navegação e anúncio Atualizando filtros.
- Não remontar SelectField por categoria; preservar foco. Eventos inclui cadastro de caixas/eventos e pedidos pendentes; Entradas inclui doações e registros/correções de pedidos com pagamento atual ou anterior. A auditoria mostra alterações sem duplicar os valores no saldo. Saídas inclui compras de insumos pagas pelo caixa consultado; entradas/saídas gerais usam Movimentações.
- Cada registro tem duas linhas: ação e autor. Textos longos truncam só no resumo. Três pontos abre CashBoxHistoryEntryModal sem mudar filtro/página nem fechar o histórico.
- Doação nos detalhes: valor, data civil, doador, observação, autor e data/hora do registro. Evento cadastral: autoria/data e snapshots anteriores/posteriores. Reutilizar os dados já autorizados, sem consulta extra.
- Escape/Fechar encerra somente o detalhe e devolve foco aos três pontos. Cancelamento de um modal não propaga ao pai.

### Detalhes e histórico

- Saldo aparece antes da descrição. Criado por mostra só o nome, sem Última alteração ou data ao lado; autoria/datas continuam nos detalhes do histórico.
- Histórico centralizado abaixo de Criado por, usando large + wide-action: 240px limitados ao espaço disponível, altura padrão de 52px. É utilitário global, não tamanho oculto ou exclusivo dentro do componente.
- Histórico tem duas linhas por evento: ação e autor. Textos longos truncam só no resumo. Três pontos ghost iconOnly abre CashBoxHistoryEntryModal com valor/datas/doador/observação ou snapshots, sem expandir tudo na lista.
- Ações diretas de Caixas/Eventos/Pedidos seguem a seção Responsividade e ícones: neutral/danger, texto a partir de 1024px e ícones abaixo disso. Confirmação sempre mostra texto.
